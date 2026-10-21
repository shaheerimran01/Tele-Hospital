'use client';

// /lab-dashboard/profile: name, contact details and home sample collection.
// The primary phone is the login number and cannot be changed here.

import { useState } from 'react';
import { LoaderCircle, Lock } from 'lucide-react';
import { Field, inputClass, inputErrorClass } from '../consult-doctors/join-now/ui';
import PhoneInput from '../lab-registration/PhoneInput';
import { whatsappE164 } from '../lab-registration/form-model';
import Toggle from '../lab-dashboard/Toggle';
import { displayPhone, updateLabProfileApi } from '@/app/lib/api/lab-portal';
import { useLabPortal } from './LabPortalShell';
import { FixNotice, PageTitle, SaveMessage, cardClass } from './portal-ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** "+923001234567" -> { country: 'PK', number: '3001234567' } for the WhatsApp picker */
function splitWhatsapp(value: string | null) {
  if (!value) return { country: 'PK', number: '' };
  if (value.startsWith('+92')) return { country: 'PK', number: value.slice(3) };
  return { country: 'PK', number: value };
}

export default function LabProfilePage() {
  const { overview, refresh } = useLabPortal();
  const lab = overview.laboratory;
  const initialWa = splitWhatsapp(lab.whatsappNumber);
  const [name, setName] = useState(lab.name);
  const [email, setEmail] = useState(lab.email);
  const [waCountry, setWaCountry] = useState(initialWa.country);
  const [waNumber, setWaNumber] = useState(initialWa.number);
  const [homeSample, setHomeSample] = useState(lab.hasHomeSample);
  const [fee, setFee] = useState(String(Math.round(lab.homeSampleFee ?? 0)));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const wa = waNumber.trim() ? whatsappE164(waCountry, waNumber) : null;
  const errors: Record<string, string> = {};
  if (name.trim().length < 2) errors.name = 'Enter the laboratory name.';
  if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (waNumber.trim() && !wa) errors.whatsapp = 'Enter a valid mobile number, e.g. 300 1234567.';
  if (homeSample && !/^\d{1,6}$/.test(fee.trim())) errors.fee = 'Enter the fee in whole rupees (0 for free).';

  const save = async () => {
    if (Object.keys(errors).length) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateLabProfileApi({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsappNumber: wa,
        hasHomeSample: homeSample,
        homeSampleFee: homeSample ? Number(fee.trim()) : 0,
      });
      await refresh();
      setMessage({ tone: 'ok', text: 'Profile saved.' });
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Could not save the profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <PageTitle title="Lab Profile" subtitle="How patients and our team recognise and reach your lab." />
      <FixNotice target="profile" />

      <section className={cardClass} aria-labelledby="profile-title">
        <h2 id="profile-title" className="sr-only">
          Profile details
        </h2>
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field id="labName" label="Lab Name" required error={errors.name} className="sm:col-span-2">
            <input id="labName" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} className={`${inputClass} ${errors.name ? inputErrorClass : ''}`} />
          </Field>
          <div>
            <p className="mb-1.5 text-xs font-medium text-[#3a3f52]">Phone Number (Primary Login &amp; OTP)</p>
            <p className="flex items-center gap-2 rounded-lg border border-[#d9d3c6] bg-[#faf9f6] px-3 py-2.5 text-sm font-semibold tabular-nums text-[#141b34]">
              <Lock className="h-4 w-4 text-[#8a8d99]" aria-hidden /> {displayPhone(lab.phone)}
            </p>
            <p className="mt-1 text-[11px] text-[#8a8d99]">Your login number can&apos;t be changed. Contact Tabibistan support if you need a different one.</p>
          </div>
          <Field id="email" label="Email Address" required error={errors.email}>
            <input
              id="email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              className={`${inputClass} ${errors.email ? inputErrorClass : ''}`}
            />
          </Field>
          <Field id="whatsapp" label="WhatsApp Number" hint="(optional, for patient inquiries)" error={errors.whatsapp} className="sm:col-span-2">
            <PhoneInput id="whatsapp" country={waCountry} number={waNumber} invalid={!!errors.whatsapp} onCountry={setWaCountry} onNumber={setWaNumber} />
          </Field>
        </div>
      </section>

      <section className={cardClass} aria-labelledby="home-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="home-title" className="text-base font-semibold text-[#141b34]">
              Home sample collection
            </h2>
            <p className="mt-0.5 text-sm text-[#6b6f80]">{homeSample ? 'Patients can ask for a sample pickup at home.' : 'Patients visit your branches for samples.'}</p>
          </div>
          <Toggle checked={homeSample} onChange={setHomeSample} label="Home sample collection" />
        </div>
        {homeSample && (
          <div className="mt-4 max-w-xs">
            <Field id="fee" label="Home collection fee (PKR)" hint="(0 = free)" error={errors.fee}>
              <input
                id="fee"
                inputMode="numeric"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                aria-invalid={!!errors.fee}
                className={`${inputClass} tabular-nums ${errors.fee ? inputErrorClass : ''}`}
              />
            </Field>
          </div>
        )}
      </section>

      <div className="space-y-3">
        <SaveMessage message={message} />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving || Object.keys(errors).length > 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#141b34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#232c4f] disabled:opacity-50"
          >
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
