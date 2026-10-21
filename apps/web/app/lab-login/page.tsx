import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import LabLogin from '@/components/lab-portal/LabLogin';

export const metadata = {
  title: 'Lab Sign In - Tabibistan',
  description: 'Sign in to your Tabibistan lab dashboard, or register your diagnostic laboratory, with your mobile number.',
};

export default function LabLoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f4ef] text-[#141b34]">
      <Header />
      <main className="flex flex-1 flex-col">
        <LabLogin />
      </main>
      <Footer />
    </div>
  );
}
