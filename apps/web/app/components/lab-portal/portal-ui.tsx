'use client';

// Small pieces shared by the lab dashboard pages.

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CircleAlert, CircleCheck } from 'lucide-react';
import type { FixTarget } from '@/app/lib/api/lab-portal';
import { useLabPortal } from './LabPortalShell';

export function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[#141b34] sm:text-3xl">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-[#6b6f80]">{subtitle}</p>
    </div>
  );
}

/** The medical board's notes that belong to this page (opened from "Fix Now") */
export function FixNotice({ target }: { target: FixTarget }) {
  const { overview, href } = useLabPortal();
  const params = useSearchParams();
  const fixId = params.get('fix');
  const mine = overview.issues.filter((i) => i.target === target);
  if (mine.length === 0) return null;
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5" role="alert">
      <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
        <CircleAlert className="h-4 w-4" /> Fix requested by our medical board
      </p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-6 text-sm text-red-800">
        {mine.map((i) => (
          <li key={i.id} className={i.id === fixId ? 'font-semibold' : ''}>
            {i.text}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-red-700">
        After saving your changes, go to the{' '}
        <Link href={href('/lab-dashboard')} className="font-semibold underline">
          Dashboard
        </Link>{' '}
        and choose <span className="font-semibold">Resubmit for Review</span>.
      </p>
    </div>
  );
}

export function SaveMessage({ message }: { message: { tone: 'ok' | 'error'; text: string } | null }) {
  if (!message) return null;
  const ok = message.tone === 'ok';
  return (
    <p className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${ok ? 'bg-[#e8f3ec] text-[#1f5a35]' : 'bg-red-50 text-red-700'}`} role={ok ? 'status' : 'alert'}>
      {ok ? <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      {message.text}
    </p>
  );
}

export const cardClass = 'rounded-2xl border border-[#e7e2d8] bg-white p-4 sm:p-6';
