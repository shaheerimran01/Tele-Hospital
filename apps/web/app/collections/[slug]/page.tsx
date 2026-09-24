'use client';

import { use, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/app/components/cart/CartContext';

// Helper for Safe Text Conversion (Handles arrays, strings, nulls, numbers)
const getSafeText = (val?: any): string => {
  if (!val) return '';
  if (Array.isArray(val)) return val.join(',').toLowerCase();
  if (typeof val === 'object') return JSON.stringify(val).toLowerCase();
  return String(val).toLowerCase();
};

interface Product {
  id: string;
  name: string;
  slug: string;
  genericName?: string;
  manufacturer: string;
  systemOfMedicine?: string;
  systemofMedicine?: string;
  category?: string;
  subCategory?: string;
  healthConditions?: string | string[];
  tags?: string | string[];
  dosageForm?: string;
  packSize: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  prescriptionRequired?: boolean;
  isActive?: boolean;
  isFeatured?: boolean | number | string;
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// 🖼️ Featured Visual Media Metadata mapping for main collection banners
const COLLECTION_MEDIA: Record<
  string,
  {
    gradient: string;
    badge: string;
    tagline: string;
    images: { url: string; label: string }[];
  }
> = {
  // 👴 Elderly Care
  'elderly-care': {
    gradient: 'from-teal-800 via-cyan-700 to-teal-900',
    badge: 'Senior Comfort & Support Essentials',
    tagline:
      'Mobility support, adult diapers, joint care formulas, and daily monitoring devices for comfortable, independent senior living.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80',
        label: 'Senior Wellness',
      },
      {
        url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
        label: 'Daily Support',
      },
    ],
  },

  // 🌸 Sexual Wellness
  'sexual-wellness': {
    gradient: 'from-purple-900 via-fuchsia-800 to-rose-900',
    badge: 'Personal & Intimate Wellness',
    tagline:
      'Explore premium vitality supplements, intimate care essentials, stamina boosters, and reproductive health products for confidence and balance.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=600&q=80',
        label: 'Vitality Supplements',
      },
      {
        url: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=600&q=80',
        label: 'Intimate Care',
      },
    ],
  },

  // 🧴 Skin Care
  'skin-care-products': {
    gradient: 'from-pink-800 via-rose-700 to-purple-900',
    badge: 'Dermatologist Recommended Skincare',
    tagline:
      'Hydrating cleansers, daily SPF sunscreens, acne control treatments, and barrier repair serums for glowing, healthy skin.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
        label: 'Barrier Hydration',
      },
      {
        url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80',
        label: 'Active Serums',
      },
    ],
  },

  // 💇 Hair Care
  'healthy-hair-starts-here': {
    gradient: 'from-indigo-900 via-purple-800 to-slate-900',
    badge: 'Nourishing Scalp & Hair Therapy',
    tagline:
      'Targeted hair fall solutions, anti-dandruff cleansers, biotin supplements, and restorative oils for strong, lustrous hair.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80',
        label: 'Scalp Oils & Serums',
      },
      {
        url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80',
        label: 'Hair Nourishment',
      },
    ],
  },

  // 🪥 Oral Care
  'oral-care': {
    gradient: 'from-rose-800 via-pink-700 to-rose-900',
    badge: 'Complete Dental & Oral Hygiene',
    tagline:
      'Sensitivity relief toothpastes, protective mouthwashes, dental floss, and enamel care solutions for fresh breath and healthy teeth.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1556228722-d0b5b1a03e67?auto=format&fit=crop&w=600&q=80',
        label: 'Oral Hygiene',
      },
      {
        url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
        label: 'Dental Protection',
      },
    ],
  },

  // 👶 Baby Care
  'baby-care': {
    gradient: 'from-sky-800 via-blue-700 to-indigo-900',
    badge: 'Gentle & Safe Baby Care',
    tagline:
      'Hypoallergenic baby shampoos, rash creams, gentle wipes, and infant nutritional products formulated for delicate baby skin.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=600&q=80',
        label: 'Gentle Care',
      },
      {
        url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
        label: 'Infant Essentials',
      },
    ],
  },

  // 👩 Women Care
  'women-care': {
    gradient: 'from-fuchsia-900 via-pink-700 to-rose-800',
    badge: 'Intimate & Hormonal Health',
    tagline:
      'Feminine hygiene washes, menstrual health products, prenatal supplements, and daily wellness items designed specifically for women.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80',
        label: 'Intimate Care',
      },
      {
        url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
        label: 'Feminine Hygiene',
      },
    ],
  },

  // 🧔 Men Grooming
  'men-grooming': {
    gradient: 'from-slate-800 via-gray-800 to-zinc-900',
    badge: 'Men’s Daily Grooming & Hygiene',
    tagline:
      'Beard care oils, refreshing face washes, anti-sweat deodorants, and premium hair styling essentials tailored for men.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80',
        label: 'Grooming Tools',
      },
      {
        url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80',
        label: 'Beard & Hair',
      },
    ],
  },

  // 🐾 Pet Care
  'pet-care': {
    gradient: 'from-purple-900 via-violet-800 to-fuchsia-900',
    badge: 'Complete Pet Health & Hygiene',
    tagline:
      'Veterinary shampoos, flea & tick treatments, dietary supplements, and daily hygiene products for happy, healthy pets.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
        label: 'Pet Health',
      },
      {
        url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
        label: 'Hygiene Care',
      },
    ],
  },

  // 🏷️ Best Offers & Deals
  'best-offers': {
    gradient: 'from-red-800 via-rose-700 to-amber-800',
    badge: 'Mega Savings & Unbeatable Prices',
    tagline:
      'Exclusive discounts, flash sales, and top price drops on authentic medicines, healthcare items, and wellness essentials.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80',
        label: 'Flash Deals',
      },
      {
        url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
        label: 'Best Savings',
      },
    ],
  },

  // 💊 Vitamins & Supplements
  'vitamins-supplements': {
    gradient: 'from-amber-700 via-orange-600 to-amber-800',
    badge: 'Essential Daily Nutrition',
    tagline:
      'High-potency multivitamin tablets, essential mineral complexes, omega-3 softgels, and daily dietary supplements for peak energy and health.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80',
        label: 'Dietary Vitamins',
      },
      {
        url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80',
        label: 'Daily Supplements',
      },
    ],
  },

  // 🧪 Homeopathy
  'homeopathy-best-medicines': {
    gradient: 'from-emerald-800 via-teal-700 to-emerald-900',
    badge: '100% Natural & Holistic Remedies',
    tagline:
      'Pure homeopathic dilutions, Mother Tinctures, biochemic tablets, and natural remedies curated for side-effect-free holistic healing.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
        label: 'Pure Dilutions',
      },
      {
        url: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=600&q=80',
        label: 'Herbal Remedies',
      },
    ],
  },

  // 🌿 Herbal Best Medicines / Unani / Ayurveda
  'herbal-best-medicines': {
    gradient: 'from-emerald-900 via-green-800 to-teal-900',
    badge: '100% Herbal & Ayurvedic Solutions',
    tagline:
      'Traditional herbal formulations, organic tonics, and ancient Unani & Ayurvedic supplements for natural immunity and holistic wellbeing.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=600&q=80',
        label: 'Botanical Extracts',
      },
      {
        url: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=600&q=80',
        label: 'Ayurvedic Formulations',
      },
    ],
  },

  // 🩺 Pain Relief Essentials
  'pain-relief-essentials': {
    gradient: 'from-blue-900 via-indigo-800 to-slate-900',
    badge: 'Fast-Acting Pain & Joint Relief',
    tagline:
      'Targeted muscle balms, fast pain sprays, joint support formulas, and effective analgesics for active, comfortable mobility.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1608248597359-54d9c79e6cf4?auto=format&fit=crop&w=600&q=80',
        label: 'Relief Sprays & Balms',
      },
      {
        url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80',
        label: 'Joint Wellness',
      },
    ],
  },

  // 🥛 Nutritional Drinks
  'nutritional-drinks': {
    gradient: 'from-amber-800 via-orange-700 to-amber-900',
    badge: 'Daily Energy & Vitality Boosters',
    tagline:
      'Complete health nutrition powders, protein drinks, stamina boosters, and meal replacement nutrition shakes for the whole family.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80',
        label: 'Nutrition Shakes',
      },
      {
        url: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=600&q=80',
        label: 'Energy Mixes',
      },
    ],
  },
};

