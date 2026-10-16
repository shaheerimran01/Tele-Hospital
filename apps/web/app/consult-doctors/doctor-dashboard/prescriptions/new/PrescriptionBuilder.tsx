'use client';

// Digital prescription builder: auto-filled patient / doctor details, diagnosis,
// medicine rows, lab tests and advice. Saving generates the PDF, attaches it to the
// appointment and notifies the patient.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  FileText,
  LoaderCircle,
  Pill,
  Plus,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import { ApiError } from '@/app/lib/api/doctors';
import {
  getPrescriptionDraftApi,
  prescriptionPdfUrl,
  savePrescriptionApi,
  type PrescriptionDraft,
  type PrescriptionMedicine,
} from '@/app/lib/api/prescriptions-doctor';
import { DOCTOR_ROUTES, useDoctorAuth } from '@/app/consult-doctors/context/DoctorAuthContext';
import AdviceDictation from './AdviceDictation';

const BACK_HREF = '/consult-doctors/doctor-dashboard?view=appointments&tab=completed';
const MAX_MEDICINES = 30;
const MAX_LAB_TESTS = 20;

const FREQUENCIES = ['1-0-0', '0-0-1', '1-0-1', '1-1-1', '0-1-0', '1-1-1-1', 'As needed (SOS)'];
const DURATIONS = ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '1 Month', '3 Months', 'Continue'];
const INSTRUCTIONS = ['After meals', 'Before meals', 'With meals', 'At bedtime', 'On an empty stomach', 'Apply on the affected area'];
const LAB_SUGGESTIONS = ['CBC', 'LFT', 'RFT', 'Urine R/E', 'Lipid Profile', 'HbA1c', 'Blood Sugar (Fasting)', 'Chest X-Ray', 'Ultrasound Abdomen', 'ECG'];
const MODE_LABEL: Record<string, string> = { IN_CLINIC: 'In-clinic visit', VIDEO: 'Video consultation', TEXT: 'Text consultation' };

const emptyMedicine = (): PrescriptionMedicine => ({ name: '', dosage: '', frequency: '', duration: '', instructions: '' });

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const input =
  'w-full rounded-lg border border-[#e2ddd2] bg-white px-3 py-2 text-sm text-[#141b34] outline-none transition placeholder:text-[#a9a59a] focus:border-[#141b34] focus:ring-2 focus:ring-[#141b34]/10';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#6b6f80]';

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e7e2d8] bg-white px-5 py-5 sm:px-6">
      <h2 className="text-base font-semibold text-[#141b34]">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-[#6b6f80]">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ReadOnly({ title, value, mono = false }: { title: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={label}>{title}</p>
      <p className={`truncate rounded-lg bg-[#f6f4ef] px-3 py-2 text-sm font-semibold text-[#141b34] ${mono ? 'font-mono' : ''}`} title={value}>
        {value}
      </p>
    </div>
  );
}

