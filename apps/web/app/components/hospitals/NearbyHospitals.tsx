'use client';

// "Browse Hospitals Near You": hospitals sorted by distance from the patient's
// saved location, with the registered Tabibistan doctors who practise there.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ChevronRight,
  Clock,
  ExternalLink,
  Hospital,
  LoaderCircle,
  Lock,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  SearchX,
  ShieldPlus,
  Stethoscope,
} from 'lucide-react';
import { apiFileUrl } from '@/app/lib/api/doctors';
import {
  getNearbyHospitalsApi,
  hospitalDirectionsUrl,
  hospitalDoctorBookingHref,
  hospitalMapsUrl,
  hospitalOsmUrl,
  type HospitalDoctor,
  type NearbyHospital,
  type NearbyHospitalsResponse,
} from '@/app/lib/api/hospitals';
import { openPatientLogin, readPatientSession, type PatientSession } from '@/app/lib/patient-session';

const doctorName = (n: string) => (/^(dr|prof)\.?\s/i.test(n.trim()) ? n.trim() : `Dr. ${n.trim()}`);
const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;
const formatKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`);

const RADIUS_OPTIONS = [
  { value: 0, label: 'Any distance' },
  { value: 5, label: 'Within 5 km' },
  { value: 10, label: 'Within 10 km' },
  { value: 25, label: 'Within 25 km' },
  { value: 50, label: 'Within 50 km' },
];

function EmergencyBadge({ value }: { value: string | null }) {
  if (!value) return null;
  const ui =
    value === '24/7'
      ? { label: '24/7 Emergency Available', className: 'bg-red-50 text-red-700 ring-red-200' }
      : value === 'Daytime'
        ? { label: 'Daytime Emergency Only', className: 'bg-amber-50 text-amber-800 ring-amber-200' }
        : { label: 'Emergency Available', className: 'bg-orange-50 text-orange-700 ring-orange-200' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${ui.className}`}>
      <ShieldPlus className="h-3.5 w-3.5" /> {ui.label}
    </span>
  );
}

function DoctorRow({ d, intakeId }: { d: HospitalDoctor; intakeId: string | null }) {
  const name = doctorName(d.fullName);
  const speciality = d.specialisations[0] ?? d.title;
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative h-11 w-11 shrink-0">
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white text-emerald-700 ring-1 ring-emerald-200">
            {d.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={apiFileUrl(d.profilePhotoUrl)} alt={name} className="h-full w-full object-cover" />
            ) : (
              <Stethoscope className="h-5 w-5" />
            )}
          </span>
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#16a34a] text-white" title="PMDC verified">
            <BadgeCheck className="h-3 w-3" />
          </span>
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Registered Doctor Available</p>
          <p className="truncate text-sm font-bold text-gray-900">
            {name} <span className="font-medium text-gray-600">({speciality})</span>
          </p>
          <p className="truncate text-xs text-gray-600">
            {d.experienceYears} yrs experience · In-clinic {pkr(d.inPersonFee)}
            {d.matchesSpeciality && <span className="ml-1.5 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">Matches your need</span>}
          </p>
        </div>
      </div>
      <Link
        href={hospitalDoctorBookingHref(d, intakeId)}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#16a34a] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#15803d]"
      >
        Book Consultation with {name} <ArrowRight className="h-4 w-4" />
      </Link>
    </li>
  );
}

