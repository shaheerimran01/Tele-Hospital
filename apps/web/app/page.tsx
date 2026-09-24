'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import HeroSection from '@/components/home/HeroSection';
import CarePlanBanner from '@/components/home/CarePlanBanner';
import HealthConcerns from '@/components/home/HealthConcernSection';
import LabTestsSection from '@/components/home/LabTestsSection';
import FeaturedBrands from '@/components/home/FeaturedBrands';
import ProductSection, { Product } from '@/components/home/ProductSection';
import AyurvedaSection from '@/components/home/AyurvedaSection';
import TrustAndStatsSection from '@/components/home/TrustAndStatsSection';
import Footer from '@/components/layout/Footer';
import PopularCategories from '@/components/home/PopularCategories';
import PersonalCareSection from '@/components/home/PersonalCareSection';
import ComboSection from '@/components/home/ComboSection';
import {
  getAllopathyTopSellers,
  getPopularProducts,
  getInTheSpotlightProducts,
  getCollagenSupplements,
  getSkinCareProducts,
  getHerbalBestMedicines,
  getPainReliefProducts,
  getHealthyHairProducts,
  getHomeopathyBestMedicines,
  getExploreSomethingNew,
  getTrendingNowProducts,
  getTopDealsPainAndCough,
  getComboDeals, // 🔄 Imported dynamic fetcher
} from '@/components/home/productData';

export default function HomePage() {
  const [topDeals, setTopDeals] = useState<Product[]>([]);
  const [allopathySellers, setAllopathySellers] = useState<Product[]>([]);
  const [popularProductsList, setPopularProductsList] = useState<Product[]>([]);
  const [spotlightProducts, setSpotlightProducts] = useState<Product[]>([]);
  const [collagenProducts, setCollagenProducts] = useState<Product[]>([]);
  const [skinCareList, setSkinCareList] = useState<Product[]>([]);
  const [herbalList, setHerbalList] = useState<Product[]>([]);
  const [painReliefList, setPainReliefList] = useState<Product[]>([]);
  const [healthyHairList, setHealthyHairList] = useState<Product[]>([]);
  const [homeopathyList, setHomeopathyList] = useState<Product[]>([]);
  const [exploreNewList, setExploreNewList] = useState<Product[]>([]);
  const [trendingNowList, setTrendingNowList] = useState<Product[]>([]);
  const [comboDealsList, setComboDealsList] = useState<Product[]>([]); // ⚡ Added State

  useEffect(() => {
    async function loadDatabaseProducts() {
      try {
        const [
          dealsData,
          allopathyData,
          popularData,
          spotlightData,
          collagenData,
          skinCareData,
          herbalData,
          painReliefData,
          healthyHairData,
          homeopathyData,
          exploreNewData,
          trendingData,
          combosData,
        ] = await Promise.all([
          getTopDealsPainAndCough(),
          getAllopathyTopSellers(),
          getPopularProducts(),
          getInTheSpotlightProducts(),
          getCollagenSupplements(),
          getSkinCareProducts(),
          getHerbalBestMedicines(),
          getPainReliefProducts(),
          getHealthyHairProducts(),
          getHomeopathyBestMedicines(),
          getExploreSomethingNew(),
          getTrendingNowProducts(),
          getComboDeals(), // ⚡ DB Fetcher Call
        ]);

        setTopDeals(dealsData);
        setAllopathySellers(allopathyData);
        setPopularProductsList(popularData);
        setSpotlightProducts(spotlightData);
        setCollagenProducts(collagenData);
        setSkinCareList(skinCareData);
        setHerbalList(herbalData);
        setPainReliefList(painReliefData);
        setHealthyHairList(healthyHairData);
        setHomeopathyList(homeopathyData);
        setExploreNewList(exploreNewData);
        setTrendingNowList(trendingData);
        setComboDealsList(combosData);
      } catch (error) {
        console.error('Error loading products from database:', error);
      }
    }

    loadDatabaseProducts();
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header />

      <main>
        <HeroSection />
        <CarePlanBanner />
        <PopularCategories />
        <HealthConcerns />
        <LabTestsSection />
        <FeaturedBrands />

        {/* Top deals */}
        <ProductSection
          title="Top deals of pain relief and cough & cold"
          hasUnderline
          showSeeAll
          seeAllLink="/collections/top-deals-of-pain-relief-and-cough-cold"
          products={topDeals}
        />

        <PersonalCareSection />

        {/* Allopathy Top Seller */}
        <ProductSection
          title="Allopathy Top Seller"
          hasUnderline
          showSeeAll
          seeAllLink="/collections/allopathy-top-seller"
          products={allopathySellers}
        />

        {/* Popular Products */}
        <ProductSection
          title="Popular Products"
          hasUnderline
          showSeeAll
          seeAllLink="/collections/popular-products"
          products={popularProductsList}
        />

        {/* In the spotlight */}
        <ProductSection
          title="In the spotlight"
          hasAdBadge
          hasUnderline
          products={spotlightProducts}
        />

        {/* Collagen */}
        <ProductSection
          title="Collagen | supplement of the week"
          hasUnderline
          showSeeAll={false}
          products={collagenProducts}
        />

        {/* Trending Now */}
        <ProductSection
          title="Trending Now"
          hasUnderline
          showSeeAll
          seeAllLink="/collections/trending-now"
          products={trendingNowList}
        />

        {/* Skin Care Products */}
        <ProductSection
          title="Skin Care Products"
          hasUnderline
          showSeeAll
          seeAllLink="/collections/skin-care-products"
          products={skinCareList}
        />

        {/* Herbal Best Medicines */}
        <ProductSection
          title="Herbal Best Medicines"
          hasUnderline
          showSeeAll
          seeAllLink="/collections/herbal-best-medicines"
          products={herbalList}
        />

        {/* 21. Popular Combo Deals (Dedicated Combo Component) */}
        <ComboSection combos={comboDealsList} />

        {/* Pain Relief Essentials */}
        <ProductSection
          title="Pain Relief Essentials"
          hasAdBadge
          hasUnderline
          showSeeAll
          seeAllLink="/collections/pain-relief-essentials"
          products={painReliefList}
        />

        {/* Healthy Hair */}
        <ProductSection
          title="Healthy Hair Starts Here"
          hasAdBadge
          hasUnderline
          showSeeAll
          seeAllLink="/collections/healthy-hair-starts-here"
          products={healthyHairList}
        />

        {/* Homeopathy Best Medicines */}
        <ProductSection
          title="Homeopathy Best Medicines"
          hasUnderline
          showSeeAll
          seeAllLink="/collections/homeopathy-best-medicines"
          products={homeopathyList}
        />

        {/* Explore Something new */}
        <ProductSection
          title="Explore Something new"
          hasUnderline
          showSeeAll
          seeAllLink="/collections/explore-something-new"
          products={exploreNewList}
        />

        <AyurvedaSection />
        <TrustAndStatsSection />
      </main>

      <Footer />
    </div>
  );
}