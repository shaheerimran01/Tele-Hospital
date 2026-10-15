'use client';

// Voice note recorder for the text consultation: live timer, red recording dot,
// Discard and Send. Uses the same microphone settings as the intake voice note
// (voice processing on, plain fallback) so recordings are never silent.

import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle, Mic, SendHorizontal, Square, Trash2 } from 'lucide-react';

/** Formats browsers can record, best first (Safari only records audio/mp4) */
const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
export const MAX_VOICE_SECONDS = 5 * 60;
const MIN_VOICE_SECONDS = 1;

export interface RecordedVoice {
  file: File;
  durationSeconds: number;
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function extensionFor(mime: string) {
  const base = mime.split(';')[0];
  if (base === 'audio/mp4' || base === 'audio/x-m4a') return 'm4a';
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/mpeg') return 'mp3';
  return 'webm';
}

function micErrorMessage(e: unknown): string {
  const name = (e as Error)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Microphone access is blocked. Allow it in your browser’s site settings, then try again.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone was found on this device.';
  if (name === 'NotReadableError') return 'Your microphone is being used by another app. Close it and try again.';
  return 'Could not start the microphone. Please try again.';
}

export default function AudioRecorder({
  onSend,
  onCancel,
  disabled,
}: {
  /** upload + send; resolves when done (rejects with a message on failure) */
  onSend: (voice: RecordedVoice) => Promise<void>;
  /** recorder closed without sending */
  onCancel: () => void;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<'starting' | 'recording' | 'sending' | 'error'>('starting');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const tick = useRef<number | null>(null);
  /** what to do with the recording when the recorder stops */
  const afterStop = useRef<'send' | 'discard'>('discard');

  const cleanup = useCallback(() => {
    if (tick.current) window.clearInterval(tick.current);
    tick.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Start recording as soon as the recorder opens
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
        setError('Voice notes are not supported in this browser. Please use an up-to-date Chrome, Edge, Firefox or Safari.');
        setPhase('error');
        return;
      }
      let stream: MediaStream;
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } catch (first) {
          const name = (first as Error)?.name;
          if (name === 'NotAllowedError' || name === 'SecurityError') throw first;
          // Some laptops reject the processing options: retry with the plainest request
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } catch (e) {
        if (!cancelled) {
          setError(micErrorMessage(e));
          setPhase('error');
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const mimeType = PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
      let recorder: MediaRecorder;
      try {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch {
        setError('Could not start recording in this browser.');
        setPhase('error');
        cleanup();
        return;
      }
      recorderRef.current = recorder;
      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.current.push(e.data);
      };
      recorder.onstop = async () => {
        const duration = Math.min(MAX_VOICE_SECONDS, (Date.now() - startedAt.current) / 1000);
        cleanup();
        if (afterStop.current === 'discard') return;
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunks.current, { type });
        if (blob.size === 0 || duration < MIN_VOICE_SECONDS) {
          setError('The recording is too short. Hold on a little longer and try again.');
          setPhase('error');
          return;
        }
        const file = new File([blob], `voice-note.${extensionFor(type)}`, { type: type.split(';')[0] });
        setPhase('sending');
        try {
          await onSend({ file, durationSeconds: Math.max(1, Math.round(duration)) });
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not send the voice note.');
          setPhase('error');
        }
      };
      startedAt.current = Date.now();
      recorder.start(1000);
      setPhase('recording');
      tick.current = window.setInterval(() => {
        const s = (Date.now() - startedAt.current) / 1000;
        setSeconds(s);
        if (s >= MAX_VOICE_SECONDS && recorder.state === 'recording') {
          afterStop.current = 'send';
          recorder.stop();
        }
      }, 250);
    })();
    return () => {
      cancelled = true;
      afterStop.current = 'discard';
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      cleanup();
    };
    // onSend is read when the recording stops; restarting the mic on every render would be wrong
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup]);

  const discard = () => {
    afterStop.current = 'discard';
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    cleanup();
    onCancel();
  };

  const send = () => {
    if (recorderRef.current?.state !== 'recording') return;
    afterStop.current = 'send';
    recorderRef.current.stop();
  };

  if (phase === 'error') {
    return (
      <div className="flex flex-1 items-center gap-3 rounded-2xl bg-rose-50 px-4 py-2.5 text-xs text-rose-700 ring-1 ring-rose-200" role="alert">
        <Mic className="h-4 w-4 shrink-0" />
        <span className="flex-1">{error}</span>
        <button type="button" onClick={onCancel} className="shrink-0 font-semibold underline-offset-2 hover:underline">
          Close
        </button>
      </div>
    );
  }

  const left = MAX_VOICE_SECONDS - seconds;
  return (
    <div className="flex flex-1 items-center gap-2" role="group" aria-label="Voice note recorder">
      <button
        type="button"
        onClick={discard}
        disabled={phase === 'sending'}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
        aria-label="Discard voice note"
        title="Discard"
      >
        <Trash2 className="h-5 w-5" />
      </button>
      <div className="flex min-h-[40px] flex-1 items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 px-4">
        {phase === 'sending' ? (
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Sending voice note…
          </span>
        ) : phase === 'starting' ? (
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Starting microphone…
          </span>
        ) : (
          <>
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-600" aria-hidden />
            <span className="text-sm font-semibold tabular-nums text-rose-700" aria-live="off">
              {mmss(seconds)}
            </span>
            <span className="truncate text-xs text-slate-500">
              Recording…{left < 30 ? ` ${Math.ceil(left)}s left` : ''}
            </span>
            <Square className="ml-auto hidden h-3 w-3 text-transparent sm:block" aria-hidden />
          </>
        )}
      </div>
      <button
        type="button"
        onClick={send}
        disabled={disabled || phase !== 'recording'}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff6f61] text-white shadow-sm transition hover:bg-[#e85b4d] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Send voice note"
        title="Send"
      >
        <SendHorizontal className="h-5 w-5" />
      </button>
    </div>
  );
}
