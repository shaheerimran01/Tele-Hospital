import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test & Package Inventory - Lab Dashboard - Tabibistan',
  description: 'Manage your lab prices, availability and the tests offered in each package.',
};

export default function ManageTestsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
