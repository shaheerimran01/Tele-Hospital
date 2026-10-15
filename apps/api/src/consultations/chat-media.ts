// Media rules for the consultation chat: which files count as voice notes,
// images or documents, and how a message's type is worked out.

import { extname } from 'path';

export type ChatMessageType = 'TEXT' | 'VOICE' | 'IMAGE' | 'DOCUMENT';
export type MediaType = Exclude<ChatMessageType, 'TEXT'>;

/** File extensions accepted for each kind of attachment */
export const MEDIA_EXTENSIONS: Record<MediaType, string[]> = {
  VOICE: ['.webm', '.mp3', '.m4a', '.ogg', '.mp4', '.aac', '.wav'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.webp'],
  DOCUMENT: ['.pdf', '.doc', '.docx'],
};

/** MIME types browsers report for each kind (Chrome may label recorded audio as video/webm) */
const MEDIA_MIME: Record<MediaType, (mime: string, ext: string) => boolean> = {
  VOICE: (m) => m.startsWith('audio/') || m === 'video/webm' || m === 'video/mp4' || m === 'application/octet-stream',
  IMAGE: (m) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(m),
  DOCUMENT: (m, ext) =>
    m === 'application/pdf' ||
    m === 'application/msword' ||
    m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    // Some Windows browsers send Word files without a specific type
    (m === 'application/octet-stream' && (ext === '.doc' || ext === '.docx')),
};

export const MAX_CHAT_FILE_BYTES = 15 * 1024 * 1024;
/** Longest voice note accepted, in seconds */
export const MAX_VOICE_SECONDS = 10 * 60;
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
/** Files shared in a consultation are uploaded here (see the controller). */
export const CHAT_UPLOAD_PREFIX = '/uploads/consultation-chat/';

const baseMime = (mime: string) => (mime || '').split(';')[0].trim().toLowerCase();

/** Media kind of an uploaded file, or null when it isn't allowed. */
export function mediaTypeOfUpload(originalName: string, mime: string): MediaType | null {
  const ext = extname(originalName || '').toLowerCase();
  const m = baseMime(mime);
  for (const type of Object.keys(MEDIA_EXTENSIONS) as MediaType[]) {
    if (MEDIA_EXTENSIONS[type].includes(ext) && MEDIA_MIME[type](m, ext)) return type;
  }
  return null;
}

/** Media kind of a stored attachment URL (by its extension). */
export function mediaTypeOfUrl(url: string): MediaType | null {
  const ext = extname(url.split('?')[0]).toLowerCase();
  return (Object.keys(MEDIA_EXTENSIONS) as MediaType[]).find((t) => MEDIA_EXTENSIONS[t].includes(ext)) ?? null;
}

/**
 * Stored name: "<time>-<random>__<original-name>.<ext>", so the chat can show the
 * original file name without a database column for it.
 */
export function storedFileName(originalName: string): string {
  const ext = extname(originalName || '').toLowerCase();
  const base = (originalName || 'file')
    .slice(0, (originalName || 'file').length - ext.length)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-_ ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}__${base || 'file'}${ext}`;
}

/** "1760-123__Blood-test-report.pdf" -> "Blood-test-report.pdf" */
export function displayFileName(url: string): string {
  const file = decodeURIComponent(url.split('/').pop() ?? url);
  const i = file.indexOf('__');
  return i >= 0 ? file.slice(i + 2) : file;
}

/** "0:14" / "2:05" */
export function durationLabel(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
