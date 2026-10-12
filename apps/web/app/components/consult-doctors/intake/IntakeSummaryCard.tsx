'use client';

import { ArrowRight, LoaderCircle, MapPin, ShieldCheck, User } from 'lucide-react';
import type { SavedAddress, Speciality } from '@/app/lib/api/consultation';
import SpecialityIcon from './SpecialityIcon';

interface Props {
  patientName: string | null;
  patientMeta: string;
  address: SavedAddress | null;
  addressLoading: boolean;
  speciality: Speciality | null;
  symptomsCount: number;
  missing: string[];
  submitting: boolean;
  uploading: boolean;
  submitError: string | null;
  onSubmit: () => void;
}

export default function IntakeSummaryCard({
  patientName,
  patientMeta,
  address,
  addressLoading,
  speciality,
  symptomsCount,
  missing,
  submitting,
  uploading,
  submitError,
  onSubmit,
}: Props) {
  const addressLine = address
    ? [address.addressLine1, address.area].filter(Boolean).join(', ')
    : null;

  return (
    <aside className="rounded-2xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-6">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-sm font-bold text-gray-900">Consultation summary</h2>
      </div>

      <dl className="divide-y divide-gray-100 px-5">
        {/* Patient */}
        <div className="flex gap-3 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <User className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Patient
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-gray-900 truncate">
              {patientName ?? <span className="font-normal text-gray-400">Not selected</span>}
            </dd>
            <dd className="text-xs text-gray-500">{patientMeta}</dd>
          </div>
        </div>

        {/* Address */}
        <div className="flex gap-3 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <MapPin className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Address
            </dt>
            {addressLoading ? (
              <dd className="mt-1 h-4 w-40 animate-pulse rounded bg-gray-100" />
            ) : address ? (
              <>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                  {address.city}
                  {address.label ? (
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                      {address.label}
                    </span>
                  ) : null}
                </dd>
                <dd className="text-xs text-gray-500 line-clamp-2">{addressLine}</dd>
              </>
            ) : (
              <dd className="mt-0.5 text-xs text-gray-500">
                No saved address. Doctors near you can&apos;t be matched until you add one.
              </dd>
            )}
          </div>
        </div>

        {/* Speciality */}
        <div className="flex gap-3 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff0ed] text-[#ff574d]">
            <SpecialityIcon iconKey={speciality?.iconUrl} slug={speciality?.slug} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Speciality
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-gray-900">
              {speciality?.name ?? <span className="font-normal text-gray-400">Not selected</span>}
            </dd>
            {symptomsCount > 0 && (
              <dd className="text-xs text-gray-500">
                {symptomsCount} symptom{symptomsCount > 1 ? 's' : ''} added
              </dd>
            )}
          </div>
        </div>
      </dl>

      <div className="border-t border-gray-100 px-5 py-4">
        {submitError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{submitError}</p>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff6f61] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#e8453b] disabled:bg-gray-300 transition"
        >
          {submitting ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" /> Saving details…
            </>
          ) : uploading ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" /> Uploading files…
            </>
          ) : (
            <>
              Proceed to consultation options <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        {missing.length > 0 && !submitting && (
          <p className="mt-2 text-center text-[11px] text-gray-500">
            Still needed: {missing.join(', ')}
          </p>
        )}

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Your details are private and shared only with your doctor
        </p>
      </div>
    </aside>
  );
}
