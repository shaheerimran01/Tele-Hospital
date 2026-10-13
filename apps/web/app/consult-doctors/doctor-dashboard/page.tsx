import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import DoctorDashboard from '@/components/consult-doctors/dashboard/DoctorDashboard';
import { DoctorRouteGuard } from '../context/DoctorAuthContext';

export const metadata = {
  title: 'Doctor Dashboard - Tabibistan',
  description: 'Your Tabibistan doctor profile and approval status.',
};

export default function DoctorDashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f6f4ef] text-[#141b34]">
      <Header />
      <main className="flex flex-1 flex-col">
        {/* No doctor session -> /consult-doctors/auth; form not submitted -> join-now */}
        <DoctorRouteGuard require="dashboard">
          <DoctorDashboard />
        </DoctorRouteGuard>
      </main>
      <Footer />
    </div>
  );
}
