// "Fix Now": which dashboard page and which field answers an admin's issue note.
// The page reads ?focus=<key> and scrolls to, focuses and highlights that field.

import type { FixTarget } from '@/app/lib/api/lab-portal';

export type FixFocus =
  // Documents & Licensing
  | 'license'
  | 'licenseNumber'
  | 'regulatoryBody'
  | 'logo'
  // Branches (main center)
  | 'council'
  | 'director'
  | 'address'
  | 'branchPhone'
  // Lab Profile
  | 'whatsapp'
  | 'email'
  | 'labName';

export const FIX_PAGE: Record<FixTarget, { path: string; label: string }> = {
  documents: { path: '/lab-dashboard/documents', label: 'Documents & Licensing' },
  branches: { path: '/lab-dashboard/branches', label: 'Branches' },
  profile: { path: '/lab-dashboard/profile', label: 'Lab Profile' },
};

/** The field on the target page that the note is about */
export function fixFocusOf(text: string, target: FixTarget): FixFocus {
  const t = text.toLowerCase();
  if (target === 'documents') {
    if (/logo/.test(t)) return 'logo';
    if (/regulat|issuing|commission|authority/.test(t) && !/document|scan|photo|copy|upload|blur|unclear|expired/.test(t)) return 'regulatoryBody';
    if (/licen[cs]e (no|number|#)|number mismatch|wrong number/.test(t) && !/document|scan|photo|copy|upload/.test(t)) return 'licenseNumber';
    return 'license';
  }
  if (target === 'branches') {
    if (/pmdc|\bpmc\b|medical council|council licen[cs]e|licen[cs]e (no|number)/.test(t)) return 'council';
    if (/director|patholog/.test(t)) return 'director';
    if (/address|location|map|pin\b/.test(t)) return 'address';
    if (/phone|helpline|number/.test(t)) return 'branchPhone';
    return 'council';
  }
  if (/e-?mail/.test(t)) return 'email';
  if (/whats\s?app|contact|phone|mobile|number/.test(t)) return 'whatsapp';
  if (/\bname\b/.test(t)) return 'labName';
  return 'whatsapp';
}

/**
 * "/lab-dashboard/documents?labId=..&fix=issue-1&focus=license&ft=.."
 * (`ft` changes on every click so pressing Fix Now again re-highlights the field)
 */
export function fixHref(href: (path: string) => string, issue: { id: string; text: string; target: FixTarget }, nonce?: string) {
  const focus = fixFocusOf(issue.text, issue.target);
  return `${href(FIX_PAGE[issue.target].path)}&fix=${encodeURIComponent(issue.id)}&focus=${focus}${nonce ? `&ft=${nonce}` : ''}`;
}
