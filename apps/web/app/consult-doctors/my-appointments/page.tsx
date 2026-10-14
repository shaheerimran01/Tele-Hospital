import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MyAppointments from './MyAppointments';

export const metadata = {
  title: 'My Appointments - Tabibistan',
  description: 'Your doctor appointments on Tabibistan.',
};

export default function MyAppointmentsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Header />
      <main className="flex flex-1 flex-col">
        <MyAppointments />
      </main>
      <Footer />
    </div>
  );
}
