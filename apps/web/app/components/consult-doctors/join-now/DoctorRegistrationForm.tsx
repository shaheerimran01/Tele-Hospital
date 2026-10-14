'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  CircleCheck,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Video,
} from 'lucide-react';
import { ApiError, registerDoctorApi, type RegisterDoctorResponse } from '@/app/lib/api/doctors';
import {
  DOCTOR_ROUTES,
  useDoctorAuth,
} from '@/app/consult-doctors/context/DoctorAuthContext';
import {
  buildPayload,
  clearDraft,
  initialFormState,
  loadDraft,
  newClinic,
  saveDraft,
  validateForm,
  type ClinicForm,
  type ConsultTypeForm,
  type DoctorFormState,
  type FormErrors,
} from './form-model';
import ClinicCard from './ClinicCard';
import ImageUploadField from './ImageUploadField';
import ScheduleEditor from './ScheduleEditor';
import { CreatableCombobox, TagCombobox } from './Combobox';
import ExperienceSelect from './ExperienceSelect';
import { DEGREE_OPTIONS, TITLE_OPTIONS } from './options';
import { Checkbox, Field, FormSection, inputClass, inputErrorClass } from './ui';

const REDIRECT_SECONDS = 6;

/** "+923001234567" -> "+92 300 1234567" */
function displayPhone(phone: string) {
  const m = phone.match(/^\+92(\d{3})(\d{7})$/);
  return m ? `+92 ${m[1]} ${m[2]}` : phone;
}

type TextKey =
  | 'fullName'
  | 'title'
  | 'pmdcNumber'
  | 'experienceYears'
  | 'languages'
  | 'phone'
  | 'email'
  | 'specialisations'
  | 'education'
  | 'about';

