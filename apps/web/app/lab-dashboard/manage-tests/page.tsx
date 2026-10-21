'use client';

import ManageTests from '@/components/lab-dashboard/ManageTests';
import { useLabPortal } from '@/components/lab-portal/LabPortalShell';

// Inside the lab dashboard frame (app/lab-dashboard/layout.tsx), which signs the lab in.
export default function ManageTestsPage() {
  const { labId } = useLabPortal();
  return <ManageTests labId={labId} />;
}
