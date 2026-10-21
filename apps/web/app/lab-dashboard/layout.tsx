import { Suspense } from 'react';
import LabPortalShell from '@/components/lab-portal/LabPortalShell';

export const metadata = {
  title: 'Lab Dashboard - Tabibistan',
  description: 'Manage your laboratory on Tabibistan: tests and prices, branches, documents and profile.',
};

// Lab portal: its own sidebar and top bar, so the patient site header/footer are not used here.
export default function LabDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <LabPortalShell>{children}</LabPortalShell>
    </Suspense>
  );
}
