import { Suspense } from 'react';
import ManageTests from '@/components/lab-dashboard/ManageTests';

export const metadata = {
  title: 'Test & Package Inventory - Lab Dashboard - Tabibistan',
  description: 'Manage your lab prices, availability and the tests offered in each package.',
};

// Lab portal page: like the doctor dashboard, it does not use the patient site header/footer.
export default function ManageTestsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f4ef] text-[#141b34]">
      <Suspense fallback={null}>
        <ManageTests />
      </Suspense>
    </div>
  );
}
