'use client';

// "View Chat Summary" for a completed text consultation, opened from the doctor's
// Appointments page. Shows the same summary the patient sees at /consultations/:id:
// doctor's notes, the full chat (voice notes, images, documents) and shared files.

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink, X } from 'lucide-react';
import type { Viewer } from '@/app/lib/api/consultations';
import TextSessionSummary from '@/app/consultations/[appointmentId]/text/components/TextSessionSummary';

export default function TextSummaryModal({
  appointmentId,
  appointmentNum,
  patientName,
  token,
  onClose,
}: {
  appointmentId: string;
  appointmentNum: string;
  patientName: string;
  /** doctor login token */
  token: string;
  onClose: () => void;
}) {
  const viewer = useMemo<Viewer>(() => ({ role: 'DOCTOR', token }), [token]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#141b34]/50 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Chat summary for ${patientName}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#efece5] px-5 py-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-[#141b34]">Chat Summary</p>
            <p className="truncate text-xs text-[#6b6f80]">
              {patientName} · <span className="font-mono">{appointmentNum}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`/consultations/${encodeURIComponent(appointmentId)}?as=doctor`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#3a4366] hover:bg-[#f4f5fa]"
              title="Open the full summary page in a new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Open page</span>
            </Link>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#6b6f80] hover:bg-[#f4f5fa] hover:text-[#141b34]" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <TextSessionSummary appointmentId={appointmentId} viewer={viewer} defaultConversationOpen />
        </div>
      </div>
    </div>
  );
}
