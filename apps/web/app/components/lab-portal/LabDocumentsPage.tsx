'use client';

// /lab-dashboard/documents: license number, issuing body, the license document
// and the lab logo. New license details on a verified lab go back for review.

import { useState } from 'react';
import { CircleAlert, ExternalLink, FileText, ImageOff, LoaderCircle, ShieldAlert } from 'lucide-react';
import { Field, inputClass, inputErrorClass } from '../consult-doctors/join-now/ui';
import FileUploadField from '../lab-registration/FileUploadField';
import { LICENSE_MAX_BYTES, LICENSE_TYPES, LOGO_MAX_BYTES, LOGO_TYPES, type PickedFile } from '../lab-registration/form-model';
import { REGULATORY_LABELS, labFileUrl, resubmitLabApi, updateLabDocumentsApi, type RegulatoryBodyCode } from '@/app/lib/api/lab-portal';
import { useLabPortal } from './LabPortalShell';
import { PageTitle, SaveMessage, cardClass } from './portal-ui';

const LICENSE_RE = /^[A-Za-z0-9][A-Za-z0-9\-/. ]{1,38}[A-Za-z0-9]$/;

/** "/uploads/labs/licenses/123.pdf" -> 'pdf' | 'image' | 'other' (by extension) */
export function fileKindOf(url: string | null | undefined): 'pdf' | 'image' | 'other' {
  const path = (url ?? '').split(/[?#]/)[0].toLowerCase();
  if (path.endsWith('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|webp|gif)$/.test(path)) return 'image';
  return 'other';
}

/** A stored document: picture preview for images, a "View PDF" card (+ inline preview on wide screens) for PDFs */
function StoredFilePreview({ url, label, compact = false }: { url: string; label: string; compact?: boolean }) {
  const [broken, setBroken] = useState(false);
  const kind = fileKindOf(url);
  if (kind === 'pdf') {
    return (
      <div className="overflow-hidden rounded-xl border border-[#e2ddd2] bg-white">
        <div className="flex flex-wrap items-center gap-3 p-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <FileText className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#141b34]">{label}</p>
            <p className="text-xs text-[#8a8d99]">PDF document</p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#141b34] px-3 py-2 text-xs font-semibold text-white hover:bg-[#232c4f]"
          >
            View PDF <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        {!compact && (
          <object data={url} type="application/pdf" aria-label={`${label} preview`} className="hidden h-[28rem] w-full border-t border-[#ece9e2] sm:block">
            <p className="p-3 text-xs text-[#8a8d99]">Your browser can&apos;t show the PDF here. Use View PDF.</p>
          </object>
        )}
      </div>
    );
  }
  if (kind === 'image' && !broken) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="group block" title="Open full size">
        <img
          src={url}
          alt={label}
          onError={() => setBroken(true)}
          className={`rounded-xl border border-[#e2ddd2] bg-[#faf9f6] object-contain ${compact ? 'h-24 w-24 p-1' : 'max-h-96 w-full'}`}
        />
        {!compact && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#141b34] group-hover:underline">
            Open full size <ExternalLink className="h-3 w-3" />
          </span>
        )}
      </a>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e2ddd2] bg-[#faf9f6] px-3 py-2 text-sm text-[#3a3f52]">
      <ImageOff className="h-4 w-4 text-[#8a8d99]" />
      {broken ? 'The file could not be loaded.' : 'Preview not available.'}
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#141b34] underline">
        Open file <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

export default function LabDocumentsPage() {
  const { overview, refresh } = useLabPortal();
  const lab = overview.laboratory;
  const needsFix = lab.verificationStatus === 'REJECTED' || Boolean(lab.rejectionReason?.trim());
  const [resubmitting, setResubmitting] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState(lab.licenseNumber);
  const [body, setBody] = useState<RegulatoryBodyCode>(lab.regulatoryBody);
  const [licenseDoc, setLicenseDoc] = useState<PickedFile | null>(null);
  const [logo, setLogo] = useState<PickedFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const numberChanged = licenseNumber.trim().toUpperCase() !== lab.licenseNumber;
  const bodyChanged = body !== lab.regulatoryBody;
  const numberError = !LICENSE_RE.test(licenseNumber.trim()) ? 'Use 3 to 40 letters, numbers, dashes or slashes.' : null;
  const changed = numberChanged || bodyChanged || Boolean(licenseDoc) || Boolean(logo);
  const credentialsChanged = numberChanged || bodyChanged || Boolean(licenseDoc);

  const save = async () => {
    if (!changed || numberError) return;
    setSaving(true);
    setMessage(null);
    const fd = new FormData();
    if (numberChanged) fd.append('licenseNumber', licenseNumber.trim().toUpperCase());
    if (bodyChanged) fd.append('regulatoryBody', body);
    if (licenseDoc) fd.append('licenseDoc', licenseDoc.file);
    if (logo) fd.append('logo', logo.file);
    try {
      const updated = await updateLabDocumentsApi(fd);
      [licenseDoc, logo].forEach((f) => f && URL.revokeObjectURL(f.previewUrl));
      setLicenseDoc(null);
      setLogo(null);
      await refresh();
      setMessage({
        tone: 'ok',
        text:
          credentialsChanged && lab.verificationStatus === 'APPROVED' && updated.verificationStatus === 'PENDING'
            ? 'Saved. Your updated license will be checked by our medical board.'
            : 'Documents saved.',
      });
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Could not save the documents.' });
    } finally {
      setSaving(false);
    }
  };

  const currentDoc = labFileUrl(lab.licenseDocUrl);
  const currentLogo = labFileUrl(lab.logoUrl);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageTitle title="Documents & Licensing" subtitle="Your healthcare license and the documents our medical board reviews." />
      {needsFix && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 sm:px-5" role="alert">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <ShieldAlert className="h-4 w-4" /> Changes requested by our medical board
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-red-800">
            {lab.rejectionReason?.trim() || 'Please review your license document and details.'}
          </p>
          <div className="mt-3 flex flex-col gap-2 border-t border-red-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-1.5 text-xs text-red-700">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Upload the corrected document and save, then send your lab back for review.
            </p>
            <button
              type="button"
              disabled={resubmitting || saving}
              onClick={async () => {
                setResubmitting(true);
                setMessage(null);
                try {
                  await resubmitLabApi();
                  await refresh();
                  setMessage({ tone: 'ok', text: 'Thank you. Your lab was sent back to our medical board for review.' });
                } catch (e) {
                  setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Could not resubmit. Please try again.' });
                } finally {
                  setResubmitting(false);
                }
              }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#141b34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#232c4f] disabled:opacity-60"
            >
              {resubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />} Resubmit for Review
            </button>
          </div>
        </div>
      )}

      <section className={cardClass} aria-labelledby="license-title">
        <h2 id="license-title" className="text-base font-semibold text-[#141b34]">
          Healthcare license
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field id="licenseNumber" label="Healthcare License Number" required error={numberError ?? undefined}>
            <input
              id="licenseNumber"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              autoCapitalize="characters"
              aria-invalid={!!numberError}
              className={`${inputClass} ${numberError ? inputErrorClass : ''}`}
            />
          </Field>
          <Field id="regulatoryBody" label="Issuing Regulatory Body" required>
            <select id="regulatoryBody" value={body} onChange={(e) => setBody(e.target.value as RegulatoryBodyCode)} className={inputClass}>
              {(Object.keys(REGULATORY_LABELS) as RegulatoryBodyCode[]).map((k) => (
                <option key={k} value={k}>
                  {REGULATORY_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-medium text-[#3a3f52]">Current license document</p>
            {currentDoc ? (
              <StoredFilePreview key={currentDoc} url={currentDoc} label="Healthcare license document" />
            ) : (
              <p className="text-sm text-[#8a8d99]">No document on file.</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <FileUploadField
              id="licenseDoc"
              label="Upload a new license document"
              hint="(clear photo or scanned PDF; replaces the current one)"
              value={licenseDoc}
              onChange={setLicenseDoc}
              types={LICENSE_TYPES}
              maxBytes={LICENSE_MAX_BYTES}
              kind="license"
            />
          </div>
        </div>
      </section>

      <section className={cardClass} aria-labelledby="logo-title">
        <h2 id="logo-title" className="text-base font-semibold text-[#141b34]">
          Lab logo
        </h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="shrink-0">
            <p className="mb-1.5 text-xs font-medium text-[#3a3f52]">Current</p>
            {currentLogo ? (
              <StoredFilePreview key={currentLogo} url={currentLogo} label="Current lab logo" compact />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-xl bg-[#f3f1ec] text-xs text-[#8a8d99]">No logo</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <FileUploadField id="logo" label="Upload a new logo" hint="(square image works best)" value={logo} onChange={setLogo} types={LOGO_TYPES} maxBytes={LOGO_MAX_BYTES} kind="logo" />
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {credentialsChanged && lab.verificationStatus === 'APPROVED' && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">New license details send your lab back for review until our medical board checks them.</p>
        )}
        <SaveMessage message={message} />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={!changed || !!numberError || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#141b34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#232c4f] disabled:opacity-50"
          >
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Save Documents
          </button>
        </div>
      </div>
    </div>
  );
}
