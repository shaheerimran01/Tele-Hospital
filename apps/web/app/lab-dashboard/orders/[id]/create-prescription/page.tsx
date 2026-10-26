'use client';

// /lab-dashboard/orders/[id]/create-prescription: build and issue the lab's
// diagnostic report for one order (lab portal only; pharmacy prescriptions
// live under /prescriptions and are not used here).

import { useParams } from 'next/navigation';
import CreateLabReportForm from '@/app/components/lab-prescriptions/CreateLabReportForm';

export default function CreateLabPrescriptionPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  if (!id) return null;
  return <CreateLabReportForm key={id} orderId={decodeURIComponent(id)} />;
}
