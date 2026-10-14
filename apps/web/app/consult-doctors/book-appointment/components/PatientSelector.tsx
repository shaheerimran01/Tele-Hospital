'use client';

import { useState } from 'react';
import { Check, CircleAlert, LoaderCircle, Phone, Plus, UserRound, Users } from 'lucide-react';
import { relationLabel, type FamilyMember, type PatientType } from '@/app/lib/api/consultation';
import AddFamilyMemberModal from '@/app/components/consult-doctors/intake/AddFamilyMemberModal';

interface Props {
  userId: string;
  userName: string;
  userPhone: string | null;
  patientType: PatientType;
  onPatientTypeChange: (t: PatientType) => void;
  members: FamilyMember[];
  membersLoading: boolean;
  membersError: string | null;
  selectedMemberId: string | null;
  onSelectMember: (id: string) => void;
  onMemberCreated: (m: FamilyMember) => void;
  showError: boolean;
  /** set when the patient came from an intake that was for a specific person */
  lockedHint?: string | null;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export default function PatientSelector({
  userId,
  userName,
  userPhone,
  patientType,
  onPatientTypeChange,
  members,
  membersLoading,
  membersError,
  selectedMemberId,
  onSelectMember,
  onMemberCreated,
  showError,
  lockedHint,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const radio = (value: PatientType, label: string, Icon: typeof Users, text: React.ReactNode) => {
    const active = patientType === value;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onPatientTypeChange(value)}
        className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
          active ? 'border-[#ff6f61] bg-[#fff5f3] ring-1 ring-[#ff6f61]' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            active ? 'border-[#ff6f61]' : 'border-gray-300'
          }`}
          aria-hidden
        >
          {active && <span className="h-2.5 w-2.5 rounded-full bg-[#ff6f61]" />}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Icon className="h-4 w-4 text-gray-400" /> {label}
          </span>
          <span className="mt-0.5 block text-xs text-gray-500">{text}</span>
        </span>
      </button>
    );
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff6f61] text-xs font-bold text-white">2</span>
        <div>
          <h2 className="text-base font-bold text-gray-900">Who is this consultation for?</h2>
          <p className="text-xs text-gray-500">The doctor will see this patient's name on the appointment.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Patient">
        {radio(
          'SELF',
          'For Myself',
          UserRound,
          <>
            {userName}
            {userPhone && (
              <span className="ml-1 inline-flex items-center gap-1">
                · <Phone className="h-3 w-3" /> {userPhone}
              </span>
            )}
          </>,
        )}
        {radio('FAMILY_MEMBER', 'For Family Member', Users, 'Spouse, child, parent or another relative')}
      </div>

      {lockedHint && <p className="mt-3 text-xs text-gray-500">{lockedHint}</p>}

      {patientType === 'FAMILY_MEMBER' && (
        <div className="mt-5">
          {membersLoading ? (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading family members…
            </p>
          ) : membersError ? (
            <p className="flex items-center gap-2 text-sm text-red-600">
              <CircleAlert className="h-4 w-4" /> {membersError}
            </p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-500">You haven't added any family members yet.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Family member">
              {members.map((m) => {
                const active = m.id === selectedMemberId;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onSelectMember(m.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                        active ? 'border-[#ff6f61] bg-[#fff5f3]' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff0ed] text-sm font-bold text-[#e8453b]">
                        {initialsOf(m.fullName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{m.fullName}</span>
                        <span className="block text-xs text-gray-500">
                          {relationLabel(m.relation)} · {m.gender}
                          {m.age != null ? ` · ${m.age} yrs` : ''}
                        </span>
                      </span>
                      {active && <Check className="h-4 w-4 shrink-0 text-[#e8453b]" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#ff6f61] px-3.5 py-2 text-sm font-semibold text-[#e8453b] transition hover:bg-[#fff5f3]"
          >
            <Plus className="h-4 w-4" /> Add Family Member
          </button>

          {showError && !selectedMemberId && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-red-600">
              <CircleAlert className="h-4 w-4" /> Please choose a family member.
            </p>
          )}
        </div>
      )}

      <AddFamilyMemberModal
        open={modalOpen}
        userId={userId}
        onClose={() => setModalOpen(false)}
        onCreated={(m) => {
          onMemberCreated(m);
          setModalOpen(false);
        }}
      />
    </section>
  );
}