export default function DoctorRegistrationForm() {
  const router = useRouter();
  const { token, doctor, updateDoctor, logout } = useDoctorAuth();
  // The guard only renders this form with a session, so these are set
  const draftScope = doctor?.id ?? 'anonymous';
  const verifiedPhone = doctor ? displayPhone(doctor.phone) : '';
  const [form, setForm] = useState<DoctorFormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [draftReady, setDraftReady] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [uploadsInProgress, setUploadsInProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [registered, setRegistered] = useState<RegisterDoctorResponse | null>(null);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const submittedOnce = useRef(false);

  // Restore a saved draft after mount (localStorage isn't available during SSR)
  useEffect(() => {
    const draft = loadDraft(draftScope);
    // The phone always comes from the OTP-verified login, never from an old draft
    setForm((f) => ({ ...(draft ?? f), phone: verifiedPhone }));
    setDraftReady(true);
  }, [draftScope, verifiedPhone]);

  // Autosave the draft on this device
  useEffect(() => {
    if (!draftReady || registered) return;
    const t = setTimeout(() => {
      saveDraft(draftScope, form);
      setDraftSavedAt(new Date());
    }, 500);
    return () => clearTimeout(t);
  }, [form, draftReady, registered, draftScope]);

  // Re-validate live once the user has tried to submit
  useEffect(() => {
    if (submittedOnce.current) setErrors(validateForm(form));
  }, [form]);

  // Redirect after a successful registration
  useEffect(() => {
    if (!registered) return;
    if (countdown <= 0) {
      router.push(DOCTOR_ROUTES.dashboard);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [registered, countdown, router]);

  const setField = (key: TextKey, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateClinic = (index: number, patch: Partial<ClinicForm>) =>
    setForm((f) => ({
      ...f,
      clinics: f.clinics.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));

  const removeClinic = (index: number) =>
    setForm((f) => ({ ...f, clinics: f.clinics.filter((_, i) => i !== index) }));

  const addClinic = () => setForm((f) => ({ ...f, clinics: [...f.clinics, newClinic()] }));

  const setConsultType = (key: 'video' | 'text', patch: Partial<ConsultTypeForm>) =>
    setForm((f) => ({ ...f, [key]: { ...f[key], ...patch } }));

  const trackUpload = useCallback((busy: boolean) => {
    setUploadsInProgress((n) => Math.max(0, n + (busy ? 1 : -1)));
  }, []);

  const scrollToFirstError = (errs: FormErrors) => {
    const firstKey = Object.keys(errs)[0];
    if (!firstKey) return;
    const el =
      document.getElementById(`field-${firstKey}`) ??
      document.getElementById(`field-${firstKey.split('.').slice(0, 2).join('.')}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el
      ?.querySelector<HTMLElement>('[data-upload-trigger], input:not([type="file"]), textarea, select')
      ?.focus({ preventScroll: true });
  };

  const handleSubmit = async () => {
    if (submitting || uploadsInProgress > 0) return;
    submittedOnce.current = true;
    setServerErrors([]);

    const errs = validateForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      scrollToFirstError(errs);
      return;
    }

    if (!token) {
      logout();
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerDoctorApi(token, buildPayload(form));
      clearDraft(draftScope);
      updateDoctor(result.doctorRegistration); // isFormFilled: true in this tab's session
      setRegistered(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout(); // the guard sends the doctor back to the OTP screen
        return;
      }
      if (err instanceof ApiError && err.status === 409 && /already submitted/i.test(err.messages[0])) {
        updateDoctor({ isFormFilled: true });
        router.replace(DOCTOR_ROUTES.dashboard);
        return;
      }
      setServerErrors(
        err instanceof ApiError
          ? err.messages
          : ['Could not reach the server. Check your connection and try again.'],
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    if (!window.confirm('Clear everything you have entered? This cannot be undone.')) return;
    clearDraft(draftScope);
    submittedOnce.current = false;
    setForm({ ...initialFormState(), phone: verifiedPhone });
    setErrors({});
    setServerErrors([]);
    setDraftSavedAt(null);
  };

  // ---------------------------------------------------------------------------
  // Success screen
  // ---------------------------------------------------------------------------

  if (registered) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 sm:py-24">
        <div className="rounded-2xl border border-[#e7e2d8] bg-white px-6 py-10 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f4ec] text-[#2f7a4b]">
            <CircleCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-[#141b34]">
            Registration submitted for admin approval
          </h1>
          <p className="mt-2 text-sm text-[#6b6f80]">
            Thank you, {registered.doctor.fullName}. Our team will verify your PMDC details and publish your
            profile once it&apos;s approved.
          </p>
          <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-[#fdf6e7] px-3 py-1 text-xs font-medium text-[#8a6d1f]">
            Status: Pending review
          </p>
          <div className="mt-8 flex flex-col items-center gap-2">
            <Link
              href={DOCTOR_ROUTES.dashboard}
              className="inline-flex items-center gap-2 rounded-lg bg-[#141b34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#232c4f]"
            >
              Go to your dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-[#8a8d99]">Opening your dashboard in {countdown}s…</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  const text = (key: TextKey, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={key}
      value={form[key]}
      onChange={(e) => setField(key, e.target.value)}
      className={`${inputClass} ${errors[key] ? inputErrorClass : ''}`}
      {...props}
    />
  );

  const online = form.video.enabled || form.text.enabled;

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a8873a]">Join our panel</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#141b34] sm:text-3xl">Register as a doctor</h1>
        <p className="mt-2 max-w-xl text-sm text-[#6b6f80]">
          Create your profile to consult patients by video, text or at your clinic / hospital. Your profile goes live
          after our team verifies your PMDC registration.
        </p>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-6"
      >
        {/* 1. Personal information */}
        <FormSection title="1. Personal information" subtitle="Your credentials and public profile details.">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <Field id="fullName" label="Full name" required error={errors.fullName}>
              {text('fullName', { placeholder: 'Dr. Ayesha Rahman', autoComplete: 'name' })}
            </Field>
            <Field id="title" label="Title / specialty" required hint="(pick or type your own)" error={errors.title}>
              <CreatableCombobox
                id="title"
                value={form.title}
                onChange={(v) => setField('title', v)}
                options={TITLE_OPTIONS}
                placeholder="Consultant Family Physician"
                invalid={!!errors.title}
              />
            </Field>
            <Field id="degrees" label="Degrees" required hint="(select all that apply)" error={errors.degrees}>
              <TagCombobox
                id="degrees"
                values={form.degrees}
                onChange={(v) => setForm((f) => ({ ...f, degrees: v }))}
                options={DEGREE_OPTIONS}
                placeholder="MBBS, FCPS…"
                invalid={!!errors.degrees}
              />
            </Field>
            <Field id="pmdcNumber" label="PMDC number" required error={errors.pmdcNumber}>
              {text('pmdcNumber', { placeholder: '00000-P', autoCapitalize: 'characters' })}
            </Field>

            <div className="sm:col-span-2">
              <ImageUploadField
                id="pmdcCertificate"
                label="PMDC License / Certificate"
                required
                hint="(clear photo or scan of your PMDC license)"
                error={errors.pmdcCertificate}
                value={form.pmdcCertificate}
                onChange={(v) => setForm((f) => ({ ...f, pmdcCertificate: v }))}
                onUploadingChange={trackUpload}
              />
            </div>

            <Field id="experienceYears" label="Experience in years" required error={errors.experienceYears}>
              <ExperienceSelect
                id="experienceYears"
                value={form.experienceYears}
                onChange={(v) => setField('experienceYears', v)}
                invalid={!!errors.experienceYears}
              />
            </Field>
            <Field id="languages" label="Languages" required hint="(comma separated)" error={errors.languages}>
              {text('languages', { placeholder: 'English, Urdu, Punjabi' })}
            </Field>
            <Field id="phone" label="Phone / WhatsApp" hint="(verified at sign-in)" error={errors.phone}>
              <div className="relative">
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  readOnly
                  aria-readonly="true"
                  className={`${inputClass} cursor-not-allowed bg-[#f6f4ef] pr-24 text-[#3a3f52]`}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-[#e8f4ec] px-2 py-0.5 text-[11px] font-medium text-[#2f7a4b]">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              </div>
            </Field>
            <Field id="email" label="Email" error={errors.email}>
              {text('email', {
                type: 'email',
                placeholder: 'ayesha.rahman@example.com',
                autoComplete: 'email',
              })}
            </Field>

            <Field
              id="specialisations"
              label="Specialisations"
              required
              hint="(comma separated)"
              error={errors.specialisations}
              className="sm:col-span-2"
            >
              {text('specialisations', { placeholder: "Family medicine, Women's health, Diabetes care" })}
            </Field>
            <Field id="education" label="Education" className="sm:col-span-2">
              {text('education', {
                placeholder: 'Aga Khan University · College of Physicians and Surgeons Pakistan',
              })}
            </Field>
            <Field id="about" label="About you" className="sm:col-span-2">
              <textarea
                id="about"
                rows={3}
                maxLength={3000}
                value={form.about}
                onChange={(e) => setField('about', e.target.value)}
                placeholder="I believe in thoughtful, evidence-led care and taking the time to understand every patient's needs."
                className={`${inputClass} resize-y`}
              />
            </Field>

            <div className="sm:col-span-2">
              <ImageUploadField
                id="profilePhoto"
                label="Profile photo"
                shape="circle"
                value={form.profilePhoto}
                onChange={(v) => setForm((f) => ({ ...f, profilePhoto: v }))}
                onUploadingChange={trackUpload}
              />
            </div>
          </div>
        </FormSection>

        {/* 2. Clinics */}
        <FormSection title="2. Clinics / Hospitals" subtitle="Add every clinic or hospital where you practise.">
          <div className="space-y-5">
            {form.clinics.map((clinic, i) => (
              <ClinicCard
                key={clinic.key}
                index={i}
                clinic={clinic}
                errors={errors}
                onChange={(patch) => updateClinic(i, patch)}
                onRemove={() => removeClinic(i)}
              />
            ))}
            {form.clinics.length === 0 && (
              <p className="rounded-xl border border-dashed border-[#d9d3c6] px-4 py-6 text-center text-sm text-[#8a8d99]">
                No clinics / hospitals added. That&apos;s fine if you only consult online.
              </p>
            )}
            <button
              type="button"
              onClick={addClinic}
              className="inline-flex items-center gap-2 rounded-lg border border-[#d9d3c6] bg-white px-4 py-2.5 text-sm font-semibold text-[#141b34] transition hover:border-[#141b34]"
            >
              <Plus className="h-4 w-4" />
              {form.clinics.length === 0 ? 'Add Clinic / Hospital' : 'Add Another Clinic / Hospital'}
            </button>
          </div>
        </FormSection>

        {/* 3. Consultation types */}
        <FormSection
          id="field-consultation"
          title="3. Consultation types"
          subtitle="Choose how patients can consult with you online."
        >
          <div className="space-y-3">
            {(
              [
                { key: 'video', label: 'Video call', Icon: Video },
                { key: 'text', label: 'Text appointment', Icon: MessageSquareText },
              ] as const
            ).map(({ key, label, Icon }) => {
              const value = form[key];
              const feeError = errors[`${key}.fee`];
              return (
                <div
                  key={key}
                  id={`field-${key}.fee`}
                  className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-4 transition ${
                    value.enabled ? 'border-[#e2ddd2] bg-white' : 'border-[#ece8df] bg-[#f6f4ef]'
                  }`}
                >
                  <Checkbox
                    id={`${key}-enabled`}
                    checked={value.enabled}
                    onChange={(v) => setConsultType(key, { enabled: v })}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#141b34]">
                      <Icon className="h-4 w-4 text-[#6b6f80]" /> {label}
                    </span>
                  </Checkbox>

                  <div className="w-full sm:w-auto">
                    <label htmlFor={`${key}-fee`} className="mb-1 block text-[11px] text-[#6b6f80]">
                      Fee
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`${key}-fee`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        disabled={!value.enabled}
                        value={value.fee}
                        onChange={(e) => setConsultType(key, { fee: e.target.value })}
                        placeholder={key === 'video' ? '3000' : '1500'}
                        className={`${inputClass} sm:w-40 ${feeError ? inputErrorClass : ''}`}
                      />
                      <span className="text-xs text-[#6b6f80]">PKR</span>
                    </div>
                    {feeError && <p className="mt-1 text-xs text-red-600">{feeError}</p>}
                  </div>
                </div>
              );
            })}
            {errors.consultation && (
              <p className="text-xs text-red-600" role="alert">
                {errors.consultation}
              </p>
            )}
          </div>
        </FormSection>

        {/* 4. Weekly availability */}
        <FormSection
          title="4. Weekly availability"
          subtitle="Hours for video and text appointments. Tick the days and set the time. Patients can only book inside these hours."
        >
          {online ? (
            <ScheduleEditor
              idPrefix="availability"
              schedule={form.availability}
              onChange={(availability) => setForm((f) => ({ ...f, availability }))}
              error={errors.availability}
            />
          ) : (
            <p className="text-sm text-[#8a8d99]">
              Turn on video call or text appointment above to set your online hours.
            </p>
          )}
        </FormSection>

        {/* Errors from the server */}
        {serverErrors.length > 0 && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">We couldn&apos;t submit your registration</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
              {serverErrors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {Object.keys(errors).length > 0 && (
          <p className="text-xs text-red-600">
            Please fix the {Object.keys(errors).length === 1 ? 'highlighted field' : `${Object.keys(errors).length} highlighted fields`} above.
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse items-stretch gap-3 pb-6 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={submitting || uploadsInProgress > 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#b38a3a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9c7630] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : uploadsInProgress > 0 ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" /> Uploading image…
              </>
            ) : (
              <>
                Register and publish profile <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={submitting}
            className="rounded-lg border border-[#d9d3c6] bg-white px-5 py-3 text-sm font-semibold text-[#141b34] transition hover:border-[#141b34] disabled:opacity-60"
          >
            Clear saved profile
          </button>
          {draftSavedAt && (
            <span className="text-center text-[11px] text-[#8a8d99] sm:ml-auto">
              Draft saved on this device
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
