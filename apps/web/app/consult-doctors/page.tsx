import Header from '@/components/layout/Header';
import CarePlanStrip from '@/components/consult-doctors/CarePlanStrip';
import ConsultHero from '@/components/consult-doctors/ConsultHero';
import ConsultStats from '@/components/consult-doctors/ConsultStats';
import CustomerReviewsSlider from '@/components/consult-doctors/CustomerReviewsSlider';
import ConsultBenefits from '@/components/consult-doctors/ConsultBenefits';
import ConsultFaq from '@/components/consult-doctors/ConsultFaq';
import DoctorJoinBanner from '@/components/consult-doctors/DoctorJoinBanner';
import TrustAndStatsSection from '@/components/home/TrustAndStatsSection';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Online Doctor Consultation - Tabibistan Doctors',
  description: 'Consult qualified medical specialists online starting at ₹199. Quick, confidential, with free 3-day follow-up.',
};

export default function ConsultDoctorsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* 1. Header (Unchanged component) */}
      <Header />

      {/* Main Content between Header and TrustAndStatsSection */}
      <main>
        {/* 2. Top Care Plan Membership Strip */}
        <CarePlanStrip />

        {/* 3. Hero Section with Headline, Starting Price, 3 Features & Illustration */}
        <ConsultHero />

        {/* 4. Three Metrics Counter Floating Card */}
        <ConsultStats />

        {/* 5. Our Happy Customers Interactive Slider with 5 Reviews */}
        <CustomerReviewsSlider />

        {/* 6. 4-Column Value Props: 100% Confidential, Certified Doctors, Convenience, Cost Effective */}
        <ConsultBenefits />

        {/* 7. Frequently Asked Questions Accordion (6 Questions) */}
        <ConsultFaq />

        {/* 8. Doctor Panel Recruitment Banner ("Are you a doctor ?") */}
        <DoctorJoinBanner />

        {/* 9. Platform Stats & Trust Section (Unchanged, from home folder) */}
        <TrustAndStatsSection />
      </main>

      {/* 10. Dark Navy Footer (Unchanged component) */}
      <Footer />
    </div>
  );
}
