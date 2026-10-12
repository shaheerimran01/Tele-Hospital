'use client';

import { Check, LoaderCircle, Plus, User, Users } from 'lucide-react';
import {
  relationLabel,
  type FamilyMember,
  type PatientType,
} from '@/app/lib/api/consultation';
import SectionCard from './SectionCard';

interface Props {
  patientType: PatientType;
  onPatientTypeChange: (type: PatientType) => void;
  selfName: string;
  members: FamilyMember[];
  membersLoading: boolean;
  membersError: string | null;
  selectedMemberId: string | null;
  onSelectMember: (id: string) => void;
  onAddMember: () => void;
  showError: boolean;
}

export default function PatientSelection({
  patientType,
  onPatientTypeChange,
  selfName,
  members,
  membersLoading,
  membersError,
  selectedMemberId,
  onSelectMember,
  onAddMember,
  showError,
}: Props) {
  const tabs: { value: PatientType; label: string; icon: typeof User }[] = [
    { value: 'SELF', label: 'For myself', icon: User },
    { value: 'FAMILY_MEMBER', label: 'For a family member', icon: Users },
  ];

  return (
    <SectionCard step={1} title="Who is this consultation for?">
      <div role="radiogroup" aria-label="Patient" className="grid grid-cols-2 gap-2 sm:gap-3">
        {tabs.map(({ value, label, icon: Icon }) => {
          const active = patientType === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onPatientTypeChange(value)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 sm:px-4 py-3 text-left transition ${
                active
                  ? 'border-[#ff6f61] bg-[#fff0ed] ring-1 ring-[#ff6f61]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  active ? 'bg-[#ff6f61] text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{label}</span>
                {value === 'SELF' && (
                  <span className="block truncate text-xs text-gray-500">{selfName}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {patientType === 'FAMILY_MEMBER' && (
        <div className="mt-4">
          {membersLoading ? (
            <div className="flex items-center gap-2 py-3 text-xs text-gray-500">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading family members…
            </div>
          ) : membersError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{membersError}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {members.map((m) => {
                const active = selectedMemberId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMember(m.id)}
                    aria-pressed={active}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? 'border-[#ff6f61] bg-[#fff0ed]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                      {m.fullName.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {m.fullName}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {relationLabel(m.relation)} · {m.gender}
                        {m.age != null ? ` · ${m.age} yrs` : ''}
                      </span>
                    </span>
                    {active && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff6f61] text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onAddMember}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#ff6f61]/60 px-3 py-3 text-sm font-semibold text-[#e8453b] hover:bg-[#fff0ed] transition"
              >
                <Plus className="h-4 w-4" /> Add new family member
              </button>
            </div>
          )}

          {members.length === 0 && !membersLoading && !membersError && (
            <p className="mt-2 text-xs text-gray-500">
              No family members saved yet. Add one to continue.
            </p>
          )}

          {showError && !selectedMemberId && (
            <p className="mt-2 text-xs font-medium text-red-600">
              Select a family member to continue.
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}
