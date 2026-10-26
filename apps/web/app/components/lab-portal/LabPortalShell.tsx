'use client';

// Lab dashboard frame: sidebar navigation + top bar (logo, name, verification
// status, sign out). Loads the signed-in lab once and shares it with the pages.
// No session -> /lab-login; signed in but no lab yet -> /lab-registration.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  FileCheck,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Settings,
  ShoppingBag,
  TriangleAlert,
  X,
} from 'lucide-react';
import {
  LabPortalError,
  clearLabSession,
  getLabOverviewApi,
  getLabSession,
  labFileUrl,
  resubmitLabApi,
  type FixTarget,
  type LabOverview,
  type LabVerificationStatus,
} from '@/app/lib/api/lab-portal';
import { FIX_PAGE, fixHref } from './fix-routing';

interface LabPortalValue {
  overview: LabOverview;
  labId: string;
  /** reload the lab after a change */
  refresh: () => Promise<void>;
  /** "/lab-dashboard/branches" -> "/lab-dashboard/branches?labId=..." */
  href: (path: string) => string;
}

const LabPortalContext = createContext<LabPortalValue | null>(null);

export function useLabPortal() {
  const v = useContext(LabPortalContext);
  if (!v) throw new Error('useLabPortal must be used inside LabPortalShell');
  return v;
}

export const STATUS_BADGE: Record<LabVerificationStatus, { label: string; cls: string }> = {
  APPROVED: { label: 'Verified', cls: 'bg-[#e8f3ec] text-[#2f7a4b] ring-[#2f7a4b]/20' },
  PENDING: { label: 'Pending review', cls: 'bg-sky-50 text-sky-800 ring-sky-700/20' },
  REJECTED: { label: 'Action required', cls: 'bg-red-50 text-red-700 ring-red-600/20' },
};

const NAV = [
  { path: '/lab-dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/lab-dashboard/orders', label: 'Patient Orders', Icon: ShoppingBag },
  { path: '/lab-dashboard/prescriptions', label: 'Lab Prescriptions', Icon: FileCheck },
  { path: '/lab-dashboard/manage-tests', label: 'Tests & Package Inventory', Icon: FlaskConical },
  { path: '/lab-dashboard/branches', label: 'Branches', Icon: Building2 },
  { path: '/lab-dashboard/documents', label: 'Documents & Licensing', Icon: FileText },
  { path: '/lab-dashboard/profile', label: 'Lab Profile', Icon: Settings },
];

