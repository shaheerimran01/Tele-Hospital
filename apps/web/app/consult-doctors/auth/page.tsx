import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import DoctorAuthScreen from '@/components/consult-doctors/auth/DoctorAuthScreen';

export const metadata = {
  title: 'Doctor Sign In - Tabibistan',
  description: 'Doctors: verify your mobile number to register or open your Tabibistan dashboard.',
};

export default function DoctorAuthPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f6f4ef] text-[#141b34]">
      <Header />
      <main className="flex flex-1 flex-col">
        <DoctorAuthScreen />
      </main>
      <Footer />
    </div>
  );
}
