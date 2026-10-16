import { Suspense } from 'react';
import { DoctorRouteGuard } from '../../../context/DoctorAuthContext';
import PrescriptionBuilder from './PrescriptionBuilder';

export const metadata = {
  title: 'Write Prescription - Tabibistan Doctor Portal',
  description: 'Create a digital prescription for your consultation.',
};

// /consult-doctors/doctor-dashboard/prescriptions/new?appointmentId=...
export default function NewPrescriptionPage() {
  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#141b34]">
      <DoctorRouteGuard require="dashboard">
        {/* useSearchParams needs a Suspense boundary */}
        <Suspense fallback={null}>
          <PrescriptionBuilder />
        </Suspense>
      </DoctorRouteGuard>
    </div>
  );
}
