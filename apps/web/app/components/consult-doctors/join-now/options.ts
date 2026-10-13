// Preset choices for the Join Now form. Doctors can still type their own value.

export const TITLE_OPTIONS = [
  'Consultant Family Physician',
  'General Practitioner / Physician',
  'Consultant Dermatologist',
  'Gynecologist & Obstetrician',
  'Pediatrician',
  'Cardiologist',
  'Neurologist',
  'Orthopedic Surgeon',
];

export const DEGREE_OPTIONS = [
  'MBBS',
  'FCPS',
  'MCPS',
  'MD',
  'MS',
  'BDS',
  'MPhil',
  'Diploma in Dermatology',
];

/** 1 Year … 29 Years, then "30+ Years" (which asks for the exact number). */
export const EXPERIENCE_OPTIONS: { value: string; label: string }[] = [
  ...Array.from({ length: 29 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} ${i === 0 ? 'Year' : 'Years'}`,
  })),
  { value: '30', label: '30+ Years' },
];
