'use client';

// /lab-dashboard/branches: every branch with its medical director, phone and
// address; each can be edited. Changing the director or council license of a
// verified lab sends it back for review.

import { useState } from 'react';
import { Building2, ExternalLink, LoaderCircle, MapPin, Pencil, Phone, Stethoscope } from 'lucide-react';
import { Field, inputClass, inputErrorClass } from '../consult-doctors/join-now/ui';
import { updateLabBranchApi, type LabBranchInfo } from '@/app/lib/api/lab-portal';
import { useLabPortal } from './LabPortalShell';
import { FixNotice, PageTitle, SaveMessage, cardClass } from './portal-ui';

const COUNCIL_RE = /^[A-Za-z0-9][A-Za-z0-9\-/ ]{1,18}[A-Za-z0-9]$/;
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,19}$/;

export default function LabBranchesPage() {
  const { overview } = useLabPortal();
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageTitle title="Branches" subtitle="Your collection centers and labs, with the medical director responsible for each." />
      <FixNotice target="branches" />
      {overview.branches.map((b, i) => (
        <BranchItem key={b.id} branch={b} index={i} />
      ))}
      <p className="text-xs text-[#8a8d99]">To add or close a branch, contact Tabibistan support.</p>
    </div>
  );
}

function BranchItem({ branch, index }: { branch: LabBranchInfo; index: number }) {
  const { overview, refresh } = useLabPortal();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: branch.name,
    medicalDirectorName: branch.medicalDirectorName,
    medicalCouncilLicenseNo: branch.medicalCouncilLicenseNo,
    phone: branch.phone ?? '',
    address: branch.address,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const idp = `branch-${branch.id}`;

  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors.name = 'Enter a branch name.';
  if (!draft.medicalDirectorName.trim()) errors.medicalDirectorName = 'Enter the medical director or pathologist name.';
  if (!COUNCIL_RE.test(draft.medicalCouncilLicenseNo.trim())) errors.medicalCouncilLicenseNo = 'Use 3 to 20 letters, numbers or dashes, e.g. 12345-P.';
  if (draft.phone.trim() && !PHONE_RE.test(draft.phone.trim())) errors.phone = 'Enter a valid phone number, e.g. 042 35761234.';
  if (draft.address.trim().length < 5) errors.address = 'Enter the full branch address.';
  const credentialsChanged =
    draft.medicalDirectorName.trim() !== branch.medicalDirectorName || draft.medicalCouncilLicenseNo.trim().toUpperCase() !== branch.medicalCouncilLicenseNo;

  const save = async () => {
    if (Object.keys(errors).length) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await updateLabBranchApi(branch.id, {
        name: draft.name.trim(),
        medicalDirectorName: draft.medicalDirectorName.trim(),
        medicalCouncilLicenseNo: draft.medicalCouncilLicenseNo.trim().toUpperCase(),
        phone: draft.phone.trim() || null,
        address: draft.address.trim(),
      });
      await refresh();
      setEditing(false);
      setMessage({ tone: 'ok', text: res.sentForReview ? 'Saved. Your lab was sent for a quick review because the medical director details changed.' : 'Branch details saved.' });
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Could not save the branch.' });
    } finally {
      setSaving(false);
    }
  };

  const input = (key: keyof typeof draft, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={`${idp}-${key}`}
      value={draft[key]}
      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
      aria-invalid={!!errors[key]}
      className={`${inputClass} ${errors[key] ? inputErrorClass : ''}`}
      {...props}
    />
  );

  const mapUrl = branch.latitude != null && branch.longitude != null ? `https://www.openstreetmap.org/?mlat=${branch.latitude}&mlon=${branch.longitude}#map=17/${branch.latitude}/${branch.longitude}` : null;

  return (
    <article className={cardClass} aria-labelledby={`${idp}-title`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${idp}-title`} className="flex items-center gap-2 text-base font-semibold text-[#141b34]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141b34] text-white">
            <Building2 className="h-4 w-4" />
          </span>
          {branch.name}
          {branch.isMainCenter && <span className="rounded-full bg-[#e8f3ec] px-2 py-0.5 text-[11px] font-semibold text-[#2f7a4b]">Main Center</span>}
          {!branch.isActive && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">Inactive</span>}
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setMessage(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9d3c6] bg-white px-3 py-1.5 text-xs font-semibold text-[#141b34] hover:bg-[#faf9f6]"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </header>

      {editing ? (
        <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field id={`${idp}-name`} label="Branch Name / Identifier" required error={errors.name} className="sm:col-span-2">
            {input('name')}
          </Field>
          <Field id={`${idp}-medicalDirectorName`} label="Medical Director / Pathologist Name" required error={errors.medicalDirectorName}>
            {input('medicalDirectorName')}
          </Field>
          <Field id={`${idp}-medicalCouncilLicenseNo`} label="Medical Council License Number" hint="(PMDC / PMC)" required error={errors.medicalCouncilLicenseNo}>
            {input('medicalCouncilLicenseNo', { autoCapitalize: 'characters' })}
          </Field>
          <Field id={`${idp}-phone`} label="Branch Phone Number / Helpline" hint="(optional)" error={errors.phone}>
            {input('phone', { type: 'tel', inputMode: 'tel', placeholder: 'e.g. 042 35761234' })}
          </Field>
          <Field id={`${idp}-address`} label="Branch Address" required error={errors.address} className="sm:col-span-2">
            {input('address')}
          </Field>
          {credentialsChanged && overview.laboratory.verificationStatus === 'APPROVED' && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2">
              Changing the medical director or council license sends your lab back for review until our medical board checks it.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#3a3f52] hover:bg-[#f3f1ec]">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || Object.keys(errors).length > 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#141b34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#232c4f] disabled:opacity-50"
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Save Branch
            </button>
          </div>
        </div>
      ) : (
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-[#8a8d99]" />
            <div>
              <dt className="text-xs text-[#8a8d99]">Medical director / pathologist</dt>
              <dd className="text-[#141b34]">
                {branch.medicalDirectorName} <span className="text-[#6b6f80]">· {branch.medicalCouncilLicenseNo}</span>
              </dd>
            </div>
          </div>
          <div className="flex gap-2">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#8a8d99]" />
            <div>
              <dt className="text-xs text-[#8a8d99]">Phone / helpline</dt>
              <dd className="text-[#141b34]">{branch.phone || <span className="text-[#8a8d99]">Not added</span>}</dd>
            </div>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8a8d99]" />
            <div className="min-w-0">
              <dt className="text-xs text-[#8a8d99]">Address</dt>
              <dd className="text-[#141b34]">
                {branch.address}
                {mapUrl && (
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-[#141b34] underline">
                    View on map <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </dd>
            </div>
          </div>
        </dl>
      )}
      {message && (
        <div className="mt-3">
          <SaveMessage message={message} />
        </div>
      )}
      <span className="sr-only">Branch {index + 1}</span>
    </article>
  );
}
