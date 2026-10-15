'use client';

// Message feed + input for the TEXT consultation room: text, voice notes,
// images and documents. (The video room keeps its own simpler chat drawer.)

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, FileText, LoaderCircle, Mic, Paperclip, RotateCcw, SendHorizontal } from 'lucide-react';
import { attachmentKind, attachmentName, fileUrl, uploadChatMediaApi } from '@/app/lib/api/consultations';
import type { ConsultationRoom, LocalMessage } from '@/app/components/consultations/useConsultationRoom';
import AudioPlayerBubble from './AudioPlayerBubble';
import AudioRecorder, { type RecordedVoice } from './AudioRecorder';
import DocumentBubble from './DocumentBubble';
import ImageBubble, { ImageLightbox } from './ImageBubble';
import MediaUploader, { PendingMediaTray, type PendingMedia } from './MediaUploader';

const TYPING_IDLE_MS = 2500;

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** What a message holds, whether or not the server sent messageType (older messages) */
function partsOf(m: LocalMessage) {
  const voice = m.attachments.filter((u) => attachmentKind(u) === 'VOICE');
  const images = m.attachments.filter((u) => attachmentKind(u) === 'IMAGE');
  const docs = m.attachments.filter((u) => attachmentKind(u) === 'DOCUMENT');
  return { voice, images, docs };
}

