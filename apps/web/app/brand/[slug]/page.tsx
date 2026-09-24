'use client';

import { use, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// 🛠️ Layout Components Import
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/app/components/cart/CartContext';

interface Product {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  genericName?: string;
  manufacturer: string;
  category: string;
  subCategory: string;
  dosageForm: string;
  packSize: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  prescriptionRequired: boolean;
  isActive: boolean;
}

// Brand Configuration Interface
interface BrandConfig {
  title: string;
  subtitle: string;
  description: string;
  primaryColor: string;
  badgeBg: string;
  badgeText: string;
  logo: string;
  promoBanners?: string[];
}

const BRAND_CONFIGS: Record<string, BrandConfig> = {
  // 1. GETZ PHARMA (5 Campaign Banners)
  'getz-pharma': {
    title: 'Getz Pharma',
    subtitle: 'Official Brand Store',
    description: 'Explore genuine prescription & healthcare products manufactured by Getz Pharma.',
    primaryColor: '#005696',
    badgeBg: '#e6f0fa',
    badgeText: '#005696',
    logo: '/Getz-pharma-logo-vector.png',
    promoBanners: [
      'https://mir-s3-cdn-cf.behance.net/projects/404/06b5ab216424361.Y3JvcCwyNzYxLDIxNjAsNDE2LDA.jpg',
      'https://mir-s3-cdn-cf.behance.net/projects/404/aa53b3102078117.Y3JvcCwxMzY1LDEwNjgsMjc3LDA.jpg',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFroJxUF8m1LU4hRF-uR6LbKVeygyHDPmO4qdh0vvoEPB6Yj8IofM4SuU&s=10',
      'https://getzpharma.com/wp-content/uploads/2025/12/Health-Fitness-A-Public-Service-Initiative-Getz-Pharma.png',
      'https://getzpharma.com/wp-content/uploads/2025/01/ogimage.png',
    ],
  },

  // 2. UNILEVER PAKISTAN (1 Full-Width Banner)
  'unilever-pakistan': {
    title: 'Unilever Pakistan',
    subtitle: 'Official Brand Store',
    description: 'Explore genuine personal care, hygiene, and consumer health products manufactured by Unilever.',
    primaryColor: '#27318b',
    badgeBg: '#e8ebff',
    badgeText: '#27318b',
    logo: '/7c1c60e9afaaaa3cce61e5101717796d21b7f914-1426x1080.jpg',
    promoBanners: [
      'https://media.licdn.com/dms/image/v2/D4E16AQEN463nMp9Nww/profile-displaybackgroundimage-shrink_200_800/profile-displaybackgroundimage-shrink_200_800/0/1736374283222?e=2147483647&v=beta&t=z8oqn1WkVZHgNDlXo5erLOSNG1zasZbaZAl3VT7nbHU',
    ],
  },

  // 3. CIPLA (4 Campaign Banners)
  cipla: {
    title: 'Cipla',
    subtitle: 'Official Brand Store',
    description: 'Explore genuine pharmaceuticals and healthcare solutions manufactured by Cipla.',
    primaryColor: '#0083ca',
    badgeBg: '#e6f4fc',
    badgeText: '#0083ca',
    logo: '/Cipla_logo.svg',
    promoBanners: [
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSDoEWXLuvNFYqfecETi8Ykbcp1MmVMr9nTae_qUl7LHQ&s',
      'https://media.licdn.com/dms/image/v2/D5622AQGS4oW4y-GmiA/feedshare-shrink_800/feedshare-shrink_800/0/1723972929514?e=2147483647&v=beta&t=t2m_kbwyQSkvZV3S4uuYFycgFN1FeDB5vCciJXnhgyk',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQWnCEK4w9CEnJBMhbP3WYxBlW3cpsz_ins2nqdkpp7zA&s',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSeEPRgmD5qY7OKAtegCu5xohdG73Ahf2m538aZfpfF02pK30td3Td83GY&s=10',
    ],
  },

  // 4. SANOFI PAKISTAN (5 Campaign Banners)
  'sanofi-pakistan': {
    title: 'Sanofi Pakistan',
    subtitle: 'Official Brand Store',
    description: 'Explore original pharmaceuticals, vaccines, and healthcare solutions from Sanofi.',
    primaryColor: '#00857c',
    badgeBg: '#e6f3f2',
    badgeText: '#00857c',
    logo: '/sanofi-logo-png_seeklogo-241329.png',
    promoBanners: [
      'https://it.tenable.com/sites/default/files/images/customers/Banner-Customer-Sanofi.jpg',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYBdIckxtF90yXHlptOIStgvVOIPIGUQMFfrlrqS2U4fMvGVQIZOzPz1hj&s=10',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfO29m7Elfx9qn5c3FfiuVH76463Vxf3sNKNA4ha2P9T6Q_JbV7fX4YlXP&s=10',
      'https://i.brecorder.com/primary/2023/01/63d0aa7a0061a.jpg',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRfmJnjl1DCg3qAw14ghCWlO8fW2vz44VV0E4s5zJUGiGxsLGxAzX6MU96S&s=10',
    ],
  },

  // 5. GSK PAKISTAN
  'gsk-pakistan': {
    title: 'GSK Pakistan',
    subtitle: 'Official Brand Store',
    description: 'Explore original healthcare and pharmaceutical products manufactured by GSK Pakistan.',
    primaryColor: '#f26522',
    badgeBg: '#fff4ed',
    badgeText: '#f26522',
    logo: '/GSK-Logo-2014.png',
  },

  // 6. RECKITT BENCKISER (7 Campaign Banners)
  'reckitt-benckiser-pakistan': {
    title: 'Reckitt Benckiser',
    subtitle: 'Official Brand Store',
    description: 'Explore trusted health, hygiene, and nutrition products manufactured by Reckitt Benckiser.',
    primaryColor: '#d0006f',
    badgeBg: '#fce6f1',
    badgeText: '#d0006f',
    logo: '/images.png',
    promoBanners: [
      'https://mir-s3-cdn-cf.behance.net/projects/404/665197198065275.Y3JvcCwyNTE3LDE5NjgsNDkyLDA.jpg',
      'https://mir-s3-cdn-cf.behance.net/projects/404/21d696222454771.Y3JvcCwxMzgwLDEwODAsMzU4LDA.jpg',
      'https://images.squarespace-cdn.com/content/v1/63a298f54a006d414f90ae66/60731565-64b7-4d11-b13e-67fe70ae21e4/COP26+RECKITT-3197.jpg',
      'https://images.squarespace-cdn.com/content/v1/63a298f54a006d414f90ae66/d833e055-e686-48cd-a008-dc3e62700b04/COP26+RECKITT-3162.jpg',
      'https://mir-s3-cdn-cf.behance.net/projects/404/5669b1188199185.Y3JvcCwxMzgwLDEwODAsMjcwLDA.jpg',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-PrIJq5i1xOfTODJiJ-86RlgElKZmwKvGNEAbkPeerHAFEkjVhh4hQDNz&s=10',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0hcRKisRx8pres5kK-PhTB5nNM-vx6Z1pm3vdDxYOZPb_8eIT9cYeIarZ&s=10',
    ],
  },

  // 7. HILTON PHARMA (5 Campaign Banners)
  'hilton-pharma': {
    title: 'Hilton Pharma',
    subtitle: 'Official Brand Store',
    description: 'Explore high-quality pharmaceutical formulations and therapeutic solutions by Hilton Pharma.',
    primaryColor: '#681a22',
    badgeBg: '#e6f4ed',
    badgeText: '#681a22',
    logo: '/aazfinwh4.webp',
    promoBanners: [
      'https://0701.static.prezi.com/preview/v2/i6uskftxyvalufzie2zhnx6gkd6jc3sachvcdoaizecfr3dnitcq_3_0.png',
      'https://media.licdn.com/dms/image/v2/D4D22AQFYDlsTb2r_KQ/feedshare-shrink_800/B4DZmguaRNIgAk-/0/1759338149605?e=2147483647&v=beta&t=4IwEAADJsmLtYDZrnRUYdSCA5jMp5SKuDi2LQ6oyqzA',
      'https://media.licdn.com/dms/image/v2/D4D22AQEavi_K7QseTw/feedshare-shrink_800/B4DZh2Rl2gHYAg-/0/1754330989797?e=2147483647&v=beta&t=8yfk1zgZm_gupr110t4fR0aMpi_gFKsS3AZCNawsh1k',
      'https://clappakistan.com/wp-content/uploads/2026/03/Rafaqat-Mehmood-Promoted-to-VP-2-Branch-Manager-at-UBL-Rawalpindi-1-1024x429.jpg',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnk8izLBc9oNWZ1EVzZ4ULOU3t3KcrxLYoRPByyi2Pv2xIPQ8RbMMldt4&s=10',
    ],
  },

  // 8. HIMALAYA DRUG COMPANY
  'himalaya-drug-company': {
    title: 'Himalaya Drug Company',
    subtitle: 'Official Brand Store',
    description: 'Browse natural, herbal healthcare, and wellness formulations from Himalaya.',
    primaryColor: '#1b7538',
    badgeBg: '#e8f5e9',
    badgeText: '#1b7538',
    logo: '/logo-aboutus.avif',
    promoBanners: [
      'https://m.media-amazon.com/images/S/stores-image-uploads-eu-prod/d/AmazonStores/A21TJRUUN4KGV/e441ea49c2234be760e57b60cd8a0a3a.w1280.h256.jpg',
    ],
  },

  // 9. ABBOTT LABORATORIES
  abbott: {
    title: 'Abbott Laboratories',
    subtitle: 'Official Brand Store',
    description: 'Discover science-backed pharmaceuticals, nutritionals, and diagnostics from Abbott.',
    primaryColor: '#121f6e',
    badgeBg: '#e9e9ea',
    badgeText: '#121f6e',
    logo: '/Abbott_Laboratories_logo.svg',
    promoBanners: [
      'https://thumbs.dreamstime.com/b/waving-flag-abbott-laboratories-logo-editoial-d-rendering-editorial-96969340.jpg',
      'https://images.squarespace-cdn.com/content/v1/633a8b3340719d6e29bb5c0c/1673285814416-AXQMF7YSGMUN9E2YNR7G/Abbott+Banner.jpeg',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPATUgk1qc0G9H850aRZhPrjSP8djH5OL0piJNEBD3YSma3k53gYE1GxcC&s=10',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0PRaqYQBq0QRihCsRxsa0SMYWiRmQiE-fQYSDQF5G5zFbLYht5ke5Y3Q&s=10',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPqtQjnIPmNc3lallyIeCroaFMtVIkJjcDPuF1BwHdQWRNReoFts10_9kR&s=10',
    ],
  },

  // 10. MERCK PAKISTAN
  'merck-pakistan': {
    title: 'Merck Pakistan',
    subtitle: 'Official Brand Store',
    description: 'Explore healthcare products, specialty medicines, and life science solutions by Merck.',
    primaryColor: '#3eb193',
    badgeBg: '#e8f5e9',
    badgeText: '#3eb193',
    logo: '/images.jpg',
    promoBanners: [
      'https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/64558c94193653.5e78d4f8ee52a.jpg',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQuGfYYWO0-3hQoBENeZpjD3wTw2rYu8wqa5wizV5vTum3UgVPD_5v82fg&s=10',
      'https://resource.tradingkey.com/uploads/20260820/MRK-3294532a8e1c4616963145c2849d3453.jpg',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1kFKEqfbm4xs0cG1DjfPRrBKJ0ISpo-BOReBpxEUN0rA56LUUHtJHGk68&s=10',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKMug6dsIYGrD4pxlo6FgZJRtf6Sfj7fKwt8CfjuAgcptEDzhHSaIAy2w&s=10',
    ],
  },
};

// 🎯 ALLOWED MANUFACTURERS DATASETS
const ALLOWED_GETZ_MANUFACTURERS = [
  'getz pharma', 'getz', 'getz pharma / local', 'getz / local',
  'alcon / getz pharma / local', 'local / getz',
  'getz pharma / hilton pharma / searle pakistan',
  'getz pharma / pfizer', 'getz pharma / gsk', 'msd / getz pharma',
  'gsk / getz pharma', 'alcon / getz pharma',
];

const ALLOWED_UNILEVER_MANUFACTURERS = [
  'unilever pakistan', 'unilever', 'hindustan unilever',
  'hindustan unilever / local distribution',
];

const ALLOWED_CIPLA_MANUFACTURERS = [
  'cipla', 'cipla / local', 'cipla / local manufacturers',
  'cipla / local distribution',
];

const ALLOWED_SANOFI_MANUFACTURERS = [
  'sanofi pakistan', 'sanofi', 'sanofi / local',
  'sanofi / local distribution', 'sanofi / specialist',
];

const ALLOWED_RECKITT_MANUFACTURERS = [
  'reckitt benckiser pakistan', 'reckitt benckiser', 'reckitt',
  'reckitt / local', 'local / reckitt or similar distribution',
];

const ALLOWED_HILTON_MANUFACTURERS = [
  'hilton pharma', 'getz pharma / hilton / local', 'hilton / local',
  'getz pharma / hilton pharma / searle', 'getz pharma / hilton pharma',
  'hilton pharma / getz pharma', 'getz pharma / hilton',
  'getz pharma / hilton / searle / local licensed',
  'alcon / getz pharma / hilton', 'novartis / getz pharma / hilton pharma',
  'msd / getz / hilton',
];

const ALLOWED_HIMALAYA_MANUFACTURERS = [
  'himalaya drug company', 'himalaya', 'himalaya / local',
  'himalaya / local distribution',
];

const ALLOWED_ABBOTT_MANUFACTURERS = [
  'abbott', 'abbott laboratories pakistan', 'abbott pakistan',
  'abbott / local', 'local / abbott style', 'abbott / getz pharma',
];

const ALLOWED_MERCK_MANUFACTURERS = [
  'merck pakistan', 'merck', 'msd (merck)', 'merck / local',
  'local / merck', 'martin dow / merck', 'merck pakistan / martin dow',
  'local / merck style',
];

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function BrandCollectionPage({ params }: PageProps) {
  const { slug } = use(params);

  // States
  const [allProductsData, setAllProductsData] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [rxOnly, setRxOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('relevance');

  // Cart Hook
  const { addProductToCart, loading: cartLoading } = useCart();

  // Brand Configuration Lookup
  const brandInfo = BRAND_CONFIGS[slug] || {
    title: slug.replace(/-/g, ' ').toUpperCase(),
    subtitle: 'Official Brand Store',
    description: `Explore products manufactured by ${slug.replace(/-/g, ' ')}.`,
    primaryColor: '#ff6f61',
    badgeBg: '#fff0ee',
    badgeText: '#ff6f61',
    logo: `/brands/${slug}.png`,
  };

  // 🔄 1. FETCH PRODUCTS FROM NESTJS BACKEND
  useEffect(() => {
    async function fetchProductsFromNestJS() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:4000/products');

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

  // ⚡ 2. FRONTEND FILTERING LOGIC
  const filteredProducts = useMemo(() => {
    return allProductsData
      .filter((product) => {
        if (!product.isActive) return false;

        const mfg = (product.manufacturer || '').trim().toLowerCase().replace(/\s+/g, ' ');

        let matchesBrand = false;

        if (slug === 'getz-pharma' || slug === 'getz') {
          matchesBrand = ALLOWED_GETZ_MANUFACTURERS.includes(mfg);
        } else if (slug === 'unilever-pakistan' || slug === 'unilever' || slug === 'hindustan-unilever') {
          matchesBrand = ALLOWED_UNILEVER_MANUFACTURERS.includes(mfg);
        } else if (slug === 'cipla') {
          matchesBrand = ALLOWED_CIPLA_MANUFACTURERS.includes(mfg);
        } else if (slug === 'sanofi-pakistan' || slug === 'sanofi') {
          matchesBrand = ALLOWED_SANOFI_MANUFACTURERS.includes(mfg);
        } else if (slug === 'reckitt-benckiser-pakistan' || slug === 'reckitt-benckiser' || slug === 'reckitt') {
          matchesBrand = ALLOWED_RECKITT_MANUFACTURERS.includes(mfg);
        } else if (slug === 'hilton-pharma' || slug === 'hilton') {
          matchesBrand = ALLOWED_HILTON_MANUFACTURERS.includes(mfg);
        } else if (slug === 'himalaya-drug-company' || slug === 'himalaya') {
          matchesBrand = ALLOWED_HIMALAYA_MANUFACTURERS.includes(mfg);
        } else if (slug === 'abbott' || slug === 'abbott-pakistan' || slug === 'abbott-laboratories-pakistan') {
          matchesBrand = ALLOWED_ABBOTT_MANUFACTURERS.includes(mfg);
        } else if (slug === 'merck-pakistan' || slug === 'merck') {
          matchesBrand = ALLOWED_MERCK_MANUFACTURERS.includes(mfg);
        } else if (slug === 'gsk-pakistan' || slug === 'gsk') {
          const isGSK =
            mfg.includes('gsk') ||
            mfg.includes('glaxosmithkline') ||
            mfg.includes('glaxo smithkline');

          const isExcludedCombo =
            mfg.includes('getz pharma / gsk') ||
            mfg.includes('gsk / getz pharma');

          matchesBrand = isGSK && !isExcludedCombo;
        } else {
          const cleanSlug = slug.replace(/-/g, ' ');
          matchesBrand = mfg.includes(cleanSlug);
        }

        if (!matchesBrand) return false;

        // Search Filter
        if (
          searchTerm.trim() &&
          !product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(
            product.genericName &&
            product.genericName.toLowerCase().includes(searchTerm.toLowerCase())
          )
        ) {
          return false;
        }

        // Category Filter
        if (selectedCategory !== 'all' && product.category !== selectedCategory) {
          return false;
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
  }, [allProductsData, slug, searchTerm, selectedCategory, selectedForm, rxOnly, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      {/* 🟢 HEADER */}
      <Header />

      <main className="flex-grow py-4 sm:py-6 px-3 sm:px-6">
        <div className="mx-auto max-w-[1360px]">
          {/* Breadcrumb Navigation */}
          <nav className="text-xs text-gray-500 mb-3 flex items-center gap-1.5 flex-wrap">
            <Link
              href="/"
              className="hover:underline transition"
              style={{ color: brandInfo.primaryColor }}
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/brands"
              className="hover:underline transition"
              style={{ color: brandInfo.primaryColor }}
            >
              Brands
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">{brandInfo.title}</span>
          </nav>

          {/* 🏷️ BRAND HEADER BANNER WITH LOGO */}
          <div
            className="rounded-2xl p-5 sm:p-6 mb-4 shadow-md text-white transition-all duration-300"
            style={{ backgroundColor: brandInfo.primaryColor }}
          >
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                {/* 📌 BRAND LOGO BADGE */}
                {brandInfo.logo && (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-2 flex items-center justify-center flex-shrink-0 shadow-md border border-white/20">
                    <Image
                      src={brandInfo.logo}
                      alt={`${brandInfo.title} Logo`}
                      width={64}
                      height={64}
                      style={{ width: 'auto', height: 'auto' }}
                      className="max-h-11 max-w-full object-contain"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="bg-white text-xs font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-2xs"
                      style={{ color: brandInfo.primaryColor }}
                    >
                      Official Brand Store
                    </span>
                    <span className="text-xs font-semibold opacity-90">
                      {filteredProducts.length} Products Available
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {brandInfo.title}
                  </h1>
                  <p className="text-xs sm:text-sm opacity-90 mt-1 max-w-2xl leading-relaxed">
                    {brandInfo.description}
                  </p>
                </div>
              </div>

              {/* In-Brand Search Bar */}
              <div className="w-full md:w-80">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Search inside ${brandInfo.title}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white text-gray-900 placeholder-gray-400 font-medium rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm transition"
                  />
                  <svg
                    className="w-4 h-4 absolute left-3.5 top-3"
                    style={{ color: brandInfo.primaryColor }}
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

          {/* PROMOTIONAL CAMPAIGN BANNERS SECTION */}
          {brandInfo.promoBanners && brandInfo.promoBanners.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: brandInfo.primaryColor }}
                  ></span>
                  {brandInfo.title} Campaigns & Initiatives
                </h3>
                {brandInfo.promoBanners.length > 1 && (
                  <span className="text-[11px] text-gray-400 font-medium">
                    Scroll to explore &rarr;
                  </span>
                )}
              </div>

              {/* Single Full-Width Banner Layout */}
              {brandInfo.promoBanners.length === 1 ? (
                <div className="w-full h-36 sm:h-48 md:h-56 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-2xs relative group">
                  <Image
                    src={brandInfo.promoBanners[0]}
                    alt={`${brandInfo.title} Campaign`}
                    fill
                    sizes="100vw"
                    className="object-cover group-hover:scale-102 transition-transform duration-500"
                  />
                </div>
              ) : (
                /* Multi-Image Carousel Cards */
                <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
                  {brandInfo.promoBanners.map((imgUrl, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 w-64 sm:w-80 h-36 sm:h-44 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-2xs hover:shadow-md transition-all duration-300 relative group"
                    >
                      <Image
                        src={imgUrl}
                        alt={`${brandInfo.title} Initiative ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 256px, 320px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TRUST & QUALITY BAR */}
          <div className="bg-[#f3f4f6] rounded-2xl p-3 sm:p-4 mb-6 border border-gray-200 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-3 bg-white/70 sm:bg-transparent p-2 sm:p-0 rounded-xl justify-center sm:justify-start">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 shadow-2xs flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: brandInfo.primaryColor }}
                >
                  <svg
                    className="w-5 h-5"
                    style={{ color: brandInfo.primaryColor }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  100% Genuine
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white/70 sm:bg-transparent p-2 sm:p-0 rounded-xl justify-center sm:justify-start">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 shadow-2xs flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: brandInfo.primaryColor }}
                >
                  <svg
                    className="w-5 h-5"
                    style={{ color: brandInfo.primaryColor }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  Quality Tested
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white/70 sm:bg-transparent p-2 sm:p-0 rounded-xl justify-center sm:justify-start">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 shadow-2xs flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: brandInfo.primaryColor }}
                >
                  <svg
                    className="w-5 h-5"
                    style={{ color: brandInfo.primaryColor }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  Direct Sourced
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white/70 sm:bg-transparent p-2 sm:p-0 rounded-xl justify-center sm:justify-start">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 shadow-2xs flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: brandInfo.primaryColor }}
                >
                  <svg
                    className="w-5 h-5"
                    style={{ color: brandInfo.primaryColor }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  Safe & Reliable
                </span>
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
                    setSelectedCategory('all');
                    setSelectedForm('all');
                    setRxOnly(false);
                  }}
                  className="text-[11px] font-semibold hover:underline cursor-pointer"
                  style={{ color: brandInfo.primaryColor }}
                >
                  Reset All
                </button>
              </div>

              {/* Category Filter */}
              <div className="mb-4">
                <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                  Category
                </h4>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Stomach Care">Stomach Care</option>
                  <option value="Pain Relief">Pain Relief</option>
                  <option value="Cold & Cough">Cold & Cough</option>
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
                  <option value="Tablet">Tablet</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Cream">Cream / Soap</option>
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
                    style={{ accentColor: brandInfo.primaryColor }}
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
                    style={{ borderColor: brandInfo.primaryColor, borderTopColor: 'transparent' }}
                  ></div>
                  <p className="text-xs font-semibold text-gray-500">
                    Loading products for {brandInfo.title}...
                  </p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <p className="text-sm font-semibold text-gray-600">
                    No products found for {brandInfo.title}.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                      setSelectedForm('all');
                      setRxOnly(false);
                    }}
                    className="mt-3 text-xs font-bold hover:underline cursor-pointer"
                    style={{ color: brandInfo.primaryColor }}
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

                        {/* 🔗 Dynamic PDP Navigation Link */}
                        <Link href={`/products/${product.slug}`} className="block group">
                          <div>
                            {/* Image */}
                            <div className="w-full aspect-square bg-gray-50 rounded-lg mb-3 relative overflow-hidden flex items-center justify-center p-2">
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
                              {product.brandName}
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
                            className="w-full text-white text-xs font-bold py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 shadow-2xs hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                            style={{ backgroundColor: brandInfo.primaryColor }}
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

      {/* 🔴 FOOTER */}
      <Footer />
    </div>
  );
}