// Lab registration form: state shape, defaults, validation and the payload
// that will be sent to the API once the backend is connected.

export const MAX_BRANCHES = 20;

/** Logo: images only. License: image or PDF. */
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LICENSE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
export const LICENSE_MAX_BYTES = 10 * 1024 * 1024;

/** Values match the RegulatoryBody enum in apps/api/prisma/schema.prisma */
export const REGULATORY_BODIES = [
  { value: 'PHC', label: 'Punjab Healthcare Commission (PHC)' },
  { value: 'SHC', label: 'Sindh Healthcare Commission (SHC)' },
  { value: 'KPK_HCC', label: 'KPK Healthcare Commission' },
  { value: 'B_HCC', label: 'Balochistan Healthcare Commission' },
  { value: 'FEDERAL', label: 'Federal Regulatory Authority' },
  { value: 'OTHER', label: 'Other' },
] as const;
export type RegulatoryBody = (typeof REGULATORY_BODIES)[number]['value'];

/** WhatsApp country codes; Pakistan first (default) */
export const COUNTRY_CODES = [
  { iso: 'PK', name: 'Pakistan', dial: '92' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966' },
  { iso: 'QA', name: 'Qatar', dial: '974' },
  { iso: 'OM', name: 'Oman', dial: '968' },
  { iso: 'KW', name: 'Kuwait', dial: '965' },
  { iso: 'BH', name: 'Bahrain', dial: '973' },
  { iso: 'GB', name: 'United Kingdom', dial: '44' },
  { iso: 'US', name: 'United States / Canada', dial: '1' },
  { iso: 'AF', name: 'Afghanistan', dial: '93' },
  { iso: 'CN', name: 'China', dial: '86' },
  { iso: 'TR', name: 'Türkiye', dial: '90' },
] as const;

export interface PickedFile {
  file: File;
  /** object URL for the preview (revoked when the file is removed) */
  previewUrl: string;
}

export interface BranchForm {
  /** local key for React lists; not sent */
  id: string;
  name: string;
  directorName: string;
  councilLicenseNumber: string;
  /** branch phone / helpline (optional) */
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface LabForm {
  labName: string;
  logo: PickedFile | null;
  email: string;
  whatsappCountry: string;
  /** national number as typed (spaces allowed) */
  whatsappNumber: string;
  licenseNumber: string;
  licenseDocument: PickedFile | null;
  regulatoryBody: RegulatoryBody | '';
  /** home sample collection offered (Laboratory.hasHomeSample) */
  hasHomeSample: boolean;
  /** home collection fee in PKR, as typed ("" / "0" = free) */
  homeSampleFee: string;
  branches: BranchForm[];
}

let seq = 0;
export const newBranchId = () => `branch-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const emptyBranch = (): BranchForm => ({
  id: newBranchId(),
  name: '',
  directorName: '',
  phone: '',
  councilLicenseNumber: '',
  address: '',
  latitude: null,
  longitude: null,
});

export const initialLabForm = (): LabForm => ({
  labName: '',
  logo: null,
  email: '',
  whatsappCountry: 'PK',
  whatsappNumber: '',
  licenseNumber: '',
  licenseDocument: null,
  regulatoryBody: '',
  hasHomeSample: true,
  homeSampleFee: '0',
  branches: [emptyBranch()],
});

/** "Branch 1 · Main Center", "Branch 2", ... */
export const branchTitle = (index: number) => (index === 0 ? 'Branch 1 · Main Center' : `Branch ${index + 1}`);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const LICENSE_RE = /^[A-Za-z0-9][A-Za-z0-9\-/. ]{1,38}[A-Za-z0-9]$/;
const COUNCIL_RE = /^[A-Za-z0-9][A-Za-z0-9\-/ ]{1,18}[A-Za-z0-9]$/;

/**
 * WhatsApp number in international format (+923001234567), or null when invalid.
 * Pakistan: a 10-digit mobile number starting with 3 (a leading 0 is dropped).
 */
export function whatsappE164(countryIso: string, national: string): string | null {
  const country = COUNTRY_CODES.find((c) => c.iso === countryIso);
  if (!country) return null;
  let digits = national.replace(/[\s\-()]/g, '');
  if (!/^\+?\d+$/.test(digits)) return null;
  // Pasted in full international form
  if (digits.startsWith('+')) {
    if (!digits.startsWith(`+${country.dial}`)) return null;
    digits = digits.slice(country.dial.length + 1);
  } else if (digits.startsWith('00' + country.dial)) {
    digits = digits.slice(country.dial.length + 2);
  }
  digits = digits.replace(/^0+/, '');
  if (country.iso === 'PK') return /^3\d{9}$/.test(digits) ? `+92${digits}` : null;
  const total = country.dial.length + digits.length;
  return digits.length >= 6 && total <= 15 ? `+${country.dial}${digits}` : null;
}

export function fileError(f: File | undefined | null, types: string[], maxBytes: number, kind: string): string | null {
  if (!f) return null;
  if (!types.includes(f.type)) return kind === 'logo' ? 'Please choose a PNG or JPG image.' : 'Please choose a PNG, JPG or PDF file.';
  if (f.size > maxBytes) return `The file must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`;
  return null;
}

export type FormErrors = Record<string, string>;

/** Error keys match the field ids (branch fields: `branches.<id>.<field>`) */
export function validateLabForm(form: LabForm): FormErrors {
  const e: FormErrors = {};
  const name = form.labName.trim();
  if (!name) e.labName = 'Enter the laboratory name.';
  else if (name.length < 2 || name.length > 120) e.labName = 'The name must be 2 to 120 characters.';

  const logoErr = fileError(form.logo?.file, LOGO_TYPES, LOGO_MAX_BYTES, 'logo');
  if (logoErr) e.logo = logoErr;

  const email = form.email.trim();
  if (!email) e.email = 'Enter an email address.';
  else if (!EMAIL_RE.test(email)) e.email = 'Enter a valid email address, e.g. info@yourlab.com.';

  // WhatsApp is an optional contact number for patient inquiries
  if (form.whatsappNumber.trim() && !whatsappE164(form.whatsappCountry, form.whatsappNumber)) {
    e.whatsappNumber =
      form.whatsappCountry === 'PK' ? 'Enter a valid Pakistani mobile number, e.g. 300 1234567.' : 'Enter a valid mobile number.';
  }

  const lic = form.licenseNumber.trim();
  if (!lic) e.licenseNumber = 'Enter the healthcare license number.';
  else if (!LICENSE_RE.test(lic)) e.licenseNumber = 'Use 3 to 40 letters, numbers, dashes or slashes.';

  if (!form.licenseDocument) e.licenseDocument = 'Upload the license document (image or PDF).';
  else {
    const docErr = fileError(form.licenseDocument.file, LICENSE_TYPES, LICENSE_MAX_BYTES, 'license');
    if (docErr) e.licenseDocument = docErr;
  }

  if (!form.regulatoryBody) e.regulatoryBody = 'Select the issuing regulatory body.';

  if (form.hasHomeSample && homeSampleFeeValue(form.homeSampleFee) === null) {
    e.homeSampleFee = 'Enter the fee in whole rupees (0 for free), up to 100,000.';
  }

  const seen = new Map<string, number>();
  form.branches.forEach((b, i) => {
    const k = (f: string) => `branches.${b.id}.${f}`;
    const bName = b.name.trim();
    if (!bName) e[k('name')] = 'Enter a branch name, e.g. Gulberg Branch.';
    else {
      const key = bName.toLowerCase();
      if (seen.has(key)) e[k('name')] = `This name is already used by ${branchTitle(seen.get(key)!).split(' · ')[0]}.`;
      else seen.set(key, i);
    }
    if (!b.directorName.trim()) e[k('directorName')] = 'Enter the medical director or pathologist name.';
    const council = b.councilLicenseNumber.trim();
    if (!council) e[k('councilLicenseNumber')] = 'Enter the PMDC / PMC license number.';
    else if (!COUNCIL_RE.test(council)) e[k('councilLicenseNumber')] = 'Use 3 to 20 letters, numbers or dashes, e.g. 12345-P.';
    if (b.phone.trim() && !BRANCH_PHONE_RE.test(b.phone.trim())) e[k('phone')] = 'Enter a valid phone number, e.g. 042 35761234 or 0300 1234567.';
    if (b.address.trim().length < 5) e[k('address')] = 'Enter the full branch address.';
    if (b.latitude == null || b.longitude == null) e[k('location')] = 'Drop a pin on the map to set the exact location.';
  });
  return e;
}

/** Which section a field belongs to (for the progress list) */
export function sectionOf(key: string): 1 | 2 | 3 {
  if (key.startsWith('branches.')) return 3;
  if (['licenseNumber', 'licenseDocument', 'regulatoryBody'].includes(key)) return 2;
  return 1;
}

/** "" -> 0, "300" -> 300, invalid -> null */
export function homeSampleFeeValue(input: string): number | null {
  const t = input.replace(/[,\s]/g, '');
  if (!t) return 0;
  if (!/^\d{1,6}$/.test(t)) return null;
  const n = Number(t);
  return n <= 100000 ? n : null;
}

export const BRANCH_PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,19}$/;

/**
 * Multipart body for POST /labs/register. `phone` is the verified login phone
 * (the API also checks it against the signed-in session).
 */
export function buildRegistrationFormData(form: LabForm, phone: string): FormData {
  const fd = new FormData();
  fd.append('name', form.labName.trim());
  fd.append('email', form.email.trim().toLowerCase());
  fd.append('phone', phone);
  const wa = form.whatsappNumber.trim() ? whatsappE164(form.whatsappCountry, form.whatsappNumber) : null;
  if (wa) fd.append('whatsappNumber', wa);
  fd.append('licenseNumber', form.licenseNumber.trim().toUpperCase());
  fd.append('regulatoryBody', form.regulatoryBody);
  fd.append('hasHomeSample', String(form.hasHomeSample));
  fd.append('homeSampleFee', String(form.hasHomeSample ? homeSampleFeeValue(form.homeSampleFee) ?? 0 : 0));
  if (form.logo) fd.append('logo', form.logo.file);
  if (form.licenseDocument) fd.append('licenseDoc', form.licenseDocument.file);
  fd.append(
    'branches',
    JSON.stringify(
      form.branches.map((b, i) => ({
        name: b.name.trim(),
        isMainCenter: i === 0,
        medicalDirectorName: b.directorName.trim(),
        medicalCouncilLicenseNo: b.councilLicenseNumber.trim().toUpperCase(),
        address: b.address.trim(),
        ...(b.phone.trim() ? { phone: b.phone.trim() } : {}),
        ...(b.latitude != null && b.longitude != null ? { latitude: b.latitude, longitude: b.longitude } : {}),
      })),
    ),
  );
  return fd;
}

const fileInfo = (f: PickedFile | null) => (f ? { name: f.file.name, type: f.file.type, size: f.file.size } : null);

/** What will be sent to the API (files as metadata; the File objects stay in state for upload) */
export function buildPayload(form: LabForm) {
  const body = REGULATORY_BODIES.find((r) => r.value === form.regulatoryBody);
  return {
    labName: form.labName.trim(),
    logo: fileInfo(form.logo),
    email: form.email.trim().toLowerCase(),
    whatsappNumber: whatsappE164(form.whatsappCountry, form.whatsappNumber),
    license: {
      number: form.licenseNumber.trim(),
      document: fileInfo(form.licenseDocument),
      regulatoryBody: form.regulatoryBody,
      regulatoryBodyName: body?.label ?? '',
    },
    branches: form.branches.map((b, i) => ({
      order: i + 1,
      isMain: i === 0,
      name: b.name.trim(),
      medicalDirectorName: b.directorName.trim(),
      medicalCouncilLicenseNumber: b.councilLicenseNumber.trim().toUpperCase(),
      phone: b.phone.trim() || null,
      address: b.address.trim(),
      latitude: b.latitude,
      longitude: b.longitude,
    })),
  };
}
