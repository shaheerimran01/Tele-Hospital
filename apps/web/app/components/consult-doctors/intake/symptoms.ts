// Common symptom chips shown for each speciality on the intake page.
// Specialities come from the database, so they're matched by slug/name keywords
// (e.g. "dermatologist", "gynecologist", "Gynecologist & Obstetrician").

import type { Speciality } from '@/app/lib/api/consultation';

export const DEFAULT_SYMPTOMS = ['Fever', 'Pain', 'Weakness', 'Nausea', 'Cough'];

const SYMPTOMS_BY_SPECIALITY: { match: RegExp; symptoms: string[] }[] = [
  {
    match: /derma|skin/,
    symptoms: ['Acne / Pimples', 'Skin Rash', 'Itching / Allergy', 'Hair Loss', 'Pigmentation', 'Dark Spots'],
  },
  {
    match: /general|physician|family/,
    symptoms: ['Fever', 'Cough & Cold', 'Headache', 'Body Ache', 'Flu / Chills', 'Stomach Pain'],
  },
  {
    match: /gyn|obstet/,
    symptoms: ['Irregular Periods', 'PCOS / PCOD', 'Pregnancy Query', 'Pelvic Pain', 'Hormonal Issues'],
  },
  {
    match: /pediatric|paediatric|child/,
    symptoms: ['Child Fever', 'Vomiting / Diarrhea', 'Skin Allergy', 'Growth & Nutrition', 'Cough in Kids'],
  },
  {
    match: /cardio|heart/,
    symptoms: ['Chest Tightness', 'High BP', 'Palpitations', 'Shortness of Breath', 'Dizziness'],
  },
  {
    match: /ortho|bone|joint/,
    symptoms: ['Joint Pain', 'Back Pain', 'Knee Swelling', 'Muscle Cramp', 'Sports Injury'],
  },
];

/** Symptom chips for the chosen speciality, or the general fallback list. */
export function symptomsForSpeciality(speciality: Pick<Speciality, 'name' | 'slug'> | null): string[] {
  if (!speciality) return DEFAULT_SYMPTOMS;
  const key = `${speciality.slug} ${speciality.name}`.toLowerCase();
  return SYMPTOMS_BY_SPECIALITY.find((s) => s.match.test(key))?.symptoms ?? DEFAULT_SYMPTOMS;
}
