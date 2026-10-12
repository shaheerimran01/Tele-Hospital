'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import {
  RELATION_OPTIONS,
  createFamilyMemberApi,
  type FamilyMember,
  type RelationType,
} from '@/app/lib/api/consultation';

interface Props {
  open: boolean;
  userId: string;
  onClose: () => void;
  onCreated: (member: FamilyMember) => void;
}

const EMPTY_FORM = {
  fullName: '',
  relation: '' as RelationType | '',
  gender: '' as 'Male' | 'Female' | '',
  age: '',
};

export default function AddFamilyMemberModal({
  open,
  userId,
  onClose,
  onCreated,
}: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset the form each time the modal opens
  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setError(null);
    const t = setTimeout(() => nameRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const ageNumber = Number(form.age);
  const isValid =
    form.fullName.trim().length > 1 &&
    form.relation !== '' &&
    form.gender !== '' &&
    form.age !== '' &&
    Number.isInteger(ageNumber) &&
    ageNumber >= 0 &&
    ageNumber <= 120;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || saving) return;

    setSaving(true);
    setError(null);
    try {
      const member = await createFamilyMemberApi(userId, {
        fullName: form.fullName.trim(),
        relation: form.relation as RelationType,
        gender: form.gender as 'Male' | 'Female',
        age: ageNumber,
      });
      onCreated(member);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add family member.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-gray-900/50 p-0 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-family-member-title"
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 id="add-family-member-title" className="text-base font-bold text-gray-900">
              Add family member
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              They&apos;ll be saved for future consultations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div>
            <label htmlFor="fm-name" className="block text-xs font-semibold text-gray-700 mb-1.5">
              Full name
            </label>
            <input
              ref={nameRef}
              id="fm-name"
              type="text"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="e.g. Ayesha Khan"
              maxLength={100}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/15"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fm-relation" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Relation
              </label>
              <select
                id="fm-relation"
                value={form.relation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, relation: e.target.value as RelationType }))
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/15"
              >
                <option value="" disabled>
                  Select
                </option>
                {RELATION_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fm-age" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Age (years)
              </label>
              <input
                id="fm-age"
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                placeholder="e.g. 34"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/15"
              />
            </div>
          </div>

          <fieldset>
            <legend className="block text-xs font-semibold text-gray-700 mb-1.5">Gender</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['Male', 'Female'] as const).map((g) => {
                const active = form.gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setForm((f) => ({ ...f, gender: g }))}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? 'border-[#ff6f61] bg-[#fff0ed] text-[#e8453b]'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || saving}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff6f61] py-2.5 text-sm font-bold text-white hover:bg-[#e8453b] disabled:bg-gray-300 transition"
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving…' : 'Add member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
