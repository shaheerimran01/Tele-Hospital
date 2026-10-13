'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { EXPERIENCE_OPTIONS } from './options';
import { inputClass, inputErrorClass } from './ui';

const CUSTOM = 'custom';

interface Props {
  id: string;
  value: string; // whole years as a string, '' when not chosen
  onChange: (value: string) => void;
  invalid?: boolean;
}

/**
 * Dropdown of 1–30+ years. "30+ Years" and "Type exact number" reveal a
 * number box so doctors can enter the exact figure (0–70).
 */
export default function ExperienceSelect({ id, value, onChange, invalid }: Props) {
  const n = Number(value);
  const inList = value !== '' && Number.isInteger(n) && n >= 1 && n < 30;
  const [manual, setManual] = useState(false);
  const showNumber = manual || (value !== '' && !inList);

  const selectValue = value === '' && !manual ? '' : inList && !manual ? value : n >= 30 && !manual ? '30' : CUSTOM;

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <select
          id={id}
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === CUSTOM) {
              setManual(true);
              return;
            }
            setManual(false);
            onChange(v);
          }}
          className={`${inputClass} appearance-none pr-9 ${invalid ? inputErrorClass : ''} ${
            value === '' && !manual ? 'text-gray-400' : ''
          }`}
        >
          <option value="" disabled>
            Select years
          </option>
          {EXPERIENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="text-[#141b34]">
              {o.label}
            </option>
          ))}
          <option value={CUSTOM} className="text-[#141b34]">
            Type exact number…
          </option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8d99]" />
      </div>

      {showNumber && (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={70}
          aria-label="Exact years of experience"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Years"
          className={`${inputClass} w-24 ${invalid ? inputErrorClass : ''}`}
        />
      )}
    </div>
  );
}
