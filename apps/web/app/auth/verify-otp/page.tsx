import { Suspense } from 'react';
import OtpForm from '@/components/auth/OtpForm';

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center text-sm text-gray-500">Loading...</div>}>
      <OtpForm />
    </Suspense>
  );
}