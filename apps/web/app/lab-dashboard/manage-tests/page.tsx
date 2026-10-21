'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ManageTests from '@/components/lab-dashboard/ManageTests';

function ManageTestsContent() {
  const searchParams = useSearchParams();
  const labId = searchParams.get('labId') || searchParams.get('laboratoryId') || undefined;

  return <ManageTests labId={labId} />;
}

// Lab portal page: like the doctor dashboard, it does not use the patient site header/footer.
export default function ManageTestsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f4ef] text-[#141b34]">
      <Suspense fallback={null}>
        <ManageTestsContent />
      </Suspense>
    </div>
  );
}
