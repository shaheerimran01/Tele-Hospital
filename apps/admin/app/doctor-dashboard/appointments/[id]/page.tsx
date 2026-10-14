'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  LoaderCircle,
  MapPin,
  Mic,
  Phone,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import {
  fetchAppointment,
  fileUrl,
  updateAppointmentStatus,
  type AppointmentDetail,
  type AppointmentStatus,
} from '@/lib/api/doctorPortal';
import { usePortal, usePortalData } from '../../_components/portal-context';
import {
  APPOINTMENT_STATUS_LABELS,
  appointmentDay,
  AppointmentStatusBadge,
  Avatar,
  Card,
  displayTime,
  ErrorState,
  formatDate,
  InfoList,
  LoadingState,
  MODE_LABELS,
  ModeBadge,
  PageHeader,
  PatientTypeBadge,
  PAYMENT_METHOD_LABELS,
  PaymentBadge,
  personName,
  pkr,
  relationLabel,
} from '../../_components/ui';

const STATUSES = Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[];

type AttachmentKind = 'audio' | 'image' | 'pdf' | 'file';

function attachmentKind(url: string): AttachmentKind {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  // Voice notes: webm/ogg (Chrome, Firefox), mp4/m4a (Safari), mp3/wav uploads
  if (['webm', 'ogg', 'oga', 'mp3', 'm4a', 'mp4', 'wav', 'aac'].includes(ext)) return 'audio';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'file';
}

const fileName = (url: string) => decodeURIComponent(url.split('?')[0].split('/').pop() ?? 'file');

function Attachments({ urls }: { urls: string[] }) {
  if (urls.length === 0) return <p className="text-sm text-slate-400">No attachments or voice notes.</p>;
  const items = urls.map((u) => ({ url: fileUrl(u), kind: attachmentKind(u), name: fileName(u) }));
  const audio = items.filter((i) => i.kind === 'audio');
  const images = items.filter((i) => i.kind === 'image');
  const files = items.filter((i) => i.kind === 'pdf' || i.kind === 'file');

  return (
    <div className="space-y-4">
      {audio.map((a, i) => (
        <div key={a.url} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Mic className="h-4 w-4 text-teal-600" /> Voice note{audio.length > 1 ? ` ${i + 1}` : ''}
          </p>
          <audio controls preload="metadata" src={a.url} className="w-full">
            Your browser cannot play this audio.
          </audio>
          <a href={a.url} download className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
            <Download className="h-3.5 w-3.5" /> Download ({a.name})
          </a>
        </div>
      ))}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <a key={img.url} href={img.url} target="_blank" rel="noopener noreferrer" className="group block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.name} className="aspect-square w-full rounded-lg border border-slate-200 object-cover" />
              <span className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500 group-hover:text-blue-700">
                <ImageIcon className="h-3 w-3 shrink-0" /> {img.name}
              </span>
            </a>
          ))}
        </div>
      )}

      {files.map((f) => (
        <a
          key={f.url}
          href={f.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <FileText className="h-5 w-5 text-slate-400" />
          <span className="min-w-0 flex-1 truncate">{f.name}</span>
          <ExternalLink className="h-4 w-4 text-slate-400" />
        </a>
      ))}
    </div>
  );
}

