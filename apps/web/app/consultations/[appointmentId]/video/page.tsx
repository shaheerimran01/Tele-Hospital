'use client';

// Video consultation room (WebRTC, with chat in a side drawer).

import { Suspense, use } from 'react';
import RoomGuard from '@/app/components/consultations/RoomGuard';
import VideoRoom from '@/app/components/consultations/VideoRoom';

export default function VideoConsultationPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = use(params);
  return (
    // useSearchParams (?as=doctor) needs a Suspense boundary
    <Suspense fallback={null}>
      <RoomGuard appointmentId={appointmentId} mode="VIDEO">
        {(access, viewer) => <VideoRoom appointmentId={appointmentId} access={access} viewer={viewer} />}
      </RoomGuard>
    </Suspense>
  );
}