function HospitalCard({
  h,
  intakeId,
  from,
}: {
  h: NearbyHospital;
  intakeId: string | null;
  from: { latitude: number; longitude: number } | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const doctors = showAll ? h.availableDoctors : h.availableDoctors.slice(0, 2);
  const osm = hospitalOsmUrl(h);
  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-4">
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff0ed] text-[#ff574d] sm:flex">
          <Hospital className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 sm:text-lg">{h.name}</h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                {h.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {h.city}
                  </span>
                )}
                {h.type && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">
                    <Building2 className="h-3 w-3" /> {h.type}
                  </span>
                )}
              </p>
            </div>
            {h.distanceKm != null && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fff0ed] px-2.5 py-1 text-xs font-bold text-[#c2382f]">
                <Navigation className="h-3.5 w-3.5" /> {formatKm(h.distanceKm)}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <EmergencyBadge value={h.emergency} />
            {h.availableDoctors.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <BadgeCheck className="h-3.5 w-3.5" /> {h.availableDoctors.length} Tabibistan doctor{h.availableDoctors.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2 text-gray-700">
              <dt className="sr-only">Address</dt>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <dd className="min-w-0">{h.address}</dd>
            </div>
            <div className="flex items-start gap-2 text-gray-700">
              <dt className="sr-only">Contact</dt>
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <dd>
                {h.contact ? (
                  <a href={`tel:${h.contact.replace(/[^\d+]/g, '')}`} className="font-semibold text-gray-900 hover:text-[#ff6f61]">
                    {h.contact}
                  </a>
                ) : (
                  <span className="text-gray-400">Contact not listed</span>
                )}
              </dd>
            </div>
          </dl>
          {h.notes && <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">{h.notes}</p>}
        </div>
      </div>

      {h.availableDoctors.length > 0 && (
        <div className="mt-4">
          <ul className="space-y-2">
            {doctors.map((d) => (
              <DoctorRow key={d.id} d={d} intakeId={intakeId} />
            ))}
          </ul>
          {h.availableDoctors.length > 2 && (
            <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-2 text-xs font-semibold text-emerald-700 hover:underline">
              {showAll ? 'Show fewer doctors' : `Show all ${h.availableDoctors.length} doctors`}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center">
        <a
          href={hospitalMapsUrl(h)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-800 transition hover:border-gray-400 hover:bg-gray-50"
        >
          <MapPin className="h-4 w-4" /> View Hospital Details / Get Directions
        </a>
        <a
          href={hospitalDirectionsUrl(h, from)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#c2382f] hover:bg-[#fff0ed]"
        >
          <Navigation className="h-4 w-4" /> Route from my location
        </a>
        {osm && (
          <a href={osm} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 sm:ml-auto">
            OpenStreetMap <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </li>
  );
}

export default function NearbyHospitals() {
  const intakeId = useSearchParams().get('intakeId');
  const [user, setUser] = useState<PatientSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<NearbyHospitalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [radius, setRadius] = useState(0);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [withDoctors, setWithDoctors] = useState(false);

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
    if (!authChecked) return;
    // The consultation request holds the patient's location, so it needs the logged-in patient
    if (intakeId && !user) return;
    const controller = new AbortController();
    setError(null);
    getNearbyHospitalsApi({ intakeId, userId: user?.id, signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setError(e instanceof Error ? e.message : 'Could not load hospitals.');
      });
    return () => controller.abort();
  }, [authChecked, user, intakeId, reloadKey]);

  const types = useMemo(() => [...new Set((data?.hospitals ?? []).map((h) => h.type).filter((t): t is string => !!t))].sort(), [data]);

  const list = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.hospitals.filter(
      (h) =>
        (!q || h.name.toLowerCase().includes(q) || (h.city ?? '').toLowerCase().includes(q) || h.address.toLowerCase().includes(q)) &&
        (type === 'ALL' || h.type === type) &&
        (!radius || (h.distanceKm != null && h.distanceKm <= radius)) &&
        (!emergencyOnly || h.emergency === '24/7') &&
        (!withDoctors || h.availableDoctors.length > 0),
    );
  }, [data, search, type, radius, emergencyOnly, withDoctors]);

  if (authChecked && intakeId && !user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0ed] text-[#ff574d]">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-gray-900">Log in to see hospitals near you</h1>
        <button type="button" onClick={openPatientLogin} className="mt-5 rounded-xl bg-[#ff6f61] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#e8453b]">
          Log in
        </button>
      </div>
    );
  }

  const location = data?.patientLocation ?? null;
  const withDoctorCount = data?.hospitals.filter((h) => h.availableDoctors.length > 0).length ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 lg:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-gray-500">
        <Link href="/consult-doctors" className="hover:text-[#ff6f61]">
          Consult doctors
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {intakeId && (
          <>
            <Link href={`/consult-doctors/options?intakeId=${encodeURIComponent(intakeId)}`} className="hover:text-[#ff6f61]">
              Consultation options
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        )}
        <span className="font-medium text-gray-800">Hospitals near you</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Hospitals near you</h1>
          {data && (
            <p className="mt-1 text-sm text-gray-500">
              {list.length} of {data.total} hospital{data.total === 1 ? '' : 's'} shown
              {withDoctorCount > 0 && ` · ${withDoctorCount} with Tabibistan doctors you can book`}
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
              {location ? `Sorted by distance from ${location.label ?? 'your saved address'}` : 'No saved location: hospitals are listed A–Z without distance'}
            </span>
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-20 -mx-4 mt-5 border-y border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Search hospitals</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by hospital name, city or area"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/15"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Hospital type"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#ff6f61]"
            >
              <option value="ALL">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              disabled={!location}
              aria-label="Distance"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#ff6f61] disabled:opacity-50"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
              <input type="checkbox" checked={emergencyOnly} onChange={(e) => setEmergencyOnly(e.target.checked)} className="h-3.5 w-3.5" />
              24/7 emergency
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
              <input type="checkbox" checked={withDoctors} onChange={(e) => setWithDoctors(e.target.checked)} className="h-3.5 w-3.5" />
              Has Tabibistan doctors
            </label>
          </div>
        </div>
      </div>

      <div className="mt-5">
        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="inline-flex items-center gap-1 font-semibold">
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        ) : !data ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Finding hospitals near you…
          </p>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center">
            <SearchX className="h-8 w-8 text-gray-300" />
            <p className="mt-3 text-base font-semibold text-gray-900">{data.total ? 'No hospitals match these filters' : 'No hospitals listed yet'}</p>
            <p className="mt-1 text-sm text-gray-500">{data.total ? 'Clear a filter or search for another area.' : 'Please check back soon.'}</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {list.map((h) => (
              <HospitalCard key={h.id} h={h} intakeId={intakeId} from={location} />
            ))}
          </ul>
        )}
      </div>

      {data && (
        <p className="mt-6 flex items-start gap-2 text-xs text-gray-500">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          In an emergency, go to the nearest hospital or call 1122. Distances are straight-line estimates from your saved address.
        </p>
      )}
    </div>
  );
}
