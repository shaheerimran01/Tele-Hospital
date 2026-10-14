'use client';

import Link from 'next/link';
import {
  BadgeCheck,
  Ban,
  CalendarClock,
  CheckCheck,
  CircleAlert,
  Clock,
  Hospital,
  Hourglass,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  UserX,
  Video,
  X,
} from 'lucide-react';
import type { AppointmentStatus, DoctorStatus, PaymentStatus, ServiceMode } from '@/lib/api/doctorPortal';

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const pkr = (n: number | null | undefined) => (n == null ? '—' : `PKR ${n.toLocaleString('en-PK')}`);

/** "Thu, 22 Oct 2026" from an ISO date (appointment dates are stored at UTC midnight) */
export function formatDate(iso: string | null | undefined, opts: { weekday?: boolean; utc?: boolean } = {}) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: opts.weekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: opts.utc ? 'UTC' : undefined,
  });
}

/** Appointment calendar day (stored as UTC midnight, so read it in UTC) */
export const appointmentDay = (iso: string, weekday = false) => formatDate(iso, { utc: true, weekday });

/** "09:30 AM" -> "9:30 AM" */
export const displayTime = (t: string | null | undefined) => (t ? t.replace(/^0(\d)/, '$1') : '—');

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  return formatDate(iso);
}

export const personName = (u: { firstName: string | null; lastName: string | null; phone?: string | null } | null | undefined) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.phone || 'Unnamed user';

export const initials = (name: string) =>
  name
    .replace(/^(dr|prof)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

export const relationLabel = (r: string) => r.charAt(0) + r.slice(1).toLowerCase();

export const shortId = (id: string) => id.slice(0, 8).toUpperCase();

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; className: string; Icon: typeof Clock }> = {
  PENDING: { label: 'Pending', className: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: Hourglass },
  CONFIRMED: { label: 'Confirmed', className: 'bg-blue-50 text-blue-700 ring-blue-200', Icon: BadgeCheck },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Icon: CheckCheck },
  CANCELLED: { label: 'Cancelled', className: 'bg-rose-50 text-rose-700 ring-rose-200', Icon: Ban },
  RESCHEDULED: { label: 'Rescheduled', className: 'bg-violet-50 text-violet-700 ring-violet-200', Icon: CalendarClock },
  NO_SHOW: { label: 'No-show', className: 'bg-slate-100 text-slate-700 ring-slate-200', Icon: UserX },
};

export const APPOINTMENT_STATUS_LABELS = Object.fromEntries(
  Object.entries(APPOINTMENT_STATUS).map(([k, v]) => [k, v.label]),
) as Record<AppointmentStatus, string>;

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const s = APPOINTMENT_STATUS[status] ?? APPOINTMENT_STATUS.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.className}`}>
      <s.Icon className="h-3.5 w-3.5" /> {s.label}
    </span>
  );
}

const DOCTOR_STATUS: Record<DoctorStatus, { label: string; className: string; Icon: typeof Clock }> = {
  PENDING: { label: 'Pending', className: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: Hourglass },
  APPROVED: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Icon: BadgeCheck },
  REJECTED: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 ring-rose-200', Icon: Ban },
};

export function DoctorStatusBadge({ status }: { status: DoctorStatus }) {
  const s = DOCTOR_STATUS[status] ?? DOCTOR_STATUS.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.className}`}>
      <s.Icon className="h-3.5 w-3.5" /> {s.label}
    </span>
  );
}

export const MODE_LABELS: Record<ServiceMode, string> = {
  IN_CLINIC: 'In-Clinic',
  VIDEO: 'Video Call',
  TEXT: 'Text Consult',
};

export function ModeBadge({ mode }: { mode: ServiceMode }) {
  const Icon = mode === 'VIDEO' ? Video : mode === 'TEXT' ? MessageSquareText : Hospital;
  const tone =
    mode === 'VIDEO' ? 'bg-sky-50 text-sky-700' : mode === 'TEXT' ? 'bg-violet-50 text-violet-700' : 'bg-teal-50 text-teal-700';
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" /> {MODE_LABELS[mode]}
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const tone =
    status === 'PAID'
      ? 'text-emerald-700'
      : status === 'FAILED'
        ? 'text-rose-700'
        : status === 'REFUNDED'
          ? 'text-slate-600'
          : 'text-amber-700';
  const label = { PAID: 'Paid', PENDING: 'Unpaid', FAILED: 'Failed', REFUNDED: 'Refunded' }[status] ?? status;
  return <span className={`text-xs font-semibold ${tone}`}>{label}</span>;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  COD: 'Cash / Pay at clinic',
  JAZZCASH: 'JazzCash',
  EASYPAISA: 'Easypaisa',
  CARD: 'Debit / Credit card',
};

export function PatientTypeBadge({ type }: { type: 'SELF' | 'FAMILY_MEMBER' }) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        type === 'SELF' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700'
      }`}
    >
      {type === 'SELF' ? 'Self' : 'Family member'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Layout pieces
// ---------------------------------------------------------------------------

export function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-20 w-20 text-2xl' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`${box} shrink-0 rounded-full object-cover ring-1 ring-slate-200`} />
  ) : (
    <span className={`${box} flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 ring-1 ring-slate-200`}>
      {initials(name)}
    </span>
  );
}

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
  padded = true,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block w-full sm:max-w-sm">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </label>
  );
}

export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm" role="tablist" aria-label={label}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function LoadingState({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-5 py-14 text-sm text-slate-500">
      <LoaderCircle className="h-4 w-4 animate-spin" /> {text}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
      <CircleAlert className="h-6 w-6 text-rose-500" />
      <p className="max-w-md text-sm text-slate-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
    </div>
  );
}

/** Small "View ... ➔" link button used in tables */
export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
    >
      {children} <span aria-hidden>➔</span>
    </Link>
  );
}

/** Label/value rows */
export function InfoList({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{k}</dt>
          <dd className="mt-0.5 break-words text-slate-900">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Table shell with horizontal scroll on small screens */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-5 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
