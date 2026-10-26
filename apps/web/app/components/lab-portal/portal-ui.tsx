'use client';

// Small pieces shared by the lab dashboard pages.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CircleAlert, CircleCheck } from 'lucide-react';
import type { FixTarget } from '@/app/lib/api/lab-portal';
import type { FixFocus } from './fix-routing';
import { useLabPortal } from './LabPortalShell';

/** The field "Fix Now" asked for (?focus=...), or null */
export function useFixFocusParam(): { focus: FixFocus | null; nonce: string } {
  const params = useSearchParams();
  return { focus: (params.get('focus') as FixFocus | null) ?? null, nonce: params.get('ft') ?? '' };
}

/**
 * Opened from "Fix Now" with ?focus=<key>: scrolls the element with `elementId`
 * into view, focuses its first field and highlights it for a few seconds.
 * Returns true while the highlight is on.
 */
export function useFixFocus(key: FixFocus | FixFocus[], elementId: string, ready = true): boolean {
  const { focus, nonce } = useFixFocusParam();
  const keys = Array.isArray(key) ? key : [key];
  const wanted = focus !== null && keys.includes(focus) && ready;
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!wanted) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      const el = document.getElementById(elementId);
      if (!el) {
        if (tries++ < 40) timer = setTimeout(run, 50);
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const field = el.matches('input, select, textarea') ? el : el.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea');
      field?.focus({ preventScroll: true });
      setActive(true);
      timer = setTimeout(() => setActive(false), 4500);
    };
    timer = setTimeout(run, 60);
    return () => clearTimeout(timer);
  }, [wanted, elementId, nonce]);

  return active;
}

/** Ring shown around the field opened from "Fix Now" */
export const fixHighlightClass = 'rounded-2xl ring-4 ring-amber-400/80 ring-offset-4 ring-offset-white transition-shadow duration-300';

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
        {target === 'documents' ? (
          <>
            Upload the corrected document and choose <span className="font-semibold">Save Documents</span>. Your lab is sent back for review automatically.
          </>
        ) : (
          <>
            After saving your changes, choose <span className="font-semibold">Resubmit for Review</span> in the notice above or on the{' '}
            <Link href={href('/lab-dashboard')} className="font-semibold underline">
              Dashboard
            </Link>
            .
          </>
        )}
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
