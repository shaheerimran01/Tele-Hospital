// Doctor dashboard data model + sample data.
//
// There is no appointment/booking table yet, so the dashboard runs on sample
// data kept in React state. Field names follow the Prisma schema so the mock can
// be swapped for a real API later without touching the UI:
//   ConsultationIntake.id / patientType / symptoms / description / serviceMode
//   FamilyMember.fullName, DoctorClinic.name / inPersonFee,
//   Doctor.videoCallFee / textConsultFee
// `scheduledAt` and `status` are front-end only until booking exists.

/** Mirrors the Prisma enum ConsultationServiceMode */
export type ServiceMode = 'IN_CLINIC' | 'TEXT' | 'VIDEO';

/** Mirrors the Prisma enum PatientType */
export type PatientType = 'SELF' | 'FAMILY_MEMBER';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'DECLINED';

export interface DashboardAppointment {
  id: string;
  patientName: string;
  patientPhone: string;
  patientType: PatientType;
  serviceMode: ServiceMode;
  clinicName: string | null;
  symptoms: string[];
  description: string | null;
  /** ISO date-time */
  scheduledAt: string;
  fee: number;
  status: AppointmentStatus;
  /** set when the doctor proposed a new time */
  rescheduled?: boolean;
  /** ISO date-time, set when marked completed */
  completedAt?: string;
}

export interface BlockedTime {
  id: string;
  /** yyyy-mm-dd */
  date: string;
  /** HH:mm */
  from: string;
  /** HH:mm */
  to: string;
  reason: string;
}

export interface DashboardFees {
  clinics: { name: string; inPersonFee: number }[];
  videoCallFee: number | null;
  textConsultFee: number | null;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const at = (day: Date, hours: number, minutes = 0) => {
  const x = new Date(day);
  x.setHours(hours, minutes, 0, 0);
  return x.toISOString();
};

/** "Tue, 13 Oct" */
export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** "5:30 PM" */
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** "Today", "Tomorrow" or "Thu, 15 Oct" */
export const relativeDay = (iso: string, now: Date) => {
  const d = new Date(iso);
  if (isSameDay(d, now)) return 'Today';
  if (isSameDay(d, addDays(now, 1))) return 'Tomorrow';
  return formatDay(iso);
};

/** Local yyyy-mm-dd for <input type="date"> */
export const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Local HH:mm for <input type="time"> */
export const toTimeInput = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export const pkr = (n?: number | null) => (n == null ? '—' : `PKR ${n.toLocaleString('en-PK')}`);

export function greetingFor(now: Date) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "Ayesha Rahman" -> "Dr. Ayesha Rahman" (leaves "Dr. …" / "Prof. …" alone) */
export function doctorDisplayName(fullName: string) {
  const name = fullName.trim();
  if (/^(dr|prof|professor)\.?\s/i.test(name)) return name;
  return `Dr. ${name}`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

// ---------------------------------------------------------------------------
// Derived views
// ---------------------------------------------------------------------------

const byTime = (a: DashboardAppointment, b: DashboardAppointment) =>
  a.scheduledAt.localeCompare(b.scheduledAt);

export function deriveDashboard(appointments: DashboardAppointment[], now: Date) {
  const today = startOfDay(now);
  const active = appointments.filter((a) => a.status !== 'DECLINED');

  const todaySchedule = active
    .filter((a) => isSameDay(new Date(a.scheduledAt), today))
    .sort(byTime);

  const requests = active
    .filter((a) => a.status === 'PENDING' && !isSameDay(new Date(a.scheduledAt), today))
    .sort(byTime);

  const upcoming = active
    .filter((a) => a.status === 'CONFIRMED' && new Date(a.scheduledAt) >= addDays(today, 1))
    .sort(byTime);

  const completed = active
    .filter((a) => a.status === 'COMPLETED')
    .sort((a, b) => (b.completedAt ?? b.scheduledAt).localeCompare(a.completedAt ?? a.scheduledAt));

  const totalEarned = completed.reduce((sum, a) => sum + a.fee, 0);

  // One row per patient (name + phone), most recent visit first
  const patientMap = new Map<
    string,
    { name: string; phone: string; visits: number; lastVisit: string; modes: Set<ServiceMode> }
  >();
  for (const a of [...active].sort(byTime)) {
    const key = `${a.patientName}|${a.patientPhone}`;
    const row = patientMap.get(key) ?? {
      name: a.patientName,
      phone: a.patientPhone,
      visits: 0,
      lastVisit: a.scheduledAt,
      modes: new Set<ServiceMode>(),
    };
    row.visits += 1;
    row.lastVisit = a.scheduledAt;
    row.modes.add(a.serviceMode);
    patientMap.set(key, row);
  }
  const patients = [...patientMap.values()].sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

  // Last 7 days, oldest first. Appointments = completed + today's booked; earnings = completed fees.
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    const done = completed.filter((a) => isSameDay(new Date(a.completedAt ?? a.scheduledAt), day));
    const booked = active.filter(
      (a) =>
        a.status !== 'COMPLETED' && a.status !== 'PENDING' && isSameDay(new Date(a.scheduledAt), day),
    );
    return {
      date: day.toISOString(),
      label: day.toLocaleDateString('en-GB', { weekday: 'short' }),
      isToday: i === 6,
      appointments: done.length + booked.length,
      earnings: done.reduce((s, a) => s + a.fee, 0),
    };
  });

