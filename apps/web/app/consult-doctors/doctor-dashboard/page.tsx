import DoctorDashboard from '@/components/consult-doctors/dashboard/DoctorDashboard';
import { DoctorRouteGuard } from '../context/DoctorAuthContext';

export const metadata = {
  title: 'Doctor Dashboard - Tabibistan',
  description: 'Manage your consultations, patients, availability and earnings on Tabibistan.',
};

// The doctor portal has its own sidebar, so the patient site header/footer are not used here.
export default function DoctorDashboardPage() {
  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#141b34]">
      {/* No doctor session -> /consult-doctors/auth; form not submitted -> join-now */}
      <DoctorRouteGuard require="dashboard">
        <DoctorDashboard />
      </DoctorRouteGuard>
    </div>
  );
}
