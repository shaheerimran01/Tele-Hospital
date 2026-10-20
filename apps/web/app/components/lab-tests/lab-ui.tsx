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
  scans: { Icon: ScanLine, tone: 'bg-sky-100 text-sky-700' },
};

export function categoryStyle(key: string) {
  return CARD_STYLE[key] ?? { Icon: FlaskConical, tone: 'bg-gray-100 text-gray-700' };
}

const unsplash = (id: string, w = 400) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Photos of the picture cards ("health needs" and radiology rows); other cards use their icon */
export const CARD_PHOTO: Record<string, string> = {
  men: unsplash('1507003211169-0a1dd7228f2d'),
  women: unsplash('1573496359142-b8d87734a5a2'),
  'liver-kidney': unsplash('1500648767791-00dcc994a43e'),
  thyroid: unsplash('1506794778202-cad84cf45f1d'),
  hormones: unsplash('1544005313-94ddf0286df2'),
  allergy: unsplash('1534528741775-53994a69daeb'),
  'ct-scan': unsplash('1516549655169-df83a0774514'),
  ecg: unsplash('1576091160399-112ba8d25d1d'),
  'x-ray': unsplash('1519494026892-80bbd2d6fd0d'),
  ultrasound: unsplash('1579684385127-1ef15d508118'),
  mri: unsplash('1530497610245-94d3c16cda28'),
  echo: unsplash('1584515979956-d9f6e5d09982'),
  radiology: unsplash('1582719478250-c89cae4dc85b'),
};

/** Soft background behind each health-needs photo */
export const CARD_BACKDROP: Record<string, string> = {
  men: 'from-[#ffedd5] to-[#fed7aa]',
  women: 'from-[#dbeafe] to-[#bfdbfe]',
  'liver-kidney': 'from-[#ccfbf1] to-[#99f6e4]',
  thyroid: 'from-[#e0e7ff] to-[#c7d2fe]',
  hormones: 'from-[#fce7f3] to-[#fbcfe8]',
  allergy: 'from-[#cffafe] to-[#a5f3fc]',
};

/** Trust tiles next to the search on the Lab Tests page */
export const HERO_TILES = [
  { title: 'Trusted, certified labs', text: 'Hygienic and safety-assured testing', image: unsplash('1582719478250-c89cae4dc85b', 600) },
  { title: 'All your tests in one place', text: 'Health packages, tests, X-rays and scans', image: unsplash('1579154204601-01588f351e67', 600) },
  { title: 'Home sample collection', text: 'Safe pickup at your doorstep', image: unsplash('1631815588090-d4bfec5b1ccb', 600) },
  { title: 'Fast, accurate reports', text: 'Doctor-verified, delivered on time', image: unsplash('1559839734-2b71ea197ec2', 600) },
];
