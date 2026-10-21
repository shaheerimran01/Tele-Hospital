import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import LabRegistrationForm from '@/components/lab-registration/LabRegistrationForm';

export const metadata = {
  title: 'Register Your Laboratory - Tabibistan',
  description:
    'List your diagnostic laboratory on Tabibistan: lab profile, healthcare license and every branch with its medical director and location.',
};

export default function LabRegistrationPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f4ef] text-[#141b34]">
      <Header />
      <main className="flex flex-1 flex-col">
        <LabRegistrationForm />
      </main>
      <Footer />
    </div>
  );
}
