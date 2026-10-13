import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import DoctorRegistrationForm from '@/components/consult-doctors/join-now/DoctorRegistrationForm';
import { DoctorRouteGuard } from '../context/DoctorAuthContext';

export const metadata = {
  title: 'Join as a Doctor - Tabibistan',
  description:
    'Register on Tabibistan to consult patients by video, text or at your clinic. Profiles go live after PMDC verification.',
};

export default function DoctorJoinNowPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f6f4ef] text-[#141b34]">
      <Header />
      <main className="flex flex-1 flex-col">
        {/* No doctor session -> /consult-doctors/auth; already submitted -> dashboard */}
        <DoctorRouteGuard require="form">
          <DoctorRegistrationForm />
        </DoctorRouteGuard>
      </main>
      <Footer />
    </div>
  );
}