  return { todaySchedule, requests, upcoming, completed, totalEarned, patients, week };
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

/**
 * Builds sample appointments around "now", using the doctor's real clinic names
 * and fees when they exist so the preview feels like their own practice.
 */
export function buildSampleAppointments(now: Date, fees: DashboardFees): DashboardAppointment[] {
  const today = startOfDay(now);
  const clinic = fees.clinics[0] ?? { name: 'City Care Clinic', inPersonFee: 2500 };
  const clinicB = fees.clinics[1] ?? clinic;
  const video = fees.videoCallFee ?? 3000;
  const text = fees.textConsultFee ?? 1500;

  let n = 0;
  const id = () => `sample-${++n}`;

  const row = (
    p: Omit<DashboardAppointment, 'id' | 'clinicName' | 'fee'> & { clinic?: typeof clinic },
  ): DashboardAppointment => {
    const { clinic: c, ...rest } = p;
    const fee =
      p.serviceMode === 'IN_CLINIC' ? (c ?? clinic).inPersonFee : p.serviceMode === 'VIDEO' ? video : text;
    return { id: id(), clinicName: p.serviceMode === 'IN_CLINIC' ? (c ?? clinic).name : null, fee, ...rest };
  };

  return [
    // --- Today's schedule (2) ---
    row({
      patientName: 'Ahmed Raza',
      patientPhone: '0300 1234567',
      patientType: 'SELF',
      serviceMode: 'IN_CLINIC',
      symptoms: ['Fever', 'Body Ache'],
      description: 'Fever on and off for three days, worse at night.',
      scheduledAt: at(today, 17, 30),
      status: 'CONFIRMED',
    }),
    row({
      patientName: 'Sana Malik',
      patientPhone: '0321 7654321',
      patientType: 'SELF',
      serviceMode: 'VIDEO',
      symptoms: ['Skin Rash', 'Itching / Allergy'],
      description: 'Itchy rash on both arms after starting a new soap.',
      scheduledAt: at(today, 19, 0),
      status: 'PENDING',
    }),

    // --- Requests waiting for a reply (7) ---
    row({
      patientName: 'Bilal Hussain',
      patientPhone: '0333 4455667',
      patientType: 'SELF',
      serviceMode: 'VIDEO',
      symptoms: ['Headache', 'Dizziness'],
      description: 'Frequent headaches in the afternoon for two weeks.',
      scheduledAt: at(addDays(today, 1), 10, 0),
      status: 'PENDING',
    }),
    row({
      patientName: 'Fatima Noor',
      patientPhone: '0345 9988776',
      patientType: 'FAMILY_MEMBER',
      serviceMode: 'TEXT',
      symptoms: ['Child Fever', 'Cough in Kids'],
      description: 'My son (6 years) has a mild fever and dry cough since yesterday.',
      scheduledAt: at(addDays(today, 1), 12, 30),
      status: 'PENDING',
    }),
    row({
      patientName: 'Usman Tariq',
      patientPhone: '0312 3344556',
      patientType: 'SELF',
      serviceMode: 'IN_CLINIC',
      clinic: clinicB,
      symptoms: ['Back Pain'],
      description: 'Lower back pain after lifting a heavy box.',
      scheduledAt: at(addDays(today, 1), 16, 0),
      status: 'PENDING',
    }),
    row({
      patientName: 'Hira Shah',
      patientPhone: '0301 2233445',
      patientType: 'SELF',
      serviceMode: 'VIDEO',
      symptoms: ['Irregular Periods', 'Hormonal Issues'],
      description: null,
      scheduledAt: at(addDays(today, 2), 11, 0),
      status: 'PENDING',
    }),
    row({
      patientName: 'Kamran Ali',
      patientPhone: '0322 5566778',
      patientType: 'SELF',
      serviceMode: 'TEXT',
      symptoms: ['High BP'],
      description: 'BP readings around 150/95 this week. Need advice on medicine.',
      scheduledAt: at(addDays(today, 2), 15, 30),
      status: 'PENDING',
    }),
    row({
      patientName: 'Zainab Iqbal',
      patientPhone: '0346 1122334',
      patientType: 'FAMILY_MEMBER',
      serviceMode: 'IN_CLINIC',
      symptoms: ['Joint Pain', 'Knee Swelling'],
      description: 'For my mother: knee pain and swelling, hard to climb stairs.',
      scheduledAt: at(addDays(today, 3), 17, 0),
      status: 'PENDING',
    }),
    row({
      patientName: 'Omar Farooq',
      patientPhone: '0300 9876543',
      patientType: 'SELF',
      serviceMode: 'VIDEO',
      symptoms: ['Cough & Cold'],
      description: null,
      scheduledAt: at(addDays(today, 4), 9, 30),
      status: 'PENDING',
    }),

    // --- Completed this week (earnings history) ---
    ...(
      [
        ['Ahmed Raza', '0300 1234567', 'IN_CLINIC', -6, 18, ['Fever']],
        ['Fatima Noor', '0345 9988776', 'VIDEO', -5, 11, ['Child Fever']],
        ['Kamran Ali', '0322 5566778', 'IN_CLINIC', -3, 17, ['High BP']],
        ['Sana Malik', '0321 7654321', 'TEXT', -2, 13, ['Skin Rash']],
        ['Bilal Hussain', '0333 4455667', 'VIDEO', -1, 20, ['Headache']],
      ] as const
    ).map(([name, phone, mode, dayOffset, hour, symptoms]) => {
      const when = at(addDays(today, dayOffset), hour, 0);
      return row({
        patientName: name,
        patientPhone: phone,
        patientType: 'SELF',
        serviceMode: mode,
        symptoms: [...symptoms],
        description: null,
        scheduledAt: when,
        completedAt: when,
        status: 'COMPLETED',
      });
    }),
  ];
}
