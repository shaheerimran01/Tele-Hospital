'use client';

// Full-screen preview of the Tabibistan PDF (blob URL from POST /lab-prescriptions/preview).

import { useEffect } from 'react';
import { ExternalLink, FileCheck2, LoaderCircle, X } from 'lucide-react';

interface Props {
  url: string;
  orderNumber: string;
  issuing: boolean;
  onClose: () => void;
  onIssue: () => void;
}

export default function ReportPreviewModal({ url, orderNumber, issuing, onClose, onIssue }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !issuing && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [issuing, onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/70 p-0 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-teal-600 to-cyan-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 id="report-preview-title" className="text-sm font-bold text-slate-900">
              Tabibistan Report Preview
            </h2>
            <p className="text-xs text-slate-500">Order #{orderNumber} · Watermarked preview, not yet sent to the patient</p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Open in new tab</span>
          </a>
          <button type="button" onClick={onClose} disabled={issuing} aria-label="Close preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 bg-slate-100">
          <iframe src={url} title={`Report preview for order ${orderNumber}`} className="h-full w-full" />
          <p className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-white/90 px-3 py-1 text-[11px] text-slate-500 shadow-sm sm:hidden">
            If the PDF doesn&apos;t show, use the open button above.
          </p>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <button type="button" onClick={onClose} disabled={issuing} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
            Back to Editing
          </button>
          <button
            type="button"
            onClick={onIssue}
            disabled={issuing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 hover:shadow-md disabled:opacity-60"
          >
            {issuing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} Finalize &amp; Issue Report
          </button>
        </footer>
      </div>
    </div>
  );
}