/** One chat bubble (text, voice note, images, documents). Also used read-only in the session summary. */
export function MessageBubble({
  m,
  mine,
  onRetry,
  onOpenImage,
  senderLabel,
}: {
  m: LocalMessage;
  mine: boolean;
  onRetry?: () => void;
  onOpenImage: (images: string[], index: number) => void;
  /** shown above the bubble (summary view) */
  senderLabel?: string;
}) {
  if (m.senderType === 'SYSTEM') {
    return (
      <li className="flex justify-center">
        <span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-medium text-slate-600">{m.message}</span>
      </li>
    );
  }
  const { voice, images, docs } = partsOf(m);
  const mediaOnly = !m.message && images.length > 0 && voice.length === 0 && docs.length === 0;
  return (
    <li className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] flex-col sm:max-w-[70%] ${mine ? 'items-end' : 'items-start'}`}>
        {senderLabel && <span className="mb-0.5 px-1 text-[11px] font-semibold text-slate-500">{senderLabel}</span>}
        <div
          className={`rounded-2xl text-sm leading-relaxed shadow-sm ${mediaOnly ? 'p-1' : 'px-3.5 py-2'} ${
            mine ? 'rounded-br-md bg-[#141b34] text-white' : 'rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200'
          } ${m.failed ? 'opacity-70' : ''}`}
        >
          {voice.map((u) => (
            <AudioPlayerBubble key={u} url={u} duration={m.audioDuration} mine={mine} />
          ))}
          {images.length > 0 && <ImageBubble images={images} onOpen={(i) => onOpenImage(images, i)} />}
          {docs.length > 0 && (
            <div className={`flex flex-col gap-1.5 ${images.length ? 'mt-1.5' : ''}`}>
              {docs.map((u) => (
                <DocumentBubble key={u} url={u} mine={mine} />
              ))}
            </div>
          )}
          {m.message && <p className={`whitespace-pre-wrap break-words ${m.attachments.length ? 'mt-1.5 px-1' : ''}`}>{m.message}</p>}
        </div>
        <span className="mt-1 flex items-center gap-1 px-1 text-[10px] text-slate-400">
          {timeOf(m.createdAt)}
          {mine &&
            (m.pending ? (
              <LoaderCircle className="h-3 w-3 animate-spin" aria-label="Sending" />
            ) : m.failed ? null : m.isRead ? (
              <CheckCheck className="h-3.5 w-3.5 text-sky-500" aria-label="Read" />
            ) : (
              <Check className="h-3.5 w-3.5" aria-label="Delivered" />
            ))}
        </span>
        {m.failed && onRetry && (
          <button type="button" onClick={onRetry} className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline">
            <RotateCcw className="h-3 w-3" /> Not sent. Tap to retry
          </button>
        )}
      </div>
    </li>
  );
}

export default function TextChatPanel({
  room,
  appointmentId,
  ticket,
  otherName,
  disabled = false,
}: {
  room: ConsultationRoom;
  appointmentId: string;
  ticket: string;
  otherName: string;
  /** room closed: history only */
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState<PendingMedia[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [showShared, setShowShared] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const idleTimer = useRef<number | null>(null);

  const { messages, otherTyping, setTyping, markRead, sendMessage, retryMessage, role } = room;

  // Keep the newest message in view
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, otherTyping]);

  // Read receipts while the conversation is on screen
  useEffect(() => {
    const mark = () => document.visibilityState === 'visible' && markRead();
    mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [markRead, messages.length]);

  useEffect(() => () => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
  }, []);

  // The recorder can't stay open once the room closes
  useEffect(() => {
    if (disabled) setRecording(false);
  }, [disabled]);

  const shared = useMemo(
    () =>
      messages.flatMap((m) =>
        m.pending || m.failed ? [] : m.attachments.filter((u) => attachmentKind(u) !== 'VOICE').map((url) => ({ url, kind: attachmentKind(url) })),
      ),
    [messages],
  );
  const sharedImages = useMemo(() => shared.filter((f) => f.kind === 'IMAGE').map((f) => f.url), [shared]);

  const onType = (v: string) => {
    setText(v);
    if (disabled) return;
    setTyping(v.trim().length > 0);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setTyping(false), TYPING_IDLE_MS);
  };

  const removePending = (key: string) =>
    setPending((prev) => {
      const gone = prev.find((p) => p.key === key);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      const next = prev.filter((p) => p.key !== key);
      if (!next.some((p) => p.error)) setMediaError(null);
      return next;
    });

  const uploading = pending.some((p) => !p.uploaded && !p.error);
  const ready = pending.filter((p) => p.uploaded);
  const hasContent = text.trim().length > 0 || ready.length > 0;
  const canSend = !disabled && !uploading && hasContent;

  const send = async () => {
    if (!canSend) return;
    const caption = text.trim();
    const images = ready.filter((p) => p.kind === 'IMAGE').map((p) => p.uploaded!.fileUrl);
    const docs = ready.filter((p) => p.kind === 'DOCUMENT').map((p) => p.uploaded!.fileUrl);
    pending.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
    setText('');
    setPending([]);
    setMediaError(null);
    setTyping(false);
    inputRef.current?.focus();

    if (images.length === 0 && docs.length === 0) {
      await sendMessage(caption, [], undefined, { messageType: 'TEXT' });
      return;
    }
    // All images go in one message (with the caption); each document is its own message
    let captionUsed = false;
    if (images.length) {
      captionUsed = true;
      await sendMessage(caption, images, undefined, { messageType: 'IMAGE' });
    }
    for (const url of docs) {
      const withCaption = !captionUsed ? caption : '';
      captionUsed = true;
      await sendMessage(withCaption, [url], undefined, { messageType: 'DOCUMENT' });
    }
  };

  const sendVoice = async ({ file, durationSeconds }: RecordedVoice) => {
    const up = await uploadChatMediaApi(appointmentId, ticket, file, durationSeconds);
    setRecording(false);
    await sendMessage('', [up.fileUrl], undefined, { messageType: 'VOICE', audioDuration: up.audioDuration ?? durationSeconds });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f6fb]">
      {/* Shared images and documents */}
      {shared.length > 0 && (
        <div className="border-b border-slate-200 bg-white px-3 py-2">
          <button type="button" onClick={() => setShowShared((s) => !s)} className="flex w-full items-center justify-between text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" /> Shared files ({shared.length})
            </span>
            <span className="text-slate-400">{showShared ? 'Hide' : 'Show'}</span>
          </button>
          {showShared && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {shared.map((f) =>
                f.kind === 'IMAGE' ? (
                  <button
                    key={f.url}
                    type="button"
                    onClick={() => setLightbox({ images: sharedImages, index: sharedImages.indexOf(f.url) })}
                    className="shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200"
                    aria-label={`Open ${attachmentName(f.url)}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileUrl(f.url)} alt={attachmentName(f.url)} className="h-14 w-14 object-cover" />
                  </button>
                ) : (
                  <a
                    key={f.url}
                    href={fileUrl(f.url)}
                    target="_blank"
                    rel="noreferrer"
                    title={attachmentName(f.url)}
                    className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-[10px] font-semibold uppercase text-slate-600 ring-1 ring-slate-200"
                  >
                    <FileText className="h-5 w-5" /> {attachmentName(f.url).split('.').pop()}
                  </a>
                ),
              )}
            </div>
          )}
        </div>
      )}

      {/* Feed */}
      <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite">
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-400">
            {room.historyLoaded ? `No messages yet. Say hello to ${otherName}.` : 'Loading conversation…'}
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) => {
              const newDay = i === 0 || dayOf(messages[i - 1].createdAt) !== dayOf(m.createdAt);
              return (
                <Fragment key={m.clientId ?? m.id}>
                  {newDay && (
                    <li className="my-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400" aria-hidden>
                      {dayOf(m.createdAt)}
                    </li>
                  )}
                  <MessageBubble
                    m={m}
                    mine={m.senderType === role}
                    onRetry={() => retryMessage(m)}
                    onOpenImage={(images, index) => setLightbox({ images, index })}
                  />
                </Fragment>
              );
            })}
          </ul>
        )}
        {otherTyping && (
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500" aria-live="polite">
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
            </span>
            {otherName} is typing…
          </p>
        )}
      </div>

      <PendingMediaTray pending={pending} error={mediaError} onRemove={removePending} />

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-slate-200 bg-white p-3"
      >
        {recording ? (
          <AudioRecorder onSend={sendVoice} onCancel={() => setRecording(false)} disabled={disabled} />
        ) : (
          <>
            <MediaUploader
              appointmentId={appointmentId}
              ticket={ticket}
              pending={pending}
              onChange={setPending}
              onError={setMediaError}
              disabled={disabled}
            />
            <label htmlFor={`chat-input-${appointmentId}`} className="sr-only">
              Message
            </label>
            <textarea
              id={`chat-input-${appointmentId}`}
              ref={inputRef}
              rows={1}
              value={text}
              disabled={disabled}
              maxLength={4000}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={disabled ? 'This consultation has ended.' : pending.length ? 'Add a caption…' : 'Type a message…'}
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#141b34] focus:bg-white disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => {
                setMediaError(null);
                setRecording(true);
              }}
              disabled={disabled}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Record a voice note"
              title="Record a voice note"
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              type="submit"
              disabled={!canSend}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff6f61] text-white shadow-sm transition hover:bg-[#e85b4d] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={uploading ? 'Waiting for uploads to finish' : 'Send message'}
              title={uploading ? 'Waiting for uploads to finish' : 'Send'}
            >
              {uploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
            </button>
          </>
        )}
      </form>

      {lightbox && <ImageLightbox images={lightbox.images} start={Math.max(0, lightbox.index)} onClose={() => setLightbox(null)} />}
    </div>
  );
}
