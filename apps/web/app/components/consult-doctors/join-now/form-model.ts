// Form state, defaults, validation and API payload for the doctor "Join Now" form.
// Kept free of React so it can be reused and tested on its own.

import type {
  DayOfWeek,
  RegisterDoctorPayload,
  TimeSlotPayload,
  UploadedImage,
} from '@/app/lib/api/doctors';

export const DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export interface DaySlot {
  enabled: boolean;
  start: string; // "HH:mm" from <input type="time">
  end: string;
}

export interface WeeklySchedule {
  sameTime: boolean;
  days: Record<DayOfWeek, DaySlot>;
}

export interface ClinicForm {
  key: string; // stable React key, not sent to the API
  name: string;
  phone: string;
  inPersonFee: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  schedule: WeeklySchedule;
}

export interface ConsultTypeForm {
  enabled: boolean;
  fee: string;
}

export interface DoctorFormState {
  fullName: string;
  title: string;
  degrees: string[]; // chips, e.g. ['MBBS', 'FCPS']
  pmdcNumber: string;
  pmdcCertificate: UploadedImage | null;
  experienceYears: string;
  languages: string;
  phone: string;
  email: string;
  specialisations: string;
  education: string;
  about: string;
  profilePhoto: UploadedImage | null;
  clinics: ClinicForm[];
  video: ConsultTypeForm;
  text: ConsultTypeForm;
  availability: WeeklySchedule;
}

export type FormErrors = Record<string, string>;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export function defaultSchedule(): WeeklySchedule {
  const days = {} as Record<DayOfWeek, DaySlot>;
  for (const day of DAYS) {
    days[day] = {
      enabled: day !== 'Saturday' && day !== 'Sunday',
      start: '10:00',
      end: '13:00',
    };
  }
  return { sameTime: true, days };
}

/**
 * `key` must be stable for the clinic that is rendered on the server, otherwise
 * the server HTML and the browser render get different ids (hydration error).
 * Pass a fixed key for the initial clinic; clinics added later by a click are
 * created only in the browser, so a random key is fine there.
 */
