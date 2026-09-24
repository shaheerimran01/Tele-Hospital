import Header from '@/components/layout/Header';
import AyurvedaTopBanner from '@/components/ayurveda/AyurvedaTopBanner';
import HerbalCategoryRow from '@/components/ayurveda/HerbalCategoryRow';
import HerbAlphabetDirectory from '@/components/ayurveda/HerbAlphabetDirectory';
import TrustAndStatsSection from '@/components/home/TrustAndStatsSection';
import Footer from '@/components/layout/Footer';
import {
  featuredHerbs,
  skinCareHerbs,
  digestiveHerbs,
  hairCareHerbs,
} from '@/components/ayurveda/ayurvedaData';

export const metadata = {
  title: 'Ayurveda & Herbal Medicine Directory - Tabibistan',
  description:
    'Explore natural herbs, Unani medicine, and Ayurvedic remedies for skin, hair, and digestion in Pakistan.',
};

export default function AyurvedaPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* 1. Header (Unchanged component) */}
      <Header />

      {/* Main Content between Header and TrustAndStatsSection */}
      <main>
        {/* 2. Top Banner (Urdu translation & Pakistani herbal branding) */}
        <AyurvedaTopBanner />

        {/* 3. Featured Herbs (10 items) */}
        <HerbalCategoryRow title="Featured Herbs" items={featuredHerbs} />

        {/* 4. Skin Care (10 items) */}
        <HerbalCategoryRow title="Skin Care" items={skinCareHerbs} />

        {/* 5. Digestive Care (10 items) */}
        <HerbalCategoryRow title="Digestive Care" items={digestiveHerbs} />

        {/* 6. Hair Care (10 items) */}
        <HerbalCategoryRow title="Hair Care" items={hairCareHerbs} />

        {/* 7. A to Z Herb Encyclopedia & Directory (Alphabet Filter + 5-Col Grid) */}
        <HerbAlphabetDirectory />

        {/* 8. Platform Stats & Trust Section (Unchanged, from home folder) */}
        <TrustAndStatsSection />
      </main>

      {/* 9. Dark Navy Footer (Unchanged component) */}
      <Footer />
    </div>
  );
}
