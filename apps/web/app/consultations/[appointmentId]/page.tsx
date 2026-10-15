'use client';

// Consultation room gateway: checks access, then sends the participant to the
// video or text room. Otherwise shows why the room can't be entered yet.
// Query: ?as=doctor (opened from the Doctor Portal), ?left=1 (after leaving the room)

import { Suspense, use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import RoomStatusCard, { RoomShell } from '@/app/components/consultations/RoomStatusCard';
import { useRoomAccess } from '@/app/components/consultations/useRoomAccess';
import { roomHref } from '@/app/components/consultations/room-utils';

function Gateway({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const asDoctor = params.get('as') === 'doctor';
  const left = params.get('left') === '1';
  const { state, recheck } = useRoomAccess(appointmentId, asDoctor);

  const goToRoom = state.phase === 'ready' && state.access.canJoin && !left ? state.access : null;
  useEffect(() => {
    if (goToRoom) router.replace(roomHref(appointmentId, goToRoom.serviceMode, goToRoom.role));
  }, [goToRoom, appointmentId, router]);

  if (state.phase === 'loading' || goToRoom) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <LoaderCircle className="h-4 w-4 animate-spin" /> {goToRoom ? 'Entering the consultation room…' : 'Checking your consultation…'}
      </p>
    );
  }
  if (state.phase === 'no-session') return <RoomStatusCard appointmentId={appointmentId} view={{ kind: 'no-session', asDoctor }} />;
  if (state.phase === 'error') {
    return <RoomStatusCard appointmentId={appointmentId} view={{ kind: 'error', message: state.message, onRetry: () => recheck(), asDoctor }} />;
  }
  if (left) {
    const access = state.access;
    return (
      <RoomStatusCard
        appointmentId={appointmentId}
        view={{
          kind: 'left',
          access,
          viewer: state.viewer,
          onRejoin: () => access.canJoin && router.replace(roomHref(appointmentId, access.serviceMode, access.role)),
        }}
      />
    );
  }
  if (state.access.canJoin) return null;
  return <RoomStatusCard appointmentId={appointmentId} view={{ kind: 'locked', access: state.access, viewer: state.viewer }} />;
}

export default function ConsultationGatewayPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = use(params);
  return (
    <RoomShell>
      {/* useSearchParams needs a Suspense boundary */}
      <Suspense fallback={null}>
        <Gateway appointmentId={appointmentId} />
      </Suspense>
    </RoomShell>
  );
}
