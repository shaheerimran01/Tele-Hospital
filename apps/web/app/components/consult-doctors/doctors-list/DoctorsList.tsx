'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, LoaderCircle, Lock, MapPin, RefreshCw, SearchX } from 'lucide-react';
import { getNearbyDoctorsApi, type NearbyDoctor, type NearbyDoctorsResponse } from '@/app/lib/api/doctors';
import { openPatientLogin, readPatientSession, type PatientSession } from '@/app/lib/patient-session';
import DoctorCard from './DoctorCard';
import DoctorProfileModal from './DoctorProfileModal';
import {
  MODE_TABS,
  PRICE_RANGES,
  SORT_OPTIONS,
  applyFilters,
  type ModeFilter,
  type PriceRange,
  type SortKey,
} from './list-model';

const selectClass =
  'w-full appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-800 outline-none transition focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/15';

export default function DoctorsList() {
  const router = useRouter();
  const intakeId = useSearchParams().get('intakeId');

  const [user, setUser] = useState<PatientSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<NearbyDoctorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allSpecialities, setAllSpecialities] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [mode, setMode] = useState<ModeFilter>('ALL');
  const [price, setPrice] = useState<PriceRange>('any');
  const [sort, setSort] = useState<SortKey>('distance');
  const [profile, setProfile] = useState<NearbyDoctor | null>(null);

  useEffect(() => {
    const sync = () => {
      setUser(readPatientSession());
      setAuthChecked(true);
    };
    sync();
    window.addEventListener('auth_state_change', sync);
    return () => window.removeEventListener('auth_state_change', sync);
  }, []);

  useEffect(() => {
    if (!user || !intakeId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getNearbyDoctorsApi({ intakeId, userId: user.id, allSpecialities, signal: controller.signal })
      .then(setData)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [user, intakeId, allSpecialities, reloadKey]);

  const doctors = useMemo(
    () => (data ? applyFilters(data.doctors, { mode, price, sort }) : []),
    [data, mode, price, sort],
  );

  const book = (doctor: NearbyDoctor) => {
    const qs = new URLSearchParams({ intakeId: intakeId ?? '', doctorId: doctor.id });
    if (mode !== 'ALL') qs.set('mode', mode);
    // Clinic visits start at the clinic nearest to the patient
    if ((mode === 'IN_CLINIC' || mode === 'ALL') && doctor.nearestClinic) qs.set('clinicId', doctor.nearestClinic.id);
    router.push(`/consult-doctors/book-appointment?${qs}`);
  };

  // ---------------------------------------------------------------------------

  if (!intakeId) {
    return (
      <Centered>
        <h1 className="text-lg font-bold text-gray-900">Start with your health details</h1>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          Tell us about the patient and the problem so we can show the right doctors.
        </p>
        <Link
          href="/consult-doctors/intake"
          className="mt-5 rounded-xl bg-[#ff6f61] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#e8453b]"
        >
          Enter patient details
        </Link>
      </Centered>
    );
  }

  if (authChecked && !user) {
    return (
      <Centered>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0ed] text-[#ff574d]">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-gray-900">Log in to see doctors near you</h1>
        <button
          type="button"
          onClick={openPatientLogin}
          className="mt-5 rounded-xl bg-[#ff6f61] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#e8453b]"
        >
          Log in
        </button>
      </Centered>
    );
  }

  const location = data?.patientLocation;
  const speciality = data?.speciality;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-gray-500">
        <Link href="/consult-doctors" className="hover:text-[#ff6f61]">
          Consult doctors
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/consult-doctors/options?intakeId=${encodeURIComponent(intakeId)}`} className="hover:text-[#ff6f61]">
          Consultation options
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-gray-800">Choose a doctor</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Doctors near you</h1>
          {data && (
            <p className="mt-1 text-sm text-gray-500">
              {speciality && !allSpecialities ? (
                <span className="mr-2 rounded-full bg-gray-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {speciality.name}
                </span>
              ) : null}
              {doctors.length} of {data.total} doctor{data.total === 1 ? '' : 's'} shown
            </p>
          )}
        </div>
        {data && (
          <span
            className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              location ? 'bg-[#fff0ed] text-[#c2382f]' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {location
                ? `Showing doctors near ${location.label ?? 'your saved address'}`
                : 'No saved location: add an address to sort doctors by distance'}
            </span>
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 z-20 -mx-4 mt-5 border-y border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Consultation type" className="flex gap-1.5 overflow-x-auto">
            {MODE_TABS.map((t) => {
              const active = mode === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMode(t.value)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 lg:w-[440px]">
            <label className="relative">
              <span className="sr-only">Price range</span>
              <select value={price} onChange={(e) => setPrice(e.target.value as PriceRange)} className={selectClass}>
                {PRICE_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </label>
            <label className="relative">
              <span className="sr-only">Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectClass}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} disabled={o.disabled}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-5 space-y-4">
        {loading && !data ? (
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-gray-200 bg-white" />
          ))
        ) : error ? (
          <Centered>
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </Centered>
        ) : data && data.total === 0 ? (
          <Centered>
            <SearchX className="h-8 w-8 text-gray-300" />
            <h2 className="mt-3 text-base font-bold text-gray-900">
              {speciality && !allSpecialities
                ? `No doctors for ${speciality.name} are available yet`
                : 'No doctors are available yet'}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              We are adding verified doctors every week. Please check back soon.
            </p>
            {speciality && !allSpecialities && (
              <button
                type="button"
                onClick={() => setAllSpecialities(true)}
                className="mt-5 rounded-xl bg-[#ff6f61] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#e8453b]"
              >
                Show doctors of all specialities
              </button>
            )}
          </Centered>
        ) : doctors.length === 0 ? (
          <Centered>
            <SearchX className="h-8 w-8 text-gray-300" />
            <h2 className="mt-3 text-base font-bold text-gray-900">No doctors match these filters</h2>
            <button
              type="button"
              onClick={() => {
                setMode('ALL');
                setPrice('any');
              }}
              className="mt-4 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Clear filters
            </button>
          </Centered>
        ) : (
          <>
            {loading && (
              <p className="flex items-center gap-2 text-xs text-gray-500">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Updating…
              </p>
            )}
            {doctors.map((d) => (
              <DoctorCard
                key={d.id}
                doctor={d}
                patientLocation={data?.patientLocation ?? null}
                highlightMode={mode === 'ALL' ? null : mode}
                onBook={() => book(d)}
                onViewProfile={() => setProfile(d)}
              />
            ))}
            {allSpecialities && speciality && (
              <button
                type="button"
                onClick={() => setAllSpecialities(false)}
                className="mx-auto block text-xs font-semibold text-[#e8453b] underline"
              >
                Show only {speciality.name}
              </button>
            )}
          </>
        )}
      </div>

      {profile && (
        <DoctorProfileModal
          doctor={profile}
          patientLocation={data?.patientLocation ?? null}
          onClose={() => setProfile(null)} onBook={() => book(profile)} />
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">{children}</div>
  );
}
