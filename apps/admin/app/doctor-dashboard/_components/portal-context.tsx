'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchPortalCounts, type PortalCounts } from '@/lib/api/doctorPortal';

interface PortalContextValue {
  /** bumps when "Refresh Data" is pressed or data changed; pages refetch on change */
  refreshKey: number;
  refresh: () => void;
  counts: PortalCounts | null;
  reloadCounts: () => void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [counts, setCounts] = useState<PortalCounts | null>(null);

  const reloadCounts = useCallback(() => {
    fetchPortalCounts()
      .then(setCounts)
      .catch(() => setCounts(null));
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    reloadCounts();
  }, [reloadCounts]);

  useEffect(() => {
    reloadCounts();
    // Keep the sidebar badges fresh while the portal is open
    const t = window.setInterval(reloadCounts, 60_000);
    return () => window.clearInterval(t);
  }, [reloadCounts]);

  return (
    <PortalContext.Provider value={{ refreshKey, refresh, counts, reloadCounts }}>{children}</PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside the doctor-dashboard layout');
  return ctx;
}

/**
 * Loads data and reloads it when `deps` change or "Refresh Data" is pressed.
 * Keeps the previous data on screen while reloading.
 */
export function usePortalData<T>(load: () => Promise<T>, deps: unknown[]) {
  const { refreshKey } = usePortal();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey, reloadKey]);

  return { data, setData, error, loading, reload: () => setReloadKey((k) => k + 1) };
}

/** Debounced value for search boxes. */
export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}
