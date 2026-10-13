'use client';

import { useEffect } from 'react';
import { GraduationCap, Languages, MapPin, X } from 'lucide-react';
import type { NearbyDoctor, TimeSlot } from '@/app/lib/api/doctors';
import { DoctorAvatar, MODE_UI } from './DoctorCard';
import { clinicsWithDistance, feeFor, formatKm, formatPkr, type PatientPoint } from './list-model';

function Slots({ slots }: { slots: TimeSlot[] }) {
  if (slots.length === 0) return <p className="text-xs text-gray-400">No timings listed.</p>;
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
      {slots.map((s) => (
        <li key={s.id} className="flex justify-between gap-3">
          <span className="font-medium text-gray-700">{s.dayOfWeek}</span>
          <span className="text-gray-500">
            {s.startTime} – {s.endTime}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface Props {
  doctor: NearbyDoctor;
  patientLocation: PatientPoint | null;
  onClose: () => void;
  onBook: () => void;
}

export default function DoctorProfileModal({ doctor, patientLocation, onClose, onBook }: Props) {
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

  const modes = (['IN_CLINIC', 'VIDEO', 'TEXT'] as const).filter((m) => feeFor(doctor, m) != null);
  const clinics = clinicsWithDistance(doctor, patientLocation);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-gray-900/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-profile-title"
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-2xl sm:rounded-2xl"
      >
        <div className="flex items-start gap-4 border-b border-gray-100 p-5">
          <DoctorAvatar doctor={doctor} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 id="doctor-profile-title" className="text-xl font-bold text-gray-900">
              {doctor.fullName}
            </h2>
            <p className="text-sm font-medium text-[#e8453b]">{doctor.title}</p>
            <p className="mt-1 text-sm text-gray-600">
              {doctor.degrees} • {doctor.experienceYears} {doctor.experienceYears === 1 ? 'Year' : 'Years'}{' '}
              Experience
            </p>
            <p className="mt-1 text-xs text-gray-500">PMDC No. {doctor.pmdcNumber} · Verified</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {doctor.about && <p className="text-sm leading-relaxed text-gray-700">{doctor.about}</p>}

          <div className="flex flex-wrap gap-1.5">
            {doctor.specialisations.map((s) => (
              <span key={s} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                {s}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <p className="flex items-start gap-2 text-gray-600">
              <Languages className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /> {doctor.languages.join(', ')}
            </p>
            {doctor.education && (
              <p className="flex items-start gap-2 text-gray-600">
                <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /> {doctor.education}
              </p>
            )}
          </div>

          <section>
            <h3 className="mb-2 text-sm font-bold text-gray-900">Consultation fees</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {modes.map((m) => {
                const { label, Icon } = MODE_UI[m];
                return (
                  <div key={m} className="rounded-xl border border-gray-200 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-gray-900">
                      {m === 'IN_CLINIC' && doctor.clinics.length > 1 ? 'from ' : ''}
                      {formatPkr(feeFor(doctor, m)!)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {doctor.clinics.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-bold text-gray-900">Clinics &amp; in-person fees</h3>
              <div className="space-y-3">
                {clinics.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-xl border px-4 py-3 ${
                      c.isNearest ? 'border-[#ff6f61] bg-[#fff6f4]' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {c.name}
                        {c.distanceKm != null && (
                          <span className="ml-2 text-xs font-semibold text-[#e8453b]">
                            {c.isNearest ? 'Nearest · ' : ''}
                            {formatKm(c.distanceKm)} away
                          </span>
                        )}
                      </p>
                      <p className="text-sm font-semibold text-gray-900">{formatPkr(c.inPersonFee)}</p>
                    </div>
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-gray-500">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {c.address}
                    </p>
                    <div className="mt-2.5">
                      <Slots slots={c.schedules} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(doctor.isVideoCallEnabled || doctor.isTextConsultEnabled) && (
            <section>
              <h3 className="mb-2 text-sm font-bold text-gray-900">Online consultation hours</h3>
              <Slots slots={doctor.onlineAvailabilities} />
            </section>
          )}
        </div>

        <div className="border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onBook}
            className="w-full rounded-xl bg-[#ff6f61] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#e8453b]"
          >
            Book Consultation
          </button>
        </div>
      </div>
    </div>
  );
}
