'use client';

// Text consultation room (real-time chat with the doctor / patient).

import { Suspense, use } from 'react';
import RoomGuard from '@/app/components/consultations/RoomGuard';
import TextRoom from '@/app/components/consultations/TextRoom';

export default function TextConsultationPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = use(params);
  return (
    // useSearchParams (?as=doctor) needs a Suspense boundary
    <Suspense fallback={null}>
      <RoomGuard appointmentId={appointmentId} mode="TEXT">
        {(access, viewer) => <TextRoom appointmentId={appointmentId} access={access} viewer={viewer} />}
      </RoomGuard>
    </Suspense>
  );
}
