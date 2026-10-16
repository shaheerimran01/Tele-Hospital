'use client';

// Live connection to a consultation room (Socket.io namespace "/consultations").
// Chat, typing, read receipts, who is in the room, and the video call's signaling.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  API_BASE,
  getRoomMessagesApi,
  type ChatMessage,
  type MessageType,
  type ParticipantRole,
  type Viewer,
  type WaitingState,
} from '@/app/lib/api/consultations';

/** Extra fields for media messages (text consultation room) */
export interface SendOptions {
  messageType?: MessageType;
  audioDuration?: number;
}

export type RtcSignalType = 'ready' | 'offer' | 'answer' | 'candidate' | 'hangup';
export interface RtcSignal {
  from: ParticipantRole;
  type: RtcSignalType;
  payload: unknown;
}

export type LocalMessage = ChatMessage & {
  /** sent from this browser, waiting for the server */
  pending?: boolean;
  /** sending failed (message shown with a Retry button) */
  failed?: string;
};

export interface RoomNotice {
  id: number;
  text: string;
  tone: 'join' | 'leave' | 'info';
}

type Presence = Record<ParticipantRole, boolean>;

/** How the session ended: the doctor completed it, or marked the patient as a no-show */
export type SessionOutcome = 'COMPLETED' | 'NO_SHOW';

/** Waiting state as received, with the local time it arrived (to correct for clock differences) */
export type ReceivedWaitingState = WaitingState & { receivedAt: number };

const OTHER_TYPING_TIMEOUT_MS = 6000;
const NOTICE_MS = 5000;

const byTime = (a: LocalMessage, b: LocalMessage) => a.createdAt.localeCompare(b.createdAt);
let noticeSeq = 0;

