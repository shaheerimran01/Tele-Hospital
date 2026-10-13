import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import DoctorsList from '@/components/consult-doctors/doctors-list/DoctorsList';

export const metadata = {
  title: 'Choose a Doctor - Tabibistan',
  description: 'Verified doctors near you, sorted by distance, with in-clinic, video and text consultation fees.',
};

export default function DoctorsListPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      <main className="flex flex-1 flex-col">
        {/* useSearchParams (intakeId) needs a Suspense boundary */}
        <Suspense fallback={null}>
          <DoctorsList />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
