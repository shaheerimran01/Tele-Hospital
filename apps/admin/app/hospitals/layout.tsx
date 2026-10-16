import type { Metadata } from 'next';
import PortalShell from '../doctor-dashboard/_components/PortalShell';

export const metadata: Metadata = {
  title: 'Hospitals - Tabibistan Admin',
  description: 'Manage the hospitals directory shown to patients.',
};

// Same sidebar and header as the Doctor Admin portal
export default function HospitalsLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