export function useConsultationRoom({
  appointmentId,
  ticket,
  viewer,
}: {
  appointmentId: string;
  ticket: string;
  viewer: Viewer;
}) {
  const role = viewer.role;
  const otherRole: ParticipantRole = role === 'DOCTOR' ? 'USER' : 'DOCTOR';

  const socketRef = useRef<Socket | null>(null);
  const signalHandlers = useRef(new Set<(s: RtcSignal) => void>());
  const typingTimer = useRef<number | null>(null);
  const typingSent = useRef(false);

  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'closed'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<Presence>({ USER: false, DOCTOR: false });
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherMedia, setOtherMedia] = useState({ audio: true, video: true });
  const [notices, setNotices] = useState<RoomNotice[]>([]);
  const [ended, setEnded] = useState<{ endedBy: string; outcome: SessionOutcome } | null>(null);
  const [waiting, setWaiting] = useState<ReceivedWaitingState | null>(null);

  const notify = useCallback((text: string, tone: RoomNotice['tone']) => {
    const id = ++noticeSeq;
    setNotices((n) => [...n.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setNotices((n) => n.filter((x) => x.id !== id)), NOTICE_MS);
  }, []);

  /** Adds or replaces messages (matching by id, or by clientId for our own pending ones). */
  const merge = useCallback((incoming: LocalMessage[]) => {
    setMessages((prev) => {
      const next = [...prev];
      for (const m of incoming) {
        const i = next.findIndex((x) => x.id === m.id || (m.clientId && x.clientId === m.clientId));
        if (i >= 0) next[i] = { ...next[i], ...m, pending: false, failed: undefined };
        else next.push(m);
      }
      return next.sort(byTime);
    });
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const { messages: history } = await getRoomMessagesApi(appointmentId, viewer);
      merge(history);
    } catch {
      // the live feed still works; history fills in on the next reconnect
    } finally {
      setHistoryLoaded(true);
    }
    // viewer is stable for the lifetime of the room
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, merge]);

  useEffect(() => {
    const socket = io(`${API_BASE}/consultations`, {
      auth: { ticket },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus((s) => (s === 'closed' ? s : 'reconnecting')));
    socket.on('connect_error', () => setStatus((s) => (s === 'closed' ? s : 'reconnecting')));
    socket.on('room:error', (e: { message?: string }) => {
      setError(e?.message || 'You can no longer join this consultation room.');
      setStatus('closed');
      socket.disconnect();
    });
    socket.on('room:joined', (e: { presence: Presence }) => {
      setPresence(e.presence);
      loadHistory();
    });
    socket.on('presence', (p: Presence) => setPresence(p));
    socket.on('participant:joined', (p: { role: ParticipantRole; name: string }) => {
      if (p.role !== role) notify(`${p.name} joined the room`, 'join');
    });
    socket.on('participant:left', (p: { role: ParticipantRole; name: string }) => {
      if (p.role !== role) {
        notify(`${p.name} left the room`, 'leave');
        setOtherTyping(false);
      }
    });
    socket.on('message:new', (m: ChatMessage) => {
      merge([m]);
      if (m.senderType === otherRole) setOtherTyping(false);
    });
    socket.on('message:read', (e: { ids: string[]; by: ParticipantRole }) => {
      if (e.by === role) return;
      const ids = new Set(e.ids);
      setMessages((prev) => prev.map((m) => (ids.has(m.id) ? { ...m, isRead: true } : m)));
    });
    socket.on('typing', (e: { role: ParticipantRole; isTyping: boolean }) => {
      if (e.role === role) return;
      setOtherTyping(e.isTyping);
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      if (e.isTyping) typingTimer.current = window.setTimeout(() => setOtherTyping(false), OTHER_TYPING_TIMEOUT_MS);
    });
    socket.on('media:state', (e: { role: ParticipantRole; audio: boolean; video: boolean }) => {
      if (e.role !== role) setOtherMedia({ audio: e.audio, video: e.video });
    });
    socket.on('rtc:signal', (s: RtcSignal) => signalHandlers.current.forEach((h) => h(s)));
    socket.on('waiting:state', (w: WaitingState) => {
      if (w && typeof w.serverTime === 'string') setWaiting({ ...w, receivedAt: Date.now() });
    });
    socket.on('session:ended', (e: { endedBy?: string; outcome?: SessionOutcome }) => {
      setEnded({ endedBy: e?.endedBy || 'The doctor', outcome: e?.outcome === 'NO_SHOW' ? 'NO_SHOW' : 'COMPLETED' });
      setStatus('closed');
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    };
  }, [ticket, role, otherRole, loadHistory, merge, notify]);

  // ---------------------------------------------------------------------------

  const emitWithAck = useCallback(
    <T,>(event: string, payload: unknown, timeoutMs = 10_000) =>
      new Promise<T>((resolve, reject) => {
        const socket = socketRef.current;
        if (!socket || !socket.connected) return reject(new Error('You are offline. The message will be sent when you reconnect.'));
        socket.timeout(timeoutMs).emit(event, payload, (err: unknown, res: T) => (err ? reject(new Error('The server did not answer. Please try again.')) : resolve(res)));
      }),
    [],
  );

  const sendMessage = useCallback(
    async (text: string, attachments: string[] = [], retryOf?: string, options: SendOptions = {}) => {
      const clientId = retryOf ?? `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const local: LocalMessage = {
        id: clientId,
        clientId,
        appointmentId,
        senderId: '',
        senderType: role,
        message: text || null,
        attachments,
        isRead: false,
        createdAt: new Date().toISOString(),
        pending: true,
        ...(options.messageType ? { messageType: options.messageType } : {}),
        ...(options.audioDuration !== undefined ? { audioDuration: options.audioDuration } : {}),
      };
      setMessages((prev) => [...prev.filter((m) => m.clientId !== clientId), local].sort(byTime));
      try {
        const res = await emitWithAck<{ ok: boolean; message?: ChatMessage; error?: string }>('message:send', {
          text,
          attachments,
          clientId,
          ...options,
        });
        if (!res?.ok || !res.message) throw new Error(res?.error || 'Message not sent.');
        merge([{ ...res.message, clientId }]);
        return true;
      } catch (e) {
        const failed = e instanceof Error ? e.message : 'Message not sent.';
        setMessages((prev) => prev.map((m) => (m.clientId === clientId && m.pending ? { ...m, pending: false, failed } : m)));
        return false;
      }
    },
    [appointmentId, role, emitWithAck, merge],
  );

  const retryMessage = useCallback(
    (m: LocalMessage) =>
      sendMessage(m.message ?? '', m.attachments, m.clientId, {
        ...(m.messageType ? { messageType: m.messageType } : {}),
        ...(m.audioDuration != null ? { audioDuration: m.audioDuration } : {}),
      }),
    [sendMessage],
  );

  const setTyping = useCallback((isTyping: boolean) => {
    if (typingSent.current === isTyping) return;
    typingSent.current = isTyping;
    socketRef.current?.emit('typing', { isTyping });
  }, []);

  const unreadFromOther = useMemo(
    () => messages.filter((m) => m.senderType === otherRole && !m.isRead).length,
    [messages, otherRole],
  );

  const markRead = useCallback(() => {
    if (unreadFromOther === 0) return;
    // Show it right away; the server confirms with "message:read"
    setMessages((prev) => prev.map((m) => (m.senderType === otherRole ? { ...m, isRead: true } : m)));
    socketRef.current?.emit('message:read', {});
  }, [unreadFromOther, otherRole]);

  const signal = useCallback((type: RtcSignalType, payload?: unknown) => {
    socketRef.current?.emit('rtc:signal', { type, payload: payload ?? null });
  }, []);

  const onSignal = useCallback((handler: (s: RtcSignal) => void) => {
    signalHandlers.current.add(handler);
    return () => {
      signalHandlers.current.delete(handler);
    };
  }, []);

  /** Doctor: "Notify Patient I'm Waiting" (the server allows one per minute) */
  const notifyPatientWaiting = useCallback(async (): Promise<{ ok: true; retryAfter: number } | { ok: false; error: string; retryAfter?: number }> => {
    try {
      const res = await emitWithAck<{ ok: boolean; error?: string; retryAfter?: number }>('waiting:notify', {});
      if (res?.ok) return { ok: true, retryAfter: res.retryAfter ?? 60 };
      return { ok: false, error: res?.error || 'The notification was not sent. Please try again.', retryAfter: res?.retryAfter };
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      return {
        ok: false,
        error: message.startsWith('You are offline') ? 'You are offline. Reconnect, then try again.' : message || 'The notification was not sent. Please try again.',
      };
    }
  }, [emitWithAck]);

  const sendMediaState = useCallback((audio: boolean, video: boolean) => {
    socketRef.current?.emit('media:state', { audio, video });
  }, []);

  return {
    role,
    otherRole,
    status,
    error,
    presence,
    otherOnline: presence[otherRole],
    messages,
    historyLoaded,
    otherTyping,
    otherMedia,
    notices,
    ended,
    waiting,
    notifyPatientWaiting,
    unreadFromOther,
    sendMessage,
    retryMessage,
    setTyping,
    markRead,
    signal,
    onSignal,
    sendMediaState,
    notify,
  };
}

export type ConsultationRoom = ReturnType<typeof useConsultationRoom>;
