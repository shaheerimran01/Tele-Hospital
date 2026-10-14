'use client';

import { useEffect, useRef } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  LoaderCircle,
  MessageSquareText,
  Moon,
  Sun,
  Sunrise,
  Video,
} from 'lucide-react';
import type { ServiceMode } from '@/app/lib/api/doctors';
import {
  displayTime,
  formatPkr,
  groupSlots,
  type DateOption,
  type DayPart,
  type ServiceOption,
} from './booking-model';

const MODE_ICON: Record<ServiceMode, typeof Video> = {
  IN_CLINIC: Building2,
  VIDEO: Video,
  TEXT: MessageSquareText,
};

const PART_ICON: Record<DayPart, typeof Sun> = { Morning: Sunrise, Afternoon: Sun, Evening: Moon };

export interface SlotsState {
  loading: boolean;
  error: string | null;
  slots: { startTime: string; endTime: string }[];
}

interface Props {
  options: ServiceOption[];
  option: ServiceOption;
  onOptionChange: (o: ServiceOption) => void;
  dates: DateOption[];
  date: string | null;
  onDateChange: (iso: string) => void;
  state: SlotsState;
  slot: string | null;
  onSlotChange: (startTime: string) => void;
  onRetry: () => void;
  /** next working day after the selected one, if any */
  nextWorkingDay: DateOption | null;
  showError: boolean;
}

export default function SlotPicker({
  options,
  option,
  onOptionChange,
  dates,
  date,
  onDateChange,
  state,
  slot,
  onSlotChange,
  onRetry,
  nextWorkingDay,
  showError,
}: Props) {
  const stripRef = useRef<HTMLDivElement>(null);

  // Keep the selected date in view
  useEffect(() => {
    if (!date) return;
    stripRef.current
      ?.querySelector<HTMLElement>(`[data-date="${date}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [date]);

  const scrollBy = (dir: 1 | -1) => stripRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  const groups = groupSlots(state.slots);
  const works = (d: DateOption) => option.workingDays.includes(d.dayName);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff6f61] text-xs font-bold text-white">1</span>
        <div>
          <h2 className="text-base font-bold text-gray-900">Choose date &amp; time</h2>
          <p className="text-xs text-gray-500">Each consultation is a 30-minute slot.</p>
        </div>
      </header>

      {/* Consultation type */}
      {options.length > 1 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Consultation type</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Consultation type">
            {options.map((o) => {
              const Icon = MODE_ICON[o.mode];
              const active = o.key === option.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onOptionChange(o)}
                  className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                    active
                      ? 'border-[#ff6f61] bg-[#fff5f3] ring-1 ring-[#ff6f61]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      active ? 'bg-[#ff6f61] text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900">{o.label}</span>
                      <span className="shrink-0 text-sm font-bold text-gray-900">{formatPkr(o.fee)}</span>
                    </span>
                    {o.detail && <span className="mt-0.5 line-clamp-1 block text-xs text-gray-500">{o.detail}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Date strip */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date</p>
        <div className="hidden gap-1 sm:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Earlier dates"
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:border-gray-300 hover:text-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Later dates"
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:border-gray-300 hover:text-gray-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={stripRef}
        className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]"
        role="radiogroup"
        aria-label="Date"
      >
        {dates.map((d) => {
          const active = d.iso === date;
          const open = works(d);
          return (
            <button
              key={d.iso}
              type="button"
              role="radio"
              aria-checked={active}
              data-date={d.iso}
              disabled={!open}
              onClick={() => onDateChange(d.iso)}
              className={`flex w-[68px] shrink-0 snap-start flex-col items-center rounded-xl border px-2 py-2.5 transition ${
                active
                  ? 'border-[#ff6f61] bg-[#ff6f61] text-white shadow-sm'
                  : open
                    ? 'border-gray-200 bg-white text-gray-900 hover:border-[#ff6f61]'
                    : 'cursor-not-allowed border-dashed border-gray-200 bg-gray-50 text-gray-400'
              }`}
            >
              <span className={`text-[11px] font-semibold ${active ? 'text-white/90' : open ? 'text-gray-500' : ''}`}>
                {d.weekday}
              </span>
              <span className="mt-0.5 text-lg font-bold leading-none">{d.day}</span>
              <span className={`mt-1 text-[11px] ${active ? 'text-white/90' : open ? 'text-gray-500' : ''}`}>
                {open ? d.month : 'Off'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slots */}
      <div className="mt-5" aria-live="polite">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Available times</p>

        {option.workingDays.length === 0 ? (
          <Notice text="This doctor hasn't added weekly hours for this consultation type yet." />
        ) : !date ? (
          <Notice text="No working days in the next two weeks. Try another consultation type." />
        ) : state.loading ? (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-500">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Checking available times…
          </div>
        ) : state.error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 shrink-0" /> {state.error}
            </span>
            <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
              Try again
            </button>
          </div>
        ) : state.slots.length === 0 ? (
          <div className="rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-600">
            <p className="font-semibold text-gray-800">No free times on this day</p>
            <p className="mt-0.5">All slots are booked or the doctor's hours have already passed.</p>
            {nextWorkingDay && (
              <button
                type="button"
                onClick={() => onDateChange(nextWorkingDay.iso)}
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:border-[#ff6f61] hover:text-[#e8453b]"
              >
                Check {nextWorkingDay.weekday === 'Tomorrow' ? 'tomorrow' : `${nextWorkingDay.weekday}, ${nextWorkingDay.day} ${nextWorkingDay.month}`}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {(Object.keys(groups) as DayPart[])
              .filter((part) => groups[part].length > 0)
              .map((part) => {
                const Icon = PART_ICON[part];
                return (
                  <div key={part}>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <Icon className="h-4 w-4 text-gray-400" /> {part}
                      <span className="text-xs font-normal text-gray-400">
                        · {groups[part].length} {groups[part].length === 1 ? 'slot' : 'slots'}
                      </span>
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5" role="radiogroup" aria-label={`${part} times`}>
                      {groups[part].map((s) => {
                        const active = s.startTime === slot;
                        return (
                          <button
                            key={s.startTime}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onSlotChange(s.startTime)}
                            className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                              active
                                ? 'border-[#ff6f61] bg-[#ff6f61] text-white shadow-sm'
                                : 'border-gray-200 bg-white text-gray-800 hover:border-[#ff6f61] hover:text-[#e8453b]'
                            }`}
                          >
                            {displayTime(s.startTime)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {showError && !slot && !state.loading && state.slots.length > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-red-600">
            <Clock className="h-4 w-4" /> Please choose a time.
          </p>
        )}
      </div>
    </section>
  );
}

function Notice({ text }: { text: string }) {
  return <p className="rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-600">{text}</p>;
}
