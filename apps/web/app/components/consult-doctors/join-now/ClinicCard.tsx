'use client';

import type { ClinicForm, FormErrors } from './form-model';
import ClinicLocationPicker from './ClinicLocationPicker';
import ScheduleEditor from './ScheduleEditor';
import { Field, inputClass, inputErrorClass } from './ui';

interface Props {
  index: number;
  clinic: ClinicForm;
  errors: FormErrors;
  onChange: (patch: Partial<ClinicForm>) => void;
  onRemove: () => void;
}

export default function ClinicCard({ index, clinic, errors, onChange, onRemove }: Props) {
  const p = `clinics.${index}`;
  const id = (name: string) => `${clinic.key}-${name}`;
  const err = (name: string) => errors[`${p}.${name}`];

  return (
    <div className="rounded-2xl border border-[#e2ddd2] bg-[#faf8f3] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#141b34]">Clinic {index + 1}</h3>
        <span className="text-[11px] text-[#8a6d1f]">* required</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id={id('name')} errorKey={`${p}.name`} label="Clinic name" required error={err('name')}>
          <input
            id={id('name')}
            value={clinic.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. City Care Clinic"
            className={`${inputClass} ${err('name') ? inputErrorClass : ''}`}
          />
        </Field>
        <Field id={id('phone')} errorKey={`${p}.phone`} label="Clinic phone" error={err('phone')}>
          <input
            id={id('phone')}
            type="tel"
            value={clinic.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+92 51 234 5678"
            className={`${inputClass} ${err('phone') ? inputErrorClass : ''}`}
          />
        </Field>
        <Field id={id('fee')} errorKey={`${p}.inPersonFee`} label="In-person fee (PKR)" required error={err('inPersonFee')}>
          <input
            id={id('fee')}
            type="number"
            inputMode="numeric"
            min={0}
            value={clinic.inPersonFee}
            onChange={(e) => onChange({ inPersonFee: e.target.value })}
            placeholder="e.g. 4000"
            className={`${inputClass} ${err('inPersonFee') ? inputErrorClass : ''}`}
          />
        </Field>
      </div>

      <div className="mt-4">
        <ClinicLocationPicker
          idPrefix={p}
          address={clinic.address}
          latitude={clinic.latitude}
          longitude={clinic.longitude}
          error={err('address')}
          onChange={(patch) => onChange(patch)}
        />
      </div>

      <div className="mt-5">
        <h4 className="mb-3 text-sm font-semibold text-[#141b34]">Days and times at this clinic</h4>
        <ScheduleEditor
          idPrefix={`${p}.schedule`}
          schedule={clinic.schedule}
          onChange={(schedule) => onChange({ schedule })}
          error={err('schedule')}
        />
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="mt-4 rounded-lg border border-[#d9d3c6] bg-white px-4 py-2 text-xs font-semibold text-[#3a3f52] transition hover:border-red-300 hover:text-red-600"
      >
        Remove clinic
      </button>
    </div>
  );
}
