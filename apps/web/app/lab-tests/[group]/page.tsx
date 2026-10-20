import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import LabCategoryPage from '@/components/lab-tests/LabCategoryPage';

export const metadata = {
  title: 'Lab Tests & Health Packages - Tabibistan Labs',
  description: 'Health packages and individual lab tests with home sample collection.',
};

// /lab-tests/full-body, /lab-tests/x-ray, ... (opened from the category cards on /lab-tests)
export default async function LabCategoryRoute({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <Header />
      <main className="flex-1">
        {/* useSearchParams (?type=) needs a Suspense boundary */}
        <Suspense fallback={null}>
          <LabCategoryPage group={decodeURIComponent(group)} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
