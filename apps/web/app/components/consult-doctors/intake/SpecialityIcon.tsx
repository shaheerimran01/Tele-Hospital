import {
  Activity,
  Baby,
  Bone,
  Brain,
  Ear,
  HeartPulse,
  Smile,
  Sparkles,
  Stethoscope,
  Venus,
  type LucideIcon,
} from 'lucide-react';

// Keys match the `iconUrl` values the API seeds, with slug keywords as a fallback.
const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  skin: Sparkles,
  female: Venus,
  baby: Baby,
  heart: HeartPulse,
  ear: Ear,
  brain: Brain,
  bone: Bone,
  mind: Smile,
  stomach: Activity,
};

const SLUG_HINTS: [string, string][] = [
  ['derma', 'skin'],
  ['gyn', 'female'],
  ['pedia', 'baby'],
  ['cardio', 'heart'],
  ['ent', 'ear'],
  ['neuro', 'brain'],
  ['ortho', 'bone'],
  ['psych', 'mind'],
  ['gastro', 'stomach'],
];

export function getSpecialityIcon(iconKey?: string | null, slug?: string) {
  if (iconKey && ICONS[iconKey]) return ICONS[iconKey];
  const hint = SLUG_HINTS.find(([k]) => slug?.includes(k));
  return hint ? ICONS[hint[1]] : Stethoscope;
}

export default function SpecialityIcon({
  iconKey,
  slug,
  className = 'h-5 w-5',
}: {
  iconKey?: string | null;
  slug?: string;
  className?: string;
}) {
  const Icon = getSpecialityIcon(iconKey, slug);
  return <Icon className={className} aria-hidden="true" />;
}
