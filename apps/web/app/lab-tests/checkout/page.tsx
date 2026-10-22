import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import LabCheckout from '@/components/lab-tests/LabCheckout';

export const metadata = {
  title: 'Lab Test Checkout - Tabibistan',
  description: 'Review your lab tests, the partner lab and branch, and sample collection before booking.',
};

export default function LabCheckoutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f9] text-gray-900">
      <Header />
      <main className="flex-1">
        <Suspense fallback={null}>
          <LabCheckout />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
