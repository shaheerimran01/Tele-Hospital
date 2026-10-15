'use client';

// Image attachments in the chat: thumbnails, and a full-screen viewer
// (previous / next, download, Esc to close).

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { attachmentName, fileUrl } from '@/app/lib/api/consultations';

export function ImageLightbox({ images, start, onClose }: { images: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const n = images.length;
  const prev = useCallback(() => setI((x) => (x - 1 + n) % n), [n]);
  const next = useCallback(() => setI((x) => (x + 1) % n), [n]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  const url = images[i];
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label="Image viewer">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="min-w-0 truncate text-sm">
          {attachmentName(url)}
          {n > 1 && <span className="ml-2 text-white/50">{i + 1} / {n}</span>}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={fileUrl(url)}
            download
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10"
          >
            <Download className="h-4 w-4" /> Download
          </a>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close image viewer">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fileUrl(url)} alt={attachmentName(url)} className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ImageBubble({ images, onOpen }: { images: string[]; onOpen: (index: number) => void }) {
  const single = images.length === 1;
  return (
    <div className={`grid gap-1 ${single ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {images.slice(0, 4).map((url, i) => (
        <button
          key={url}
          type="button"
          onClick={() => onOpen(i)}
          className="relative overflow-hidden rounded-xl ring-1 ring-black/10"
          aria-label={`Open image ${attachmentName(url)}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl(url)}
            alt={attachmentName(url)}
            loading="lazy"
            className={single ? 'max-h-64 w-full max-w-[260px] object-cover' : 'h-28 w-28 object-cover sm:h-32 sm:w-32'}
          />
          {i === 3 && images.length > 4 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-bold text-white">+{images.length - 4}</span>
          )}
        </button>
      ))}
    </div>
  );
}
