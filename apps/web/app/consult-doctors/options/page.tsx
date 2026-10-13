import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ConsultOptions from '@/components/consult-doctors/options/ConsultOptions';

export const metadata = {
  title: 'Consultation Options - Tabibistan',
  description: 'Choose how you would like to consult a doctor.',
};

export default function ConsultOptionsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      <main className="flex flex-1 flex-col">
        {/* useSearchParams (intakeId) needs a Suspense boundary */}
        <Suspense fallback={null}>
          <ConsultOptions />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
