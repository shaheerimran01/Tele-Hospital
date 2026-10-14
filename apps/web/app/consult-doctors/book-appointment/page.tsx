import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BookingFlow from './components/BookingFlow';

export const metadata = {
  title: 'Book an Appointment - Tabibistan',
  description: 'Choose a date and time, who the consultation is for, and how to pay.',
};

// Query params: doctorId (required), intakeId?, mode? (IN_CLINIC | VIDEO | TEXT), clinicId?
export default function BookAppointmentPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      <main className="flex flex-1 flex-col">
        {/* useSearchParams needs a Suspense boundary */}
        <Suspense fallback={null}>
          <BookingFlow />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