// 💳 Secondary Promo Banner Cards configuration
const PROMO_BANNERS = [
  {
    title: 'Flat 15% Off On First Order',
    code: 'WELCOME15',
    tag: 'LIMITED DEAL',
    gradient: 'from-rose-500 to-orange-500',
    image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Express Doorstep Delivery',
    code: 'SAME DAY',
    tag: 'FAST SHIPPING',
    gradient: 'from-blue-600 to-teal-500',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: '100% Genuine Certified',
    code: 'VERIFIED',
    tag: 'TRUST GUARANTEE',
    gradient: 'from-emerald-600 to-green-500',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
  },
];

export default function GenericCollectionPage({ params }: PageProps) {
  const { slug } = use(params);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 🛒 Cart Context Hook Integration
  const { addProductToCart, loading: cartLoading } = useCart();

  // 🎛️ Active Filters State
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDosageForm, setSelectedDosageForm] = useState<string>('all');
  const [selectedPrescription, setSelectedPrescription] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('relevance');

  // Title formatting (e.g., 'elderly-care' -> 'Elderly Care')
  const formattedTitle = useMemo(() => {
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }, [slug]);

  // Dynamic Media Selector
  const activeMedia = useMemo(() => {
    if (COLLECTION_MEDIA[slug]) return COLLECTION_MEDIA[slug];

    if (slug.includes('elderly')) return COLLECTION_MEDIA['elderly-care'];
    if (slug.includes('sexual') || slug.includes('intimate')) {
      return COLLECTION_MEDIA['sexual-wellness'];
    }
    if (slug.includes('skin') || slug.includes('derma')) {
      return COLLECTION_MEDIA['skin-care-products'];
    }
    if (slug.includes('hair') || slug.includes('healthy-hair')) {
      return COLLECTION_MEDIA['healthy-hair-starts-here'];
    }
    if (slug.includes('oral')) return COLLECTION_MEDIA['oral-care'];
    if (slug.includes('baby')) return COLLECTION_MEDIA['baby-care'];
    if (slug.includes('women')) return COLLECTION_MEDIA['women-care'];
    if (slug.includes('men') || slug.includes('grooming')) return COLLECTION_MEDIA['men-grooming'];
    if (slug.includes('pet')) return COLLECTION_MEDIA['pet-care'];

    if (
      slug.includes('offer') ||
      slug.includes('deal') ||
      slug.includes('discount')
    ) {
      return COLLECTION_MEDIA['best-offers'];
    }
    if (slug.includes('vitamin') || slug.includes('supplement')) {
      return COLLECTION_MEDIA['vitamins-supplements'];
    }
    if (slug.includes('homeo')) return COLLECTION_MEDIA['homeopathy-best-medicines'];
    if (slug.includes('herbal') || slug.includes('unani') || slug.includes('ayurveda')) {
      return COLLECTION_MEDIA['herbal-best-medicines'];
    }
    if (slug.includes('pain')) return COLLECTION_MEDIA['pain-relief-essentials'];
    if (slug.includes('nutrition') || slug.includes('drinks') || slug.includes('nutritional')) {
      return COLLECTION_MEDIA['nutritional-drinks'];
    }

    return null;
  }, [slug]);

  // Fetch ALL products from NestJS backend
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:4000/products');
        if (!res.ok) throw new Error('Failed to fetch backend products');

        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
          ? data.data
          : data.products || [];

        setAllProducts(list);
      } catch (error) {
        console.error('Error fetching collection products:', error);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Base Collection-specific filtering rules according to SQL criteria
  const collectionProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (p.isActive === false) return false;

      // 👴 ELDERLY CARE (SQL Exact Match Criteria)
      if (slug.includes('elderly') || slug === 'elderly-care') {
        const healthCondText = getSafeText(p.healthConditions);
        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const tagsText = getSafeText(p.tags);
        const nameText = getSafeText(p.name);

        const healthCondRegex =
          /elderly|senior|geriatric|incontinence|parkinson|alzheimer/i;
        const catRegex =
          /elderly care|senior care|adult care|orthopedic|mobility/i;
        const subCatRegex =
          /elderly|senior|adult diaper|walker|wheelchair|commode/i;
        const tagsRegex =
          /elderly-care|senior-care|adult-diaper|mobility-aid/i;
        const nameRegex =
          /adult diaper|diaper adult|walker|commode|wheelchair|underpad|walking stick|crutch|elderly|senior/i;

        return (
          healthCondRegex.test(healthCondText) ||
          catRegex.test(catText) ||
          subCatRegex.test(subCatText) ||
          tagsRegex.test(tagsText) ||
          nameRegex.test(nameText)
        );
      }

      // 🌸 SEXUAL WELLNESS (SQL Exact Match Criteria)
      if (
        slug.includes('sexual') ||
        slug.includes('intimate') ||
        slug === 'sexual-wellness'
      ) {
        const healthCondText = getSafeText(p.healthConditions);
        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const tagsText = getSafeText(p.tags);
        const nameText = getSafeText(p.name);

        const healthCondRegex =
          /sexual|vitality|stamina|vigor|reproductive|erectile|libido|intimate/i;
        const catRegex = /sexual wellness|sexual health|wellness/i;
        const subCatRegex =
          /sexual|vitality|condom|lubricant|intimate hygiene|intimate care|intimate/i;
        const tagsRegex =
          /sexual-wellness|vitality|stamina|wellness|intimate-hygiene|intimate-care/i;
        const nameRegex =
          /condom|lubricant|delay|vitality|vigor|stamina|shilajit|penis|sexual|vwash|intimate/i;

        return (
          healthCondRegex.test(healthCondText) ||
          catRegex.test(catText) ||
          subCatRegex.test(subCatText) ||
          tagsRegex.test(tagsText) ||
          nameRegex.test(nameText)
        );
      }

      // 🪥 ORAL CARE (SQL Exact Query Logic)
      if (slug.includes('oral') || slug === 'oral-care') {
        const healthCondText = getSafeText(p.healthConditions);
        const catText = getSafeText(p.category);

        const healthCondRegex = /oral-thrush/i;
        const catRegex = /dental care|oral care/i;

        return healthCondRegex.test(healthCondText) || catRegex.test(catText);
      }

      // 👩 WOMEN CARE (SQL Exact Query Logic)
      if (slug.includes('women') || slug === 'women-care') {
        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const healthCondText = getSafeText(p.healthConditions);
        const tagsText = getSafeText(p.tags);
        const nameText = getSafeText(p.name);

        const catRegex = /women|women care|feminine care|maternity/i;
        const subCatRegex = /women|sanitary|pads|tampons|intimate|maternity|period/i;
        const healthCondRegex =
          /women|pregnancy|pcos|period|menstrual|menopause|lactation/i;
        const tagsRegex = /women|women-care|feminine-hygiene|sanitary|maternity/i;
        const nameRegex =
          /sanitary|tampon|always|butterfly|vwash|fem|eve|women|maternity|pcos|period/i;

        return (
          catRegex.test(catText) ||
          subCatRegex.test(subCatText) ||
          healthCondRegex.test(healthCondText) ||
          tagsRegex.test(tagsText) ||
          nameRegex.test(nameText)
        );
      }

      // 🧔 MEN'S GROOMING (SQL Exact Query Logic)
      if (slug.includes('men') || slug.includes('grooming') || slug === 'men-grooming') {
        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const tagsText = getSafeText(p.tags);
        const nameText = getSafeText(p.name);

        const catRegex = /men grooming|men's grooming|men care|men's care/i;
        const subCatRegex = /shaving|beard|trimmer|razor|grooming|men's care/i;
        const tagsRegex = /men-grooming|beard-care|shaving/i;
        const nameRegex = /razor|shaving|beard|trimmer|aftershave|gillette|nivea men|park avenue/i;

        return (
          catRegex.test(catText) ||
          subCatRegex.test(subCatText) ||
          tagsRegex.test(tagsText) ||
          nameRegex.test(nameText)
        );
      }

      // 🐾 PET CARE (SQL Exact Query Logic)
      if (slug.includes('pet') || slug === 'pet-care') {
        const catText = getSafeText(p.category);
        const catRegex = /pet care|pets/i;

        return catRegex.test(catText);
      }

      // 👶 BABY CARE
      if (slug.includes('baby') || slug === 'baby-care') {
        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const tagsText = getSafeText(p.tags);
        const nameText = getSafeText(p.name);

        const babyRegex = /baby|infant|diaper|wipes|cerelac|pediasure|lotion|baby care/i;

        return (
          babyRegex.test(catText) ||
          babyRegex.test(subCatText) ||
          babyRegex.test(tagsText) ||
          babyRegex.test(nameText)
        );
      }

      // 🏷️ BEST OFFERS / BEST DEALS / TOP DEALS
      if (
        slug.includes('best-offer') ||
        slug.includes('best-offers') ||
        slug.includes('best-deals') ||
        slug.includes('top-deals') ||
        slug.includes('offers') ||
        slug.includes('deals') ||
        slug === 'best-offers'
      ) {
        const pPrice = Number(p.price) || 0;
        const pOriginalPrice = Number(p.originalPrice) || 0;

        return pOriginalPrice > pPrice && pOriginalPrice > 0 && pPrice > 0;
      }

      // 💊 VITAMINS & SUPPLEMENTS
      if (
        slug.includes('vitamin') ||
        slug.includes('supplement') ||
        slug === 'vitamins-supplements' ||
        slug === 'vitamins-and-supplements'
      ) {
        const sysMed = getSafeText(p.systemOfMedicine || p.systemofMedicine);
        const tagsText = getSafeText(p.tags);
        const catText = getSafeText(p.category);
        const nameText = getSafeText(p.name);

        const matchesIncluded = /vitamin|supplement/i.test(`${sysMed} ${tagsText}`);
        const matchesExcluded =
          /skin|skin care/i.test(catText) ||
          /ensure|pediasure|horlicks|complan|shake/i.test(nameText);

        return matchesIncluded && !matchesExcluded;
      }

      // 🧪 HOMEOPATHY BEST MEDICINES
      if (
        slug.includes('homeopathy') ||
        slug.includes('homeo') ||
        slug === 'homeopathy-best-medicines'
      ) {
        const sysMed = getSafeText(p.systemOfMedicine || p.systemofMedicine);
        const homeoRegex = /homeo|homeopathy|homeopathic/i;
        return homeoRegex.test(sysMed);
      }

      // 💇 HEALTHY HAIR STARTS HERE / HAIR CARE
      if (
        slug.includes('healthy-hair') ||
        slug.includes('hair-care') ||
        slug === 'healthy-hair-starts-here'
      ) {
        const healthCondText = getSafeText(p.healthConditions);
        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const tagsText = getSafeText(p.tags);
        const nameText = getSafeText(p.name);

        const healthCondRegex = /hair|scalp|dandruff|hair loss|hair fall|alopecia/i;
        const catSubRegex = /hair|hair care/i;
        const tagsRegex = /hair|hair-care|scalp/i;
        const nameRegex = /hair|shampoo|oil|serum|biotin|scalp/i;

        return (
          healthCondRegex.test(healthCondText) ||
          catSubRegex.test(catText) ||
          catSubRegex.test(subCatText) ||
          tagsRegex.test(tagsText) ||
          nameRegex.test(nameText)
        );
      }

      // 🩺 PAIN RELIEF ESSENTIALS
      if (
        slug === 'pain-relief-essentials' ||
        slug === 'pain-relief' ||
        slug === 'pain-essentials'
      ) {
        const healthCondText = getSafeText(p.healthConditions);
        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const tagsText = getSafeText(p.tags);
        const nameText = getSafeText(p.name);

        const healthCondRegex = /pain relief|pain killer|analgesic|muscle pain|joint pain/i;
        const catSubRegex = /pain relief|pain/i;
        const tagsRegex = /pain-relief|pain/i;
        const nameRegex = /pain|relief|analgesic|spray|balm|painkiller/i;

        return (
          healthCondRegex.test(healthCondText) ||
          catSubRegex.test(catText) ||
          catSubRegex.test(subCatText) ||
          tagsRegex.test(tagsText) ||
          nameRegex.test(nameText)
        );
      }

      // 🧴 SKIN CARE PRODUCTS
      if (
        slug.includes('skin-care') ||
        slug.includes('skincare') ||
        slug.includes('derma')
      ) {
        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const healthCondText = getSafeText(p.healthConditions);

        const skinCareRegex = /skin\s*care|skincare|derma\s*care/i;

        return (
          skinCareRegex.test(catText) ||
          skinCareRegex.test(subCatText) ||
          skinCareRegex.test(healthCondText)
        );
      }

      // 🌿 HERBAL BEST MEDICINES
      if (
        slug.includes('herbal') ||
        slug.includes('unani') ||
        slug.includes('ayurvedic') ||
        slug.includes('ayurveda')
      ) {
        const sysMed = getSafeText(p.systemOfMedicine || p.systemofMedicine);
        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const tagsText = getSafeText(p.tags);

        const herbalRegex = /herbal|unani|ayurvedic|ayurveda/i;

        const isHerbalSys = sysMed === 'herbal' || sysMed === 'ayurvedic' || sysMed === 'unani';
        const isHerbalCategory =
          herbalRegex.test(catText) ||
          herbalRegex.test(subCatText) ||
          herbalRegex.test(tagsText);

        return isHerbalSys || isHerbalCategory;
      }

      // 🥛 NUTRITIONAL DRINKS
      if (
        slug.includes('nutritional-drinks') ||
        slug.includes('nutrition') ||
        slug.includes('drink')
      ) {
        const catText = getSafeText(p.category);
        const subCatText = getSafeText(p.subCategory);
        const tagsText = getSafeText(p.tags);

        const nutritionRegex = /nutrition|nutritional|drink|protein|shake|boost/i;

        return (
          nutritionRegex.test(catText) ||
          nutritionRegex.test(subCatText) ||
          nutritionRegex.test(tagsText)
        );
      }

      // 💊 ALLOPATHY TOP SELLER
      if (slug === 'allopathy-top-seller' || slug === 'allopathy') {
        const sysMed = getSafeText(p.systemOfMedicine || p.systemofMedicine);
        const tagsText = getSafeText(p.tags);
        const cat = getSafeText(p.category);
        const sub = getSafeText(p.subCategory);

        const isAllopathy =
          sysMed === 'allopathy' ||
          (!sysMed && !/herbal|unani|ayurvedic|homeopathy|homeopathic/i.test(`${cat} ${sub}`));

        const isBestSeller = /best-?seller|bestseller/i.test(tagsText);

        return isAllopathy && isBestSeller;
      }

      // 🔥 POPULAR PRODUCTS
      if (slug === 'popular-products' || slug === 'popular') {
        const tagsText = getSafeText(p.tags);
        const subCatText = getSafeText(p.subCategory);
        const healthCondText = getSafeText(p.healthConditions);

        return (
          tagsText.includes('popular') ||
          subCatText.includes('popular') ||
          healthCondText.includes('popular')
        );
      }

      // 🌟 IN THE SPOTLIGHT
      if (slug === 'in-the-spotlight') {
        return (
          p.isFeatured === true ||
          p.isFeatured === 1 ||
          String(p.isFeatured).toLowerCase() === 'true'
        );
      }

      // Fallback matching
      return (
        getSafeText(p.category).includes(slug.replace(/-/g, ' ')) ||
        getSafeText(p.tags).includes(slug.replace(/-/g, ' '))
      );
    });
  }, [allProducts, slug]);

  // 🏬 Extract Dynamic Sidebar Filter Options from Active Collection
  const availableManufacturers = useMemo(() => {
    const mfgSet = new Set<string>();
    collectionProducts.forEach((p) => {
      if (p.manufacturer && p.manufacturer.trim()) {
        mfgSet.add(p.manufacturer.trim());
      }
    });
    return Array.from(mfgSet).sort();
  }, [collectionProducts]);

  const availableCategories = useMemo(() => {
    const catSet = new Set<string>();
    collectionProducts.forEach((p) => {
      if (p.category && p.category.trim()) {
        catSet.add(p.category.trim());
      }
    });
    return Array.from(catSet).sort();
  }, [collectionProducts]);

  const availableDosageForms = useMemo(() => {
    const formSet = new Set<string>();
    collectionProducts.forEach((p) => {
      if (p.dosageForm && p.dosageForm.trim()) {
        formSet.add(p.dosageForm.trim());
      }
    });
    return Array.from(formSet).sort();
  }, [collectionProducts]);

  // 🔍 Final Filtering (Search, Manufacturer, Category, Dosage Form, Prescription, and Sorting)
  const filteredProducts = useMemo(() => {
    let result = collectionProducts
      .filter((p) => {
        // Search Term Filter
        if (
          searchTerm.trim() &&
          !p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !getSafeText(p.genericName).includes(searchTerm.toLowerCase())
        ) {
          return false;
        }

        // Manufacturer Filter
        if (selectedManufacturer !== 'all') {
          if ((p.manufacturer || '').trim().toLowerCase() !== selectedManufacturer.toLowerCase()) {
            return false;
          }
        }

        // Category Filter
        if (selectedCategory !== 'all') {
          if ((p.category || '').trim().toLowerCase() !== selectedCategory.toLowerCase()) {
            return false;
          }
        }

        // Dosage Form Filter
        if (selectedDosageForm !== 'all') {
          if ((p.dosageForm || '').trim().toLowerCase() !== selectedDosageForm.toLowerCase()) {
            return false;
          }
        }

        // Prescription Required (Rx) Filter
        if (selectedPrescription !== 'all') {
          const isRx =
            p.prescriptionRequired === true ||
            String(p.prescriptionRequired).toLowerCase() === 'true';

          if (selectedPrescription === 'rx' && !isRx) return false;
          if (selectedPrescription === 'otc' && isRx) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;

        // Default Relevance sorting for Best Offers: Highest discount_percentage DESC
        if (
          slug.includes('offer') ||
          slug.includes('deal') ||
          slug.includes('discount')
        ) {
          const origA = Number(a.originalPrice) || 0;
          const priceA = Number(a.price) || 0;
          const discA = origA > priceA && origA > 0 ? ((origA - priceA) / origA) * 100 : 0;

          const origB = Number(b.originalPrice) || 0;
          const priceB = Number(b.price) || 0;
          const discB = origB > priceB && origB > 0 ? ((origB - priceB) / origB) * 100 : 0;

          return discB - discA;
        }

        return 0;
      });

    // Enforce LIMIT 40 for best offer default view matching SQL LIMIT 40
    if (
      (slug.includes('offer') || slug.includes('deal')) &&
      selectedManufacturer === 'all' &&
      selectedCategory === 'all' &&
      selectedDosageForm === 'all' &&
      selectedPrescription === 'all' &&
      !searchTerm.trim()
    ) {
      result = result.slice(0, 40);
    }

    return result;
  }, [
    collectionProducts,
    searchTerm,
    selectedManufacturer,
    selectedCategory,
    selectedDosageForm,
    selectedPrescription,
    sortBy,
    slug,
  ]);

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedManufacturer('all');
    setSelectedCategory('all');
    setSelectedDosageForm('all');
    setSelectedPrescription('all');
    setSortBy('relevance');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <Header />

      <main className="flex-grow py-4 sm:py-6 px-3 sm:px-6">
        <div className="mx-auto max-w-[1360px]">
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
            <Link href="/" className="hover:underline text-[#ff6f61]">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-500">Collections</span>
            <span>/</span>
            <span className="text-gray-900 font-semibold">{formattedTitle}</span>
          </nav>

          {/* 🖼️ Main Visual Header Banner */}
          {activeMedia ? (
            <div
              className={`rounded-2xl p-6 sm:p-8 mb-4 text-white shadow-md bg-gradient-to-r ${activeMedia.gradient} relative overflow-hidden`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
                {/* Banner Text Content */}
                <div className="md:col-span-7 space-y-3">
                  <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 text-[10px] sm:text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                    {activeMedia.badge}
                  </span>
                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    {formattedTitle}
                  </h1>
                  <p className="text-xs sm:text-sm opacity-90 leading-relaxed max-w-xl">
                    {activeMedia.tagline}
                  </p>

                  {/* Search Bar inside Banner */}
                  <div className="w-full sm:w-80 pt-1">
                    <input
                      type="text"
                      placeholder={`Search in ${formattedTitle}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white/95 text-gray-900 placeholder-gray-500 font-medium rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:bg-white shadow-sm"
                    />
                  </div>
                </div>

                {/* Banner Image Gallery Grid */}
                <div className="md:col-span-5 grid grid-cols-2 gap-3">
                  {activeMedia.images.map((imgObj, index) => (
                    <div
                      key={index}
                      className="relative aspect-4/3 rounded-xl overflow-hidden border-2 border-white/20 shadow-md bg-black/20 group/img"
                    >
                      <img
                        src={imgObj.url}
                        alt={imgObj.label}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition duration-300"
                      />
                      <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                        {imgObj.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Default Red Banner for Other Collections */
            <div className="rounded-2xl p-5 sm:p-6 mb-4 shadow-md text-white bg-gradient-to-r from-[#ff6f61] to-[#e11d48]">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <span className="bg-white text-[#ff6f61] text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                    COLLECTION
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                    {formattedTitle}
                  </h1>
                  <p className="text-xs sm:text-sm opacity-90 mt-1 max-w-2xl">
                    Explore all authentic products under {formattedTitle}.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="w-full md:w-80">
                  <input
                    type="text"
                    placeholder={`Search in ${formattedTitle}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white text-gray-900 placeholder-gray-400 font-medium rounded-xl py-2.5 px-4 text-xs focus:outline-none shadow-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 🖼️ Promotional Image Banner Bar directly below main banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {PROMO_BANNERS.map((banner, index) => (
              <div
                key={index}
                className={`relative overflow-hidden rounded-xl p-4 bg-gradient-to-r ${banner.gradient} text-white shadow-xs border border-white/10 flex items-center justify-between group hover:shadow-md transition cursor-pointer`}
              >
                <div className="z-10 space-y-1 max-w-[65%]">
                  <span className="text-[9px] font-black uppercase bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded tracking-wider text-white">
                    {banner.tag}
                  </span>
                  <h3 className="text-xs font-black leading-snug">{banner.title}</h3>
                  <div className="inline-flex items-center gap-1 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/30 mt-1">
                    <span>Use Code:</span>
                    <span className="font-extrabold underline">{banner.code}</span>
                  </div>
                </div>

                {/* Promotional Banner Thumbnail Image */}
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/30 shadow-xs shrink-0 group-hover:scale-105 transition duration-300">
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* 🛠️ Sidebar Filters */}
            <aside className="bg-white border border-gray-200 rounded-xl p-4 h-fit hidden lg:block sticky top-20 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm">Filters</h3>
                <button
                  onClick={resetAllFilters}
                  className="text-[11px] font-semibold text-[#ff6f61] hover:underline cursor-pointer"
                >
                  Reset All
                </button>
              </div>

              {/* 1. Prescription Required (Rx) Filter */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                  Prescription Type
                </h4>
                <select
                  value={selectedPrescription}
                  onChange={(e) => setSelectedPrescription(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                >
                  <option value="all">All Products</option>
                  <option value="rx">Prescription Required (Rx)</option>
                  <option value="otc">Non-Prescription (OTC)</option>
                </select>
              </div>

              {/* 2. Category Filter */}
              {availableCategories.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                    Category
                  </h4>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                  >
                    <option value="all">All Categories ({availableCategories.length})</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Dosage Form Filter */}
              {availableDosageForms.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                    Dosage Form
                  </h4>
                  <select
                    value={selectedDosageForm}
                    onChange={(e) => setSelectedDosageForm(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                  >
                    <option value="all">All Forms ({availableDosageForms.length})</option>
                    {availableDosageForms.map((form) => (
                      <option key={form} value={form}>
                        {form}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 4. Manufacturer Filter */}
              {availableManufacturers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                    Manufacturer
                  </h4>
                  <select
                    value={selectedManufacturer}
                    onChange={(e) => setSelectedManufacturer(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                  >
                    <option value="all">
                      All Manufacturers ({availableManufacturers.length})
                    </option>
                    {availableManufacturers.map((mfg) => (
                      <option key={mfg} value={mfg}>
                        {mfg}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </aside>

            {/* Product Cards Grid */}
            <section className="lg:col-span-3">
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5 mb-4 shadow-2xs">
                <span className="text-xs font-semibold text-gray-700">
                  Showing <strong className="text-gray-900">{filteredProducts.length}</strong> products
                </span>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium text-gray-800 focus:outline-none"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              {loading ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-xs text-gray-500 font-semibold">
                  Loading {formattedTitle}...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-xs text-gray-500 font-semibold">
                  No products found matching your active filters.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {filteredProducts.map((product) => {
                    const productSlug =
                      product.slug ||
                      product.name
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, '');

                    const isRxRequired =
                      product.prescriptionRequired === true ||
                      String(product.prescriptionRequired).toLowerCase() === 'true';

                    const hasDiscount =
                      product.originalPrice && product.originalPrice > product.price;
                    const discountPercent = hasDiscount
                      ? Math.round(
                          ((product.originalPrice! - product.price) / product.originalPrice!) * 100
                        )
                      : 0;

                    const targetProductId = product.id;

                    return (
                      <div
                        key={product.id}
                        className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between hover:shadow-md transition relative group"
                      >
                        {/* Rx Badge */}
                        {isRxRequired && (
                          <span className="absolute top-2 left-2 z-10 bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-red-200 uppercase">
                            Rx Required
                          </span>
                        )}

                        {/* Discount Badge */}
                        {hasDiscount && discountPercent > 0 && (
                          <span className="absolute top-2 right-2 z-10 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-2xs">
                            {discountPercent}% OFF
                          </span>
                        )}

                        <Link href={`/products/${productSlug}`} className="block group">
                          <div className="w-full aspect-square bg-white rounded-lg mb-3 relative overflow-hidden flex items-center justify-center p-2">
                            <Image
                              src={
                                product.imageUrl ||
                                'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500'
                              }
                              alt={product.name}
                              width={150}
                              height={150}
                              className="object-contain max-h-32 group-hover:scale-105 transition"
                            />
                          </div>

                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            {product.manufacturer || 'General'}
                          </span>
                          <h3 className="text-xs font-bold text-gray-900 line-clamp-2 mt-0.5 group-hover:text-[#ff6f61] transition">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-gray-500">{product.packSize}</span>
                            {product.dosageForm && (
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded">
                                {product.dosageForm}
                              </span>
                            )}
                          </div>
                        </Link>

                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <div className="flex items-baseline gap-1.5 mb-2">
                            <span className="text-sm font-extrabold text-gray-900">
                              Rs. {product.price}
                            </span>
                            {hasDiscount && (
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
                            className="w-full text-white text-xs font-bold py-2 rounded-lg bg-[#ff6f61] hover:bg-[#e05b4f] transition shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
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