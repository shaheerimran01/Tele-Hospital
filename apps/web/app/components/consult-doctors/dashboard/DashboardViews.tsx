'use client';

import { useState } from 'react';
import {
  BadgeCheck,
  CircleAlert,
  Clock,
  Hospital,
  Languages,
  MapPin,
  MessageSquareText,
  Phone,
  Stethoscope,
  Video,
} from 'lucide-react';
import { apiFileUrl, type DoctorProfile, type TimeSlot } from '@/app/lib/api/doctors';
import AppointmentTable, { ModeBadge, type AppointmentAction } from './AppointmentTable';
import { SectionCard, TableSkeleton } from './DashboardHome';
import { CancelledTable, CompletedTable } from './AppointmentHistoryTables';
import TextSummaryModal from '@/app/consult-doctors/doctor-dashboard/components/TextSummaryModal';
import {
  displayTime,
  formatDay,
  initials,
  pkr,
  plural,
  type DashboardAppointment,
  type DoctorDashboardData,
  type ServiceMode,
} from './dashboard-data';

export function ViewHeader({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#141b34]">{title}</h1>
        <p className="mt-1 text-sm text-[#6b6f80]">{text}</p>
      </div>
      {action}
    </div>
  );
}

function SlotList({ slots }: { slots: TimeSlot[] }) {
  if (slots.length === 0) return <p className="text-sm text-[#8a8d99]">No timings added.</p>;
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
      {slots.map((s) => (
        <li key={s.id} className="flex justify-between gap-3 text-[#3a3f52]">
          <span className="font-medium">{s.dayOfWeek}</span>
          <span className="tabular-nums text-[#6b6f80]">
            {s.startTime} – {s.endTime}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[#e7e2d8] bg-white px-5 py-5 sm:px-6 ${className}`}>{children}</div>;
}

const editNote = (
  <p className="mt-6 text-center text-xs text-[#8a8d99]">
    Need to change these details? Contact Tabibistan support. Editing from the dashboard is coming soon.
  </p>
);

/** Shown in place of a view's content while the dashboard data loads or fails */
function DataGate({
  data,
  error,
  onRetry,
  children,
}: {
  data: DoctorDashboardData | null;
  error: string | null;
  onRetry: () => void;
  children: (d: DoctorDashboardData) => React.ReactNode;
}) {
  if (data) return <>{children(data)}</>;
  if (error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f2cccc] bg-[#fdf2f2] px-5 py-4 text-sm text-[#8f2d2d]" role="alert">
        <span className="flex items-center gap-2">
          <CircleAlert className="h-4 w-4 shrink-0" /> {error}
        </span>
        <button type="button" onClick={onRetry} className="font-semibold hover:underline">
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e7e2d8] bg-white">
      <TableSkeleton rows={4} />
    </div>
  );
}

interface DataProps {
  data: DoctorDashboardData | null;
  error: string | null;
  onRetry: () => void;
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export type AppointmentsTab = 'confirmed' | 'completed' | 'cancelled';

const APPOINTMENT_TABS: { id: AppointmentsTab; label: string }[] = [
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Declined / Cancelled' },
];

export function AppointmentsView({
  data,
  error,
  onRetry,
  onAction,
  busy,
  token,
  initialTab = 'confirmed',
}: DataProps & {
  onAction: (action: AppointmentAction, a: DashboardAppointment) => void;
  busy: Record<string, AppointmentAction | undefined>;
  /** doctor login token (chat summary) */
  token: string;
  initialTab?: AppointmentsTab;
}) {
  const [tab, setTab] = useState<AppointmentsTab>(initialTab);
  const [chatFor, setChatFor] = useState<DashboardAppointment | null>(null);
  const lists = data
    ? {
        confirmed: data.confirmed ?? [...data.todaySchedule.filter((a) => a.status !== 'PENDING'), ...data.upcoming],
        completed: data.completed,
        cancelled: data.cancelled ?? [],
      }
    : null;

  return (
    <>
      <ViewHeader title="Appointments" text="Your confirmed consultations, finished consultations with their prescriptions, and declined requests." />
      <div role="tablist" aria-label="Appointment status" className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-[#e7e2d8] bg-white p-1">
        {APPOINTMENT_TABS.map((t) => {
          const active = t.id === tab;
          const count = lists?.[t.id].length;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-[#141b34] text-white' : 'text-[#5c6072] hover:bg-[#f6f4ef] hover:text-[#141b34]'
              }`}
            >
              {t.label}
              {count !== undefined && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${active ? 'bg-white/15' : 'bg-[#f1ece1] text-[#7b5d22]'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
      <DataGate data={data} error={error} onRetry={onRetry}>
        {(d) => (
          <div role="tabpanel">
            {tab === 'confirmed' && (
              <SectionCard title="Confirmed" subtitle="Active and upcoming consultations · join online rooms or mark them completed">
                <AppointmentTable
                  rows={lists!.confirmed}
                  today={d.today}
                  onAction={onAction}
                  busy={busy}
                  empty={{ title: 'No confirmed consultations', text: 'Requests you approve will appear here.' }}
                />
              </SectionCard>
            )}
            {tab === 'completed' && (
              <SectionCard title="Completed" subtitle="Write a prescription, open it, or review the chat of text consultations">
                <CompletedTable rows={lists!.completed} onViewChat={setChatFor} />
              </SectionCard>
            )}
            {tab === 'cancelled' && (
              <SectionCard title="Declined / Cancelled" subtitle="Requests you declined and bookings that were cancelled">
                <CancelledTable rows={lists!.cancelled} />
              </SectionCard>
            )}
          </div>
        )}
      </DataGate>
      {chatFor && (
        <TextSummaryModal
          appointmentId={chatFor.id}
          appointmentNum={chatFor.appointmentNum}
          patientName={chatFor.patientName}
          token={token}
          onClose={() => setChatFor(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

export function PatientsView({ data, error, onRetry }: DataProps) {
  return (
    <>
      <ViewHeader
        title="Patients"
        text={data ? `${plural(data.metrics.patients, 'patient has', 'patients have')} booked with you.` : 'Patients who booked with you.'}
      />
      <DataGate data={data} error={error} onRetry={onRetry}>
        {(d) => (
          <SectionCard title="All patients" subtitle="Most recent appointment first">
            {d.patients.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-[#6b6f80]">No patients have booked with you yet.</p>
            ) : (
              <ul className="divide-y divide-[#f1eee7]">
                {d.patients.map((p) => (
                  <li key={p.userId} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1ece1] text-sm font-semibold text-[#7b5d22]">
                      {initials(p.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#141b34]">{p.name}</p>
                      {p.phone && (
                        <a href={`tel:${p.phone}`} className="mt-0.5 flex items-center gap-1 text-xs text-[#6b6f80] hover:text-[#141b34]">
                          <Phone className="h-3 w-3" /> {p.phone}
                        </a>
                      )}
                    </div>
                    <div className="w-full text-sm sm:w-auto sm:min-w-[170px] sm:text-right">
                      <p className="font-semibold text-[#141b34]">{plural(p.appointments, 'appointment', 'appointments')}</p>
                      {p.lastAppointmentDate && (
                        <p className="text-xs text-[#6b6f80]">Latest: {formatDay(p.lastAppointmentDate)}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {d.patients.length < d.metrics.patients && (
              <p className="border-t border-[#efece5] px-6 py-3 text-xs text-[#8a8d99]">
                Showing the {d.patients.length} most recent of {d.metrics.patients} patients.
              </p>
            )}
          </SectionCard>
        )}
      </DataGate>
    </>
  );
}

// ---------------------------------------------------------------------------
// Availability (weekly hours from the doctor profile)
// ---------------------------------------------------------------------------

export function AvailabilityView({ profile }: { profile: DoctorProfile }) {
  const online = profile.isVideoCallEnabled || profile.isTextConsultEnabled;
  return (
    <>
      <ViewHeader title="Availability" text="Your weekly hours. Patients can only book inside these times." />
      <div className="space-y-5">
        {profile.clinics.map((c) => (
          <Panel key={c.id}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#141b34]">
              <Hospital className="h-4 w-4 text-[#8a8d99]" /> {c.name}
            </h2>
            <SlotList slots={c.schedules} />
          </Panel>
        ))}
        <Panel>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#141b34]">
            <Video className="h-4 w-4 text-[#8a8d99]" /> Online consultations
          </h2>
          {online ? (
            <SlotList slots={profile.onlineAvailabilities} />
          ) : (
            <p className="text-sm text-[#8a8d99]">Online consultations are switched off.</p>
          )}
        </Panel>
      </div>
      {editNote}
    </>
  );
}

// ---------------------------------------------------------------------------
// Earnings (completed consultations)
// ---------------------------------------------------------------------------

const MODES: ServiceMode[] = ['IN_CLINIC', 'VIDEO', 'TEXT'];

export function EarningsView({ data, error, onRetry }: DataProps) {
  return (
    <>
      <ViewHeader title="Earnings" text="Fees from completed consultations. Only paid consultations count towards Total earned." />
      <DataGate data={data} error={error} onRetry={onRetry}>
        {(d) => {
          const unpaid = d.earnings.filter((e) => e.paymentStatus !== 'PAID').reduce((s, e) => s + e.total, 0);
          const byMode = MODES.map((mode) => {
            const rows = d.earnings.filter((e) => e.serviceMode === mode && e.paymentStatus === 'PAID');
            return { mode, count: rows.reduce((s, e) => s + e.count, 0), total: rows.reduce((s, e) => s + e.total, 0) };
          });
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <Panel className="col-span-2 xl:col-span-1">
                  <p className="text-sm font-medium text-[#6b6f80]">Total earned</p>
                  <p className="mt-2 text-[28px] font-semibold tracking-tight text-[#141b34] tabular-nums">{pkr(d.metrics.totalEarned)}</p>
                  {unpaid > 0 && <p className="mt-1 text-xs text-[#8a6416]">{pkr(unpaid)} from completed visits not marked paid yet</p>}
                </Panel>
                {byMode.map((m) => (
                  <Panel key={m.mode}>
                    <ModeBadge mode={m.mode} clinicName={null} short />
                    <p className="mt-3 text-xl font-semibold text-[#141b34] tabular-nums">{pkr(m.total)}</p>
                    <p className="text-xs text-[#6b6f80]">{plural(m.count, 'paid consultation', 'paid consultations')}</p>
                  </Panel>
                ))}
              </div>

              <SectionCard title="Completed consultations" subtitle="Most recent first">
                {d.completed.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-[#6b6f80]">No completed consultations yet.</p>
                ) : (
                  <ul className="divide-y divide-[#f1eee7]">
                    {d.completed.map((a) => (
                      <li key={a.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#141b34]">{a.patientName}</p>
                          <p className="whitespace-nowrap text-xs text-[#6b6f80]">
                            {formatDay(a.appointmentDate)} · {displayTime(a.startTime)} · {a.appointmentNum}
                          </p>
                          <div className="mt-1.5 sm:hidden">
                            <ModeBadge mode={a.serviceMode} clinicName={null} short />
                          </div>
                        </div>
                        <div className="hidden sm:block">
                          <ModeBadge mode={a.serviceMode} clinicName={null} short />
                        </div>
                        <div className="shrink-0 text-right sm:w-32">
                          <p className="text-sm font-semibold text-[#141b34] tabular-nums">{pkr(a.fee)}</p>
                          <p className={`text-xs font-medium ${a.paymentStatus === 'PAID' ? 'text-[#2f6b45]' : 'text-[#8a6416]'}`}>
                            {a.paymentStatus === 'PAID' ? 'Paid' : 'Not paid yet'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          );
        }}
      </DataGate>
    </>
  );
}

// ---------------------------------------------------------------------------
// My profile
// ---------------------------------------------------------------------------

const STATUS_CHIP: Record<string, { label: string; className: string; Icon: typeof Clock }> = {
  PENDING: { label: 'Under review', className: 'bg-[#fdf4e3] text-[#8a6416]', Icon: Clock },
  APPROVED: { label: 'Approved and live', className: 'bg-[#eaf6ee] text-[#2f6b45]', Icon: BadgeCheck },
  REJECTED: { label: 'Not approved', className: 'bg-[#fdf0f0] text-[#9a3030]', Icon: CircleAlert },
};

export function PersonalInfoView({ profile, phone }: { profile: DoctorProfile; phone: string }) {
  const status = STATUS_CHIP[profile.status] ?? STATUS_CHIP.PENDING;
  return (
    <>
      <ViewHeader title="Personal Info" text="How patients see you on Tabibistan." />
      <Panel>
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#ece9e2]">
            {profile.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={apiFileUrl(profile.profilePhotoUrl)} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[#a9a59a]">
                <Stethoscope className="h-6 w-6" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-[#141b34]">{profile.fullName}</p>
            <p className="text-sm text-[#6b6f80]">
              {profile.title} · {profile.degrees}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
            <status.Icon className="h-3.5 w-3.5" /> {status.label}
          </span>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-x-10 gap-y-3 border-t border-[#efece5] pt-5 text-sm sm:grid-cols-2">
          {[
            ['PMDC number', profile.pmdcNumber],
            ['Experience', `${profile.experienceYears} ${profile.experienceYears === 1 ? 'year' : 'years'}`],
            ['Phone', phone],
            ['Email', profile.email || '—'],
            ['Education', profile.education || '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-[#8a8d99]">{k}</dt>
              <dd className="text-right text-[#141b34]">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {profile.specialisations.map((s) => (
            <span key={s} className="rounded-full bg-[#f3f1ec] px-2.5 py-1 text-xs text-[#3a3f52]">
              {s}
            </span>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-[#6b6f80]">
          <Languages className="h-3.5 w-3.5" /> {profile.languages.join(', ')}
        </p>
        {profile.about && <p className="mt-4 text-sm leading-relaxed text-[#3a3f52]">{profile.about}</p>}
      </Panel>
      {editNote}
    </>
  );
}

export function ClinicsInfoView({ profile }: { profile: DoctorProfile }) {
  return (
    <>
      <ViewHeader
        title="Clinics Info"
        text={
          profile.clinics.length === 0
            ? 'You consult online only.'
            : `${profile.clinics.length} ${profile.clinics.length === 1 ? 'clinic' : 'clinics'} where patients can visit you.`
        }
      />
      <div className="space-y-4">
        {profile.clinics.map((c) => (
          <Panel key={c.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="flex items-center gap-2 text-base font-semibold text-[#141b34]">
                <Hospital className="h-4 w-4 text-[#8a8d99]" /> {c.name}
              </p>
              <p className="text-sm font-semibold text-[#141b34]">{pkr(c.inPersonFee)}</p>
            </div>
            <p className="mt-1.5 flex items-start gap-1.5 text-sm text-[#6b6f80]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {c.address}
            </p>
            {c.phone && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[#6b6f80]">
                <Phone className="h-4 w-4" /> {c.phone}
              </p>
            )}
            <div className="mt-4 border-t border-[#efece5] pt-4">
              <SlotList slots={c.schedules} />
            </div>
          </Panel>
        ))}
      </div>
      {editNote}
    </>
  );
}

export function OnlineConsultationsView({ profile }: { profile: DoctorProfile }) {
  const rows = [
    { label: 'Video call', Icon: Video, on: profile.isVideoCallEnabled, fee: profile.videoCallFee },
    { label: 'Text appointment', Icon: MessageSquareText, on: profile.isTextConsultEnabled, fee: profile.textConsultFee },
  ];
  return (
    <>
      <ViewHeader title="Online Consultations" text="Your online services, fees and weekly hours." />
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map(({ label, Icon, on, fee }) => (
            <Panel key={label}>
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#141b34]">
                  <Icon className="h-4 w-4 text-[#8a8d99]" /> {label}
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    on ? 'bg-[#eaf6ee] text-[#2f6b45]' : 'bg-[#f3f1ec] text-[#8a8d99]'
                  }`}
                >
                  {on ? 'On' : 'Off'}
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-[#141b34] tabular-nums">{on ? pkr(fee) : '—'}</p>
              <p className="text-xs text-[#6b6f80]">Fee per consultation</p>
            </Panel>
          ))}
        </div>
        <Panel>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#141b34]">
            <Clock className="h-4 w-4 text-[#8a8d99]" /> Weekly hours
          </h2>
          {profile.isVideoCallEnabled || profile.isTextConsultEnabled ? (
            <SlotList slots={profile.onlineAvailabilities} />
          ) : (
            <p className="text-sm text-[#8a8d99]">Online consultations are switched off.</p>
          )}
        </Panel>
      </div>
      {editNote}
    </>
  );
}
