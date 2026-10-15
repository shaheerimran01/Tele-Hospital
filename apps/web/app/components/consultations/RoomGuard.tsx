'use client';

// Runs the access check before a video/text room renders (also when the room URL
// is opened directly) and sends the participant to the right place otherwise.

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import type { AccessResult, RoomMode, Viewer } from '@/app/lib/api/consultations';
import RoomStatusCard, { RoomShell } from './RoomStatusCard';
import { useRoomAccess } from './useRoomAccess';
import { roomHref } from './room-utils';

export type JoinedAccess = Extract<AccessResult, { canJoin: true }>;

export default function RoomGuard({
  appointmentId,
  mode,
  children,
}: {
  appointmentId: string;
  mode: RoomMode;
  children: (access: JoinedAccess, viewer: Viewer) => React.ReactNode;
}) {
  const router = useRouter();
  const asDoctor = useSearchParams().get('as') === 'doctor';
  const { state, recheck } = useRoomAccess(appointmentId, asDoctor);

  const wrongMode = state.phase === 'ready' && state.access.canJoin && state.access.serviceMode !== mode ? state.access : null;
  useEffect(() => {
    if (wrongMode) router.replace(roomHref(appointmentId, wrongMode.serviceMode, wrongMode.role));
  }, [wrongMode, appointmentId, router]);

  if (state.phase === 'loading' || wrongMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1020] text-sm text-white/70">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Checking your consultation…
      </div>
    );
  }
  if (state.phase !== 'ready' || !state.access.canJoin) {
    return (
      <RoomShell>
        {state.phase === 'no-session' ? (
          <RoomStatusCard appointmentId={appointmentId} view={{ kind: 'no-session', asDoctor }} />
        ) : state.phase === 'error' ? (
          <RoomStatusCard appointmentId={appointmentId} view={{ kind: 'error', message: state.message, onRetry: () => recheck(), asDoctor }} />
        ) : state.phase === 'ready' && !state.access.canJoin ? (
          <RoomStatusCard appointmentId={appointmentId} view={{ kind: 'locked', access: state.access, viewer: state.viewer }} />
        ) : null}
      </RoomShell>
    );
  }
  return <>{children(state.access, state.viewer)}</>;
}
