'use client';

// Lab dashboard frame: sidebar navigation + top bar (logo, name, verification
// status, sign out). Loads the signed-in lab once and shares it with the pages.
// No session -> /lab-login; signed in but no lab yet -> /lab-registration.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Building2, CircleAlert, FileText, FlaskConical, LayoutDashboard, LoaderCircle, LogOut, Menu, Settings, X } from 'lucide-react';
import { LabPortalError, clearLabSession, getLabOverviewApi, getLabSession, labFileUrl, type LabOverview, type LabVerificationStatus } from '@/app/lib/api/lab-portal';

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

        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#e7e2d8] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
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

        <main className="min-w-0">{children}</main>
      </div>
    </LabPortalContext.Provider>
  );
}
