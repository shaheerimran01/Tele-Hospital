'use client';

// A shared PDF / Word document: icon, file name, size and a Download / View link.

import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { attachmentName, fileUrl } from '@/app/lib/api/consultations';

const sizeCache = new Map<string, number | null>();

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** File size from the server (HEAD request), remembered per file */
function useFileSize(url: string, known?: number) {
  const [size, setSize] = useState<number | null>(known ?? sizeCache.get(url) ?? null);
  useEffect(() => {
    if (known !== undefined || sizeCache.has(url)) return;
    let cancelled = false;
    fetch(fileUrl(url), { method: 'HEAD' })
      .then((r) => {
        const n = Number(r.headers.get('content-length'));
        const value = r.ok && Number.isFinite(n) && n > 0 ? n : null;
        sizeCache.set(url, value);
        if (!cancelled) setSize(value);
      })
      .catch(() => sizeCache.set(url, null));
    return () => {
      cancelled = true;
    };
  }, [url, known]);
  return size;
}

export default function DocumentBubble({ url, mine, size: knownSize }: { url: string; mine: boolean; size?: number }) {
  const name = attachmentName(url);
  const ext = (name.split('.').pop() ?? '').toUpperCase();
  const size = useFileSize(url, knownSize);
  const isPdf = ext === 'PDF';
  return (
    <div className={`flex w-[250px] max-w-full items-center gap-3 rounded-xl p-2.5 ${mine ? 'bg-white/10' : 'bg-slate-50 ring-1 ring-slate-200'}`}>
      <span
        className={`relative flex h-11 w-9 shrink-0 items-center justify-center rounded-md ${isPdf ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}
        aria-hidden
      >
        <FileText className="h-5 w-5" />
        <span className="absolute -bottom-1 rounded bg-current px-1 text-[8px] font-bold leading-3">
          <span className="text-white">{ext.slice(0, 4)}</span>
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${mine ? 'text-white' : 'text-slate-900'}`} title={name}>
          {name}
        </p>
        <p className={`truncate text-[11px] ${mine ? 'text-white/70' : 'text-slate-500'}`}>
          {ext} document{size ? ` · ${formatSize(size)}` : ''}
        </p>
      </div>
      <a
        href={fileUrl(url)}
        target="_blank"
        rel="noreferrer"
        download={isPdf ? undefined : name}
        className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
          mine ? 'bg-white text-[#141b34] hover:bg-white/90' : 'bg-[#141b34] text-white hover:bg-[#232c4f]'
        }`}
        aria-label={`Download or view ${name}`}
      >
        <Download className="h-3.5 w-3.5" /> {isPdf ? 'View' : 'Download'}
      </a>
    </div>
  );
}
