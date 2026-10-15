'use client';

// Message feed + input, used full-page in the text room and as the chat drawer in the video room.

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCheck,
  FileText,
  ImageIcon,
  LoaderCircle,
  Paperclip,
  RotateCcw,
  SendHorizontal,
  X,
} from 'lucide-react';
import { attachmentKind, fileUrl, uploadRoomFileApi, type UploadedChatFile } from '@/app/lib/api/consultations';
import AudioPlayerBubble from '@/app/consultations/[appointmentId]/text/components/AudioPlayerBubble';
import DocumentBubble from '@/app/consultations/[appointmentId]/text/components/DocumentBubble';
import type { ConsultationRoom, LocalMessage } from './useConsultationRoom';

const ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;
const TYPING_IDLE_MS = 2500;

const isImage = (url: string) => /\.(png|jpe?g|webp)$/i.test(url);
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

function Bubble({ m, mine, onRetry, onOpen }: { m: LocalMessage; mine: boolean; onRetry: () => void; onOpen: (url: string) => void }) {
  if (m.senderType === 'SYSTEM') {
    return (
      <li className="flex justify-center">
        <span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-medium text-slate-600">{m.message}</span>
      </li>
    );
  }
  return (
    <li className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[70%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
            mine ? 'rounded-br-md bg-[#141b34] text-white' : 'rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200'
          } ${m.failed ? 'opacity-70' : ''}`}
        >
          {m.attachments.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 ${m.message ? 'mb-1.5' : ''}`}>
              {m.attachments.map((u) =>
                isImage(u) ? (
                  <button key={u} type="button" onClick={() => onOpen(u)} className="overflow-hidden rounded-lg ring-1 ring-black/10" aria-label="Open image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileUrl(u)} alt="Shared image" className="h-28 w-28 object-cover" />
                  </button>
                ) : attachmentKind(u) === 'VOICE' ? (
                  <AudioPlayerBubble key={u} url={u} duration={m.audioDuration} mine={mine} />
                ) : (
                  <DocumentBubble key={u} url={u} mine={mine} />
                ),
              )}
            </div>
          )}
          {m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
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
        {m.failed && (
          <button type="button" onClick={onRetry} className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline">
            <RotateCcw className="h-3 w-3" /> Not sent. Tap to retry
          </button>
        )}
      </div>
    </li>
  );
}

export default function ChatPanel({
  room,
  appointmentId,
  ticket,
  otherName,
  active,
  disabled = false,
  dark = false,
}: {
  room: ConsultationRoom;
  appointmentId: string;
  ticket: string;
  otherName: string;
  /** the panel is visible: incoming messages are marked read */
  active: boolean;
  /** room closed: history only */
  disabled?: boolean;
  dark?: boolean;
}) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<(UploadedChatFile & { localUrl?: string })[]>([]);
  const [uploading, setUploading] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showShared, setShowShared] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const idleTimer = useRef<number | null>(null);

  const { messages, otherTyping, setTyping, markRead, sendMessage, retryMessage, role } = room;

  // Keep the newest message in view
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, otherTyping]);

  // Read receipts while the conversation is on screen
  useEffect(() => {
    if (!active) return;
    const mark = () => document.visibilityState === 'visible' && markRead();
    mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [active, markRead, messages.length]);

  useEffect(() => () => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
  }, []);

  const shared = useMemo(
    () => messages.flatMap((m) => m.attachments.filter((u) => attachmentKind(u) !== 'VOICE').map((u) => ({ url: u, mine: m.senderType === role }))),
    [messages, role],
  );

  const onType = (v: string) => {
    setText(v);
    if (disabled) return;
    setTyping(v.trim().length > 0);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setTyping(false), TYPING_IDLE_MS);
  };

  const pickFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setFileError(null);
    const chosen = Array.from(list).slice(0, Math.max(0, MAX_FILES - files.length));
    for (const file of chosen) {
      if (!/^(image\/(png|jpe?g|webp)|application\/pdf)$/.test(file.type)) {
        setFileError('Only PNG, JPG, WEBP images or PDF files can be shared.');
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`${file.name} is larger than 10 MB.`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const up = await uploadRoomFileApi(appointmentId, ticket, file);
        setFiles((f) => [...f, { ...up, localUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined }]);
      } catch (e) {
        setFileError(e instanceof Error ? e.message : 'Upload failed.');
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && files.length === 0) || uploading > 0 || disabled) return;
    const attachments = files.map((f) => f.fileUrl);
    setText('');
    setFiles([]);
    setTyping(false);
    inputRef.current?.focus();
    await sendMessage(body, attachments);
  };

  const canSend = !disabled && uploading === 0 && (text.trim().length > 0 || files.length > 0);

  return (
    <div className={`flex h-full min-h-0 flex-col ${dark ? 'bg-slate-50' : 'bg-[#f4f6fb]'}`}>
      {/* Shared files */}
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
                isImage(f.url) ? (
                  <button key={f.url} type="button" onClick={() => setLightbox(f.url)} className="shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileUrl(f.url)} alt="Shared image" className="h-14 w-14 object-cover" />
                  </button>
                ) : (
                  <a key={f.url} href={fileUrl(f.url)} target="_blank" rel="noreferrer" className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                    <FileText className="h-5 w-5" /> {f.url.split('.').pop()?.toUpperCase()}
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
                  <Bubble m={m} mine={m.senderType === role} onRetry={() => retryMessage(m)} onOpen={setLightbox} />
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

      {/* Files waiting to be sent */}
      {(files.length > 0 || uploading > 0 || fileError) && (
        <div className="border-t border-slate-200 bg-white px-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            {files.map((f, i) => (
              <span key={f.fileUrl} className="relative inline-flex items-center gap-1.5 rounded-lg bg-slate-100 py-1 pl-1 pr-6 text-xs text-slate-700 ring-1 ring-slate-200">
                {f.localUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.localUrl} alt="" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <FileText className="ml-1 h-4 w-4" />
                )}
                <span className="max-w-[120px] truncate">{f.fileName}</span>
                <button type="button" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-rose-600" aria-label={`Remove ${f.fileName}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {uploading > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Uploading…
              </span>
            )}
          </div>
          {fileError && (
            <p className="mt-1 text-xs text-rose-600" role="alert">
              {fileError}
            </p>
          )}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-slate-200 bg-white p-3"
      >
        <input ref={fileRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => pickFiles(e.target.files)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || files.length >= MAX_FILES}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
          aria-label="Attach a prescription image or test report"
          title="Attach image or PDF"
        >
          <Paperclip className="h-5 w-5" />
        </button>
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
          placeholder={disabled ? 'This consultation has ended.' : 'Type a message…'}
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#141b34] focus:bg-white disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff6f61] text-white shadow-sm transition hover:bg-[#e85b4d] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </form>

      {lightbox && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)} role="dialog" aria-label="Image preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(lightbox)} alt="Shared image" className="max-h-full max-w-full rounded-lg object-contain" />
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close preview">
            <X className="h-5 w-5" />
          </button>
          <a href={fileUrl(lightbox)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="absolute bottom-4 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20">
            <ImageIcon className="mr-1 inline h-4 w-4" /> Open full size
          </a>
        </div>
      )}
    </div>
  );
}