export function newClinic(key?: string): ClinicForm {
  return {
    key: key ?? `clinic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    phone: '',
    inPersonFee: '',
    address: '',
    latitude: null,
    longitude: null,
    schedule: defaultSchedule(),
  };
}

export function initialFormState(): DoctorFormState {
  return {
    fullName: '',
    title: '',
    degrees: [],
    pmdcNumber: '',
    pmdcCertificate: null,
    experienceYears: '',
    languages: '',
    phone: '',
    email: '',
    specialisations: '',
    education: '',
    about: '',
    profilePhoto: null,
    clinics: [newClinic('clinic-initial')],
    video: { enabled: true, fee: '' },
    text: { enabled: true, fee: '' },
    availability: defaultSchedule(),
  };
}

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------

/** Updates one day; with "same time for all" on, times are copied to every day. */
export function updateScheduleDay(
  schedule: WeeklySchedule,
  day: DayOfWeek,
  patch: Partial<DaySlot>,
): WeeklySchedule {
  const days = { ...schedule.days, [day]: { ...schedule.days[day], ...patch } };
  const timeChanged = patch.start !== undefined || patch.end !== undefined;

  if (schedule.sameTime && timeChanged) {
    const { start, end } = days[day];
    for (const d of DAYS) days[d] = { ...days[d], start, end };
  }
  return { ...schedule, days };
}

/** Turning "same time" on copies the first ticked day's times to all days. */
export function setSameTime(schedule: WeeklySchedule, sameTime: boolean): WeeklySchedule {
  if (!sameTime) return { ...schedule, sameTime };
  const source = DAYS.map((d) => schedule.days[d]).find((s) => s.enabled) ?? schedule.days.Monday;
  const days = {} as Record<DayOfWeek, DaySlot>;
  for (const d of DAYS) days[d] = { ...schedule.days[d], start: source.start, end: source.end };
  return { sameTime, days };
}

export function scheduleToSlots(schedule: WeeklySchedule): TimeSlotPayload[] {
  return DAYS.filter((d) => schedule.days[d].enabled).map((d) => ({
    dayOfWeek: d,
    startTime: schedule.days[d].start,
    endTime: schedule.days[d].end,
  }));
}

function minutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function scheduleError(schedule: WeeklySchedule): string | null {
  const enabled = DAYS.filter((d) => schedule.days[d].enabled);
  if (enabled.length === 0) return 'Tick at least one day.';
  for (const d of enabled) {
    const { start, end } = schedule.days[d];
    if (!start || !end) return `Set both times for ${d}.`;
    if (minutes(end) <= minutes(start)) return `${d}: closing time must be after opening time.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validation (mirrors the API rules so errors show before submitting)
// ---------------------------------------------------------------------------

export function splitList(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => {
      const k = v.toLowerCase();
      if (!v || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PMDC_RE = /^[A-Z0-9-]{3,30}$/;

function isFee(value: string) {
  if (value.trim() === '') return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000;
}

export function validateForm(form: DoctorFormState): FormErrors {
  const e: FormErrors = {};

  // 1. Personal information
  if (form.fullName.trim().length < 2) e.fullName = 'Enter your full name.';
  if (!form.title.trim()) e.title = 'Enter your title or specialty.';
  if (form.degrees.length === 0) e.degrees = 'Add at least one degree, e.g. MBBS.';
  const pmdc = form.pmdcNumber.trim().toUpperCase().replace(/\s+/g, '');
  if (!pmdc) e.pmdcNumber = 'Enter your PMDC number.';
  else if (!PMDC_RE.test(pmdc)) e.pmdcNumber = 'Use only letters, numbers and dashes.';

  const years = Number(form.experienceYears);
  if (form.experienceYears.trim() === '') e.experienceYears = 'Enter years of experience.';
  else if (!Number.isInteger(years) || years < 0 || years > 70)
    e.experienceYears = 'Enter a whole number between 0 and 70.';

  if (splitList(form.languages).length === 0) e.languages = 'Add at least one language.';
  if (!PHONE_RE.test(form.phone.trim())) e.phone = 'Enter a valid phone number, e.g. +92 300 1234567.';
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address.';
  if (splitList(form.specialisations).length === 0)
    e.specialisations = 'Add at least one specialisation.';

  // 2. Clinics
  form.clinics.forEach((c, i) => {
    const p = `clinics.${i}`;
    if (!c.name.trim()) e[`${p}.name`] = 'Enter the clinic name.';
    if (c.phone.trim() && !PHONE_RE.test(c.phone.trim())) e[`${p}.phone`] = 'Enter a valid phone number.';
    if (!isFee(c.inPersonFee)) e[`${p}.inPersonFee`] = 'Enter the in-person fee.';
    if (!c.address.trim()) e[`${p}.address`] = 'Enter the clinic address.';
    const s = scheduleError(c.schedule);
    if (s) e[`${p}.schedule`] = s;
  });

  // 3. Consultation types
  if (!form.video.enabled && !form.text.enabled && form.clinics.length === 0) {
    e.consultation = 'Offer at least one way to consult: video, text or a clinic.';
  }
  if (form.video.enabled && !isFee(form.video.fee)) e['video.fee'] = 'Enter the video call fee.';
  if (form.text.enabled && !isFee(form.text.fee)) e['text.fee'] = 'Enter the text appointment fee.';

  // 4. Weekly availability (only needed for online consults)
  if (form.video.enabled || form.text.enabled) {
    const s = scheduleError(form.availability);
    if (s) e.availability = s;
  }

  return e;
}

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

const optional = (v: string) => (v.trim() ? v.trim() : undefined);

export function buildPayload(form: DoctorFormState): RegisterDoctorPayload {
  const online = form.video.enabled || form.text.enabled;

  return {
    fullName: form.fullName.trim(),
    title: form.title.trim(),
    degrees: form.degrees.join(', '),
    pmdcNumber: form.pmdcNumber.trim().toUpperCase().replace(/\s+/g, ''),
    pmdcCertificateUrl: form.pmdcCertificate?.fileUrl,
    experienceYears: Number(form.experienceYears),
    languages: splitList(form.languages),
    phone: form.phone.trim(),
    email: optional(form.email),
    specialisations: splitList(form.specialisations),
    education: optional(form.education),
    about: optional(form.about),
    profilePhotoUrl: form.profilePhoto?.fileUrl,

    isVideoCallEnabled: form.video.enabled,
    videoCallFee: form.video.enabled ? Number(form.video.fee) : undefined,
    isTextConsultEnabled: form.text.enabled,
    textConsultFee: form.text.enabled ? Number(form.text.fee) : undefined,

    clinics: form.clinics.map((c) => ({
      name: c.name.trim(),
      phone: optional(c.phone),
      inPersonFee: Number(c.inPersonFee),
      address: c.address.trim(),
      latitude: c.latitude ?? undefined,
      longitude: c.longitude ?? undefined,
      schedules: scheduleToSlots(c.schedule),
    })),

    onlineAvailabilities: online ? scheduleToSlots(form.availability) : [],
  };
}

// ---------------------------------------------------------------------------
// Draft persistence
// ---------------------------------------------------------------------------

export const DRAFT_STORAGE_KEY = 'tabibistan_doctor_registration_draft';

export function loadDraft(): DoctorFormState | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DoctorFormState>;
    const base = initialFormState();
    // Merge onto defaults so older drafts missing new fields still load
    // Drafts saved before degrees became tags stored them as one string
    const degrees = Array.isArray(parsed.degrees)
      ? parsed.degrees
      : typeof parsed.degrees === 'string'
        ? splitList(parsed.degrees)
        : base.degrees;
    return {
      ...base,
      ...parsed,
      degrees,
      video: { ...base.video, ...parsed.video },
      text: { ...base.text, ...parsed.text },
      availability: parsed.availability ?? base.availability,
      clinics: Array.isArray(parsed.clinics) ? parsed.clinics : base.clinics,
    };
  } catch {
    return null;
  }
}

export function saveDraft(form: DoctorFormState) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
  } catch {
    // Storage full or blocked - the draft just isn't kept
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
