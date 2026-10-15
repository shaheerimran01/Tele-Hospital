'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkRoomAccessApi, RoomApiError, type AccessResult, type Viewer } from '@/app/lib/api/consultations';
import { readViewer } from './room-utils';

export type RoomAccessState =
  | { phase: 'loading' }
  | { phase: 'no-session'; asDoctor: boolean }
  | { phase: 'error'; message: string; status: number }
  | { phase: 'ready'; viewer: Viewer; access: AccessResult };

/** Re-checks a locked room every minute (and right when it is due to open). */
const RECHECK_MS = 60_000;

export function useRoomAccess(appointmentId: string, asDoctor: boolean) {
  const [state, setState] = useState<RoomAccessState>({ phase: 'loading' });
  const timer = useRef<number | null>(null);

  const check = useCallback(
    async (quiet = false) => {
      const viewer = readViewer(asDoctor);
      if (!viewer) {
        setState({ phase: 'no-session', asDoctor });
        return;
      }
      if (!quiet) setState({ phase: 'loading' });
      try {
        const access = await checkRoomAccessApi(appointmentId, viewer);
        setState({ phase: 'ready', viewer, access });
      } catch (e) {
        const status = e instanceof RoomApiError ? e.status : 0;
        const message = e instanceof Error ? e.message : 'Could not open the consultation room.';
        // Keep showing the last good screen if a background re-check fails
        setState((prev) => (quiet && prev.phase === 'ready' ? prev : { phase: 'error', message, status }));
      }
    },
    [appointmentId, asDoctor],
  );

  useEffect(() => {
    check();
  }, [check]);

  // While locked for a reason that can change on its own, check again
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (state.phase !== 'ready' || state.access.canJoin) return;
    const { reason } = state.access;
    if (!['TOO_EARLY', 'NOT_APPROVED', 'RESCHEDULE_PENDING'].includes(reason)) return;
    const untilOpen = state.access.canJoin === false && reason === 'TOO_EARLY' ? (state.access.secondsUntilOpen ?? 0) * 1000 : Infinity;
    const delay = Math.max(1000, Math.min(RECHECK_MS, untilOpen + 500));
    timer.current = window.setTimeout(() => check(true), delay);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [state, check]);

  return { state, recheck: check };
}