export default function LabPortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [overview, setOverview] = useState<LabOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setOverview(await getLabOverviewApi());
      setError(null);
    } catch (e) {
      if (e instanceof LabPortalError && e.status === 401) router.replace('/lab-login');
      else if (e instanceof LabPortalError && e.status === 404) router.replace('/lab-registration');
      else setError(e instanceof Error ? e.message : 'Could not load your lab.');
    }
  }, [router]);

  useEffect(() => {
    if (!getLabSession()) {
      router.replace('/lab-login');
      return;
    }
    load();
  }, [load, router]);

  // Keep ?labId= in the address in line with the signed-in lab
  const labId = overview?.laboratory.id;
  useEffect(() => {
    if (!labId) return;
    if (params.get('labId') !== labId) {
      const q = new URLSearchParams(params.toString());
      q.delete('laboratoryId');
      q.set('labId', labId);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    }
  }, [labId, params, pathname, router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  // Pick up changes made by our team (approval, review notes) when the lab
  // moves to another page or comes back to this browser tab
  const loaded = useRef(false);
  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    if (getLabSession()) load();
  }, [pathname, load]);
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && getLabSession() && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const signOut = () => {
    clearLabSession();
    router.replace('/lab-login');
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f4ef] px-4">
        <div className="flex max-w-md flex-wrap items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <CircleAlert className="h-4 w-4 shrink-0" /> {error}
          <button type="button" onClick={load} className="font-semibold underline">
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!overview) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-[#f6f4ef] text-sm text-[#6b6f80]">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading your lab…
      </div>
    );
  }

  const lab = overview.laboratory;
  const status = STATUS_BADGE[lab.verificationStatus];
  const href = (path: string) => `${path}?labId=${lab.id}`;
  const logo = labFileUrl(lab.logoUrl);
  const isActive = (path: string) => (path === '/lab-dashboard' ? pathname === path : pathname.startsWith(path));

  const nav = (
    <nav aria-label="Lab dashboard" className="space-y-1 p-3">
      {NAV.map(({ path, label, Icon }) => {
        const active = isActive(path);
        const flag = path === '/lab-dashboard' && overview.issues.length > 0;
        return (
          <Link
            key={path}
            href={href(path)}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{label}</span>
            {flag && <span className="h-2 w-2 rounded-full bg-red-400" aria-label="Action required" />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <LabPortalContext.Provider value={{ overview, labId: lab.id, refresh: load, href }}>
      <div className="min-h-screen bg-[#f6f4ef] text-[#141b34] lg:pl-64">
        {/* Sidebar (desktop) */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#141b34] lg:flex">
          <Link href={href('/lab-dashboard')} className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff574d] text-white">
              <FlaskConical className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-white">
              Tabibistan <span className="font-normal text-white/60">Labs</span>
            </span>
          </Link>
          {nav}
          <button type="button" onClick={signOut} className="mt-auto flex items-center gap-3 border-t border-white/10 px-6 py-4 text-sm text-white/70 hover:text-white">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </aside>

        {/* Sidebar (mobile drawer) */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)}>
            <aside className="flex h-full w-72 max-w-[85vw] flex-col bg-[#141b34]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <span className="text-sm font-bold text-white">
                  Tabibistan <span className="font-normal text-white/60">Labs</span>
                </span>
                <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="rounded p-1 text-white/70 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {nav}
              <button type="button" onClick={signOut} className="mt-auto flex items-center gap-3 border-t border-white/10 px-6 py-4 text-sm text-white/70 hover:text-white">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </aside>
          </div>
        )}

        {/* Top bar + admin issue notice (both stay on screen while scrolling) */}
        <div className="sticky top-0 z-20">
        <header className="flex items-center gap-3 border-b border-[#e7e2d8] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 text-[#3a3f52] hover:bg-[#f3f1ec] lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          {logo ? (
            <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-[#ece9e2] object-contain" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f3f1ec] text-sm font-bold text-[#3a3f52]">{lab.name.charAt(0).toUpperCase()}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#141b34]">{lab.name}</p>
            <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${status.cls}`}>{status.label}</span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9d3c6] bg-white px-3 py-2 text-xs font-semibold text-[#3a3f52] hover:bg-[#faf9f6]"
          >
            <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>
        <VerificationIssueBanner overview={overview} href={href} refresh={load} />
        </div>

        <main className="min-w-0">{children}</main>
      </div>
    </LabPortalContext.Provider>
  );
}

/**
 * Sticky notice when our team sent a verification issue (rejectionReason) and
 * the lab is pending / rejected or its license file is not verified.
 * "Fix Now" opens the page and field the (first) note is about.
 */
function VerificationIssueBanner({ overview, href, refresh }: { overview: LabOverview; href: (path: string) => string; refresh: () => Promise<void> }) {
  const router = useRouter();
  const lab = overview.laboratory;
  const reason = lab.rejectionReason?.trim() ?? '';
  const show = reason.length > 0 && (lab.verificationStatus === 'PENDING' || lab.verificationStatus === 'REJECTED' || !lab.documentVerified);
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  // Clear the "submitted" confirmation after a while
  useEffect(() => {
    if (note?.tone !== 'ok') return;
    const t = setTimeout(() => setNote(null), 8000);
    return () => clearTimeout(t);
  }, [note]);

  if (!show) {
    return note?.tone === 'ok' ? (
      <div className="flex items-center gap-2 border-b border-[#2f7a4b]/20 bg-[#e8f3ec] px-4 py-2.5 text-sm text-[#1f5a35] sm:px-6" role="status">
        <CircleCheck className="h-4 w-4 shrink-0" /> {note.text}
      </div>
    ) : null;
  }

  const issues = overview.issues.length ? overview.issues : [{ id: 'issue-1', text: reason, target: 'documents' as FixTarget }];
  const first = issues[0];
  const otherTargets = [...new Set(issues.map((i) => i.target))].filter((t) => t !== first.target);
  const fixNow = (issue = first) => router.push(fixHref(href, issue, Date.now().toString(36)));

  const resubmit = async () => {
    setBusy(true);
    setNote(null);
    try {
      await resubmitLabApi();
      await refresh();
      setNote({ tone: 'ok', text: 'Thank you. Your lab was submitted for re-review by the Tabibistan Medical Board.' });
    } catch (e) {
      setNote({ tone: 'error', text: e instanceof Error ? e.message : 'Could not resubmit. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 sm:px-6" role="alert" aria-labelledby="lab-issue-title">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
          <TriangleAlert className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p id="lab-issue-title" className="text-sm font-bold text-amber-950">
              ⚠️ Verification Issue Detected — Action Required
            </p>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:underline"
            >
              {collapsed ? (
                <>
                  Show details <ChevronDown className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Hide details <ChevronUp className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
          {!collapsed && (
            <>
              <p className="mt-1 max-h-28 overflow-y-auto whitespace-pre-line pr-1 text-sm text-amber-950">{reason}</p>
              {otherTargets.length > 0 && (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-900">
                  Also fix in:
                  {otherTargets.map((t) => (
                    <button key={t} type="button" onClick={() => fixNow(issues.find((i) => i.target === t))} className="font-semibold underline hover:no-underline">
                      {FIX_PAGE[t].label}
                    </button>
                  ))}
                </p>
              )}
              {note?.tone === 'error' && <p className="mt-1.5 text-xs font-medium text-red-700">{note.text}</p>}
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => fixNow()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:ring-offset-2"
          >
            Fix Now <ArrowRight className="h-4 w-4" />
          </button>
          {!collapsed && overview.canResubmit && (
            <button
              type="button"
              onClick={resubmit}
              disabled={busy}
              title="Choose this after fixing everything in the note"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-400 bg-white px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60"
            >
              {busy && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />} Resubmit for Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
