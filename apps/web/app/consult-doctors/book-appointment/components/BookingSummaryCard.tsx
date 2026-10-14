'use client';

import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarDays,
  CircleAlert,
  CreditCard,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  UserRound,
  Video,
} from 'lucide-react';
import { apiFileUrl, type DoctorProfile } from '@/app/lib/api/doctors';
import {
  displayDate,
  displayTime,
  formatPkr,
  MODE_LABELS,
  PAYMENT_CHOICES,
  type PaymentChoice,
  type ServiceOption,
} from './booking-model';

const CHOICE_ICON: Record<PaymentChoice, typeof Banknote> = {
  COD: Banknote,
  WALLET: Smartphone,
  CARD: CreditCard,
};

interface Props {
  doctor: DoctorProfile;
  option: ServiceOption;
  date: string | null;
  slot: { startTime: string; endTime: string } | null;
  patientLabel: string | null;
  reason: string[];
  payment: PaymentChoice;
  onPaymentChange: (p: PaymentChoice) => void;
  wallet: 'JAZZCASH' | 'EASYPAISA';
  onWalletChange: (w: 'JAZZCASH' | 'EASYPAISA') => void;
  missing: string[];
  showErrors: boolean;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
}

export default function BookingSummaryCard({
  doctor,
  option,
  date,
  slot,
  patientLabel,
  reason,
  payment,
  onPaymentChange,
  wallet,
  onWalletChange,
  missing,
  showErrors,
  submitting,
  error,
  onConfirm,
}: Props) {
  const clinic = option.clinicId ? doctor.clinics.find((c) => c.id === option.clinicId) : null;
  const ModeIcon = option.mode === 'VIDEO' ? Video : option.mode === 'TEXT' ? MessageSquareText : Building2;
  // Cash only makes sense when the patient goes to the clinic
  const choices = PAYMENT_CHOICES.filter((c) => c.value !== 'COD' || option.mode === 'IN_CLINIC');
  const platformFee = 0;
  const total = option.fee + platformFee;

  return (
    <aside className="rounded-2xl border border-gray-200 bg-white lg:sticky lg:top-24">
      {/* Doctor brief */}
      <div className="flex items-center gap-3.5 border-b border-gray-100 p-5">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
          {doctor.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={apiFileUrl(doctor.profilePhotoUrl)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-gray-400">
              <Stethoscope className="h-6 w-6" />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-base font-bold text-gray-900">
            {doctor.fullName}
            {doctor.status === 'APPROVED' && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-[#1f8a5b]" aria-label="PMDC verified" />
            )}
          </p>
          <p className="truncate text-xs text-gray-500">{doctor.specialisations[0] ?? doctor.title}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {doctor.experienceYears} {doctor.experienceYears === 1 ? 'year' : 'years'} experience · {doctor.degrees}
          </p>
        </div>
      </div>

      {/* Booking details */}
      <dl className="space-y-3.5 border-b border-gray-100 p-5 text-sm">
        <div className="flex gap-3">
          <dt className="sr-only">Consultation</dt>
          <ModeIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <dd className="min-w-0">
            <p className="font-semibold text-gray-900">{MODE_LABELS[option.mode]}</p>
            {clinic && (
              <p className="mt-0.5 flex items-start gap-1 text-xs text-gray-500">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  <span className="font-medium text-gray-700">{clinic.name}</span> · {clinic.address}
                </span>
              </p>
            )}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="sr-only">Time</dt>
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <dd>
            {date && slot ? (
              <span className="inline-flex items-center rounded-lg bg-[#fff0ed] px-2.5 py-1 text-sm font-semibold text-[#c2392f]">
                {displayDate(date)} • {displayTime(slot.startTime)}
              </span>
            ) : (
              <span className="text-gray-400">Choose a date and time</span>
            )}
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="sr-only">Patient</dt>
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <dd className={patientLabel ? 'text-gray-900' : 'text-gray-400'}>{patientLabel ?? 'Choose the patient'}</dd>
        </div>
        {reason.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-7">
            {reason.slice(0, 4).map((r) => (
              <span key={r} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {r}
              </span>
            ))}
            {reason.length > 4 && <span className="text-xs text-gray-400">+{reason.length - 4} more</span>}
          </div>
        )}
      </dl>

      {/* Fee summary */}
      <div className="border-b border-gray-100 p-5">
        <h3 className="mb-3 text-sm font-bold text-gray-900">Fee summary</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600">Consultation fee</dt>
            <dd className="font-medium text-gray-900">{formatPkr(option.fee)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600">Service / platform fee</dt>
            <dd className="text-gray-900">
              {formatPkr(platformFee)}{' '}
              <span className="ml-1 rounded bg-[#e8f6ee] px-1.5 py-0.5 text-[11px] font-semibold text-[#1f8a5b]">Waived</span>
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-dashed border-gray-200 pt-2.5 text-base">
            <dt className="font-bold text-gray-900">Total payable</dt>
            <dd className="font-bold text-gray-900">{formatPkr(total)}</dd>
          </div>
        </dl>
      </div>

      {/* Payment */}
      <div className="p-5">
        <h3 className="mb-3 text-sm font-bold text-gray-900">Payment method</h3>
        <div className="space-y-2" role="radiogroup" aria-label="Payment method">
          {choices.map((c) => {
            const Icon = CHOICE_ICON[c.value];
            const active = payment === c.value;
            return (
              <div key={c.value}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onPaymentChange(c.value)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                    active ? 'border-[#ff6f61] bg-[#fff5f3]' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      active ? 'border-[#ff6f61]' : 'border-gray-300'
                    }`}
                    aria-hidden
                  >
                    {active && <span className="h-2.5 w-2.5 rounded-full bg-[#ff6f61]" />}
                  </span>
                  <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{c.label}</span>
                    <span className="block text-xs text-gray-500">{c.hint}</span>
                  </span>
                </button>
                {active && c.value === 'WALLET' && (
                  <div className="mt-2 flex gap-2 pl-8" role="radiogroup" aria-label="Wallet">
                    {(['JAZZCASH', 'EASYPAISA'] as const).map((w) => (
                      <button
                        key={w}
                        type="button"
                        role="radio"
                        aria-checked={wallet === w}
                        onClick={() => onWalletChange(w)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          wallet === w
                            ? 'border-[#ff6f61] bg-[#ff6f61] text-white'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {w === 'JAZZCASH' ? 'JazzCash' : 'Easypaisa'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
          Nothing is charged now. Your appointment is saved as unpaid until the payment is collected.
        </p>

        {showErrors && missing.length > 0 && (
          <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> Please choose {missing.join(' and ')}.
          </p>
        )}
        {error && (
          <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff6f61] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e8453b] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" /> Booking your appointment…
            </>
          ) : (
            <>
              Confirm &amp; Book Appointment <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
