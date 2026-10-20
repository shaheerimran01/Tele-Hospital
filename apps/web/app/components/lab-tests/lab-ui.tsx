'use client';

// Icons and colours of the lab category cards (shared by the Lab Tests page and the category pages).

import {
  Activity,
  Baby,
  Bone,
  Droplet,
  Droplets,
  FlaskConical,
  HeartPulse,
  Mars,
  Microscope,
  Radiation,
  Ribbon,
  Scan,
  ScanLine,
  ShieldPlus,
  Sun,
  TestTubes,
  Thermometer,
  Venus,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';

export const CARD_STYLE: Record<string, { Icon: LucideIcon; tone: string }> = {
  'full-body': { Icon: Activity, tone: 'bg-emerald-50 text-emerald-600' },
  'fever-infection': { Icon: Thermometer, tone: 'bg-orange-50 text-orange-600' },
  diabetes: { Icon: Droplet, tone: 'bg-rose-50 text-rose-600' },
  vitamins: { Icon: Sun, tone: 'bg-amber-50 text-amber-600' },
  men: { Icon: Mars, tone: 'bg-sky-50 text-sky-600' },
  women: { Icon: Venus, tone: 'bg-pink-50 text-pink-600' },
  'liver-kidney': { Icon: FlaskConical, tone: 'bg-teal-50 text-teal-600' },
  thyroid: { Icon: ShieldPlus, tone: 'bg-indigo-50 text-indigo-600' },
  hormones: { Icon: Baby, tone: 'bg-fuchsia-50 text-fuchsia-600' },
  allergy: { Icon: Wind, tone: 'bg-cyan-50 text-cyan-600' },
  'ct-scan': { Icon: Scan, tone: 'bg-blue-50 text-blue-600' },
  ecg: { Icon: HeartPulse, tone: 'bg-red-50 text-red-600' },
  'x-ray': { Icon: Bone, tone: 'bg-slate-100 text-slate-700' },
  ultrasound: { Icon: Waves, tone: 'bg-sky-50 text-sky-600' },
  mri: { Icon: ScanLine, tone: 'bg-violet-50 text-violet-600' },
  echo: { Icon: HeartPulse, tone: 'bg-rose-50 text-rose-600' },
  radiology: { Icon: Radiation, tone: 'bg-yellow-50 text-yellow-700' },
  blood: { Icon: Droplets, tone: 'bg-red-50 text-red-600' },
  'urine-stool': { Icon: TestTubes, tone: 'bg-lime-50 text-lime-700' },
  heart: { Icon: HeartPulse, tone: 'bg-rose-50 text-rose-600' },
  cancer: { Icon: Ribbon, tone: 'bg-purple-50 text-purple-600' },
  pathology: { Icon: Microscope, tone: 'bg-gray-100 text-gray-700' },
};

export function categoryStyle(key: string) {
  return CARD_STYLE[key] ?? { Icon: FlaskConical, tone: 'bg-gray-100 text-gray-700' };
}