function StatusControl({ appointment, onUpdated }: { appointment: AppointmentDetail; onUpdated: (a: AppointmentDetail) => void }) {
  const { reloadCounts } = usePortal();
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status);
  const [reason, setReason] = useState(appointment.cancelReason ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setStatus(appointment.status);
    setReason(appointment.cancelReason ?? '');
  }, [appointment.status, appointment.cancelReason]);

  const changed = status !== appointment.status || (status === 'CANCELLED' && reason.trim() !== (appointment.cancelReason ?? ''));

  const save = async () => {
    if (status === 'CANCELLED' && !reason.trim()) {
      setMessage({ tone: 'error', text: 'Please add a reason for cancelling.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateAppointmentStatus(appointment.id, status, status === 'CANCELLED' ? reason.trim() : undefined);
      onUpdated(updated);
      reloadCounts();
      setMessage({ tone: 'ok', text: `Status updated to ${APPOINTMENT_STATUS_LABELS[status]}.` });
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Could not update the status.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 lg:w-[320px]">
      <label htmlFor="status-select" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Update status
      </label>
      <div className="mt-2 flex gap-2">
        <select
          id="status-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as AppointmentStatus);
            setMessage(null);
          }}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPOINTMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={!changed || saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Save
        </button>
      </div>
      {status === 'CANCELLED' && (
        <label className="mt-3 block">
          <span className="text-xs font-semibold text-slate-600">Reason for cancelling</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Doctor unavailable, patient request"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
      )}
      {message && (
        <p
          role="status"
          className={`mt-3 rounded-md px-3 py-2 text-xs ${message.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: a, setData, error, reload } = usePortalData(() => fetchAppointment(id), [id]);

  if (!a) {
    return (
      <>
        <PageHeader title="Appointment Details" back={{ href: '/doctor-dashboard/appointments', label: 'All appointments' }} />
        <Card padded={false}>{error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState text="Loading appointment…" />}</Card>
      </>
    );
  }

  const member = a.familyMember ?? a.intake?.familyMember ?? null;
  const isFamily = a.patientType === 'FAMILY_MEMBER';
  const outcomeAvailable = a.status === 'COMPLETED' || a.doctorNotes || a.prescriptionUrl;

  return (
    <>
      <PageHeader title="Appointment Details" back={{ href: '/doctor-dashboard/appointments', label: 'All appointments' }} />

      {/* Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Appointment number</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="font-mono text-2xl font-bold tracking-wide text-slate-900">{a.appointmentNum}</h2>
              <AppointmentStatusBadge status={a.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                {appointmentDay(a.appointmentDate, true)}, {displayTime(a.startTime)} – {displayTime(a.endTime)}
              </span>
              <ModeBadge mode={a.serviceMode} />
            </div>
            <p className="mt-2 text-xs text-slate-400">Booked {formatDate(a.createdAt)} · Last updated {formatDate(a.updatedAt)}</p>
            {a.status === 'CANCELLED' && a.cancelReason && (
              <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">Cancelled / declined: {a.cancelReason}</p>
            )}
            {a.status === 'RESCHEDULED' && a.cancelReason && (
              <p className="mt-3 rounded-md bg-violet-50 px-3 py-2 text-sm text-violet-800">Rescheduled by the doctor: {a.cancelReason}</p>
            )}
          </div>
          <StatusControl appointment={a} onUpdated={setData} />
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 1. Patient & intake */}
        <Card title="Patient & Intake Summary" className="xl:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={a.patientName} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                {a.patientName} <PatientTypeBadge type={a.patientType} />
              </p>
              <p className="text-xs text-slate-500">
                Account holder:{' '}
                <Link href={`/doctor-dashboard/patients/${a.user.id}`} className="font-semibold text-blue-700 hover:underline">
                  {personName(a.user)}
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-5">
            <InfoList
              items={[
                ['Age', isFamily && member?.age != null ? `${member.age} years` : '—'],
                ['Gender', isFamily && member ? member.gender : '—'],
                ['Relation', isFamily && member ? relationLabel(member.relation) : 'Self'],
                [
                  'Contact phone',
                  a.user.phone ? (
                    <a href={`tel:${a.user.phone}`} className="inline-flex items-center gap-1 hover:text-blue-700">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> {a.user.phone}
                    </a>
                  ) : (
                    '—'
                  ),
                ],
                ['Speciality', a.intake?.speciality?.name ?? '—'],
                ['Symptom duration', a.intake?.symptomDuration || '—'],
              ]}
            />
          </div>

          {a.intake ? (
            <>
              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Reported symptoms</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {a.intake.symptoms.length ? (
                    a.intake.symptoms.map((s) => (
                      <span key={s} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-inset ring-teal-200">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">None listed</span>
                  )}
                </div>
              </div>
              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Problem description</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {a.intake.description || 'No description provided.'}
                </p>
              </div>
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Voice notes & attachments</p>
                <Attachments urls={a.intake.attachments} />
              </div>
            </>
          ) : (
            <p className="mt-5 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
              This appointment was booked without a symptom form.
            </p>
          )}
        </Card>

        {/* 2. Doctor & clinic */}
        <Card title="Doctor & Clinic Details">
          <div className="flex items-center gap-3">
            <Avatar name={a.doctor.fullName} src={a.doctor.profilePhotoUrl ? fileUrl(a.doctor.profilePhotoUrl) : null} />
            <div className="min-w-0">
              <Link href={`/doctor-dashboard/doctors/${a.doctor.id}`} className="font-semibold text-slate-900 hover:text-blue-700">
                {a.doctor.fullName}
              </Link>
              <p className="text-xs text-slate-500">{a.doctor.specialisations.join(', ') || a.doctor.title}</p>
            </div>
          </div>
          <div className="mt-5">
            <InfoList
              items={[
                ['PMDC number', <span key="p" className="font-mono">{a.doctor.pmdcNumber}</span>],
                ['Experience', `${a.doctor.experienceYears} years · ${a.doctor.degrees}`],
                ['Doctor phone', a.doctor.phone],
                ['Doctor email', a.doctor.email || '—'],
              ]}
            />
          </div>
          {a.serviceMode === 'IN_CLINIC' && (
            <div className="mt-5 rounded-lg border border-slate-200 p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Stethoscope className="h-4 w-4 text-slate-400" /> {a.clinic?.name ?? 'Clinic removed'}
              </p>
              {a.clinic && (
                <>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {a.clinic.address}
                  </p>
                  {a.clinic.phone && <p className="mt-1 text-xs text-slate-500">Clinic phone: {a.clinic.phone}</p>}
                  {a.clinic.latitude != null && a.clinic.longitude != null && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${a.clinic.latitude}&mlon=${a.clinic.longitude}#map=17/${a.clinic.latitude}/${a.clinic.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Open in map <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </>
              )}
            </div>
          )}
        </Card>

        {/* 3. Booking & payment */}
        <Card title="Booking & Payment Information">
          <InfoList
            items={[
              ['Scheduled date', appointmentDay(a.appointmentDate, true)],
              ['Slot time', `${displayTime(a.startTime)} – ${displayTime(a.endTime)}`],
              ['Service mode', MODE_LABELS[a.serviceMode]],
              ['Total fee', <span key="f" className="font-semibold">{pkr(a.fee)}</span>],
              [
                'Payment method',
                <span key="m" className="inline-flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                  {a.paymentMethod ? PAYMENT_METHOD_LABELS[a.paymentMethod] ?? a.paymentMethod : '—'}
                </span>,
              ],
              ['Payment status', <PaymentBadge key="s" status={a.paymentStatus} />],
            ]}
          />
        </Card>

        {/* 4. Clinical outcome */}
        <Card title="Doctor Clinical Outcome" className="xl:col-span-2">
          {!outcomeAvailable ? (
            <p className="text-sm text-slate-500">Doctor notes and the prescription appear here once the consultation is completed.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Doctor notes</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {a.doctorNotes || 'The doctor has not added notes.'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Prescription</p>
                {a.prescriptionUrl ? (
                  attachmentKind(a.prescriptionUrl) === 'image' ? (
                    <a href={fileUrl(a.prescriptionUrl)} target="_blank" rel="noopener noreferrer" className="mt-2 block max-w-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileUrl(a.prescriptionUrl)} alt="Prescription" className="w-full rounded-lg border border-slate-200" />
                    </a>
                  ) : (
                    <a
                      href={fileUrl(a.prescriptionUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4" /> Open prescription <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )
                ) : (
                  <p className="mt-1 text-sm text-slate-500">No prescription uploaded.</p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400">
        <UserRound className="h-3.5 w-3.5" /> Patient account created {formatDate(a.user.createdAt)}
      </p>
    </>
  );
}
