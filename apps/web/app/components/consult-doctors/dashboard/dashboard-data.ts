// Helpers for the doctor dashboard. All appointment data comes from the API
// (lib/api/doctor-dashboard.ts); nothing here is sample data.

export type {
  DoctorAppointment as DashboardAppointment,
  AppointmentStatus,
  DoctorDashboardData,
} from '@/app/lib/api/doctor-dashboard';
export type { ServiceMode } from '@/app/lib/api/doctors';

/**
 * "Tue, 13 Oct". Appointment dates are calendar days stored at UTC midnight,
 * so they are read in UTC to avoid showing the previous/next day.
 */
export const formatDay = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00.000Z` : iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/** "09:30 AM" -> "9:30 AM" */
export const displayTime = (t: string) => t.replace(/^0(\d)/, '$1');

/** "Today", "Tomorrow" or "Thu, 15 Oct", compared with the server's today ("YYYY-MM-DD") */
export function relativeDay(appointmentDate: string, today: string) {
  const day = appointmentDate.slice(0, 10);
  if (day === today) return 'Today';
  const t = new Date(`${today}T00:00:00.000Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  if (day === t.toISOString().slice(0, 10)) return 'Tomorrow';
  if (day < today) return `${formatDay(appointmentDate)} (past)`;
  return formatDay(appointmentDate);
}

/** Local "YYYY-MM-DD" for <input type="date"> */
export const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
    .replace(/^(dr|prof)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

export const relationLabel = (r: string) => r.charAt(0) + r.slice(1).toLowerCase();

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
