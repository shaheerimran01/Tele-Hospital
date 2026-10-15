'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, LoaderCircle, LogOut, PhoneOff, X } from 'lucide-react';
import { endConsultationApi, type ParticipantRole } from '@/app/lib/api/consultations';

const NOTES_MAX = 5000;

/**
 * Doctor: ends the consultation for both (status becomes COMPLETED) with optional clinical notes.
 * Patient: only leaves the room; the doctor can still be waiting.
 */
export default function EndConsultationModal({
  role,
  appointmentId,
  doctorToken,
  otherName,
  onClose,
  onEnded,
  onLeave,
}: {
  role: ParticipantRole;
  appointmentId: string;
  doctorToken?: string;
  otherName: string;
  onClose: () => void;
  /** doctor: after the consultation was ended */
  onEnded: () => void;
  /** patient (or doctor stepping out without ending) */
  onLeave: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const end = async () => {
    if (!doctorToken) return;
    setBusy(true);
    setError(null);
    try {
      await endConsultationApi(appointmentId, doctorToken, notes.trim() || undefined);
      onEnded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not end the consultation.');
      setBusy(false);
    }
  };

  const doctor = role === 'DOCTOR';
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60" onClick={() => !busy && onClose()} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={doctor ? 'End consultation' : 'Leave consultation'} className="relative w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{doctor ? 'End Consultation?' : 'Leave Consultation?'}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {doctor
                ? `This ends the session for you and ${otherName} and marks the appointment as completed.`
                : `You can rejoin while the room is open. Only ${otherName} can end the consultation.`}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {doctor && (
          <div className="px-6 py-5">
            <label htmlFor="clinical-notes" className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-slate-400" /> Clinical notes <span className="font-normal text-slate-400">(optional, shared with the patient)</span>
              </span>
              <span className="font-normal text-slate-400">
                {notes.length}/{NOTES_MAX}
              </span>
            </label>
            <textarea
              id="clinical-notes"
              rows={5}
              maxLength={NOTES_MAX}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Diagnosis, advice, prescribed medicines, follow-up…"
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#141b34] focus:ring-2 focus:ring-[#141b34]/10"
            />
            {error && (
              <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        <div className={`flex flex-col-reverse gap-2 px-6 py-4 sm:flex-row sm:justify-end ${doctor ? 'border-t border-slate-100' : ''}`}>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Stay in Consultation
          </button>
          {doctor && (
            <button type="button" onClick={onLeave} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <LogOut className="h-4 w-4" /> Step Out
            </button>
          )}
          <button
            type="button"
            onClick={doctor ? end : onLeave}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}
            {doctor ? 'End Consultation' : 'Leave Consultation'}
          </button>
        </div>
      </div>
    </div>
  );
}
