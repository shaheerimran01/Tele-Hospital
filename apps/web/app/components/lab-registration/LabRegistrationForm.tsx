'use client';

// Laboratory registration (frontend phase): lab profile, licensing, and any
// number of branches with a map pin each. "Register Laboratory" validates the
// form and logs the payload; the API call is connected in the next phase.

import { useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, FlaskConical, Plus, ShieldCheck, Building2, X } from 'lucide-react';
import { Field, FormSection, inputClass, inputErrorClass } from '../consult-doctors/join-now/ui';
import FileUploadField from './FileUploadField';
import PhoneInput from './PhoneInput';
import BranchCard from './BranchCard';
import {
  LICENSE_MAX_BYTES,
  LICENSE_TYPES,
  LOGO_MAX_BYTES,
  LOGO_TYPES,
  MAX_BRANCHES,
  REGULATORY_BODIES,
  buildPayload,
  emptyBranch,
  initialLabForm,
  sectionOf,
  validateLabForm,
  type BranchForm,
  type FormErrors,
  type LabForm,
  type RegulatoryBody,
} from './form-model';

const SECTIONS = [
  { n: 1 as const, id: 'lab-profile', title: 'Lab Profile & Contact', Icon: FlaskConical },
  { n: 2 as const, id: 'lab-licensing', title: 'Regulatory & Licensing', Icon: ShieldCheck },
  { n: 3 as const, id: 'lab-branches', title: 'Branches & Medical Staff', Icon: Building2 },
];

type Payload = ReturnType<typeof buildPayload>;

