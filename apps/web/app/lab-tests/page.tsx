import Header from '@/components/layout/Header';
import LabStickySearchBar from '@/components/lab-tests/LabStickySearchBar';
import LabTestsHero from '@/components/lab-tests/LabTestsHero';
import HealthNeedsCategories from '@/components/lab-tests/HealthNeedsCategories';
import LabBannersCarousel from '@/components/lab-tests/LabBannersCarousel';
import RadiologySection from '@/components/lab-tests/RadiologySection';
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

      {/* 2. Sticky Location & Search Bar (moves downward as you scroll) */}
      <LabStickySearchBar />

      {/* Main Lab Tests Content between Header and TrustAndStatsSection */}
      <main>
        {/* 3. Hero Section with Search, Quick Action Pills, Package Grid & 4 Photo Cards */}
        <LabTestsHero />

        {/* 4. Tests and Packages for Your Health Needs (6 Category Cards) */}
        <HealthNeedsCategories />

        {/* 5. Promotional Banners Carousel with Navigation */}
        <LabBannersCarousel />

        {/* 6. Radiology Tests, X-Rays & Scans (6 Cards) */}
        <RadiologySection />

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