/** Multi-tag input: Enter or comma adds a test */
function LabTestInput({ tests, onChange }: { tests: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(',').map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...tests];
    for (const p of parts) {
      if (next.length >= MAX_LAB_TESTS) break;
      if (!next.some((t) => t.toLowerCase() === p.toLowerCase())) next.push(p.slice(0, 120));
    }
    onChange(next);
    setDraft('');
  };
  return (
    <div>
      <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-lg border border-[#e2ddd2] bg-white px-2 py-1.5 focus-within:border-[#141b34] focus-within:ring-2 focus-within:ring-[#141b34]/10">
        {tests.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#eef2fb] py-1 pl-3 pr-1.5 text-xs font-semibold text-[#2c4f8f]">
            {t}
            <button type="button" onClick={() => onChange(tests.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-[#d6e0f3]" aria-label={`Remove ${t}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && tests.length) {
              onChange(tests.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          disabled={tests.length >= MAX_LAB_TESTS}
          placeholder={tests.length ? 'Add another test…' : 'Type a test and press Enter, e.g. CBC'}
          aria-label="Recommended lab tests"
          className="min-w-[180px] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-[#a9a59a]"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {LAB_SUGGESTIONS.filter((s) => !tests.some((t) => t.toLowerCase() === s.toLowerCase())).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => add(s)}
            disabled={tests.length >= MAX_LAB_TESTS}
            className="rounded-full border border-dashed border-[#d9d3c6] px-2.5 py-1 text-xs text-[#5c6072] hover:border-[#141b34] hover:text-[#141b34] disabled:opacity-40"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PrescriptionBuilder() {
  const router = useRouter();
  const appointmentId = useSearchParams().get('appointmentId') ?? '';
  const { token, logout } = useDoctorAuth();

  const [draft, setDraft] = useState<PrescriptionDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'' | 'Male' | 'Female' | 'Other'>('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([emptyMedicine()]);
  const [labTests, setLabTests] = useState<string[]>([]);
  const [advice, setAdvice] = useState('');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ pdfUrl: string; created: boolean } | null>(null);

  const authFailed = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        router.replace(DOCTOR_ROUTES.auth);
        return true;
      }
      return false;
    },
    [logout, router],
  );

  useEffect(() => {
    if (!token) return;
    if (!/^[0-9a-f-]{36}$/i.test(appointmentId)) {
      setLoadError('Choose a consultation from Appointments → Completed to write a prescription.');
      return;
    }
    let cancelled = false;
    getPrescriptionDraftApi(token, appointmentId)
      .then((d) => {
        if (cancelled) return;
        setDraft(d);
        setAge(d.patient.age ?? '');
        const g = d.patient.gender ?? '';
        setGender(g === 'Male' || g === 'Female' || g === 'Other' ? g : '');
        const p = d.prescription;
        if (p) {
          setDiagnosis(p.diagnosis ?? '');
          setMedicines(p.medicines.length ? p.medicines.map((m) => ({ ...emptyMedicine(), ...m })) : [emptyMedicine()]);
          setLabTests(p.labTests);
          setAdvice(p.advice ?? '');
        }
      })
      .catch((err) => {
        if (cancelled || authFailed(err)) return;
        setLoadError(err instanceof ApiError ? err.messages[0] : 'Could not load this appointment.');
      });
    return () => {
      cancelled = true;
    };
  }, [token, appointmentId, authFailed]);

  const updateMedicine = (i: number, key: keyof PrescriptionMedicine, value: string) =>
    setMedicines((rows) => rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));

  const filledMedicines = useMemo(
    () => medicines.filter((m) => Object.values(m).some((v) => v.trim())),
    [medicines],
  );

  const validate = (): string | null => {
    const missingName = medicines.findIndex((m) => Object.values(m).some((v) => v.trim()) && !m.name.trim());
    if (missingName >= 0) return `Enter the medicine name in row ${missingName + 1}, or clear that row.`;
    if (!diagnosis.trim() && filledMedicines.length === 0 && labTests.length === 0 && !advice.trim()) {
      return 'Add a diagnosis, at least one medicine, a lab test or advice before generating the prescription.';
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !draft || saving) return;
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const res = await savePrescriptionApi(token, {
        appointmentId: draft.appointment.id,
        diagnosis: diagnosis.trim() || undefined,
        medicines: filledMedicines.map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration: m.duration.trim(),
          instructions: m.instructions.trim(),
        })),
        labTests,
        advice: advice.trim() || undefined,
        patientAge: age.trim() || undefined,
        patientGender: gender || undefined,
      });
      setSaved({ pdfUrl: res.pdfUrl, created: res.created });
      setDraft((d) => (d ? { ...d, prescription: res.prescription } : d));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (authFailed(err)) return;
      setFormError(err instanceof ApiError ? err.messages.join(' ') : 'Could not save the prescription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // --- Header ---------------------------------------------------------------
  const header = (
    <header className="sticky top-0 z-30 border-b border-[#e7e2d8] bg-[#f6f4ef]/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href={BACK_HREF} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#141b34] hover:bg-[#ece8de]">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to Appointments</span>
        </Link>
        <span className="ml-auto flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b38a3a] text-white">
            <Stethoscope className="h-4 w-4" />
          </span>
          Doctor Portal
        </span>
      </div>
    </header>
  );

  if (loadError) {
    return (
      <>
        {header}
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <CircleAlert className="mx-auto h-8 w-8 text-[#8f2d2d]" />
          <p className="mt-3 text-sm text-[#8f2d2d]" role="alert">
            {loadError}
          </p>
          <Link href={BACK_HREF} className="mt-6 inline-flex rounded-lg bg-[#141b34] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#232c4f]">
            Back to Appointments
          </Link>
        </main>
      </>
    );
  }

  if (!draft) {
    return (
      <>
        {header}
        <p className="flex items-center justify-center gap-2 py-24 text-sm text-[#6b6f80]">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading consultation details…
        </p>
      </>
    );
  }

  const { appointment: a, patient, doctor } = draft;
  const editing = !!draft.prescription;

  return (
    <>
      {header}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{editing ? 'Update Prescription' : 'Create Prescription'}</h1>
          <p className="mt-1 text-sm text-[#6b6f80]">
            {MODE_LABEL[a.serviceMode] ?? a.serviceMode} · {dateLabel(a.appointmentDate)}, {a.startTime.replace(/^0/, '')} ·{' '}
            <span className="font-mono">{a.appointmentNum}</span>
          </p>
        </div>

        {saved && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#cfe6d6] bg-[#eaf6ee] px-5 py-4 text-[#2f6b45]" role="status">
            <CircleCheck className="h-5 w-5 shrink-0" />
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">{saved.created ? 'Prescription created.' : 'Prescription updated.'}</span> The PDF is attached to the
              appointment and {patient.name} has been notified.
            </p>
            <a
              href={prescriptionPdfUrl(saved.pdfUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f6b45] px-3 py-2 text-xs font-semibold text-white hover:bg-[#275a3a]"
            >
              <FileText className="h-4 w-4" /> View PDF
            </a>
            <Link href={BACK_HREF} className="rounded-lg border border-[#2f6b45]/30 px-3 py-2 text-xs font-semibold hover:bg-white/60">
              Back to Appointments
            </Link>
          </div>
        )}

        {!draft.canPrescribe && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#efe1bf] bg-[#fdf6e7] px-5 py-4 text-sm text-[#7a5d1a]" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            This appointment is {a.status.toLowerCase().replace('_', ' ')}. Prescriptions can be written for confirmed or completed consultations only.
          </div>
        )}

        <form onSubmit={submit} className="space-y-5" noValidate>
          <Card title="Patient & doctor" hint="Filled in from the appointment. Add the age and gender if they are missing.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ReadOnly title="Patient name" value={patient.name} />
              <div>
                <label htmlFor="rx-age" className={label}>
                  Age
                </label>
                <input id="rx-age" value={age} onChange={(e) => setAge(e.target.value.slice(0, 20))} placeholder="e.g. 34 yrs" className={input} />
              </div>
              <div>
                <label htmlFor="rx-gender" className={label}>
                  Gender
                </label>
                <select id="rx-gender" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className={input}>
                  <option value="">Not specified</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <ReadOnly title="Date" value={dateLabel(a.appointmentDate)} />
              <ReadOnly title="Doctor" value={doctor.name} />
              <ReadOnly title="Qualifications" value={doctor.degrees} />
              <ReadOnly title="PMDC Reg. No." value={doctor.pmdcNumber} mono />
              <ReadOnly title="Appointment" value={a.appointmentNum} mono />
            </div>
            {a.symptoms.length > 0 && (
              <p className="mt-4 text-xs text-[#6b6f80]">
                <span className="font-semibold text-[#3a3f52]">Reported symptoms:</span> {a.symptoms.join(', ')}
              </p>
            )}
          </Card>

          <Card title="Clinical diagnosis" hint="Primary diagnosis and clinical notes.">
            <label htmlFor="rx-diagnosis" className="sr-only">
              Clinical diagnosis
            </label>
            <textarea
              id="rx-diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value.slice(0, 4000))}
              rows={4}
              placeholder="e.g. Acute pharyngitis. Throat congestion, no fever."
              className={`${input} resize-y`}
            />
          </Card>

          <Card title="Medicines" hint="One row per medicine. Rows left empty are ignored.">
            <datalist id="rx-frequencies">
              {FREQUENCIES.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <datalist id="rx-durations">
              {DURATIONS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <datalist id="rx-instructions">
              {INSTRUCTIONS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <ol className="space-y-3">
              {medicines.map((m, i) => (
                <li key={i} className="rounded-xl border border-[#efece5] bg-[#fbfaf6] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7b5d22]">
                      <Pill className="h-3.5 w-3.5" /> Medicine {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMedicines((rows) => (rows.length === 1 ? [emptyMedicine()] : rows.filter((_, j) => j !== i)))}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#8f2d2d] hover:bg-[#fdf2f2]"
                      aria-label={`Remove medicine ${i + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-12">
                    <input
                      value={m.name}
                      onChange={(e) => updateMedicine(i, 'name', e.target.value.slice(0, 120))}
                      placeholder="Medicine name"
                      aria-label={`Medicine ${i + 1} name`}
                      className={`${input} lg:col-span-4`}
                    />
                    <input
                      value={m.dosage}
                      onChange={(e) => updateMedicine(i, 'dosage', e.target.value.slice(0, 60))}
                      placeholder="Dosage (e.g. 500mg)"
                      aria-label={`Medicine ${i + 1} dosage`}
                      className={`${input} lg:col-span-2`}
                    />
                    <input
                      value={m.frequency}
                      onChange={(e) => updateMedicine(i, 'frequency', e.target.value.slice(0, 60))}
                      list="rx-frequencies"
                      placeholder="Frequency (1-0-1)"
                      aria-label={`Medicine ${i + 1} frequency`}
                      className={`${input} lg:col-span-2`}
                    />
                    <input
                      value={m.duration}
                      onChange={(e) => updateMedicine(i, 'duration', e.target.value.slice(0, 60))}
                      list="rx-durations"
                      placeholder="Duration (5 Days)"
                      aria-label={`Medicine ${i + 1} duration`}
                      className={`${input} lg:col-span-2`}
                    />
                    <input
                      value={m.instructions}
                      onChange={(e) => updateMedicine(i, 'instructions', e.target.value.slice(0, 300))}
                      list="rx-instructions"
                      placeholder="Instructions"
                      aria-label={`Medicine ${i + 1} instructions`}
                      className={`${input} sm:col-span-2 lg:col-span-2`}
                    />
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setMedicines((rows) => [...rows, emptyMedicine()])}
              disabled={medicines.length >= MAX_MEDICINES}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#b38a3a] px-3 py-2 text-sm font-semibold text-[#7b5d22] hover:bg-[#fdf6e7] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add medicine
            </button>
          </Card>

          <Card title="Recommended lab tests" hint="Type a test and press Enter, or pick a common one.">
            <LabTestInput tests={labTests} onChange={setLabTests} />
          </Card>

          <Card title="General advice & precautions" hint="Diet, rest, precautions and follow-up. Type it, or use Dictate Advice to speak it.">
            <AdviceDictation value={advice} onChange={setAdvice} max={4000} disabled={!draft.canPrescribe} />
          </Card>

          {formError && (
            <p className="flex items-start gap-2 rounded-xl border border-[#f2cccc] bg-[#fdf2f2] px-4 py-3 text-sm text-[#8f2d2d]" role="alert">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
            </p>
          )}

          <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-[#e7e2d8] bg-[#f6f4ef]/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
            <p className="mr-auto text-xs text-[#6b6f80]">
              {filledMedicines.length} medicine{filledMedicines.length === 1 ? '' : 's'} · {labTests.length} lab test{labTests.length === 1 ? '' : 's'}
            </p>
            <Link href={BACK_HREF} className="rounded-lg border border-[#d9d3c6] bg-white px-4 py-2.5 text-sm font-semibold text-[#141b34] hover:border-[#141b34]">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !draft.canPrescribe}
              className="inline-flex items-center gap-2 rounded-lg bg-[#141b34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#232c4f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {saving ? 'Generating PDF…' : editing ? 'Update & Send to Patient' : 'Generate PDF & Send to Patient'}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