export default function LabRegistrationForm() {
  const [form, setForm] = useState<LabForm>(initialLabForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState<Payload | null>(null);
  const [newBranchId, setNewBranchId] = useState<string | null>(null);
  const triedSubmit = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;

  // Live validation once the user has tried to submit
  useEffect(() => {
    if (triedSubmit.current) setErrors(validateLabForm(form));
  }, [form]);

  // Free the file previews when leaving the page
  useEffect(
    () => () => {
      const f = formRef.current;
      [f.logo, f.licenseDocument].forEach((x) => x && URL.revokeObjectURL(x.previewUrl));
    },
    [],
  );

  // Bring a newly added branch into view and put the cursor in its name field
  useEffect(() => {
    if (!newBranchId) return;
    document.getElementById(`branch-${newBranchId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    (document.getElementById(`branches.${newBranchId}.name`) as HTMLInputElement | null)?.focus({ preventScroll: true });
    setNewBranchId(null);
  }, [newBranchId]);

  const set = <K extends keyof LabForm>(key: K, value: LabForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const updateBranch = (id: string, patch: Partial<BranchForm>) =>
    setForm((f) => ({ ...f, branches: f.branches.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  const addBranch = () => {
    if (form.branches.length >= MAX_BRANCHES) return;
    const b = emptyBranch();
    setForm((f) => ({ ...f, branches: [...f.branches, b] }));
    setNewBranchId(b.id);
  };
  const removeBranch = (id: string) => setForm((f) => (f.branches.length > 1 ? { ...f, branches: f.branches.filter((b) => b.id !== id) } : f));

  // Progress list: a section is complete when it has no validation errors
  const liveErrors = validateLabForm(form);
  const sectionDone = (n: 1 | 2 | 3) => !Object.keys(liveErrors).some((k) => sectionOf(k) === n);
  const doneCount = SECTIONS.filter((s) => sectionDone(s.n)).length;
  const errorCount = Object.keys(errors).length;

  const handleSubmit = () => {
    triedSubmit.current = true;
    const found = validateLabForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Scroll to the first field with a problem, in page order
      requestAnimationFrame(() => {
        const first = Array.from(document.querySelectorAll<HTMLElement>('[id^="field-"]')).find((el) => found[el.id.slice(6)]);
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const control = first?.querySelector<HTMLElement>('input:not([type=file]), select, textarea, button');
        control?.focus({ preventScroll: true });
      });
      return;
    }
    const payload = buildPayload(form);
    // Frontend phase: the API call replaces this log later. Files are kept in
    // state (form.logo.file, form.licenseDocument.file) for the upload.
    console.log('Lab registration payload:\n' + JSON.stringify(payload, null, 2));
    setSubmitted(payload);
  };

  const startOver = () => {
    [form.logo, form.licenseDocument].forEach((x) => x && URL.revokeObjectURL(x.previewUrl));
    triedSubmit.current = false;
    setErrors({});
    setSubmitted(null);
    setForm(initialLabForm());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const text = (
    key: 'labName' | 'email' | 'licenseNumber',
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <input
      id={key}
      type="text"
      value={form[key]}
      onChange={(e) => set(key, e.target.value)}
      aria-invalid={!!errors[key]}
      className={`${inputClass} ${errors[key] ? inputErrorClass : ''}`}
      {...props}
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8a8d99]">Tabibistan for Laboratories</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#141b34] sm:text-3xl">Register your laboratory</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#6b6f80]">
          List your lab on Tabibistan so patients can book tests at your branches. Fields marked{' '}
          <span className="text-red-500">*</span> are required. Your lab goes live after our team verifies the license.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
        {/* Progress (sticky on wide screens) */}
        <nav aria-label="Registration sections" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {SECTIONS.map(({ n, id, title, Icon }) => {
              const done = sectionDone(n);
              return (
                <li key={id} className="shrink-0">
                  <a
                    href={`#${id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex items-center gap-2.5 rounded-xl border border-[#e7e2d8] bg-white px-3 py-2.5 text-sm text-[#3a3f52] hover:border-[#c9c2b3]"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        done ? 'bg-[#e8f3ec] text-[#2f7a4b]' : 'bg-[#f3f1ec] text-[#3a3f52]'
                      }`}
                    >
                      {done ? <CircleCheck className="h-4 w-4" /> : n}
                    </span>
                    <span className="whitespace-nowrap font-medium lg:whitespace-normal">{title}</span>
                    <Icon className="ml-auto hidden h-4 w-4 text-[#b9b3a5] lg:block" />
                  </a>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 hidden text-xs text-[#8a8d99] lg:block">
            {doneCount} of {SECTIONS.length} sections complete · {form.branches.length} {form.branches.length === 1 ? 'branch' : 'branches'}
          </p>
        </nav>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="min-w-0 space-y-6"
        >
          {/* 1. Lab profile */}
          <div id="lab-profile" className="scroll-mt-24">
            <FormSection title="1. Lab profile & contact details" subtitle="How patients and our team will recognise and reach your lab.">
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field id="labName" label="Lab Name" required error={errors.labName} className="sm:col-span-2">
                  {text('labName', { placeholder: 'e.g. Crescent Diagnostic Laboratories', autoComplete: 'organization' })}
                </Field>
                <div className="sm:col-span-2">
                  <FileUploadField
                    id="logo"
                    label="Lab Logo"
                    hint="(optional, square image works best)"
                    value={form.logo}
                    onChange={(v) => set('logo', v)}
                    types={LOGO_TYPES}
                    maxBytes={LOGO_MAX_BYTES}
                    kind="logo"
                    error={errors.logo}
                  />
                </div>
                <Field id="email" label="Email Address" required error={errors.email}>
                  {text('email', { type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'info@yourlab.com' })}
                </Field>
                <Field id="whatsappNumber" label="WhatsApp Number" required error={errors.whatsappNumber}>
                  <PhoneInput
                    id="whatsappNumber"
                    country={form.whatsappCountry}
                    number={form.whatsappNumber}
                    invalid={!!errors.whatsappNumber}
                    onCountry={(v) => set('whatsappCountry', v)}
                    onNumber={(v) => set('whatsappNumber', v)}
                  />
                </Field>
              </div>
            </FormSection>
          </div>

          {/* 2. Licensing */}
          <div id="lab-licensing" className="scroll-mt-24">
            <FormSection title="2. Regulatory & healthcare licensing" subtitle="We verify these details before your lab is listed.">
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field id="licenseNumber" label="Healthcare License Number" required error={errors.licenseNumber}>
                  {text('licenseNumber', { placeholder: 'e.g. PHC/LAB/2024/01234', autoCapitalize: 'characters' })}
                </Field>
                <Field id="regulatoryBody" label="Issuing Regulatory Body" required error={errors.regulatoryBody}>
                  <select
                    id="regulatoryBody"
                    value={form.regulatoryBody}
                    onChange={(e) => set('regulatoryBody', e.target.value as RegulatoryBody | '')}
                    aria-invalid={!!errors.regulatoryBody}
                    className={`${inputClass} ${errors.regulatoryBody ? inputErrorClass : ''} ${form.regulatoryBody ? '' : 'text-gray-400'}`}
                  >
                    <option value="" disabled>
                      Select the regulatory body
                    </option>
                    {REGULATORY_BODIES.map((r) => (
                      <option key={r.value} value={r.value} className="text-[#141b34]">
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <FileUploadField
                    id="licenseDocument"
                    label="Healthcare License Document"
                    hint="(clear photo or scanned PDF)"
                    required
                    value={form.licenseDocument}
                    onChange={(v) => set('licenseDocument', v)}
                    types={LICENSE_TYPES}
                    maxBytes={LICENSE_MAX_BYTES}
                    kind="license"
                    error={errors.licenseDocument}
                  />
                </div>
              </div>
            </FormSection>
          </div>

          {/* 3. Branches */}
          <div id="lab-branches" className="scroll-mt-24">
            <FormSection
              title="3. Branches & medical staff"
              subtitle="Add every collection center or lab branch, with its medical director and exact location."
            >
              <div className="space-y-4">
                {form.branches.map((b, i) => (
                  <BranchCard
                    key={b.id}
                    branch={b}
                    index={i}
                    canRemove={form.branches.length > 1}
                    errors={errors}
                    onChange={(patch) => updateBranch(b.id, patch)}
                    onRemove={() => removeBranch(b.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={addBranch}
                  disabled={form.branches.length >= MAX_BRANCHES}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c9c2b3] bg-white px-4 py-4 text-sm font-semibold text-[#141b34] transition hover:border-[#141b34] hover:bg-[#faf9f6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Add New Branch
                </button>
                {form.branches.length >= MAX_BRANCHES && (
                  <p className="text-center text-xs text-[#8a8d99]">You can add up to {MAX_BRANCHES} branches here. Contact us to add more.</p>
                )}
              </div>
            </FormSection>
          </div>

          {/* Submit */}
          <div className="rounded-2xl border border-[#e7e2d8] bg-white p-4 sm:p-6">
            {errorCount > 0 && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Please fix {errorCount === 1 ? '1 field' : `${errorCount} fields`} before registering. The first one is highlighted above.
                </span>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#6b6f80]">
                By registering, you confirm that the details and documents are accurate and that your lab holds a valid license.
              </p>
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#141b34] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#232c4f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141b34]/40 focus-visible:ring-offset-2"
              >
                <FlaskConical className="h-4 w-4" /> Register Laboratory
              </button>
            </div>
          </div>
        </form>
      </div>

      {submitted && <SuccessDialog payload={submitted} onClose={() => setSubmitted(null)} onStartOver={startOver} />}
    </div>
  );
}

function SuccessDialog({ payload, onClose, onStartOver }: { payload: Payload; onClose: () => void; onStartOver: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-reg-success-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1.5 text-[#8a8d99] hover:bg-[#f3f1ec]">
          <X className="h-5 w-5" />
        </button>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f3ec] text-[#2f7a4b]">
          <CircleCheck className="h-6 w-6" />
        </span>
        <h2 id="lab-reg-success-title" className="mt-4 text-lg font-semibold text-[#141b34]">
          Registration details are complete
        </h2>
        <p className="mt-1 text-sm text-[#6b6f80]">
          {payload.labName} with {payload.branches.length} {payload.branches.length === 1 ? 'branch' : 'branches'} passed all checks.
        </p>
        <ul className="mt-4 space-y-1.5 rounded-xl bg-[#faf9f6] p-3 text-xs text-[#3a3f52]">
          <li>
            <span className="text-[#8a8d99]">Email:</span> {payload.email}
          </li>
          <li>
            <span className="text-[#8a8d99]">WhatsApp:</span> {payload.whatsappNumber}
          </li>
          <li>
            <span className="text-[#8a8d99]">License:</span> {payload.license.number} · {payload.license.regulatoryBodyName}
          </li>
          {payload.branches.map((b) => (
            <li key={b.order}>
              <span className="text-[#8a8d99]">Branch {b.order}:</span> {b.name} · {b.medicalDirectorName}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[#8a8d99]">
          Preview mode: the details were written to the browser console. Sending them to Tabibistan will be connected in the next phase.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onStartOver} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#3a3f52] hover:bg-[#f3f1ec]">
            Register another lab
          </button>
          <button type="button" onClick={onClose} className="rounded-xl bg-[#141b34] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#232c4f]">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
