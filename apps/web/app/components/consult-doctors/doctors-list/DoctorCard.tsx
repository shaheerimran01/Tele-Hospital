'use client';

import { BadgeCheck, Building2, Languages, MapPin, MessageSquareText, Star, Stethoscope, Video } from 'lucide-react';
import { apiFileUrl, type NearbyDoctor, type ServiceMode } from '@/app/lib/api/doctors';
import { clinicsWithDistance, feeFor, formatKm, formatPkr, shortAddress, type PatientPoint } from './list-model';

export const MODE_UI: Record<ServiceMode, { label: string; Icon: typeof Video }> = {
  IN_CLINIC: { label: 'In-Clinic', Icon: Building2 },
  VIDEO: { label: 'Video', Icon: Video },
  TEXT: { label: 'Text', Icon: MessageSquareText },
};

export function DoctorAvatar({ doctor, size = 'md' }: { doctor: NearbyDoctor; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-24 w-24' : 'h-20 w-20';
  return (
    <div className={`relative ${box} shrink-0`}>
      <div className="h-full w-full overflow-hidden rounded-2xl bg-gray-100">
        {doctor.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={apiFileUrl(doctor.profilePhotoUrl)} alt={doctor.fullName} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-gray-400">
            <Stethoscope className="h-7 w-7" />
          </span>
        )}
      </div>
      <span
        title="PMDC verified"
        className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#16a34a] text-white"
      >
        <BadgeCheck className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

interface Props {
  doctor: NearbyDoctor;
  patientLocation: PatientPoint | null;
  highlightMode: ServiceMode | null;
  onBook: () => void;
  onViewProfile: () => void;
}

export default function DoctorCard({ doctor, patientLocation, highlightMode, onBook, onViewProfile }: Props) {
  // In-clinic fees are listed per clinic below, so the right column only shows online modes
  const onlineModes = (['VIDEO', 'TEXT'] as const).filter((m) => feeFor(doctor, m) != null);
  const clinics = clinicsWithDistance(doctor, patientLocation);
  const clinicHighlighted = highlightMode === 'IN_CLINIC';

  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm md:flex-row">
      {/* Left: photo, verified badge, rating */}
      <div className="flex items-center gap-4 md:w-32 md:flex-col md:items-center md:text-center">
        <DoctorAvatar doctor={doctor} />
        <div className="text-xs">
          <p className="inline-flex items-center gap-1 font-semibold text-gray-500">
            <Star className="h-3.5 w-3.5" /> New
          </p>
          <p className="text-[11px] text-gray-400">No reviews yet</p>
        </div>
      </div>

      {/* Middle: who and where */}
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-bold text-gray-900">{doctor.fullName}</h3>
        <p className="text-sm font-medium text-[#e8453b]">{doctor.title}</p>
        <p className="mt-1.5 text-sm text-gray-700">
          {doctor.degrees}
          <span className="mx-1.5 text-gray-300">•</span>
          {doctor.experienceYears} {doctor.experienceYears === 1 ? 'Year' : 'Years'} Experience
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
          <Languages className="h-3.5 w-3.5" /> {doctor.languages.join(', ')}
        </p>

        {clinics.length > 0 ? (
          <div
            className={`mt-3 rounded-xl border px-3 py-2.5 ${
              clinicHighlighted ? 'border-[#ff6f61] bg-[#fff6f4]' : 'border-gray-200 bg-gray-50/60'
            }`}
          >
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <Building2 className="h-3.5 w-3.5 text-gray-500" /> Practicing Clinics &amp; In-Person Fees
            </p>
            <ul className="divide-y divide-gray-200/70">
              {clinics.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 py-1.5 text-xs">
                  <span className="flex min-w-0 items-start gap-1.5">
                    <MapPin
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${c.isNearest ? 'text-[#ff574d]' : 'text-gray-400'}`}
                    />
                    <span className="min-w-0">
                      <span className="font-semibold text-gray-900">{c.name}</span>
                      {c.isNearest && (
                        <span className="ml-1.5 rounded bg-[#ff6f61] px-1.5 py-px text-[10px] font-semibold text-white">
                          Nearest
                        </span>
                      )}
                      <span className="block text-gray-500">
                        {shortAddress(c.address)}
                        {c.distanceKm != null ? (
                          <span className="font-semibold text-[#e8453b]"> · {formatKm(c.distanceKm)} away</span>
                        ) : (
                          <span className="text-gray-400"> · distance unavailable</span>
                        )}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatPkr(c.inPersonFee)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <Video className="h-3.5 w-3.5 text-gray-400" /> Online consultations only
          </p>
        )}
      </div>

      {/* Right: fees and actions */}
      <div className="flex flex-col gap-3 md:w-56">
        {onlineModes.length > 0 && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Online consultation</p>
        )}
        <ul className="space-y-1.5">
          {onlineModes.map((m) => {
            const { label, Icon } = MODE_UI[m];
            const active = highlightMode === m;
            return (
              <li
                key={m}
                className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs ${
                  active ? 'border-[#ff6f61] bg-[#fff0ed]' : 'border-gray-200'
                }`}
              >
                <span className="flex items-center gap-1.5 text-gray-600">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
                <span className="font-semibold text-gray-900">{formatPkr(feeFor(doctor, m)!)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={onBook}
            className="w-full rounded-xl bg-[#ff6f61] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e8453b]"
          >
            Book Consultation
          </button>
          <button
            type="button"
            onClick={onViewProfile}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
          >
            View Profile
          </button>
        </div>
      </div>
    </article>
  );
}
