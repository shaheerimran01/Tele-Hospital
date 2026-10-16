import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NearbyHospitals from '@/components/hospitals/NearbyHospitals';

export const metadata = {
  title: 'Hospitals Near You - Tabibistan',
  description: 'Hospitals sorted by distance, with emergency services and Tabibistan doctors you can book.',
};

// /hospitals?intakeId=...  (opened from the consultation options screen)
export default function HospitalsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      <main className="flex flex-1 flex-col">
        {/* useSearchParams (intakeId) needs a Suspense boundary */}
        <Suspense fallback={null}>
          <NearbyHospitals />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
