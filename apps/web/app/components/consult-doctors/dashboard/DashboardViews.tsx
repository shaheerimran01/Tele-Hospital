'use client';

import {
  BadgeCheck,
  CalendarOff,
  CircleAlert,
  Clock,
  Hospital,
  Languages,
  MapPin,
  MessageSquareText,
  Phone,
  Stethoscope,
  Trash2,
  Video,
} from 'lucide-react';
import { apiFileUrl, type DoctorProfile, type TimeSlot } from '@/app/lib/api/doctors';
import AppointmentTable, { ModeBadge, type AppointmentAction } from './AppointmentTable';
import { SectionCard } from './DashboardHome';
import WeeklyOverviewChart, { type WeekPoint } from './WeeklyOverviewChart';
import {
  formatDay,
  formatTime,
  initials,
  pkr,
  type BlockedTime,
  type DashboardAppointment,
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

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export function AppointmentsView({
  now,
  todaySchedule,
  requests,
  upcoming,
  onAction,
}: {
  now: Date;
  todaySchedule: DashboardAppointment[];
  requests: DashboardAppointment[];
  upcoming: DashboardAppointment[];
  onAction: (action: AppointmentAction, a: DashboardAppointment) => void;
}) {
  return (
    <>
      <ViewHeader title="Appointments" text="Respond to requests and manage your confirmed consultations." />
      <div className="space-y-6">
        <SectionCard
          title="Requests waiting for you"
          subtitle={`${requests.length} pending · Patients will be notified when you respond`}
        >
          <AppointmentTable
            rows={requests}
            now={now}
            onAction={onAction}
            shortMode
            empty={{ title: "You're all caught up", text: 'New consultation requests will appear here.' }}
          />
        </SectionCard>
        <SectionCard title="Today" subtitle={`${todaySchedule.length} scheduled`}>
          <AppointmentTable
            rows={todaySchedule}
            now={now}
            onAction={onAction}
            empty={{ title: 'Nothing scheduled today', text: 'Approved consultations for today will appear here.' }}
          />
        </SectionCard>
        <SectionCard title="Upcoming" subtitle="Confirmed consultations after today">
          <AppointmentTable
            rows={upcoming}
            now={now}
            onAction={onAction}
            empty={{ title: 'No upcoming consultations', text: 'Requests you approve for later dates will appear here.' }}
          />
        </SectionCard>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

export function PatientsView({
  patients,
}: {
  patients: { name: string; phone: string; visits: number; lastVisit: string; modes: Set<ServiceMode> }[];
}) {
  return (
    <>
      <ViewHeader title="Patients" text={`${patients.length} patients have booked or consulted with you.`} />
      <SectionCard title="All patients" subtitle="Most recent first">
        {patients.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-[#6b6f80]">No patients yet.</p>
        ) : (
          <ul className="divide-y divide-[#f1eee7]">
            {patients.map((p) => (
              <li key={`${p.name}|${p.phone}`} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1ece1] text-sm font-semibold text-[#7b5d22]">
                  {initials(p.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#141b34]">{p.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-[#6b6f80]">
                    <Phone className="h-3 w-3" /> {p.phone}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[...p.modes].map((m) => (
                    <ModeBadge key={m} mode={m} clinicName={null} short />
                  ))}
                </div>
                <div className="w-full text-sm sm:w-auto sm:min-w-[150px] sm:text-right">
                  <p className="font-semibold text-[#141b34]">
                    {p.visits} {p.visits === 1 ? 'consultation' : 'consultations'}
                  </p>
                  <p className="text-xs text-[#6b6f80]">Latest: {formatDay(p.lastVisit)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export function AvailabilityView({
  profile,
  blocked,
  onBlockTime,
  onRemoveBlock,
}: {
  profile: DoctorProfile;
  blocked: BlockedTime[];
  onBlockTime: () => void;
  onRemoveBlock: (id: string) => void;
}) {
  const online = profile.isVideoCallEnabled || profile.isTextConsultEnabled;
  return (
    <>
      <ViewHeader
        title="Availability"
        text="Your weekly hours from registration, and the time you've blocked."
        action={
          <button
            type="button"
            onClick={onBlockTime}
            className="inline-flex items-center gap-2 rounded-lg bg-[#141b34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#232c4f]"
          >
            <CalendarOff className="h-4 w-4" /> Block time
          </button>
        }
      />
      <div className="space-y-5">
        <SectionCard title="Blocked time" subtitle="Patients can't book you during these hours">
          {blocked.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-[#6b6f80]">No blocked time.</p>
          ) : (
            <ul className="divide-y divide-[#f1eee7]">
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
                  <CalendarOff className="h-4 w-4 shrink-0 text-[#b23a3a]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#141b34]">
                      {formatDay(`${b.date}T00:00`)} · {b.from} – {b.to}
                    </p>
                    <p className="truncate text-xs text-[#6b6f80]">{b.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveBlock(b.id)}
                    aria-label="Remove blocked time"
                    className="rounded-lg p-2 text-[#8a8d99] hover:bg-[#fdf2f2] hover:text-[#b23a3a]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

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
// Earnings
// ---------------------------------------------------------------------------

export function EarningsView({
  totalEarned,
  completed,
  week,
}: {
  totalEarned: number;
  completed: DashboardAppointment[];
  week: WeekPoint[];
}) {
  const byMode = (['IN_CLINIC', 'VIDEO', 'TEXT'] as ServiceMode[]).map((mode) => {
    const rows = completed.filter((a) => a.serviceMode === mode);
    return { mode, count: rows.length, total: rows.reduce((s, a) => s + a.fee, 0) };
  });

  return (
    <>
      <ViewHeader title="Earnings" text="Fees from completed consultations." />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Panel className="col-span-2 xl:col-span-1">
            <p className="text-sm font-medium text-[#6b6f80]">Total earned</p>
            <p className="mt-2 text-[28px] font-semibold tracking-tight text-[#141b34] tabular-nums">{pkr(totalEarned)}</p>
          </Panel>
          {byMode.map((m) => (
            <Panel key={m.mode}>
              <ModeBadge mode={m.mode} clinicName={null} short />
              <p className="mt-3 text-xl font-semibold text-[#141b34] tabular-nums">{pkr(m.total)}</p>
              <p className="text-xs text-[#6b6f80]">
                {m.count} {m.count === 1 ? 'consultation' : 'consultations'}
              </p>
            </Panel>
          ))}
        </div>

        <WeeklyOverviewChart week={week} />

        <SectionCard title="Completed consultations" subtitle="Most recent first">
          {completed.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-[#6b6f80]">No completed consultations yet.</p>
          ) : (
            <ul className="divide-y divide-[#f1eee7]">
              {completed.map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#141b34]">{a.patientName}</p>
                    <p className="whitespace-nowrap text-xs text-[#6b6f80]">
                      {formatDay(a.completedAt ?? a.scheduledAt)} · {formatTime(a.completedAt ?? a.scheduledAt)}
                    </p>
                    <div className="mt-1.5 sm:hidden">
                      <ModeBadge mode={a.serviceMode} clinicName={a.clinicName} short />
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <ModeBadge mode={a.serviceMode} clinicName={a.clinicName} short />
                  </div>
                  <p className="shrink-0 text-right text-sm font-semibold text-[#141b34] tabular-nums sm:w-28">{pkr(a.fee)}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
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
