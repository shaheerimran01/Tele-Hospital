'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  CheckCheck,
  LoaderCircle,
  Quote,
  RotateCcw,
  Stethoscope,
  UserRoundCog,
  X,
} from 'lucide-react';
import {
  fetchReassignOptions,
  reassignAppointment,
  refundAppointment,
  resolveAppointmentCase,
  type CaseRow,
  type ReassignOptions,
} from '@/lib/api/doctorPortal';
import { ResolutionActions } from './ResolutionActions';
import { usePortal } from './portal-context';
import {
  AppointmentStatusBadge,
  appointmentDay,
  displayTime,
  EmptyState,
  ModeBadge,
  PatientTypeBadge,
  PaymentBadge,
  pkr,
} from './ui';

type Busy = 'resolve' | 'refund' | null;

const btn =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50';

/** Cards for appointments a doctor declined or rescheduled, with the admin follow-up actions. */
export default function DoctorActionCases({ rows, onChanged }: { rows: CaseRow[]; onChanged: () => void }) {
  const { reloadCounts } = usePortal();
  const [busy, setBusy] = useState<Record<string, Busy>>({});
  const [messages, setMessages] = useState<Record<string, { tone: 'ok' | 'error'; text: string }>>({});
  const [reassigning, setReassigning] = useState<CaseRow | null>(null);

  const run = async (row: CaseRow, kind: Exclude<Busy, null>, task: () => Promise<unknown>, ok: string) => {
    setBusy((b) => ({ ...b, [row.id]: kind }));
    setMessages((m) => {
      const next = { ...m };
      delete next[row.id];
      return next;
    });
    try {
      await task();
      setMessages((m) => ({ ...m, [row.id]: { tone: 'ok', text: ok } }));
      reloadCounts();
      onChanged();
    } catch (e) {
      setMessages((m) => ({ ...m, [row.id]: { tone: 'error', text: e instanceof Error ? e.message : 'Something went wrong.' } }));
    } finally {
      setBusy((b) => ({ ...b, [row.id]: null }));
    }
  };

  if (rows.length === 0) {
    return <EmptyState title="No open cases" text="Appointments that doctors decline or reschedule appear here with their reason." />;
  }

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {rows.map((a) => {
          const declined = a.status === 'CANCELLED';
          const byPatient = a.cancelReason?.startsWith('The patient ') ?? false;
          const caseLabel = a.cancelReason?.startsWith('The patient declined')
            ? 'Patient wants another doctor'
            : a.cancelReason?.startsWith('The patient asked')
              ? 'Patient picked a new time'
              : declined
                ? 'Declined by doctor'
                : 'Rescheduled by doctor';
          const paid = a.paymentStatus === 'PAID';
          const b = busy[a.id] ?? null;
          const msg = messages[a.id];
          return (
            <li key={a.id} className={`px-5 py-5 ${a.caseOpen ? '' : 'bg-slate-50/60'}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/doctor-dashboard/appointments/${a.id}`} className="font-mono text-sm font-semibold text-blue-700 hover:underline">
                      {a.appointmentNum}
                    </Link>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                        declined ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-violet-50 text-violet-700 ring-violet-200'
                      }`}
                    >
                      {caseLabel}
                    </span>
                    <AppointmentStatusBadge status={a.status} />
                    {!a.caseOpen && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <CheckCheck className="h-3.5 w-3.5" /> Resolved
                      </span>
                    )}
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                    <div className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Patient</dt>
                      <dd className="truncate text-slate-900">{a.patientName}</dd>
                      <dd className="mt-0.5 flex items-center gap-1.5">
                        <PatientTypeBadge type={a.patientType} />
                        {a.user?.phone && <span className="text-xs text-slate-500">{a.user.phone}</span>}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Doctor</dt>
                      <dd className="truncate">
                        <Link href={`/doctor-dashboard/doctors/${a.doctor.id}`} className="text-slate-900 hover:text-blue-700">
                          {a.doctor.fullName}
                        </Link>
                      </dd>
                      <dd className="truncate text-xs text-slate-500">{a.doctor.specialisations[0] ?? a.doctor.title}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {declined ? 'Was booked for' : 'New time'}
                      </dt>
                      <dd className="text-slate-900">{appointmentDay(a.appointmentDate)}</dd>
                      <dd className="text-xs text-slate-500">
                        {displayTime(a.startTime)} · <ModeBadge mode={a.serviceMode} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Fee</dt>
                      <dd className="text-slate-900">{pkr(a.fee)}</dd>
                      <dd>
                        <PaymentBadge status={a.paymentStatus} />
                      </dd>
                    </div>
                  </dl>

                  <blockquote className="mt-3 flex gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <Quote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      <span className="font-semibold text-slate-900">{byPatient ? 'Note' : 'Doctor\u2019s reason / note'}: </span>
                      {a.cancelReason}
                    </span>
                  </blockquote>

                  <div className="mt-3">
                    <ResolutionActions
                      appointmentId={a.id}
                      stage={a.stage}
                      forwardedAt={a.forwardedAt}
                      recommendedAt={a.recommendedAt}
                      onDone={(text) => {
                        setMessages((m) => ({ ...m, [a.id]: { tone: 'ok', text } }));
                        reloadCounts();
                        onChanged();
                      }}
                    />
                  </div>

                  {msg && (
                    <p
                      role="status"
                      className={`mt-3 rounded-md px-3 py-2 text-xs ${msg.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}
                    >
                      {msg.text}
                    </p>
                  )}
                </div>

                {/* Admin actions */}
                <div className="flex shrink-0 flex-row flex-wrap gap-2 lg:w-[190px] lg:flex-col">
                  <button
                    type="button"
                    onClick={() => setReassigning(a)}
                    disabled={b !== null}
                    className={`${btn} bg-slate-900 text-white hover:bg-slate-800`}
                  >
                    <UserRoundCog className="h-4 w-4" /> Reassign Doctor
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      run(
                        a,
                        'resolve',
                        () => resolveAppointmentCase(a.id),
                        declined ? 'Case marked resolved.' : 'New time accepted. The appointment is now confirmed.',
                      )
                    }
                    disabled={b !== null || !a.caseOpen}
                    title={a.caseOpen ? undefined : 'Already resolved'}
                    className={`${btn} border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50`}
                  >
                    {b === 'resolve' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                    {declined ? 'Mark Resolved' : 'Accept & Resolve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => run(a, 'refund', () => refundAppointment(a.id), 'Refund recorded and the patient was notified.')}
                    disabled={b !== null || !paid}
                    title={
                      a.paymentStatus === 'REFUNDED'
                        ? 'Already refunded'
                        : paid
                          ? undefined
                          : 'Not paid yet, so there is nothing to refund'
                    }
                    className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                  >
                    {b === 'refund' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    {a.paymentStatus === 'REFUNDED' ? 'Refunded' : 'Process Refund'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {reassigning && (
        <ReassignModal
          row={reassigning}
          onClose={() => setReassigning(null)}
          onDone={(text) => {
            setMessages((m) => ({ ...m, [reassigning.id]: { tone: 'ok', text } }));
            setReassigning(null);
            reloadCounts();
            onChanged();
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Reassign: pick another doctor who is free at the same time
// ---------------------------------------------------------------------------

function ReassignModal({ row, onClose, onDone }: { row: CaseRow; onClose: () => void; onDone: (message: string) => void }) {
  const [data, setData] = useState<ReassignOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<{ doctorId: string; clinicId: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchReassignOptions(row.id)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load doctors.'));
    return () => {
      cancelled = true;
    };
  }, [row.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const save = async () => {
    if (!choice) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await reassignAppointment(row.id, choice.doctorId, choice.clinicId);
      onDone(`Reassigned to ${updated.doctor.fullName}. Waiting for the new doctor to confirm; the patient was notified.`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not reassign.');
      setSaving(false);
    }
  };

  const available = data?.doctors.filter((d) => d.options.some((o) => o.available)) ?? [];
  const busyDoctors = data?.doctors.filter((d) => !d.options.some((o) => o.available)) ?? [];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !saving && onClose()} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Reassign doctor" className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Reassign Doctor</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {row.appointmentNum} · {row.patientName} · {appointmentDay(row.appointmentDate, true)}, {displayTime(row.startTime)}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error ? (
            <p className="text-sm text-rose-700">{error}</p>
          ) : !data ? (
            <p className="flex items-center gap-2 py-8 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Checking which doctors are free at this time…
            </p>
          ) : (
            <>
              {data.dateProblem && (
                <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {data.dateProblem}. A doctor can only take the booking at its original date and time, so reassigning isn&apos;t possible.
                </p>
              )}
              <p className="mb-3 text-xs text-slate-500">
                Same date and time, {data.serviceMode === 'IN_CLINIC' ? 'in-clinic' : data.serviceMode === 'VIDEO' ? 'video call' : 'text consult'}
                {data.speciality ? ` · speciality: ${data.speciality}` : ''}. The new doctor will need to confirm.
              </p>
              {available.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-600">
                  No other approved doctor is free at this time{data.doctors.length ? '' : ' or offers this consultation type'}.
                </p>
              ) : (
                <ul className="space-y-2" role="radiogroup" aria-label="Doctors">
                  {available.map((d) =>
                    d.options
                      .filter((o) => o.available)
                      .map((o) => {
                        const active = choice?.doctorId === d.doctorId && choice.clinicId === o.clinicId;
                        return (
                          <li key={`${d.doctorId}-${o.clinicId ?? 'online'}`}>
                            <button
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => setChoice({ doctorId: d.doctorId, clinicId: o.clinicId })}
                              className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition ${
                                active ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                                  {d.fullName}
                                  {d.matchesSpeciality && (
                                    <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">
                                      Same speciality
                                    </span>
                                  )}
                                </span>
                                <span className="block text-xs text-slate-500">
                                  {d.specialisations.slice(0, 2).join(', ') || d.title} · {d.experienceYears} yrs
                                </span>
                                {o.clinicName && (
                                  <span className="block truncate text-xs text-slate-500">
                                    {o.clinicName} · {o.address}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-sm font-semibold text-slate-900">{pkr(o.fee)}</span>
                            </button>
                          </li>
                        );
                      }),
                  )}
                </ul>
              )}
              {busyDoctors.length > 0 && (
                <p className="mt-3 text-xs text-slate-400">
                  {busyDoctors.length} other {busyDoctors.length === 1 ? 'doctor is' : 'doctors are'} not free at this time.
                </p>
              )}
              {choice && (
                <p className="mt-3 text-xs text-slate-500">
                  The fee changes to the new doctor&apos;s fee. The current fee is {pkr(row.fee)}.
                </p>
              )}
            </>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          {saveError && (
            <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {saveError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!choice || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Reassign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
