import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import IntakeScreen from '@/components/consult-doctors/intake/IntakeScreen';

export const metadata = {
  title: 'Patient Details - Consult a Doctor | Tabibistan',
  description:
    'Tell us who the consultation is for, choose a speciality and describe the health problem to get matched with the right doctor.',
};

export default function ConsultIntakePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      <main className="flex flex-1 flex-col">
        <IntakeScreen />
      </main>
      <Footer />
    </div>
  );
}
