'use client';

// Paperclip for the text consultation: pick images (JPG, PNG, WEBP) or documents
// (PDF, DOC, DOCX), check them, upload them, and show them as chips until sent.

import { useRef } from 'react';
import { FileText, LoaderCircle, Paperclip, X } from 'lucide-react';
import { uploadChatMediaApi, type UploadedMedia } from '@/app/lib/api/consultations';

export const MAX_MEDIA_FILES = 5;
export const MAX_MEDIA_BYTES = 15 * 1024 * 1024;

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp'];
const DOC_EXT = ['pdf', 'doc', 'docx'];
const ACCEPT = [...IMAGE_EXT, ...DOC_EXT].map((e) => `.${e}`).join(',');

export interface PendingMedia {
  /** local id, for the chip */
  key: string;
  name: string;
  kind: 'IMAGE' | 'DOCUMENT';
  /** set once the upload finished */
  uploaded?: UploadedMedia;
  /** object URL for image thumbnails */
  preview?: string;
  error?: string;
}

const extOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';

/** null when the file is fine, otherwise the reason it can't be sent */
export function checkMediaFile(file: File): string | null {
  const ext = extOf(file.name);
  if (!IMAGE_EXT.includes(ext) && !DOC_EXT.includes(ext)) {
    return `${file.name}: only images (JPG, PNG, WEBP) and documents (PDF, DOC, DOCX) can be shared.`;
  }
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_MEDIA_BYTES) return `${file.name} is larger than 15 MB.`;
  return null;
}

export default function MediaUploader({
  appointmentId,
  ticket,
  pending,
  onChange,
  onError,
  disabled,
}: {
  appointmentId: string;
  ticket: string;
  pending: PendingMedia[];
  /** receives an updater, because uploads finish at different times */
  onChange: (update: (prev: PendingMedia[]) => PendingMedia[]) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const full = pending.length >= MAX_MEDIA_FILES;

  const pick = (list: FileList | null) => {
    if (!list?.length) return;
    onError(null);
    const room = MAX_MEDIA_FILES - pending.length;
    const files = Array.from(list);
    if (files.length > room) onError(`You can attach up to ${MAX_MEDIA_FILES} files per message.`);
    for (const file of files.slice(0, Math.max(0, room))) {
      const problem = checkMediaFile(file);
      if (problem) {
        onError(problem);
        continue;
      }
      const kind = IMAGE_EXT.includes(extOf(file.name)) ? 'IMAGE' : 'DOCUMENT';
      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const preview = kind === 'IMAGE' ? URL.createObjectURL(file) : undefined;
      onChange((prev) => [...prev, { key, name: file.name, kind, preview }]);
      uploadChatMediaApi(appointmentId, ticket, file)
        .then((uploaded) => onChange((prev) => prev.map((p) => (p.key === key ? { ...p, uploaded } : p))))
        .catch((e) => {
          const message = e instanceof Error ? e.message : `Could not upload ${file.name}.`;
          onChange((prev) => prev.map((p) => (p.key === key ? { ...p, error: message } : p)));
          onError(message);
        });
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => pick(e.target.files)} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || full}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
        aria-label="Attach images or documents"
        title={full ? `Up to ${MAX_MEDIA_FILES} files per message` : 'Attach images or documents (PDF, DOC, DOCX)'}
      >
        <Paperclip className="h-5 w-5" />
      </button>
    </>
  );
}

/** Chips for the files waiting to be sent */
export function PendingMediaTray({
  pending,
  error,
  onRemove,
}: {
  pending: PendingMedia[];
  error: string | null;
  onRemove: (key: string) => void;
}) {
  if (pending.length === 0 && !error) return null;
  return (
    <div className="border-t border-slate-200 bg-white px-3 pt-2">
      {pending.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {pending.map((p) => (
            <span
              key={p.key}
              className={`relative inline-flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-6 text-xs ring-1 ${
                p.error ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-slate-100 text-slate-700 ring-slate-200'
              }`}
            >
              {p.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.preview} alt="" className="h-8 w-8 rounded object-cover" />
              ) : (
                <FileText className="ml-1 h-4 w-4" />
              )}
              <span className="max-w-[140px] truncate" title={p.name}>
                {p.name}
              </span>
              {!p.uploaded && !p.error && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-slate-400" aria-label="Uploading" />}
              {p.error && <span className="font-semibold">Failed</span>}
              <button
                type="button"
                onClick={() => onRemove(p.key)}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-rose-600"
                aria-label={`Remove ${p.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
