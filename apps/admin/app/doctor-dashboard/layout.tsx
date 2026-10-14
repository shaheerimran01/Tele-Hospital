import type { Metadata } from 'next';
import PortalShell from './_components/PortalShell';

export const metadata: Metadata = {
  title: 'Doctor Admin - Tabibistan',
  description: 'Manage doctors, patients, appointments and notifications.',
};

// Persistent sidebar + top header for every /doctor-dashboard page
export default function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
