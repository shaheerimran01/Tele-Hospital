'use client';

import { use, useState } from 'react';
import {
  Ban,
  BadgeCheck,
  ExternalLink,
  FileText,
  Hourglass,
  Languages,
  LoaderCircle,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Video,
} from 'lucide-react';
import {
  fetchDoctor,
  fileUrl,
  updateDoctorStatus,
  type DoctorStatus,
  type TimeSlot,
} from '@/lib/api/doctorPortal';
import { usePortal, usePortalData } from '../../_components/portal-context';
import AppointmentsTable from '../../_components/AppointmentsTable';
import {
  Avatar,
  Card,
  DoctorStatusBadge,
  ErrorState,
  formatDate,
  InfoList,
  LoadingState,
  PageHeader,
  pkr,
} from '../../_components/ui';

function Schedule({ slots }: { slots: TimeSlot[] }) {
  if (slots.length === 0) return <p className="text-sm text-slate-400">No weekly hours added.</p>;
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      {slots.map((s) => (
        <li key={s.id} className="flex justify-between gap-3">
          <span className="font-medium text-slate-700">{s.dayOfWeek}</span>
          <span className="tabular-nums text-slate-500">
            {s.startTime} – {s.endTime}
          </span>
        </li>
      ))}
    </ul>
  );
}

const ACTIONS: { status: DoctorStatus; label: string; Icon: typeof Ban; className: string }[] = [
  { status: 'APPROVED', label: 'Approve Doctor', Icon: BadgeCheck, className: 'bg-emerald-600 text-white hover:bg-emerald-700' },
  { status: 'PENDING', label: 'Mark Pending', Icon: Hourglass, className: 'border border-amber-300 bg-white text-amber-800 hover:bg-amber-50' },
  { status: 'REJECTED', label: 'Reject', Icon: Ban, className: 'border border-rose-300 bg-white text-rose-700 hover:bg-rose-50' },
];

