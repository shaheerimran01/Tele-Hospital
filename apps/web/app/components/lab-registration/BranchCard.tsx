'use client';

// One lab branch: name, medical director, council license and location (map picker).

import { useState } from 'react';
import { Building2, Trash2 } from 'lucide-react';
import { Field, inputClass, inputErrorClass } from '../consult-doctors/join-now/ui';
import ClinicLocationPicker from '../consult-doctors/join-now/ClinicLocationPicker';
import { branchTitle, type BranchForm, type FormErrors } from './form-model';

const BRANCH_WORDING = {
  title: 'Branch Location',
  titleHint: '(search, then drag the pin to the exact building)',
  searchLabel: 'Search the branch address or area',
  searchPlaceholder: 'Search the branch address or area, e.g. Gulberg III Lahore',
  noPin: 'No pin yet. Patients use the pin to find the nearest branch.',
  addressLabel: 'Branch Address',
  addressHint: 'filled from the map; add floor or shop number if needed',
  addressPlaceholder: 'e.g. Shop 12, Main Boulevard, Gulberg III, Lahore',
  place: 'branch',
};

interface Props {
  branch: BranchForm;
  index: number;
  canRemove: boolean;
  errors: FormErrors;
  onChange: (patch: Partial<BranchForm>) => void;
  onRemove: () => void;
}

export default function BranchCard({ branch, index, canRemove, errors, onChange, onRemove }: Props) {
  const [confirming, setConfirming] = useState(false);
  const id = (f: string) => `branches.${branch.id}.${f}`;
  const err = (f: string) => errors[id(f)];
  const [title, tag] = branchTitle(index).split(' · ');
  const hasData = !!(branch.name || branch.directorName || branch.councilLicenseNumber || branch.phone || branch.address || branch.latitude != null);

  const text = (f: 'name' | 'directorName' | 'councilLicenseNumber' | 'phone', props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      id={id(f)}
      type="text"
      value={branch[f]}
      onChange={(e) => onChange({ [f]: e.target.value })}
      aria-invalid={!!err(f)}
      className={`${inputClass} ${err(f) ? inputErrorClass : ''}`}
      {...props}
    />
  );

  return (
    <article
      id={`branch-${branch.id}`}
      aria-labelledby={`branch-${branch.id}-title`}
      className="scroll-mt-24 rounded-2xl border border-[#e2ddd2] bg-[#faf9f6] p-4 sm:p-5"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 id={`branch-${branch.id}-title`} className="flex items-center gap-2 text-sm font-semibold text-[#141b34]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141b34] text-white">
            <Building2 className="h-4 w-4" />
          </span>
          {title}
          {tag && <span className="rounded-full bg-[#e8f3ec] px-2 py-0.5 text-[11px] font-semibold text-[#2f7a4b]">{tag}</span>}
          {branch.name.trim() && <span className="font-normal text-[#6b6f80]">· {branch.name.trim()}</span>}
        </h3>
        {canRemove &&
          (confirming ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-[#3a3f52]">Remove this branch?</span>
              <button type="button" onClick={onRemove} className="rounded-lg bg-red-600 px-2.5 py-1.5 font-semibold text-white hover:bg-red-700">
                Remove
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-2.5 py-1.5 font-semibold text-[#3a3f52] hover:bg-[#ece9e2]">
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => (hasData ? setConfirming(true) : onRemove())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove Branch
            </button>
          ))}
      </header>

      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field id={id('name')} label="Branch Name / Identifier" required error={err('name')} className="sm:col-span-2">
          {text('name', { placeholder: index === 0 ? 'e.g. Gulberg Main Center' : 'e.g. Satellite Town Branch' })}
        </Field>
        <Field id={id('directorName')} label="Medical Director / Pathologist Name" required error={err('directorName')}>
          {text('directorName', { placeholder: 'e.g. Dr. Sana Malik', autoComplete: 'off' })}
        </Field>
        <Field id={id('councilLicenseNumber')} label="Medical Council License Number" hint="(PMDC / PMC)" required error={err('councilLicenseNumber')}>
          {text('councilLicenseNumber', { placeholder: 'e.g. 12345-P', autoCapitalize: 'characters' })}
        </Field>
        <Field id={id('phone')} label="Branch Phone Number / Helpline" hint="(optional)" error={err('phone')} className="sm:col-span-2">
          {text('phone', { type: 'tel', inputMode: 'tel', placeholder: 'e.g. 042 35761234 or 0300 1234567', autoComplete: 'off' })}
        </Field>
        <div className="sm:col-span-2" id={`field-${id('location')}`}>
          <ClinicLocationPicker
            idPrefix={id('address').replace(/\.address$/, '')}
            address={branch.address}
            latitude={branch.latitude}
            longitude={branch.longitude}
            error={err('address')}
            pinError={err('location')}
            wording={BRANCH_WORDING}
            onChange={(p) => onChange(p)}
          />
        </div>
      </div>
    </article>
  );
}
