'use client';

import type { DayOfWeek } from '@/app/lib/api/doctors';
import { DAYS, setSameTime, updateScheduleDay, type WeeklySchedule } from './form-model';
import { Checkbox } from './ui';

interface Props {
  idPrefix: string;
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
  error?: string;
}

const timeInputClass =
  'w-[118px] sm:w-[128px] rounded-lg border border-[#d9d3c6] bg-white px-2.5 py-2 text-sm text-[#141b34] outline-none focus:border-[#141b34] focus:ring-2 focus:ring-[#141b34]/10 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-[#a9a59a]';

export default function ScheduleEditor({ idPrefix, schedule, onChange, error }: Props) {
  const update = (day: DayOfWeek, patch: { enabled?: boolean; start?: string; end?: string }) =>
    onChange(updateScheduleDay(schedule, day, patch));

  return (
    <div id={`field-${idPrefix}`}>
      <div className="mb-3">
        <Checkbox
          id={`${idPrefix}-same`}
          checked={schedule.sameTime}
          onChange={(v) => onChange(setSameTime(schedule, v))}
        >
          <span className="text-sm font-medium text-[#141b34]">
            Use the same time for all selected days{' '}
            <span className="font-normal text-[#8a8d99]">(untick to set each day separately)</span>
          </span>
        </Checkbox>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e2ddd2]">
        {DAYS.map((day, i) => {
          const slot = schedule.days[day];
          return (
            <div
              key={day}
              className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5 sm:px-4 ${
                i > 0 ? 'border-t border-[#e2ddd2]' : ''
              } ${slot.enabled ? 'bg-white' : 'bg-[#f3f1ec]'}`}
            >
              <Checkbox
                id={`${idPrefix}-${day}`}
                checked={slot.enabled}
                onChange={(v) => update(day, { enabled: v })}
              >
                <span
                  className={`w-24 text-sm ${slot.enabled ? 'text-[#141b34]' : 'text-[#a9a59a]'}`}
                >
                  {day}
                </span>
              </Checkbox>

              <div className="flex items-center gap-2 text-xs text-[#6b6f80]">
                <span>from</span>
                <input
                  type="time"
                  aria-label={`${day} from`}
                  value={slot.start}
                  disabled={!slot.enabled}
                  onChange={(e) => update(day, { start: e.target.value })}
                  className={timeInputClass}
                />
                <span>to</span>
                <input
                  type="time"
                  aria-label={`${day} to`}
                  value={slot.end}
                  disabled={!slot.enabled}
                  onChange={(e) => update(day, { end: e.target.value })}
                  className={timeInputClass}
                />
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
