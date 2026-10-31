'use client';

import { use, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/app/components/cart/CartContext';

interface Product {
  id: string;
  name: string;
  slug: string;
  brandName?: string;
  genericName?: string;
  manufacturer: string; // 🏭 Primary Manufacturer Column
  category?: string;
  subCategory?: string;
  healthCondition?: string;
  healthConditions?: string | string[];
  tags?: string | string[];
  benefits?: string | string[];
  uses?: string | string[];
  dosageForm: string;
  packSize: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  prescriptionRequired: boolean;
  isActive: boolean;
}

interface ConcernConfig {
  title: string;
  description: string;
  primaryColor: string;
  bannerBg: string;
}

// Banner & Theme Configs for Health Concerns
const CONCERN_CONFIGS: Record<string, ConcernConfig> = {
  diabetes: {
    title: 'Diabetes Care',
    description: 'Manage blood sugar levels effectively with authentic medicines, test strips, glucometers, and supplements.',
    primaryColor: '#0284c7', // Cyan Blue
    bannerBg: '#e0f2fe',
  },
  'heart-care': {
    title: 'Heart Care',
    description: 'Explore cardiovascular health support, cholesterol management, and blood pressure monitoring products.',
    primaryColor: '#e11d48', // Rose Red
    bannerBg: '#ffe4e6',
  },
  'stomach-care': {
    title: 'Stomach & Gastro Care',
    description: 'Solutions for acidity, indigestion, constipation, reflux, ulcers, and overall digestive health.',
    primaryColor: '#059669', // Emerald Green
    bannerBg: '#d1fae5',
  },
  'liver-care': {
    title: 'Liver Care',
    description: 'Hepatic support formulations, fatty liver treatments, silymarin supplements, and liver detox care.',
    primaryColor: '#d97706', // Amber
    bannerBg: '#fef3c7',
  },
  'bone-joint-care': {
    title: 'Bone & Joint Care',
    description: 'Calcium & D3 supplements, arthritis care, muscle relaxants, joint mobility support, and gout remedies.',
    primaryColor: '#7c3aed', // Purple
    bannerBg: '#ede9fe',
  },
  'kidney-care': {
    title: 'Kidney & Renal Care',
    description: 'CKD support, diuretics, renal protectants, alkalinizers, and urinary tract health formulations.',
    primaryColor: '#db2777', // Pink / Rose
    bannerBg: '#fce7f3',
  },
  'derma-care': {
    title: 'Derma & Skin Care',
    description: 'Dermatologist recommended skincare, acne treatments, cleansers, moisturizers, sunscreens, and topical creams.',
    primaryColor: '#0284c7', // Sky / Cyan
    bannerBg: '#e0f2fe',
  },
  'respiratory-care': {
    title: 'Respiratory & Allergy Care',
    description: 'Inhalers, bronchodilators, anti-asthmatics, antihistamines, cough syrups, decongestants, and nebulizers.',
    primaryColor: '#2563eb', // Royal Blue
    bannerBg: '#dbeafe',
  },
};

// 🎯 Generic Query Keywords for Other Health Concerns
const CONCERN_KEYWORDS: Record<string, string[]> = {
  diabetes: ['diabetes', 'diabetic', 'insulin', 'glucometer', 'blood sugar'],
  'heart-care': ['heart', 'cardio', 'cardiovascular', 'cholesterol', 'blood pressure', 'bp'],
  'bone-joint-care': ['bone', 'joint', 'osteo', 'arthritis', 'gout', 'calcium', 'glucosamine', 'rheumatoid', 'osteoporosis'],
  'kidney-care': ['kidney', 'renal', 'nephro', 'diuretic', 'lasix', 'furosemide', 'ketosteril', 'ketoanalogue', 'nephropathy', 'urinary'],
  'derma-care': ['skin', 'derma', 'dermatology', 'dermatitis', 'acne', 'eczema', 'psoriasis', 'moisturiser', 'moisturizer', 'cleanser', 'sunscreen', 'sunblock', 'serum', 'retinol', 'niacinamide', 'fungal', 'antifungal', 'melasma', 'scabies'],
  'respiratory-care': ['respiratory', 'asthma', 'copd', 'bronchitis', 'nebulizer', 'inhaler', 'cough', 'cold', 'allergy', 'antihistamine', 'decongestant', 'breath', 'salbutamol', 'ventolin', 'montelukast', 'fluticasone', 'budesonide', 'cetirizine', 'loratadine'],
};

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function HealthConcernCollectionPage({ params }: PageProps) {
  const { slug } = use(params);

  // States
  const [allProductsData, setAllProductsData] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all'); // 🏭 Manufacturer Filter State
  const [rxOnly, setRxOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('relevance');

  // 🛒 Cart Context Hook Integration
  const { addProductToCart, loading: cartLoading } = useCart();

  // Config Info Lookup
  const concernInfo = CONCERN_CONFIGS[slug] || {
    title: slug.replace(/-/g, ' ').toUpperCase(),
    description: `Explore authentic healthcare products for ${slug.replace(/-/g, ' ')}.`,
    primaryColor: '#ff6f61',
    bannerBg: '#fff0ee',
  };

  // 🔄 1. FETCH PRODUCTS FROM NESTJS BACKEND (PORT 4000)
  useEffect(() => {
    async function fetchProductsFromNestJS() {
      try {
        setLoading(true);
        const res = await fetch('https://tabibistan.org/products');

        if (!res.ok) {
          throw new Error(`Failed to fetch from NestJS: ${res.statusText}`);
        }

        const data = await res.json();

        if (Array.isArray(data)) {
          setAllProductsData(data);
        } else if (Array.isArray(data.data)) {
          setAllProductsData(data.data);
        } else if (Array.isArray(data.products)) {
          setAllProductsData(data.products);
        } else {
          setAllProductsData([]);
        }
      } catch (error) {
        console.error('Error fetching products from NestJS:', error);
        setAllProductsData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProductsFromNestJS();
  }, []);

  // ⚡ 2. BASE HEALTH CONCERN FILTERING LOGIC
  const baseConcernProducts = useMemo(() => {
    const keywords = CONCERN_KEYWORDS[slug] || [slug.replace(/-/g, ' ').toLowerCase()];

    // Safe string converter
    const getSafeFieldValue = (val?: string | string[]): string => {
      if (!val) return '';
      if (Array.isArray(val)) return val.join(' ').toLowerCase();
      return val.toLowerCase();
    };

    // Regex definitions for specific categories
    const stomachRegex = /stomach|digest|gastric|reflux|antacid|ulcer|laxative/i;
    const liverRegex = /\b(liver|hepatic|fatty-liver|silymarin|essentiale|legalon|hepamerz|udiliv)\b/i;
    const boneRegex = /\b(bone|joint|osteo|arthritis|gout|calcium|glucosamine|rheumatoid|osteoporosis)\b/i;
    const kidneyRegex = /\b(kidney|renal|nephro|diuretic|lasix|furosemide|ketosteril|ketoanalogue|nephropathy|urinary)\b/i;
    const dermaRegex = /\b(skin|derma|dermatology|dermatitis|acne|eczema|psoriasis|moisturiser|moisturizer|cleanser|sunscreen|sunblock|serum|retinol|niacinamide|fungal|antifungal|melasma|scabies)\b/i;
    const respRegex = /\b(respiratory|asthma|copd|bronchitis|nebulizer|inhaler|cough|cold|allergy|antihistamine|decongestant|breath|salbutamol|ventolin|montelukast|fluticasone|budesonide|cetirizine|loratadine)\b/i;

    return allProductsData.filter((product) => {
      if (!product.isActive) return false;

      const categoryText = getSafeFieldValue(product.category);
      const subCatText = getSafeFieldValue(product.subCategory);
      const healthCondText =
        getSafeFieldValue(product.healthCondition) +
        ' ' +
        getSafeFieldValue(product.healthConditions);
      const tagsText = getSafeFieldValue(product.tags);
      const benefitsText = getSafeFieldValue(product.benefits);
      const usesText = getSafeFieldValue(product.uses);
      const nameText = getSafeFieldValue(product.name);

      if (slug === 'respiratory-care' || slug === 'respiratory' || slug === 'cold-and-cough' || slug === 'allergy') {
        // Exact SQL/MongoDB/Regex Equivalent for Respiratory & Allergy Care
        return (
          ['respiratory care', 'cold & cough', 'allergy', 'respiratory'].includes(categoryText) ||
          categoryText.includes('respiratory') ||
          categoryText.includes('cough') ||
          categoryText.includes('cold') ||
          categoryText.includes('asthma') ||
          respRegex.test(subCatText) ||
          respRegex.test(healthCondText) ||
          respRegex.test(tagsText) ||
          respRegex.test(benefitsText) ||
          respRegex.test(usesText) ||
          respRegex.test(nameText)
        );
      }

      if (slug === 'derma-care' || slug === 'skin-care' || slug === 'derma') {
        return (
          ['skin care', 'derma care', 'derma'].includes(categoryText) ||
          categoryText.includes('skin') ||
          categoryText.includes('derma') ||
          dermaRegex.test(subCatText) ||
          dermaRegex.test(healthCondText) ||
          dermaRegex.test(tagsText) ||
          dermaRegex.test(benefitsText) ||
          dermaRegex.test(usesText) ||
          dermaRegex.test(nameText)
        );
      }

      if (slug === 'kidney-care' || slug === 'kidney') {
        return (
          categoryText === 'kidney care' ||
          categoryText.includes('kidney') ||
          categoryText.includes('renal') ||
          kidneyRegex.test(subCatText) ||
          kidneyRegex.test(healthCondText) ||
          kidneyRegex.test(tagsText) ||
          kidneyRegex.test(benefitsText) ||
          kidneyRegex.test(usesText) ||
          kidneyRegex.test(nameText)
        );
      }

      if (slug === 'bone-joint-care' || slug === 'bone-and-joint-care') {
        return (
          categoryText === 'bone & joint care' ||
          categoryText.includes('bone') ||
          boneRegex.test(subCatText) ||
          boneRegex.test(healthCondText) ||
          boneRegex.test(tagsText) ||
          boneRegex.test(benefitsText) ||
          boneRegex.test(usesText) ||
          boneRegex.test(nameText)
        );
      }

      if (slug === 'liver-care') {
        return (
          categoryText === 'liver care' ||
          liverRegex.test(subCatText) ||
          liverRegex.test(healthCondText) ||
          liverRegex.test(tagsText) ||
          liverRegex.test(benefitsText) ||
          liverRegex.test(usesText) ||
          liverRegex.test(nameText)
        );
      }

      if (slug === 'stomach-care') {
        return (
          categoryText === 'stomach care' ||
          stomachRegex.test(subCatText) ||
          stomachRegex.test(healthCondText) ||
          stomachRegex.test(tagsText) ||
          stomachRegex.test(benefitsText) ||
          stomachRegex.test(usesText) ||
          stomachRegex.test(nameText)
        );
      }

      // Generic keyword matching for other health concerns
      return keywords.some((kw) => {
        const keyword = kw.toLowerCase();
        return (
          categoryText.includes(keyword) ||
          subCatText.includes(keyword) ||
          healthCondText.includes(keyword) ||
          tagsText.includes(keyword) ||
          benefitsText.includes(keyword) ||
          usesText.includes(keyword) ||
          nameText.includes(keyword)
        );
      });
    });
  }, [allProductsData, slug]);

  // 🏭 3. EXTRACT UNIQUE MANUFACTURERS (STRICTLY FETCHES MANUFACTURER COLUMN ONLY)
  const availableManufacturers = useMemo(() => {
    const mfgSet = new Set<string>();
    baseConcernProducts.forEach((p) => {
      if (p.manufacturer && p.manufacturer.trim()) {
        mfgSet.add(p.manufacturer.trim());
      }
    });
    return Array.from(mfgSet).sort();
  }, [baseConcernProducts]);

  // ⚡ 4. FINAL FILTERED PRODUCTS (Applies Search, Manufacturer, Dosage Form, Rx, Sort)
  const filteredProducts = useMemo(() => {
    return baseConcernProducts
      .filter((product) => {
        // Search Filter Inside Page
        if (
          searchTerm.trim() &&
          !product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(product.genericName && product.genericName.toLowerCase().includes(searchTerm.toLowerCase()))
        ) {
          return false;
        }

        // 🏭 Manufacturer Column Filter
        if (selectedManufacturer !== 'all') {
          const productMfg = (product.manufacturer || '').trim().toLowerCase();
          if (productMfg !== selectedManufacturer.toLowerCase()) {
            return false;
          }
        }

        // Dosage Form Filter
        if (selectedForm !== 'all' && product.dosageForm !== selectedForm) {
          return false;
        }

        // Prescription Filter
        if (rxOnly && !product.prescriptionRequired) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'discount') {
          const discA = ((a.originalPrice - a.price) / a.originalPrice) * 100;
          const discB = ((b.originalPrice - b.price) / b.originalPrice) * 100;
          return discB - discA;
        }
        return 0;
      });
  }, [baseConcernProducts, searchTerm, selectedManufacturer, selectedForm, rxOnly, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <Header />

      <main className="flex-grow py-4 sm:py-6 px-3 sm:px-6">
        <div className="mx-auto max-w-[1360px]">
          {/* Breadcrumb Navigation */}
          <nav className="text-xs text-gray-500 mb-3 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:underline transition" style={{ color: concernInfo.primaryColor }}>
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-500">Health Concerns</span>
            <span>/</span>
            <span className="text-gray-900 font-semibold">{concernInfo.title}</span>
          </nav>

          {/* 🏷️ HEALTH CONCERN HEADER BANNER */}
          <div
            className="rounded-2xl p-5 sm:p-6 mb-5 shadow-md text-white transition-all duration-300"
            style={{ backgroundColor: concernInfo.primaryColor }}
          >
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="bg-white text-xs font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-2xs"
                    style={{ color: concernInfo.primaryColor }}
                  >
                    Health Concern
                  </span>
                  <span className="text-xs font-semibold opacity-90">
                    {filteredProducts.length} Products Found
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {concernInfo.title}
                </h1>
                <p className="text-xs sm:text-sm opacity-90 mt-1 max-w-2xl leading-relaxed">
                  {concernInfo.description}
                </p>
              </div>

              {/* In-Collection Search Bar */}
              <div className="w-full md:w-80">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Search in ${concernInfo.title}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white text-gray-900 placeholder-gray-400 font-medium rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm transition"
                  />
                  <svg
                    className="w-4 h-4 absolute left-3.5 top-3"
                    style={{ color: concernInfo.primaryColor }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 🌟 TRUST & QUALITY BAR */}
          <div className="bg-[#f3f4f6] rounded-2xl p-3 sm:p-4 mb-6 border border-gray-200 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-3 bg-white/70 sm:bg-transparent p-2 sm:p-0 rounded-xl justify-center sm:justify-start">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 shadow-2xs flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: concernInfo.primaryColor }}
                >
                  <svg className="w-5 h-5" style={{ color: concernInfo.primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900">100% Genuine</span>
              </div>

              <div className="flex items-center gap-3 bg-white/70 sm:bg-transparent p-2 sm:p-0 rounded-xl justify-center sm:justify-start">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 shadow-2xs flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: concernInfo.primaryColor }}
                >
                  <svg className="w-5 h-5" style={{ color: concernInfo.primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900">Quality Tested</span>
              </div>

              <div className="flex items-center gap-3 bg-white/70 sm:bg-transparent p-2 sm:p-0 rounded-xl justify-center sm:justify-start">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 shadow-2xs flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: concernInfo.primaryColor }}
                >
                  <svg className="w-5 h-5" style={{ color: concernInfo.primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900">Direct Sourced</span>
              </div>

              <div className="flex items-center gap-3 bg-white/70 sm:bg-transparent p-2 sm:p-0 rounded-xl justify-center sm:justify-start">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 shadow-2xs flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: concernInfo.primaryColor }}
                >
                  <svg className="w-5 h-5" style={{ color: concernInfo.primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900">Safe & Reliable</span>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT AREA WITH SIDEBAR FILTERS AND PRODUCT CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Left Sidebar Filters */}
            <aside className="bg-white border border-gray-200 rounded-xl p-4 h-fit hidden lg:block sticky top-20 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <h3 className="font-bold text-gray-900 text-sm">Filters</h3>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedManufacturer('all');
                    setSelectedForm('all');
                    setRxOnly(false);
                  }}
                  className="text-[11px] font-semibold hover:underline"
                  style={{ color: concernInfo.primaryColor }}
                >
                  Reset All
                </button>
              </div>

              {/* 🏭 MANUFACTURER FILTER DROPDOWN (Strictly manufacturer column) */}
              <div className="mb-4">
                <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                  Manufacturer
                </h4>
                <select
                  value={selectedManufacturer}
                  onChange={(e) => setSelectedManufacturer(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none"
                >
                  <option value="all">All Manufacturers ({availableManufacturers.length})</option>
                  {availableManufacturers.map((mfg) => (
                    <option key={mfg} value={mfg}>
                      {mfg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dosage Form Filter */}
              <div className="mb-4 pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                  Dosage Form
                </h4>
                <select
                  value={selectedForm}
                  onChange={(e) => setSelectedForm(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none"
                >
                  <option value="all">All Forms</option>
                  <option value="Inhaler">Inhaler</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Rotacap">Rotacap / Respules</option>
                  <option value="Device">Nebulizer / Device</option>
                </select>
              </div>

              {/* Prescription Filter */}
              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                  Prescription
                </h4>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={rxOnly}
                    onChange={(e) => setRxOnly(e.target.checked)}
                    className="rounded focus:ring-0"
                    style={{ accentColor: concernInfo.primaryColor }}
                  />
                  <span>Prescription Required (Rx Only)</span>
                </label>
              </div>
            </aside>

            {/* Product Grid Section */}
            <section className="lg:col-span-3">
              {/* Counter & Sorting Bar */}
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5 mb-4 shadow-2xs">
                <span className="text-xs font-semibold text-gray-700">
                  Showing <strong className="text-gray-900">{filteredProducts.length}</strong> products
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 hidden sm:inline">Sort By:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium text-gray-800 focus:outline-none"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="discount">Discount (% Off)</option>
                  </select>
                </div>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center min-h-[300px]">
                  <div
                    className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mb-3"
                    style={{ borderColor: concernInfo.primaryColor, borderTopColor: 'transparent' }}
                  ></div>
                  <p className="text-xs font-semibold text-gray-500">
                    Loading products for {concernInfo.title}...
                  </p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <p className="text-sm font-semibold text-gray-600">
                    No products found for {concernInfo.title}.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedManufacturer('all');
                      setSelectedForm('all');
                      setRxOnly(false);
                    }}
                    className="mt-3 text-xs font-bold hover:underline"
                    style={{ color: concernInfo.primaryColor }}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                /* Product Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {filteredProducts.map((product) => {
                    const discountPercent =
                      product.originalPrice > product.price
                        ? Math.round(
                            ((product.originalPrice - product.price) / product.originalPrice) * 100
                          )
                        : 0;

                    const targetProductId = product.id;

                    return (
                      <div
                        key={product.id}
                        className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between hover:shadow-md transition-all duration-200 relative group"
                      >
                        {/* Discount & Rx Badges */}
                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                          {discountPercent > 0 && (
                            <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                              {discountPercent}% OFF
                            </span>
                          )}
                          {product.prescriptionRequired && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-amber-300">
                              Rx
                            </span>
                          )}
                        </div>

                        {/* Dynamic PDP Navigation Link */}
                        <Link href={`/products/${product.slug}`} className="block group">
                          <div>
                            {/* Image */}
                            <div className="w-full aspect-square bg-white rounded-lg mb-3 relative overflow-hidden flex items-center justify-center p-2">
                              <Image
                                src={product.imageUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500'}
                                alt={product.name}
                                width={150}
                                height={150}
                                className="object-contain max-h-32 group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>

                            {/* Details */}
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                              {product.manufacturer}
                            </span>
                            <h3 className="text-xs font-bold text-gray-900 line-clamp-2 mt-0.5 leading-snug transition group-hover:opacity-80">
                              {product.name}
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-1">{product.packSize}</p>
                          </div>
                        </Link>

                        {/* Pricing & CTA */}
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <div className="flex items-baseline gap-1.5 mb-2">
                            <span className="text-sm font-extrabold text-gray-900">
                              Rs. {product.price}
                            </span>
                            {product.originalPrice > product.price && (
                              <span className="text-xs text-gray-400 line-through">
                                Rs. {product.originalPrice}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={cartLoading}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              if (targetProductId) {
                                addProductToCart(targetProductId, 1);
                              } else {
                                console.error('Product ID missing:', product);
                                alert('Is product ki ID database se fetch nahi ho saki.');
                              }
                            }}
                            className="w-full text-white text-xs font-bold py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 shadow-2xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed uppercase cursor-pointer"
                            style={{ backgroundColor: concernInfo.primaryColor }}
                          >
                            {cartLoading ? 'ADDING...' : 'ADD TO CART'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}