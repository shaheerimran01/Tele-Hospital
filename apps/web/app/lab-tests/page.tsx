import Header from '@/components/layout/Header';
import LabCatalog from '@/components/lab-tests/LabCatalog';
import LabBannersCarousel from '@/components/lab-tests/LabBannersCarousel';
import HowItWorksSteps from '@/components/lab-tests/HowItWorksSteps';
import AppDownloadBanner from '@/components/lab-tests/AppDownloadBanner';
import LabFaqAccordion from '@/components/lab-tests/LabFaqAccordion';
import TrustAndStatsSection from '@/components/home/TrustAndStatsSection';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Book Lab Tests Online - Tabibistan Labs',
  description: 'Book diagnostic lab tests and full body checkups online with certified labs and home sample collection.',
};

export default function LabTestsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* 1. Header (Unchanged, remains same component) */}
      <Header />

      {/* Main Lab Tests Content between Header and TrustAndStatsSection */}
      <main>
        {/* 2. Search + the 4 sections from the LabPackage table:
               1 Find tests & packages for your needs, 2 Tests and packages for your health needs,
               3 Radiology tests, x-rays & scans (#radiology-section), 4 Routine Diagnostics & Specialized Care.
               Each card opens its packages and tests, with the package details modal and the lab cart. */}
        <LabCatalog />

        {/* 5. Promotional Banners Carousel with Navigation */}
        <LabBannersCarousel />

        {/* 7. How Does Home Sample Collection Work? (5-Step Cards) */}
        <HowItWorksSteps />

        {/* 8. Download App Banner with Store Badges, QR Code & Smartphone Mockups */}
        <AppDownloadBanner />

        {/* 9. Editorial / FAQ Accordion */}
        <LabFaqAccordion />

        {/* 10. Platform Stats & Trust Section (Unchanged, from home folder) */}
        <TrustAndStatsSection />
      </main>

      {/* 11. Dark Navy Footer (Unchanged, remains same component) */}
      <Footer />
    </div>
  );
}
