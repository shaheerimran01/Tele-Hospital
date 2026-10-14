'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  Hourglass,
  MapPin,
  MessageSquareText,
  Stethoscope,
  UserRound,
  Video,
  Wallet,
} from 'lucide-react';
import type { Appointment } from '@/app/lib/api/appointments';
import { displayDate, displayTime, formatPkr, MODE_LABELS, PAYMENT_LABELS } from './booking-model';

interface Props {
  appointment: Appointment;
}

export default function BookingSuccessModal({ appointment: a }: Props) {
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(a.appointmentNum);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the number is still visible to copy by hand
    }
  };

  const patient =
    a.patientType === 'FAMILY_MEMBER' && a.familyMember
      ? a.familyMember.fullName
      : [a.user.firstName, a.user.lastName].filter(Boolean).join(' ') || 'You';

  const mapUrl =
    a.clinic?.latitude != null && a.clinic?.longitude != null
      ? `https://www.openstreetmap.org/?mlat=${a.clinic.latitude}&mlon=${a.clinic.longitude}#map=17/${a.clinic.latitude}/${a.clinic.longitude}`
      : null;

  const date = a.appointmentDate.slice(0, 10);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <style>{`
        @keyframes tb-pop { 0% { transform: scale(.4); opacity: 0 } 60% { transform: scale(1.12); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes tb-ring { 0% { transform: scale(.6); opacity: .55 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes tb-draw { to { stroke-dashoffset: 0 } }
        @media (prefers-reduced-motion: reduce) { .tb-anim, .tb-anim * { animation: none !important; stroke-dashoffset: 0 !important } }
      `}</style>
      <div className="absolute inset-0 bg-gray-900/55" aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-success-title"
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="px-6 pb-5 pt-8 text-center">
          <div className="tb-anim relative mx-auto h-20 w-20">
            <span
              className="absolute inset-0 rounded-full bg-[#1f8a5b]/25"
              style={{ animation: 'tb-ring 1.1s ease-out 0.25s both' }}
              aria-hidden
            />
            <span
              className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#1f8a5b] shadow-lg shadow-[#1f8a5b]/30"
              style={{ animation: 'tb-pop 0.5s cubic-bezier(.2,.8,.3,1.2) both' }}
            >
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={24} strokeDashoffset={24} style={{ animation: 'tb-draw 0.4s ease-out 0.35s forwards' }} />
              </svg>
            </span>
          </div>
          <h2 id="booking-success-title" className="mt-5 text-xl font-extrabold text-gray-900">
            Appointment booked
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Your request has been sent to {a.doctor.fullName}.
          </p>
          <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#fdf4e3] px-3 py-1 text-xs font-semibold text-[#8a6416]">
            <Hourglass className="h-3.5 w-3.5" /> Waiting for the doctor to confirm
          </p>
        </div>

        {/* Appointment number */}
        <div className="mx-6 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Appointment number</p>
            <p className="mt-0.5 font-mono text-lg font-bold tracking-wide text-gray-900">{a.appointmentNum}</p>
          </div>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-300"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#1f8a5b]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Receipt */}
        <dl className="mx-6 mt-4 divide-y divide-gray-100 text-sm">
          <Row Icon={CalendarDays} label="Date & time">
            {displayDate(date, true)}
            <span className="block text-xs font-normal text-gray-500">
              {displayTime(a.startTime)} – {displayTime(a.endTime)}
            </span>
          </Row>
          <Row Icon={Stethoscope} label="Doctor">
            {a.doctor.fullName}
            <span className="block text-xs font-normal text-gray-500">{a.doctor.specialisations[0] ?? a.doctor.title}</span>
          </Row>
          <Row
            Icon={a.serviceMode === 'VIDEO' ? Video : a.serviceMode === 'TEXT' ? MessageSquareText : MapPin}
            label={a.serviceMode === 'IN_CLINIC' ? 'Clinic' : 'Consultation'}
          >
            {a.clinic ? (
              <>
                {a.clinic.name}
                <span className="block text-xs font-normal text-gray-500">{a.clinic.address}</span>
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#e8453b] hover:underline"
                  >
                    Open in map <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </>
            ) : (
              MODE_LABELS[a.serviceMode]
            )}
          </Row>
          <Row Icon={UserRound} label="Patient">
            {patient}
          </Row>
          <Row Icon={Wallet} label="Payment">
            {formatPkr(a.fee)}
            <span className="block text-xs font-normal text-gray-500">
              {a.paymentMethod ? PAYMENT_LABELS[a.paymentMethod] : '—'} · Not paid yet
            </span>
          </Row>
        </dl>

        {/* Actions */}
        <div className="flex flex-col gap-2 p-6">
          <Link
            data-autofocus
            href="/consult-doctors/my-appointments"
            className="inline-flex items-center justify-center rounded-xl bg-[#ff6f61] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e8453b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6f61] focus-visible:ring-offset-2"
          >
            View My Appointments
          </Link>
          <Link
            href="/consult-doctors"
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-gray-400"
          >
            Back to Consult Doctors
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ Icon, label, children }: { Icon: typeof Check; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <dt className="w-24 shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1 font-semibold text-gray-900">{children}</dd>
    </div>
  );
}
