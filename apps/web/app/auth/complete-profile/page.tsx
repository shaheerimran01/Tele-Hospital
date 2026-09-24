import { Suspense } from 'react';
import CompleteProfileForm from '@/components/auth/CompleteProfileForm';

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center text-sm text-gray-500">Loading...</div>}>
      <CompleteProfileForm />
    </Suspense>
  );
}