export default function DoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { reloadCounts } = usePortal();
  const { data: doctor, setData, error, reload } = usePortalData(() => fetchDoctor(id), [id]);
  const [saving, setSaving] = useState<DoctorStatus | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const changeStatus = async (status: DoctorStatus) => {
    if (status === 'REJECTED' && !confirmReject) {
      setConfirmReject(true);
      return;
    }
    setSaving(status);
    setMessage(null);
    setConfirmReject(false);
    try {
      const updated = await updateDoctorStatus(id, status);
      setData(updated);
      reloadCounts();
      const text = {
        APPROVED: 'Doctor approved. Their profile is now visible to patients.',
        PENDING: 'Doctor moved back to pending review. Patients cannot book them until approved.',
        REJECTED: 'Doctor rejected. Their profile is hidden from patients.',
      }[status];
      setMessage({ tone: 'ok', text });
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Could not update the status.' });
    } finally {
      setSaving(null);
    }
  };

  if (!doctor) {
    return (
      <>
        <PageHeader title="Doctor Profile" back={{ href: '/doctor-dashboard/doctors', label: 'All doctors' }} />
        <Card padded={false}>{error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState text="Loading doctor…" />}</Card>
      </>
    );
  }

  const certificate = doctor.pmdcCertificateUrl ? fileUrl(doctor.pmdcCertificateUrl) : null;
  const certificateIsPdf = certificate ? /\.pdf($|\?)/i.test(certificate) : false;
  const counts = doctor.appointmentStatusCounts;

  return (
    <>
      <PageHeader title="Doctor Profile" back={{ href: '/doctor-dashboard/doctors', label: 'All doctors' }} />

      {/* Header card */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={doctor.fullName} src={doctor.profilePhotoUrl ? fileUrl(doctor.profilePhotoUrl) : null} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{doctor.fullName}</h2>
                <DoctorStatusBadge status={doctor.status} />
                {!doctor.isActive && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Inactive</span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-slate-600">{doctor.title}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">PMDC {doctor.pmdcNumber}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                <a href={`tel:${doctor.phone}`} className="inline-flex items-center gap-1.5 hover:text-slate-900">
                  <Phone className="h-4 w-4 text-slate-400" /> {doctor.phone}
                </a>
                {doctor.email && (
                  <a href={`mailto:${doctor.email}`} className="inline-flex items-center gap-1.5 hover:text-slate-900">
                    <Mail className="h-4 w-4 text-slate-400" /> {doctor.email}
                  </a>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Registered {formatDate(doctor.createdAt)} · {doctor._count.appointments}{' '}
                {doctor._count.appointments === 1 ? 'appointment' : 'appointments'}
              </p>
            </div>
          </div>

          {/* Approval controls */}
          <div className="w-full shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:w-[300px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin approval</p>
            <div className="mt-3 flex flex-col gap-2">
              {ACTIONS.map((a) => {
                const current = doctor.status === a.status;
                const confirming = a.status === 'REJECTED' && confirmReject;
                return (
                  <button
                    key={a.status}
                    type="button"
                    onClick={() => changeStatus(a.status)}
                    disabled={current || saving !== null}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      confirming ? 'bg-rose-600 text-white hover:bg-rose-700' : a.className
                    }`}
                  >
                    {saving === a.status ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <a.Icon className="h-4 w-4" />}
                    {current ? `${a.label} (current)` : confirming ? 'Click again to confirm rejection' : a.label}
                  </button>
                );
              })}
              {confirmReject && (
                <button type="button" onClick={() => setConfirmReject(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                  Cancel
                </button>
              )}
            </div>
            {message && (
              <p
                role="status"
                className={`mt-3 rounded-md px-3 py-2 text-xs ${
                  message.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Personal & Qualifications">
            <InfoList
              items={[
                ['Degrees', doctor.degrees],
                ['Experience', `${doctor.experienceYears} ${doctor.experienceYears === 1 ? 'year' : 'years'}`],
                ['Education', doctor.education || '—'],
                [
                  'Languages',
                  <span key="l" className="inline-flex items-center gap-1.5">
                    <Languages className="h-4 w-4 text-slate-400" /> {doctor.languages.join(', ') || '—'}
                  </span>,
                ],
              ]}
            />
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Specialities</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {doctor.specialisations.map((s) => (
                  <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">About</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{doctor.about || 'No bio added.'}</p>
            </div>
          </Card>

          <Card title="Clinics & Practice Locations" subtitle={`${doctor.clinics.length} ${doctor.clinics.length === 1 ? 'clinic' : 'clinics'}`}>
            {doctor.clinics.length === 0 ? (
              <p className="text-sm text-slate-500">This doctor consults online only.</p>
            ) : (
              <ul className="space-y-4">
                {doctor.clinics.map((c) => (
                  <li key={c.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      <p className="text-sm font-semibold text-slate-900">{pkr(c.inPersonFee)}</p>
                    </div>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {c.address}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-500">
                      {c.phone && <span>Phone: {c.phone}</span>}
                      {c.latitude != null && c.longitude != null ? (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=17/${c.latitude}/${c.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-blue-700 hover:underline"
                        >
                          {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span>No map location</span>
                      )}
                    </div>
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <Schedule slots={c.schedules} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Online Consultations & Fees">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: 'Video Call', Icon: Video, on: doctor.isVideoCallEnabled, fee: doctor.videoCallFee },
                { label: 'Text Consult', Icon: MessageSquareText, on: doctor.isTextConsultEnabled, fee: doctor.textConsultFee },
              ].map((x) => (
                <div key={x.label} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <x.Icon className="h-4 w-4 text-slate-400" /> {x.label}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        x.on ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {x.on ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-900">{x.on ? pkr(x.fee) : '—'}</p>
                </div>
              ))}
            </div>
            {(doctor.isVideoCallEnabled || doctor.isTextConsultEnabled) && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Online weekly hours</p>
                <Schedule slots={doctor.onlineAvailabilities} />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="PMDC Credentials Document">
            {!certificate ? (
              <p className="text-sm text-slate-500">No certificate uploaded.</p>
            ) : certificateIsPdf ? (
              <a
                href={certificate}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-sm font-semibold text-blue-700 hover:bg-slate-50"
              >
                <FileText className="h-6 w-6 text-slate-400" /> Open PMDC certificate (PDF)
                <ExternalLink className="ml-auto h-4 w-4" />
              </a>
            ) : (
              <a href={certificate} target="_blank" rel="noopener noreferrer" className="group block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={certificate}
                  alt={`PMDC certificate of ${doctor.fullName}`}
                  className="max-h-[420px] w-full rounded-lg border border-slate-200 bg-slate-50 object-contain"
                />
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 group-hover:underline">
                  Open full size <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            )}
          </Card>

          <Card title="Appointments">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
                <div key={s} className="rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-500">{s.charAt(0) + s.slice(1).toLowerCase()}</dt>
                  <dd className="text-lg font-bold tabular-nums text-slate-900">{counts[s] ?? 0}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>

      <Card title="Recent Appointments" subtitle="Latest 10 bookings with this doctor" className="mt-6" padded={false}>
        <AppointmentsTable
          rows={doctor.recentAppointments}
          columns={['id', 'patient', 'mode', 'when', 'fee', 'status', 'action']}
          empty={{ title: 'No appointments with this doctor yet' }}
        />
      </Card>
    </>
  );
}
