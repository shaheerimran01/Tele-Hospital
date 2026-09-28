'use client';

import { use, useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/app/components/cart/CartContext';

// Helper for Safe Text Conversion
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
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// 🖼️ Category Banners & Images Configuration
const NAVIGATION_MEDIA: Record<
  string,
  {
    gradient: string;
    badge: string;
    tagline: string;
    images: { url: string; label: string }[];
  }
> = {
  // --- SUPPORTS & BRACES ---

  // 🦶 Ankle, Foot & Leg Support
  'ankle-foot-and-leg-support': {
    gradient: 'from-blue-950 via-slate-900 to-indigo-950',
    badge: 'Orthopedic Joint & Limb Support',
    tagline:
      'High-grade compression sleeves, ankle braces, knee binders, calf supports, and plantar fasciitis heel cushions for stability and recovery.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQykWOvtOOsjyi3MktOF4XAVKNwVZMj7hQMUQ0_ku0-WQ&s=10',
        label: 'Ankle Braces',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSg-_ah0rXDNRKq3K6-FCJhW1SJVwdK1JFBBVBtMBesQ&s=10',
        label: 'Compression Sleeves',
      },
    ],
  },

  // --- IMMUNITY BOOSTERS ---

  // 🛡️ Immunity Supplements
  'supplements': {
    gradient: 'from-amber-950 via-orange-900 to-slate-900',
    badge: 'Daily Immune Shield & Defense',
    tagline:
      'Zinc + Vitamin C formulas, Chyawanprash, Elderberry, Black Seed (Kalonji), and Giloy extracts for all-around immune defense.',
    images: [
      {
        url: 'https://assets.clevelandclinic.org/transform/LargeFeatureImage/de3bda53-59e5-4342-a45c-e64c72c1207d/foods-with-vitamins-1182014891',
        label: 'Immunity Boosters',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQl-myXWS0cFJS7slCjXLgh-rDPTCZJPq1fym73npH_XQ&s=10',
        label: 'Zinc & Elderberry',
      },
    ],
  },

  // 🧪 Antioxidant Supplements
  'antioxidant-supplements': {
    gradient: 'from-purple-950 via-rose-900 to-slate-900',
    badge: 'Cellular Health & Oxidative Defense',
    tagline:
      'Glutathione, CoQ10, Alpha Lipoic Acid, Astaxanthin, Resveratrol, and Green Tea Extracts for powerful free-radical neutralization.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRzlZjPHF_AoJApz5AfALRqFZivrpwe8eL6zMtsruAq0z2wBvRQIi6F6kVc&s=10',
        label: 'Glutathione & CoQ10',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTV_QacqhrxF0VnDK3lDUQ-BmD-VVLiCMJVRvYuvD4xYcpDjlibsewTVjNX&s=10',
        label: 'Antioxidant Shield',
      },
    ],
  },

  // 🌿 Herbal Supplements
  'herbal-supplements': {
    gradient: 'from-emerald-950 via-green-900 to-teal-950',
    badge: 'Ayurvedic & Natural Wellness',
    tagline:
      'Pure Ashwagandha, Turmeric Curcumin, Tulsi, Kalonji, Echinacea, and Giloy capsules for natural vitality and holistic wellness.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMCXVya3Ny9EhTZpYp3aiFngETe6HGFAouDN6JXB9qjEUEbuU8iVWoo1CK&s=10',
        label: 'Ashwagandha & Curcumin',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZhbc5tWcXwXzP7LW9yJYDfuT9yohNQJDWOgFgT9nelea_KYgoTSvi48w&s=10',
        label: 'Herbal Extracts',
      },
    ],
  },

  // ☕ Herbal Tea
  'herbal-tea': {
    gradient: 'from-teal-950 via-emerald-900 to-yellow-950',
    badge: 'Soothing Infusions & Organic Detox',
    tagline:
      'Organic Green Tea, Tulsi Ginger brews, Chamomile relaxation tea, Joshanda, and Detox Kahwa for warm soothing comfort.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTv2P5iSREqlsU2TlQtnlX1wjcY8_OzLxno6MHihknYqA&s=10',
        label: 'Green & Tulsi Tea',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSP_TMLKdrHWxR-J3Wyvpjy-aa5fZdOfgEdAcNZKXGLwjMGTE0jMY4tq_d_&s=10',
        label: 'Detox Kahwa & Joshanda',
      },
    ],
  },

  // --- VITAMINS & NUTRITION CATEGORIES ---

  'fish-oil': {
    gradient: 'from-blue-950 via-sky-900 to-slate-900',
    badge: 'Heart, Brain & Joint Health',
    tagline:
      'High-potency Omega-3 fatty acids, EPA, DHA, and purified fish oil softgels for cardiovascular health and cognitive support.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPgSVSCx_1stsoiFhmAgEeo8ayTar1rzdfJZ06t64DBw&s=10',
        label: 'Omega-3 Softgels',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ5CZ8GjzC8qqZZvxGfB3l68mixMAfjFsmCPP_INA-O5bk2F1K6arellAI&s=10',
        label: 'Triple Strength Fish Oil',
      },
    ],
  },

  'cod-liver-oil': {
    gradient: 'from-amber-950 via-yellow-900 to-slate-900',
    badge: 'Rich Source of Vitamin A & D',
    tagline:
      'Classic cod liver oil liquid & softgels enriched with essential Omega-3s, supporting immunity, vision, and bone strength.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2qIq_VxVLZwOBoRZlehrrKUcEVBcX8dqRLmWSk6JornTvEPX8T_drtoaE&s=10',
        label: 'Cod Liver Softgels',
      },
      {
        url: 'https://naturalpoland.com/wp-content/uploads/olej-z-watroby-dorsza.jpg',
        label: 'Immune & Vision Health',
      },
    ],
  },

  'flax-seed-oil': {
    gradient: 'from-emerald-950 via-teal-900 to-slate-900',
    badge: 'Plant-Based Omega 3-6-9',
    tagline:
      'Cold-pressed flaxseed oil capsules and organic linseed oil for vegetarian heart, digestive, and skin health.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyk0WwDQK5HXDfinV7HCTrrpPN29tCWYuNt3ha-LBzpCqe8RgeufbFMzWz&s=10',
        label: 'Flaxseed Oil Softgels',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbm8_TntLJXaVf1B2eVUFkdKMUbP4wo85LjhwpxgFiOqYh3Vf_S_czvIx3&s=10',
        label: 'Plant Omega 3-6-9',
      },
    ],
  },

  'hair-and-skin-supplements': {
    gradient: 'from-rose-950 via-pink-900 to-purple-950',
    badge: 'Radiant Skin, Hair & Nail Glow',
    tagline:
      'Biotin 10000mcg, Collagen peptides, Glutathione brightening complex, and Vitamin E capsules for youthful glowing skin and hair growth.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTBC-C-BQgE8Yvyfe18m8GFT8IrTJuK1lgeXRpQgSLELK5XSgzd9Lsv7rIS&s=10',
        label: 'Biotin & Collagen',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTp1feERzf54Pg2FyOHf21NYDYgEd7ygE5yBeHbcTz0wWZLL-Jn_Ez7jnyL&s=10',
        label: 'Glutathione & Vitamin E',
      },
    ],
  },

  'calcium': {
    gradient: 'from-cyan-950 via-slate-900 to-blue-950',
    badge: 'Strong Bones & Joint Health',
    tagline:
      'CAC-1000, Calcium Carbonate, Citrate, Osteocare, and Calcium + Vitamin D3 formulas for bone density and joint mobility.',
    images: [
      {
        url: 'https://healthyeatingclinic.com.au/wp-content/uploads/2022/11/Clinic-Website-Main-Image-1.jpg',
        label: 'CAC-1000 Effervescent',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSKN_Tt4JF3NvJ2LL1yrXll9zH_jcPkJ0gIFV6nFPoe_uA9Xl1Tw8FIphM&s=10',
        label: 'Calcium + D3 Tablets',
      },
    ],
  },

  'vitamin-b': {
    gradient: 'from-amber-950 via-orange-900 to-slate-900',
    badge: 'Nerve Health, Energy & Metabolism',
    tagline:
      'Vitamin B-Complex, Neurobion, Surbex Z, B12, B6, and Folic Acid supplements for nerve revitalization and everyday stamina.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2NUuepY8HXYmnsBfKvum-9VZ3H_GBsbzGIoHrt6d74HI6iXTgNOdcj5o2&s=10',
        label: 'Neurobion & B-Complex',
      },
      {
        url: 'https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/blog/uploads/8-types-of-b-vitamins-and-their-health-benefits-large.jpg',
        label: 'Energy & Nerve Support',
      },
    ],
  },

  'vitamin-c': {
    gradient: 'from-orange-950 via-amber-800 to-yellow-950',
    badge: 'Immunity Boost & Antioxidant Shield',
    tagline:
      'Limcee, Cecon, C-Vites, and Ascorbic acid 500mg chewables to boost daily white blood cell immunity and collagen synthesis.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnXnfY4Or8nLyaX0MFZGvSiOxSBI-2KmQPzlrBiy7RrFnNwyAw7pm2DJk&s=10',
        label: 'Vitamin C 500mg',
      },
      {
        url: 'https://missouripoisoncenter.org/wp-content/uploads/2020/06/bigstock-Yellow-Tablets-Vitamin-C-Medic-344734378.jpg',
        label: 'Immunity Shield',
      },
    ],
  },

  'vitamin-d': {
    gradient: 'from-yellow-950 via-amber-900 to-slate-900',
    badge: 'Bone Strength & Sun Vitamin Support',
    tagline:
      'Sunny D, Indrop-D 200,000 IU, Cholecalciferol, and Vitamin D3 softgels for daily bone calcification and cellular immunity.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpaGqrYB5u6he2Dyf81O0S_HTfMD0awHspRzSBbh-ZQGilE2PUFx2cnKM&s=10',
        label: 'Indrop-D Shots',
      },
      {
        url: 'https://www.usnews.com/object/image/0000017b-97de-df24-ab7f-ffdf2de40000/vitamins8.jpg?update-time=1630341367176&size=responsive640',
        label: 'Sunny D Softgels',
      },
    ],
  },

  // --- SEXUAL WELLNESS CATEGORIES ---

  'lubricants-and-massage-gels': {
    gradient: 'from-pink-950 via-rose-900 to-slate-900',
    badge: 'Intimate Care & Smooth Comfort',
    tagline:
      'Water-based lubricants, moisturizing intimacy gels, and soothing massage oils for enhanced comfort.',
    images: [
      {
        url: 'https://pyxis.nymag.com/v1/imgs/ca9/c54/f2e7faf684a138f5dd430d62bd7cefa698-bic-lube.rsquare.w700.jpg',
        label: 'Intimate Gels',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQmxlDp_mWiSYvO2g4bmVEc4NS1_qRjb0-jdHCyl_sN5S4KmijjzO9Hq_N&s=10',
        label: 'Massage Oils',
      },
    ],
  },

  'sexual-wellness-devices': {
    gradient: 'from-purple-950 via-indigo-900 to-slate-900',
    badge: 'Personal Wellness & Care Devices',
    tagline:
      'Ergonomically designed intimate massagers, body relaxation wands, and pelvic floor exercise devices.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSmoE-PV3SV4wJVBcGElDRH8ZBNIKjv__q88gaybNoQO5BzI8LPAtWkhqs&s=10',
        label: 'Intimate Massagers',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVJVmHpdxfopbIzqC7sdOB7jO8af3588r7ttp1jsBrEvVQYfwTnv08AO0&s=10',
        label: 'Wellness Care',
      },
    ],
  },

  'performance-enhancers': {
    gradient: 'from-slate-950 via-zinc-900 to-amber-950',
    badge: 'Stamina, Vigor & Male Vitality',
    tagline:
      'Purified Shilajit, stamina boosters, delay sprays, and protective barriers formulated for stamina.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjBp7WkZWfCzEU7ur6payQr2aYQYvNt44R0aiZ0AkAJPQu8ARv3Sic5k3x&s=10',
        label: 'Vitality Boosters',
      },
      {
        url: 'https://s.abcnews.com/images/Health/gty_steroids_mi_130805_16x9_992.jpg',
        label: 'Shilajit & Tonics',
      },
    ],
  },

  'oral-contraceptives': {
    gradient: 'from-teal-950 via-cyan-900 to-slate-900',
    badge: 'Safe Family Planning & Care',
    tagline:
      'Certified daily birth control pills, emergency contraceptive options, and reproductive health care treatments.',
    images: [
      {
        url: 'https://www.fertilityfamily.co.uk/wp-content/uploads/2024/10/contraceptive-pill-scaled.jpg',
        label: 'Family Planning',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9qcVLGLGdywxMZK93X1XBcf3bMUC8LIGkfQwCBIwOPwyqDAM5-4J9Ryc&s=10',
        label: 'Reproductive Care',
      },
    ],
  },

  // --- FITNESS & HEALTH CATEGORIES ---

  'plant-protein': {
    gradient: 'from-emerald-950 via-amber-900 to-slate-900',
    badge: 'Clean Organic Plant Nutrition',
    tagline:
      'High-potency pea protein, vegan protein powder, soy protein isolate, and organic plant blends.',
    images: [
      {
        url: 'https://dam.northwell.edu/m/566a7b0e549ed7f9/Drupal-TheWell_protein-with-less-meat_AS_542997454.jpg',
        label: 'Plant Protein',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTbKLbGPyYgAn150DXSK-Og1WMflIrRNcOxJXNq5fV0V5F6RCONCdp8uv0I&s=10',
        label: 'Vegan Blends',
      },
    ],
  },

  'mass-gainers': {
    gradient: 'from-blue-950 via-indigo-900 to-slate-900',
    badge: 'Muscle Mass & Healthy Weight Gain',
    tagline:
      'High-calorie mass gainers, whey proteins, heavy weight gainers, and muscle building shake formulas.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQirpDDUqXfs2IuEDNfPwAdL4hSER2k9kIyH-VxCDyx-Q&s=10',
        label: 'Mass Gainers',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6xLsfbk1vC6g9w_eVefA1QJFYBkEBM1zL_En9UW8qYT95RJD-bXUOYb_D&s=10',
        label: 'Whey & Mass Shakes',
      },
    ],
  },

  'pre-post-workout': {
    gradient: 'from-red-950 via-rose-900 to-slate-900',
    badge: 'Energy, BCAAs & Muscle Recovery',
    tagline:
      'High-energy pre-workout powders, BCAAs, creatine monohydrate, and amino acid muscle recovery boosters.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuUo08cDRpVbbanVUKO6ne1myCsVz6831bFaube5ml3jHkbzTUII68cTa0&s=10',
        label: 'Pre-Workout Boosters',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDj-wXdQBvt675gcej_JpYK1nfLDTjIuP_wWumbAR_PL0cNMLvpa3Bavs&s=10',
        label: 'BCAA & Creatine',
      },
    ],
  },

  'smart-watch-and-rings': {
    gradient: 'from-slate-950 via-gray-900 to-zinc-900',
    badge: 'Health & Fitness Wearables',
    tagline:
      'Track heart rate, sleep quality, blood oxygen, and daily workout performance with advanced smartwatches and rings.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTV_Ws8ZWk8AJ-mqtfAAxxTeJ_SvUM8Z9-WA8iFoqZ91mMy2GvjvJIGaQY&s=10',
        label: 'Smartwatches',
      },
      {
        url: 'https://cdn.shopify.com/s/files/1/0850/1769/0420/files/What_s_the_Point_of_Smart_Rings_The_Real_Value_Beyond_the_Hype.jpg?v=1752115596',
        label: 'Fitness Rings',
      },
    ],
  },

  'fat-burners': {
    gradient: 'from-amber-950 via-red-900 to-orange-950',
    badge: 'Thermogenic & Metabolism Boosters',
    tagline:
      'L-Carnitine, thermogenic fat burners, and weight management supplements formulated to boost metabolic energy.',
    images: [
      {
        url: 'https://burjeel.com/wp-content/uploads/2023/04/Screenshot_19.jpg',
        label: 'Thermogenics',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTr6xosZ6v4ewnTBCOK-NzsyK_jPa1GfY_AxR2dD4ft1qCiLj7zOfmKelM&s=10',
        label: 'L-Carnitine Formulas',
      },
    ],
  },

  // --- HAIR CARE CATEGORIES ---

  'hair-cream-and-masks': {
    gradient: 'from-rose-950 via-pink-900 to-amber-950',
    badge: 'Deep Conditioning & Hair Butter',
    tagline:
      'Intense repair masks, leave-in conditioners, spa masks, and nourishing styling creams for soft hair.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-Vprxb-eV7vr7zKU1x5WpKZNDGP5nXlOymWjhJhRICY4C0qyM9FqamwB8&s=10',
        label: 'Hair Masks',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOZRkf9FMYhXEyiOgBxb4Z6ShDmCx90e0YNea_GcAjYcGNNDc_DUNffdI&s=10',
        label: 'Nourishing Creams',
      },
    ],
  },

  'hair-serums': {
    gradient: 'from-violet-950 via-purple-900 to-slate-900',
    badge: 'Frizz Control & Heat Protection',
    tagline:
      'Nourish and illuminate your tresses with lightweight serums, keratin glosses, and argan oil elixirs.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQNkBWBwmLktfpLIeAp2aGmkBRBd0okIZV3disZudCIaStN9X5dcLSnWDkz&s=10',
        label: 'Hair Serums',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQn6PvoyJQDHhmAFWPBc3Mq6okTvW3VcrOGJG8WVpT-loSFyhzVrHvDoP8&s=10',
        label: 'Gloss Drops',
      },
    ],
  },

  'hair-oils': {
    gradient: 'from-emerald-900 via-teal-800 to-slate-900',
    badge: 'Pure Scalp & Hair Nourishment',
    tagline:
      'Herbal hair oils, onion seed blends, argan therapy, and scalp revitalizing oils.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZHuFKfdBJRqj_3ftxi1eIHQlJZpKX2W9gK0XynN3ShDfYC3dwKH1eTNA&s=10',
        label: 'Scalp Oils',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRw-_lEOGLTN6N36d-EpjwGJRQKEhyRCGctnfBvZCvaqg&s',
        label: 'Herbal Extracts',
      },
    ],
  },

  'shampoos-and-conditioners': {
    gradient: 'from-cyan-900 via-teal-800 to-slate-900',
    badge: 'Daily Scalp Cleansing & Moisture',
    tagline:
      'Anti-dandruff cleansers, sulfate-free shampoos, deep conditioners, and color-protect formulas.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpUcoZiPpJFkLzy9yUM53uGjrUAk3ADWkodlKL1GlhX-agthSewYGNKm95&s=10',
        label: 'Shampoos',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZmuJf3f1LEHtRn1sYjUuzI2K--_QtVqXzHNsUky1cXNzDjs7SyZ8hwkU&s=10',
        label: 'Conditioners',
      },
    ],
  },

  // --- HOMEOPATHY CATEGORIES ---

  'homeopathy-sexual-health': {
    gradient: 'from-purple-950 via-slate-900 to-indigo-950',
    badge: 'Homeopathic Vitality & Vigor',
    tagline:
      'Natural homeopathic remedies including Damiana, Yohimbinum, Agnus Castus, Acid Phos, and Selenium for stamina and sexual wellness.',
    images: [
      {
        url: 'https://www.askdrshah.com/blog/wp-content/uploads/homeopathy.jpg',
        label: 'Damiana & Vigor',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSiBHtCcl0kmD8LNo37-Z0OUyqEE7W3OS5morCDC9OghZLyb_YVm_HA9lgm&s=10',
        label: 'Acid Phos & Selenium',
      },
    ],
  },

  'homeopathy-hair-care-products': {
    gradient: 'from-rose-950 via-pink-900 to-slate-900',
    badge: 'Natural Scalp & Hair Growth',
    tagline:
      'Jaborandi hair oils, Cantharis hair drops, anti-hairfall tonics, and natural homeopathic hair growth formulations.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80',
        label: 'Jaborandi Hair Drops',
      },
      {
        url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80',
        label: 'Homeopathic Hair Oils',
      },
    ],
  },

  'piles-and-fissures': {
    gradient: 'from-amber-950 via-red-900 to-slate-900',
    badge: 'Gentle Anorectal Relief',
    tagline:
      'Aesculus, Hamamelis, Ratanhia drops, and soothing hemorrhoid ointments for natural relief from piles and painful fissures.',
    images: [
      {
        url: 'https://pilesfistulacure.com/wp-content/uploads/2024/05/2148643262-1080x675.jpg',
        label: 'Aesculus & Hamamelis',
      },
      {
        url: 'https://img.lb.wbmdstatic.com/vim/live/webmd/consumer_assets/site_images/articles/health_tools/advances_in_eczema_treatment_slideshow/1800ss_getty_rf_tube_of_medicated_cream.jpg?resize=750px:*&output-quality=75',
        label: 'Piles Relief Drops',
      },
    ],
  },

  'obesity': {
    gradient: 'from-teal-950 via-emerald-900 to-slate-900',
    badge: 'Natural Weight & Metabolism Support',
    tagline:
      'Phytolacca Berry drops, Fucus Vesiculosus, and natural homeopathic anti-obesity drops engineered for safe weight management.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTR4vPf3k0S5tUTkK4l-8xWlm07Edr3f3FeQTOFlWYE2aTTO1Lw-Avnu3tB&s=10',
        label: 'Phytolacca Berry Drops',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhXdWo7AtqEXNFmHmu0N72Mug6ZzzG40Wc2m97D91YD8m7yrqOMurIZSEl&s=10',
        label: 'Slimming Formulas',
      },
    ],
  },

  'warts': {
    gradient: 'from-slate-950 via-zinc-900 to-stone-900',
    badge: 'Painless Skin Growth & Corn Removal',
    tagline:
      'Thuja Occidentalis 200C, Antim Crud, Causticum, Dulcamara, and specialized corn removers for painless skin tag elimination.',
    images: [
      {
        url: 'https://media.post.rvohealth.io/wp-content/uploads/2020/09/732x549_Home_Remedies_for_Genital_Warts_What_Works.jpg',
        label: 'Thuja Drops',
      },
      {
        url: 'https://media.post.rvohealth.io/wp-content/uploads/sites/3/2020/04/GettyImages-864484044_thumb-732x549.jpg',
        label: 'Wart & Corn Removers',
      },
    ],
  },

  'fungal-infection': {
    gradient: 'from-amber-950 via-orange-900 to-slate-900',
    badge: 'Anti-Fungal & Dermatological Care',
    tagline:
      'Tellurium, Sepia, Petroleum, Sulphur, Graphites, and Chrysarobinum for ringworm, tinea, candidiasis, and athlete’s foot.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxNMi8kBwfeZsxkV26W_8oqgsaRKvsPOSUaQsFkNumDTRRn8m8fn116p-D&s=10',
        label: 'Sulphur & Graphites',
      },
      {
        url: 'https://images.theconversation.com/files/238436/original/file-20180928-48647-12ud27s.jpg?ixlib=rb-4.1.1&q=75&auto=format&w=768&h=512&fit=crop&dpr=1',
        label: 'Ringworm & Tinea Care',
      },
    ],
  },

  'diabetes-medicines': {
    gradient: 'from-blue-950 via-cyan-900 to-slate-900',
    badge: 'Natural Blood Sugar Balance',
    tagline:
      'Syzygium Jambolanum, Gymnema Sylvestre, Cephalandra Indica, and Abroma Augusta for complementary glucose management.',
    images: [
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQO9dlbzgfem_OKtKh58UOwf7Wc-qYMyajkXF-qmpXZlLHZdPOI7mapzZ8&s=10',
        label: 'Syzygium Jambolanum',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTXidMBQyZPiED7MufLkhmmFJiWPEQJyxQJfmt4pv_U5HF78lYdqAN0IBlc&s=10',
        label: 'Sugar Control Drops',
      },
    ],
  },

  'stomach-medicines': {
    gradient: 'from-emerald-950 via-green-900 to-teal-950',
    badge: 'Digestive & Gastric Balance',
    tagline:
      'Nux Vomica, Carbo Veg, Lycopodium, and gastric drops for quick relief from acidity, indigestion, gas, and stomach cramps.',
    images: [
      {
        url: 'https://thumbs.dreamstime.com/b/gastritis-medication-drug-stomach-ache-gastroesophageal-reflux-disease-gerd-medicine-treatment-285820544.jpg',
        label: 'Nux Vomica 30C',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSK0fOoSGZa7fkgVsI1AnAOYkkILQKGchDTCw_9V8T2Wu25iT5CJTjE1pUZ&s=10',
        label: 'Carbo Veg & Lycopodium',
      },
    ],
  },

  // --- PET CARE CATEGORIES ---

  'pet-supplements': {
    gradient: 'from-amber-950 via-yellow-900 to-slate-900',
    badge: 'Veterinary Joint & Multivitamin Care',
    tagline:
      'Calcium syrups, Glucosamine joint support, Omega-3 coat conditioning oils, and probiotic multivitamins for dogs and cats.',
    images: [
      {
        url: 'https://drruthroberts.com/cdn/shop/files/dog_supplements.png?v=1730389402&width=1500',
        label: 'Pet Multivitamins',
      },
      {
        url: 'https://img.petfoodindustry.com/mindful/watt/workspaces/default/uploads/2026/09/pet-supplement-formats-and-calm-dog-dall-e.G4IgDqdxrq.png?auto=format%2Ccompress&q=70&w=400',
        label: 'Joint & Coat Care',
      },
    ],
  },

  'pet-food': {
    gradient: 'from-orange-950 via-red-900 to-amber-950',
    badge: 'Wholesome Pet Nutrition & Treats',
    tagline:
      'Royal Canin, Whiskas, Me-O, Pedigree, Reflex puppy/kitten dry food, wet pouches, and crunchy training biscuits.',
    images: [
      {
        url: 'https://www.petfoodinstitute.org/wp-content/uploads/2020/12/pet-food-types.jpg',
        label: 'Royal Canin & Pedigree',
      },
      {
        url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOy7hT8hKLzKy0qe7fsS7x44p83oyfxMwVFVvnA3BL3Dll5dIr7BuZ1g&s=10',
        label: 'Whiskas & Me-O Treats',
      },
    ],
  },
};

// 🎞️ Category-Specific Horizontal Scrolling Banners
const CATEGORY_SCROLLING_BANNERS: Record<
  string,
  { id: number; title: string; subtitle: string; url: string }[]
> = {
  'ankle-foot-and-leg-support': [
    {
      id: 1,
      title: 'Orthopedic Ankle & Calf Binders',
      subtitle: 'Targeted compression for heel pain & joint stabilization',
      url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 2,
      title: 'Plantar & Knee Compression Sleeves',
      subtitle: 'Ergonomic joint relief and comfortable active movement',
      url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'supplements': [
    {
      id: 1,
      title: 'Zinc + Vitamin C & Elderberry',
      subtitle: 'Daily immune defense capsules and effervescent boosters',
      url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'antioxidant-supplements': [
    {
      id: 1,
      title: 'Glutathione 500mg & CoQ10',
      subtitle: 'Premium cellular detox & free-radical neutralization',
      url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'herbal-supplements': [
    {
      id: 1,
      title: 'Organic Ashwagandha & Curcumin',
      subtitle: '100% Ayurvedic extracts for natural vitality & stress ease',
      url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'herbal-tea': [
    {
      id: 1,
      title: 'Tulsi Ginger Green Tea & Kahwa',
      subtitle: 'Aromatic herbal infusions for digestive & immune comfort',
      url: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'fish-oil': [
    {
      id: 1,
      title: 'Triple Strength Omega-3 EPA/DHA',
      subtitle: 'Molecularly distilled softgels for heart & joint support',
      url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'hair-and-skin-supplements': [
    {
      id: 1,
      title: 'Biotin 10000mcg & Marine Collagen',
      subtitle: 'Thicker hair growth, strong nails & glowing skin bounce',
      url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'homeopathy-sexual-health': [
    {
      id: 1,
      title: 'Damiana Q & Agnus Castus',
      subtitle: 'Homeopathic tonic for natural stamina & reproductive health',
      url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'homeopathy-hair-care-products': [
    {
      id: 1,
      title: 'Jaborandi & Cantharis Hair Oils',
      subtitle: 'Nourish roots, prevent hairfall & control dandruff naturally',
      url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'piles-and-fissures': [
    {
      id: 1,
      title: 'Aesculus & Hamamelis Ointment',
      subtitle: 'Relieve pain, itching, and swelling from piles & fissures',
      url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'obesity': [
    {
      id: 1,
      title: 'Phytolacca Berry & Fucus Vesiculosus',
      subtitle: 'Support healthy metabolic weight loss without side effects',
      url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'warts': [
    {
      id: 1,
      title: 'Thuja Occidentalis 200C & Corn Paint',
      subtitle: 'Painless homeopathic solution for warts, corns & skin tags',
      url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'fungal-infection': [
    {
      id: 1,
      title: 'Tellurium & Sulphur Anti-Fungal Drop',
      subtitle: 'Relief from ringworm, itching, candidiasis & skin mycosis',
      url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'diabetes-medicines': [
    {
      id: 1,
      title: 'Syzygium Jambolanum Q Drops',
      subtitle: 'Natural support for regulating blood sugar levels',
      url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'stomach-medicines': [
    {
      id: 1,
      title: 'Nux Vomica & Carbo Veg Drops',
      subtitle: 'Instant relief from acidity, heartburn & indigestion',
      url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'pet-supplements': [
    {
      id: 1,
      title: 'Veterinary Calcium & Glucosamine',
      subtitle: 'Essential bone, joint & shiny coat supplements for pets',
      url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    },
  ],

  'pet-food': [
    {
      id: 1,
      title: 'Royal Canin, Whiskas & Pedigree',
      subtitle: 'High-protein dry food & tasty wet pouches for dogs & cats',
      url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=800&q=80',
    },
  ],
};

const DEFAULT_SCROLLING_BANNERS = [
  {
    id: 1,
    title: 'Top Healthcare Essentials',
    subtitle: '100% Authentic Guaranteed Products Sourced Direct',
    url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    title: 'Certified Wellness Products',
    subtitle: 'Safe Packaging & Express Home Delivery',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
  },
];

export default function HeaderNavigationPage({ params }: PageProps) {
  const { slug } = use(params);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 🛒 Cart Context Hook Integration
  const { addProductToCart, loading: cartLoading } = useCart();

  // Scroll ref for horizontal image banner carousel
  const bannerScrollRef = useRef<HTMLDivElement>(null);

  const scrollBanners = (direction: 'left' | 'right') => {
    if (bannerScrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      bannerScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // 🎛️ Active Sidebar Filters State
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDosageForm, setSelectedDosageForm] = useState<string>('all');
  const [selectedPrescription, setSelectedPrescription] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('relevance');

  // Title formatting
  const formattedTitle = useMemo(() => {
    if (
      slug === 'ankle-foot-and-leg-support' ||
      slug === 'ankle-foot-and-leg-supports'
    )
      return 'Ankle, Foot & Leg Support';

    if (slug === 'supplements') return 'Immunity Supplements';
    if (slug === 'antioxidant-supplements') return 'Antioxidant Supplements';
    if (slug === 'herbal-supplements') return 'Herbal Supplements';
    if (slug === 'herbal-tea' || slug === 'herbal-teas') return 'Herbal Tea';

    if (slug === 'fish-oil' || slug === 'fish-oils') return 'Fish Oil';
    if (slug === 'cod-liver-oil') return 'Cod Liver Oil';
    if (slug === 'flax-seed-oil' || slug === 'flaxseed-oil') return 'Flax Seed Oil';
    if (slug === 'hair-and-skin-supplements') return 'Hair & Skin Supplements';
    if (slug === 'calcium') return 'Calcium';
    if (slug === 'vitamin-b') return 'Vitamin B';
    if (slug === 'vitamin-c') return 'Vitamin C';
    if (slug === 'vitamin-d') return 'Vitamin D';

    if (slug === 'lubricants-and-massage-gels') return 'Lubricants & Massage Gels';
    if (slug === 'sexual-wellness-devices') return 'Sexual Wellness Devices';
    if (slug === 'performance-enhancers') return 'Performance Enhancers';
    if (slug === 'oral-contraceptives') return 'Oral Contraceptives';
    if (slug === 'plant-protein') return 'Plant Protein';
    if (slug === 'mass-gainers' || slug === 'mass-gainer') return 'Mass Gainers';
    if (slug === 'pre-post-workout') return 'Pre/Post Workout';
    if (
      slug === 'smart-watch-and-rings' ||
      slug === 'smart-watches-and-rings' ||
      slug === 'smart-watch-and-ring'
    )
      return 'Smart Watches & Rings';
    if (slug === 'fat-burners' || slug === 'fat-burner') return 'Fat Burners';
    if (slug === 'hair-cream-and-masks') return 'Hair Cream & Masks';
    if (slug === 'shampoos-and-conditioners') return 'Shampoos & Conditioners';

    // Homeopathy
    if (
      slug === 'homeopathy-sexual-health' ||
      slug === 'sexual-health-homeopathy'
    )
      return 'Homeopathy Sexual Health';

    if (
      slug === 'homeopathy-hair-care-products' ||
      slug === 'homeopathy-hair-care'
    )
      return 'Homeopathy Hair Care';

    if (
      slug === 'piles-and-fissures' ||
      slug === 'homeopathy-piles-and-fissures'
    )
      return 'Piles & Fissures';

    if (slug === 'obesity' || slug === 'homeopathy-obesity') return 'Obesity & Weight Management';
    if (slug === 'warts' || slug === 'homeopathy-warts') return 'Warts & Corns';
    if (slug === 'fungal-infection' || slug === 'homeopathy-fungal-infection') return 'Fungal Infection';
    if (slug === 'diabetes-medicines' || slug === 'homeopathy-diabetes-medicines') return 'Homeopathy Diabetes';
    if (slug === 'stomach-medicines' || slug === 'homeopathy-stomach-medicines') return 'Homeopathy Stomach Medicines';

    // Pet Care
    if (slug === 'pet-supplements' || slug === 'pet-supplement') return 'Pet Supplements';
    if (slug === 'pet-food' || slug === 'pet-foods') return 'Pet Food';

    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }, [slug]);

  // Dynamic Banner Media Selector
  const activeMedia = useMemo(() => {
    if (NAVIGATION_MEDIA[slug]) return NAVIGATION_MEDIA[slug];

    if (slug.includes('ankle') || slug.includes('foot') || slug.includes('leg')) return NAVIGATION_MEDIA['ankle-foot-and-leg-support'];
    if (slug.includes('antioxidant')) return NAVIGATION_MEDIA['antioxidant-supplements'];
    if (slug.includes('tea')) return NAVIGATION_MEDIA['herbal-tea'];
    if (slug.includes('herbal')) return NAVIGATION_MEDIA['herbal-supplements'];
    if (slug.includes('immunity') || slug.includes('supplement')) return NAVIGATION_MEDIA['supplements'];

    if (slug.includes('fish')) return NAVIGATION_MEDIA['fish-oil'];
    if (slug.includes('cod')) return NAVIGATION_MEDIA['cod-liver-oil'];
    if (slug.includes('flax')) return NAVIGATION_MEDIA['flax-seed-oil'];
    if (slug.includes('skin') || slug.includes('biotin')) return NAVIGATION_MEDIA['hair-and-skin-supplements'];
    if (slug.includes('calcium')) return NAVIGATION_MEDIA['calcium'];
    if (slug.includes('vitamin-b') || slug.includes('b12')) return NAVIGATION_MEDIA['vitamin-b'];
    if (slug.includes('vitamin-c')) return NAVIGATION_MEDIA['vitamin-c'];
    if (slug.includes('vitamin-d')) return NAVIGATION_MEDIA['vitamin-d'];

    if (slug.includes('lubricant') || slug.includes('massage')) return NAVIGATION_MEDIA['lubricants-and-massage-gels'];
    if (slug.includes('device') || slug.includes('vibrator')) return NAVIGATION_MEDIA['sexual-wellness-devices'];
    if (slug.includes('performance') || slug.includes('enhancer')) return NAVIGATION_MEDIA['performance-enhancers'];
    if (slug.includes('contraceptive') || slug.includes('pill')) return NAVIGATION_MEDIA['oral-contraceptives'];

    if (slug.includes('protein')) return NAVIGATION_MEDIA['plant-protein'];
    if (slug.includes('gainer') || slug.includes('mass')) return NAVIGATION_MEDIA['mass-gainers'];
    if (slug.includes('workout') || slug.includes('bcaa')) return NAVIGATION_MEDIA['pre-post-workout'];
    if (slug.includes('watch') || slug.includes('ring')) return NAVIGATION_MEDIA['smart-watch-and-rings'];
    if (slug.includes('burner') || slug.includes('slimming')) return NAVIGATION_MEDIA['fat-burners'];

    if (slug.includes('cream') || slug.includes('mask')) return NAVIGATION_MEDIA['hair-cream-and-masks'];
    if (slug.includes('serum')) return NAVIGATION_MEDIA['hair-serums'];

    if (slug.includes('sexual') && slug.includes('homeopathy')) return NAVIGATION_MEDIA['homeopathy-sexual-health'];
    if (slug.includes('hair') && slug.includes('homeopathy')) return NAVIGATION_MEDIA['homeopathy-hair-care-products'];
    if (slug.includes('piles') || slug.includes('fissures')) return NAVIGATION_MEDIA['piles-and-fissures'];
    if (slug.includes('obesity')) return NAVIGATION_MEDIA['obesity'];
    if (slug.includes('wart') || slug.includes('corn')) return NAVIGATION_MEDIA['warts'];
    if (slug.includes('fungal')) return NAVIGATION_MEDIA['fungal-infection'];
    if (slug.includes('diabetes') && slug.includes('homeopathy')) return NAVIGATION_MEDIA['diabetes-medicines'];
    if (slug.includes('stomach') && slug.includes('homeopathy')) return NAVIGATION_MEDIA['stomach-medicines'];

    if (slug.includes('pet') && slug.includes('supplement')) return NAVIGATION_MEDIA['pet-supplements'];
    if (slug.includes('pet') && slug.includes('food')) return NAVIGATION_MEDIA['pet-food'];

    return null;
  }, [slug]);

  // Dynamic Scrolling Banners Selector
  const scrollingBanners = useMemo(() => {
    if (CATEGORY_SCROLLING_BANNERS[slug]) {
      return CATEGORY_SCROLLING_BANNERS[slug];
    }
    return DEFAULT_SCROLLING_BANNERS;
  }, [slug]);

  // Fetch products from NestJS backend
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
        console.error('Error fetching navigation products:', error);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Filter Products According to Exact SQL Criteria
  const categoryProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (p.isActive === false) return false;

      const subCat = getSafeText(p.subCategory);
      const cat = getSafeText(p.category);
      const cond = getSafeText(p.healthConditions);
      const tags = getSafeText(p.tags);
      const name = getSafeText(p.name);
      const sysMed = getSafeText(p.systemOfMedicine || p.systemofMedicine);

      // --- 1. ANKLE, FOOT AND LEG SUPPORT (Exact SQL Query Rule) ---
      if (
        slug === 'ankle-foot-and-leg-support' ||
        slug === 'ankle-foot-and-leg-supports' ||
        slug === 'ankle-foot-leg-support'
      ) {
        const catMatch = /supports & braces|supports and braces|orthopedic/i.test(cat);
        const subCatMatch = /ankle|foot|leg|knee|lower limb|braces/i.test(subCat);
        const nameMatch = /ankle|foot|leg|knee|calf|heel support|plantar|compression sleeve|ankle brace/i.test(name);

        return catMatch && (subCatMatch || nameMatch);
      }

      // --- IMMUNITY BOOSTERS SQL QUERIES ---

      // 2. 🛡️ IMMUNITY SUPPLEMENTS (Exact SQL Query Rule)
      if (
        slug === 'supplements' ||
        slug === 'immunity-supplements' ||
        slug === 'immunity-booster-supplements'
      ) {
        const contextMatch =
          /vitamins & supplements|vitamins and supplements|supplements|nutrition|herbal/i.test(cat) ||
          /immunity|immunity booster|immunity boosters|supplements/i.test(subCat) ||
          /immunity|immunity-booster|immune-support/i.test(tags) ||
          /low immunity|immunity|infection|general weakness/i.test(cond);

        const specificMatch =
          /immunity|immune|booster|zinc|echinacea|chyawanprash|kalonji|black seed|sambucus|elderberry|curcumin|giloy|vitamin c \+ zinc/i.test(name) ||
          /immunity|immunity booster|immunity boosters/i.test(subCat) ||
          /immunity|immunity-booster|immune-support|defense/i.test(tags);

        return contextMatch && specificMatch;
      }

      // 3. 🧪 ANTIOXIDANT SUPPLEMENTS (Exact SQL Query Rule)
      if (
        slug === 'antioxidant-supplements' ||
        slug === 'antioxidants' ||
        slug === 'antioxidant'
      ) {
        const contextMatch =
          /vitamins & supplements|vitamins and supplements|nutrition/i.test(cat) ||
          /antioxidants|antioxidant|immunity|immunity boosters|supplements/i.test(subCat) ||
          /antioxidant|antioxidants|immunity|immune-support/i.test(tags) ||
          /immunity|antioxidant support|oxidative stress|general wellness/i.test(cond);

        const specificMatch =
          /antioxidant|glutathione|coq10|coenzyme q10|alpha lipoic acid|astaxanthin|resveratrol|green tea extract|selenium|zinc/i.test(name) ||
          /antioxidant|antioxidants|antioxidant supplements/i.test(subCat) ||
          /antioxidants|glutathione|coq10|vitamin-c|vitamin-e/i.test(tags);

        return contextMatch && specificMatch;
      }

      // 4. 🌿 HERBAL SUPPLEMENTS (Exact SQL Query Rule)
      if (slug === 'herbal-supplements' || slug === 'herbal-supplement') {
        const catOrMedMatch =
          /vitamins & supplements|vitamins and supplements|herbal/i.test(cat) ||
          /herbal|ayurvedic|unani/i.test(sysMed);

        const subCatOrNameMatch =
          /immunity|immunity booster|herbal supplements/i.test(subCat) ||
          /giloy|tulsi|kalonji|chyawanprash|echinacea|turmeric|curcumin|ashwagandha/i.test(name);

        return catOrMedMatch && subCatOrNameMatch;
      }

      // 5. ☕ HERBAL TEA (Exact SQL Query Rule)
      if (slug === 'herbal-tea' || slug === 'herbal-teas') {
        const catOrMedMatch =
          /vitamins & supplements|vitamins and supplements|herbal/i.test(cat) ||
          /herbal|ayurvedic|unani/i.test(sysMed);

        const subCatOrNameMatch =
          /herbal tea|green tea|tea|immunity booster/i.test(subCat) ||
          /herbal tea|green tea|tulsi tea|ginger tea|chamomile|detox tea|kahwa|joshanda/i.test(name);

        return catOrMedMatch && subCatOrNameMatch;
      }

      // --- VITAMINS & NUTRITION SQL QUERIES ---

      if (slug === 'fish-oil' || slug === 'fish-oils') {
        const catMatch = /fish oil|omega 3|cod liver oil/i.test(cat);
        const subCatMatch = /fish oil|omega 3|cod liver oil|omega supplements/i.test(subCat);
        return catMatch || subCatMatch;
      }

      if (slug === 'cod-liver-oil' || slug === 'cod-liver') {
        const subCatMatch = /cod liver|cod liver oil/i.test(subCat);
        const nameMatch = /cod liver|cod liver oil/i.test(name);
        return subCatMatch || nameMatch;
      }

      if (
        slug === 'flax-seed-oil' ||
        slug === 'flaxseed-oil' ||
        slug === 'flax-seed'
      ) {
        const catMatch = /flaxseed|flax seed/i.test(cat);
        const subCatMatch = /flaxseed|flax seed|flaxseed oil/i.test(subCat);
        const nameMatch = /flaxseed|flax seed|flax oil|linseed/i.test(name);
        return catMatch || subCatMatch || nameMatch;
      }

      if (
        slug === 'hair-and-skin-supplements' ||
        slug === 'hair-skin-supplements'
      ) {
        const contextMatch =
          /vitamins|nutrition|supplements|health & wellness/i.test(cat) ||
          /vitamins|nutrition|supplements|hair & skin|skin care|hair care/i.test(subCat) ||
          /vitamin|supplement|hair-care|skin-care/i.test(tags) ||
          /hair loss|hair fall|skin health|glowing skin|anti-aging|nail health/i.test(cond);

        const specificMatch =
          /biotin|collagen|glutathione|vitamin e|hyaluronic acid|keratin|hair supplement|skin supplement|skin brightening|glow/i.test(name) ||
          /hair & skin supplements|hair supplements|skin supplements|biotin|collagen/i.test(subCat) ||
          /biotin|collagen|glutathione|vitamin-e|hair-supplement|skin-supplement/i.test(tags);

        return contextMatch && specificMatch;
      }

      if (slug === 'calcium' || slug === 'calcium-supplements') {
        const catMatch = /vitamins & supplements|vitamins and supplements|bone & joint care|bone and joint care/i.test(cat);

        const specificMatch =
          /calcium|calcium carbonate|calcium citrate|osteocare|caltrate|cac-1000|cac 1000|bone health|calcium \+ d3/i.test(name) ||
          /calcium|calcium supplements|bone health|bone care|joint care/i.test(subCat) ||
          /calcium|calcium-support|bone-health/i.test(tags) ||
          /calcium deficiency|osteoporosis|bone health|fracture/i.test(cond);

        return catMatch && specificMatch;
      }

      if (slug === 'vitamin-b' || slug === 'vitamin-b-complex') {
        const catMatch = /vitamins & supplements|vitamins and supplements/i.test(cat);
        const specificMatch =
          /vitamin b|b-complex|b12|folic acid/i.test(subCat) ||
          /vitamin b|b-complex|b complex|b12|b6|folic acid|neurobion|surbex/i.test(name);

        return catMatch && specificMatch;
      }

      if (slug === 'vitamin-c') {
        const catMatch = /vitamins & supplements|vitamins and supplements/i.test(cat);
        const specificMatch =
          /vitamin c|ascorbic acid|immunity/i.test(subCat) ||
          /vitamin c|ascorbic acid|limcee|cecon|c-vites/i.test(name);

        return catMatch && specificMatch;
      }

      if (slug === 'vitamin-d' || slug === 'vitamin-d3') {
        const catMatch = /vitamins & supplements|vitamins and supplements/i.test(cat);
        const specificMatch =
          /vitamin d|vitamin d3|cholecalciferol/i.test(subCat) ||
          /vitamin d|vitamin d3|cholecalciferol|indrop|sunny d/i.test(name);

        return catMatch && specificMatch;
      }

      // --- SEXUAL WELLNESS SQL QUERIES ---

      if (
        slug === 'lubricants-and-massage-gels' ||
        slug === 'lubricants-massage-gels' ||
        slug === 'lubricant'
      ) {
        const subCatMatch = /lubricant|lubricants|massage gel|intimate gel/i.test(subCat);
        const nameMatch = /lubricant|lube|massage gel/i.test(name);
        return subCatMatch || nameMatch;
      }

      if (
        slug === 'sexual-wellness-devices' ||
        slug === 'sexual-wellness-device'
      ) {
        const subCatMatch = /vibrator|massager|intimate device|wellness device|sexual device/i.test(subCat);
        const nameMatch = /vibrator|wand massager|kegel|cock ring|intimate massager/i.test(name);
        return subCatMatch || nameMatch;
      }

      if (
        slug === 'performance-enhancers' ||
        slug === 'performance-enhancer'
      ) {
        const subCatMatch = /performance enhancer|stamina|vitality|delay spray|condoms/i.test(subCat);
        const nameMatch = /delay spray|delay gel|shilajit|stamina booster|vigor|vitality/i.test(name);
        const condMatch = /male-stamina|male stamina/i.test(cond);
        return subCatMatch || nameMatch || condMatch;
      }

      if (
        slug === 'oral-contraceptives' ||
        slug === 'oral-contraceptive'
      ) {
        const subCatMatch = /contraceptive|oral contraceptive|birth control/i.test(subCat);
        const nameMatch = /contraceptive|birth control|i-pill|unwanted 72|levonorgestrel/i.test(name);
        return subCatMatch || nameMatch;
      }

      // --- FITNESS & HEALTH SQL QUERIES ---

      if (slug === 'mass-gainers' || slug === 'mass-gainer') {
        const subCatMatch = /mass gainer|weight gainer|gainers|whey protein/i.test(subCat);
        const nameMatch = /mass gainer|weight gainer|gainer/i.test(name);
        return subCatMatch || nameMatch;
      }

      if (slug === 'plant-protein' || slug === 'plant-proteins') {
        const categoryMatch =
          /fitness|health|nutrition|sports nutrition|supplement|supplements/i.test(cat) ||
          /fitness|health|protein|nutrition|supplement/i.test(subCat) ||
          /fitness|muscle|protein|wellness/i.test(cond);

        const productMatch =
          /plant protein|vegan protein|pea protein|rice protein|plant based|plant-based|organic protein/i.test(name) ||
          /plant protein|vegan protein|protein powder/i.test(subCat) ||
          /plant-protein|vegan-protein|plant-based/i.test(tags);

        return categoryMatch && productMatch;
      }

      if (
        slug === 'pre-post-workout' ||
        slug === 'pre-workout' ||
        slug === 'post-workout'
      ) {
        const subCatMatch = /pre-workout|post-workout|pre workout|post workout|bcaa|creatine|amino acids|High Protein/i.test(subCat);
        const nameMatch = /pre-workout|pre workout|post-workout|post workout|bcaa|creatine/i.test(name);

        return subCatMatch || nameMatch;
      }

      if (
        slug === 'smart-watch-and-rings' ||
        slug === 'smart-watch-and-ring' ||
        slug === 'smart-watches-and-rings'
      ) {
        const subCatMatch = /smart watch|smartwatch|smart ring|smartring/i.test(subCat);
        const nameMatch = /smart watch|smartwatch|smart ring|smartring/i.test(name);

        return subCatMatch || nameMatch;
      }

      if (slug === 'fat-burners' || slug === 'fat-burner') {
        const subCatMatch = /fat burner|fat burners|weight loss|slimming/i.test(subCat);
        const nameMatch = /fat burner|fat-burner|thermogenic|l-carnitine|fat loss/i.test(name);

        return subCatMatch || nameMatch;
      }

      // --- HAIR CARE SQL QUERIES ---

      if (
        slug === 'hair-cream-and-masks' ||
        slug === 'hair-creams-and-masks' ||
        slug === 'hair-cream-masks'
      ) {
        const subCatMatch = /hair cream|hair mask|hair creams|hair masks/i.test(subCat);
        const nameHairAndCream = name.includes('hair') && name.includes('cream');
        const nameHairAndMask = name.includes('hair') && name.includes('mask');
        const nameRegexMatch = /hair cream|hair mask|hair butter|spa mask/i.test(name);

        return subCatMatch || nameHairAndCream || nameHairAndMask || nameRegexMatch;
      }

      if (slug === 'hair-serums' || slug === 'hair-serum') {
        const regex = /hair serum|hair serums/i;
        return regex.test(subCat);
      }

      if (slug === 'hair-oils' || slug === 'hair-oil') {
        const regex = /hair oil|hair & skin oil|hair and skin oil/i;
        return regex.test(subCat);
      }

      if (
        slug === 'shampoos-and-conditioners' ||
        slug === 'shampoo-and-conditioner' ||
        slug === 'shampoos-conditioners'
      ) {
        const regex = /shampoo|conditioner|shampoos & conditioners|shampoos and conditioners/i;
        return regex.test(subCat);
      }

      // --- HOMEOPATHY SQL QUERIES ---

      // 1. Homeopathy Sexual Health
      if (
        slug === 'homeopathy-sexual-health' ||
        slug === 'sexual-health-homeopathy' ||
        slug === 'homeopathic-sexual-health'
      ) {
        const sysMedOrCatMatch =
          /homeopathy|homeopathic/i.test(sysMed) || /homeopathy/i.test(cat);

        const subCatOrNameMatch =
          /sexual health|sexual wellness|vitality|male wellness/i.test(subCat) ||
          /damiana|yohimbinum|agnus castus|acid phos|selenium|vitality|vigor/i.test(name);

        return sysMedOrCatMatch && subCatOrNameMatch;
      }

      // 2. Homeopathy Hair Care Products
      if (
        slug === 'homeopathy-hair-care-products' ||
        slug === 'homeopathy-hair-care' ||
        slug === 'homeopathic-hair-care'
      ) {
        const sysMedOrCatMatch =
          /homeopathy|homeopathic/i.test(sysMed) || /homeopathy/i.test(cat);

        const subCatOrNameMatch =
          /hair care|hair oil|hair fall|hair growth|shampoo/i.test(subCat) ||
          /jaborandi|cantharis|hair oil|hair tonic|hair drop/i.test(name);

        return sysMedOrCatMatch && subCatOrNameMatch;
      }

      // 3. Homeopathy Piles and Fissures
      if (
        slug === 'piles-and-fissures' ||
        slug === 'homeopathy-piles-and-fissures' ||
        slug === 'piles-fissures'
      ) {
        const sysMedOrCatMatch =
          /homeopathy|homeopathic/i.test(sysMed) || /homeopathy/i.test(cat);

        const subCatOrNameMatch =
          /piles|fissures|hemorrhoids|anorectal/i.test(subCat) ||
          /piles|fissure|hemorrhoid|aesculus|hamamelis|ratanhia|piles drops|piles ointment/i.test(name);

        return sysMedOrCatMatch && subCatOrNameMatch;
      }

      // 4. Homeopathy Obesity
      if (
        slug === 'obesity' ||
        slug === 'homeopathy-obesity' ||
        slug === 'weight-loss-homeopathy'
      ) {
        const sysMedOrCatMatch =
          /homeopathy|homeopathic/i.test(sysMed) || /homeopathy/i.test(cat);

        const subCatOrNameMatch =
          /obesity|weight loss|slimming|weight management/i.test(subCat) ||
          /phytolacca|fucus|slimming|weight loss|anti-obesity|fat loss/i.test(name);

        return sysMedOrCatMatch && subCatOrNameMatch;
      }

      // 5. Homeopathy Warts
      if (
        slug === 'warts' ||
        slug === 'homeopathy-warts' ||
        slug === 'warts-and-corns'
      ) {
        const sysMedOrCatMatch =
          /homeopathy|homeopathic/i.test(sysMed) || /homeopathy/i.test(cat);

        const subCatOrNameMatch =
          /warts|corns|verruca|skin growths/i.test(subCat) ||
          /thuja|antim crud|causticum|dulcamara|wart|corn|wart remover/i.test(name);

        return sysMedOrCatMatch && subCatOrNameMatch;
      }

      // 6. Homeopathy Fungal Infection
      if (
        slug === 'fungal-infection' ||
        slug === 'homeopathy-fungal-infection' ||
        slug === 'fungal-infections'
      ) {
        const sysMedOrCatMatch =
          /homeopathy|homeopathic/i.test(sysMed) ||
          /homeopathy|homeopathic/i.test(cat) ||
          /homeopathy|homeopathic/i.test(subCat);

        const specificMatch =
          /fungal|ringworm|skin care|dermatology|infections/i.test(cat) ||
          /fungal infection|ringworm|antifungal|candidiasis|skin infection/i.test(subCat) ||
          /fungal|fungal-infection|ringworm|antifungal|candidiasis/i.test(tags) ||
          /fungal infection|ringworm|tinea|candidiasis|athlete's foot|jock itch|itching/i.test(cond) ||
          /tellurium|sepia|petroleum|chrysarobinum|sulphur|graphites|antifungal|fungal|ringworm|tinea|candida/i.test(name);

        return sysMedOrCatMatch && specificMatch;
      }

      // 7. Homeopathy Diabetes Medicines
      if (
        slug === 'diabetes-medicines' ||
        slug === 'homeopathy-diabetes-medicines' ||
        slug === 'homeopathy-diabetes'
      ) {
        const sysMedOrCatMatch =
          /homeopathy|homeopathic/i.test(sysMed) || /homeopathy/i.test(cat);

        const subCatOrNameMatch =
          /diabetes|diabetic care|blood sugar|sugar control/i.test(subCat) ||
          /syzygium|gymnema|cephalandra|abroma|uranium nit|diabetic|sugar control/i.test(name);

        return sysMedOrCatMatch && subCatOrNameMatch;
      }

      // 8. Homeopathy Stomach Medicines
      if (
        slug === 'stomach-medicines' ||
        slug === 'homeopathy-stomach-medicines' ||
        slug === 'homeopathy-stomach'
      ) {
        const sysMedOrCatMatch =
          /homeopathy|homeopathic/i.test(sysMed) || /homeopathy/i.test(cat);

        const subCatOrNameMatch =
          /stomach|digestion|digestive care|acidity|gastric/i.test(subCat) ||
          /nux vomica|carbo veg|lycopodium|digestive|gastric|acidity|stomach/i.test(name);

        return sysMedOrCatMatch && subCatOrNameMatch;
      }

      // --- PET CARE SQL QUERIES ---

      // 1. Pet Supplements
      if (
        slug === 'pet-supplements' ||
        slug === 'pet-supplement'
      ) {
        const catMatch = /pet care|pet health|veterinary/i.test(cat);
        const subCatOrNameMatch =
          /pet supplements|supplements|pet nutrition|vitamins|joint care/i.test(subCat) ||
          /supplement|vitamin|calcium|glucosamine|omega|probiotic|multivitamin/i.test(name);

        return catMatch && subCatOrNameMatch;
      }

      // 2. Pet Food
      if (
        slug === 'pet-food' ||
        slug === 'pet-foods'
      ) {
        const catMatch = /pet care|pet health|pets/i.test(cat);
        const subCatOrNameMatch =
          /pet food|dog food|cat food|pet treats|puppy food|kitten food|nutrition/i.test(subCat) ||
          /food|treats|biscuits|royal canin|whiskas|me-o|pedigree|reflex/i.test(name);

        return catMatch && subCatOrNameMatch;
      }

      // Fallback matching
      const cleanSlug = slug.replace(/-/g, ' ');
      return (
        subCat.includes(cleanSlug) ||
        cat.includes(cleanSlug) ||
        tags.includes(cleanSlug) ||
        name.includes(cleanSlug)
      );
    });
  }, [allProducts, slug]);

  // Extract Dynamic Sidebar Filter Options
  const availableManufacturers = useMemo(() => {
    const mfgSet = new Set<string>();
    categoryProducts.forEach((p) => {
      if (p.manufacturer && p.manufacturer.trim()) {
        mfgSet.add(p.manufacturer.trim());
      }
    });
    return Array.from(mfgSet).sort();
  }, [categoryProducts]);

  const availableCategories = useMemo(() => {
    const catSet = new Set<string>();
    categoryProducts.forEach((p) => {
      if (p.category && p.category.trim()) {
        catSet.add(p.category.trim());
      }
    });
    return Array.from(catSet).sort();
  }, [categoryProducts]);

  const availableDosageForms = useMemo(() => {
    const formSet = new Set<string>();
    categoryProducts.forEach((p) => {
      if (p.dosageForm && p.dosageForm.trim()) {
        formSet.add(p.dosageForm.trim());
      }
    });
    return Array.from(formSet).sort();
  }, [categoryProducts]);

  // Final Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return categoryProducts
      .filter((p) => {
        if (
          searchTerm.trim() &&
          !p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !getSafeText(p.genericName).includes(searchTerm.toLowerCase())
        ) {
          return false;
        }

        if (selectedManufacturer !== 'all') {
          if ((p.manufacturer || '').trim().toLowerCase() !== selectedManufacturer.toLowerCase()) {
            return false;
          }
        }

        if (selectedCategory !== 'all') {
          if ((p.category || '').trim().toLowerCase() !== selectedCategory.toLowerCase()) {
            return false;
          }
        }

        if (selectedDosageForm !== 'all') {
          if ((p.dosageForm || '').trim().toLowerCase() !== selectedDosageForm.toLowerCase()) {
            return false;
          }
        }

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
        return 0;
      });
  }, [
    categoryProducts,
    searchTerm,
    selectedManufacturer,
    selectedCategory,
    selectedDosageForm,
    selectedPrescription,
    sortBy,
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
            <span className="text-gray-500">Header Navigation</span>
            <span>/</span>
            <span className="text-gray-900 font-semibold">{formattedTitle}</span>
          </nav>

          {/* 🖼️ 1ST BAR: Main Visual Header Banner */}
          {activeMedia ? (
            <div
              className={`rounded-2xl p-6 sm:p-8 mb-4 text-white shadow-md bg-gradient-to-r ${activeMedia.gradient} relative overflow-hidden`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
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
            <div className="rounded-2xl p-5 sm:p-6 mb-4 shadow-md text-white bg-gradient-to-r from-[#ff6f61] to-[#e11d48]">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <span className="bg-white text-[#ff6f61] text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                    CATEGORY
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                    {formattedTitle}
                  </h1>
                  <p className="text-xs sm:text-sm opacity-90 mt-1 max-w-2xl">
                    Explore all authentic products under {formattedTitle}.
                  </p>
                </div>

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

          {/* 🎞️ 2ND BAR: Horizontally Scrollable Images Carousel */}
          <div className="relative mb-6 group">
            <button
              onClick={() => scrollBanners('left')}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 rounded-full border border-gray-200 bg-white p-2 shadow-md hover:bg-gray-50 text-gray-700 hover:text-[#ff6f61] transition hidden md:flex items-center justify-center cursor-pointer"
              aria-label="Previous Banners"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div
              ref={bannerScrollRef}
              className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-1 no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {scrollingBanners.map((banner) => (
                <div
                  key={banner.id}
                  className="w-[300px] sm:w-[380px] shrink-0 snap-start h-36 sm:h-40 rounded-2xl overflow-hidden border border-gray-200 relative shadow-2xs hover:shadow-md transition cursor-pointer group/banner"
                >
                  <img
                    src={banner.url}
                    alt={banner.title}
                    className="w-full h-full object-cover group-hover/banner:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex flex-col justify-end">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ff6f61] bg-white/90 px-2 py-0.5 rounded w-fit mb-1 shadow-xs">
                      Featured
                    </span>
                    <h3 className="text-white text-sm sm:text-base font-bold leading-tight">
                      {banner.title}
                    </h3>
                    <p className="text-white/80 text-xs mt-0.5 font-medium line-clamp-1">
                      {banner.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => scrollBanners('right')}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 rounded-full border border-gray-200 bg-white p-2 shadow-md hover:bg-gray-50 text-gray-700 hover:text-[#ff6f61] transition hidden md:flex items-center justify-center cursor-pointer"
              aria-label="Next Banners"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Grid Layout: Sidebar Filters + Products */}
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

              {availableDosageForms.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                    Form
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

              {availableManufacturers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                    Manufacturer / Brand
                  </h4>
                  <select
                    value={selectedManufacturer}
                    onChange={(e) => setSelectedManufacturer(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                  >
                    <option value="all">
                      All Brands ({availableManufacturers.length})
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
                        {isRxRequired && (
                          <span className="absolute top-2 left-2 z-10 bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-red-200 uppercase">
                            Rx Required
                          </span>
                        )}

                        {hasDiscount && discountPercent > 0 && (
                          <span className="absolute top-2 right-2 z-10 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-2xs">
                            {discountPercent}% OFF
                          </span>
                        )}

                        <Link href={`/products/${productSlug}`} className="block group">
                          <div className="w-full aspect-square bg-gray-50 rounded-lg mb-3 relative overflow-hidden flex items-center justify-center p-2">
                            <Image
                              src={
                                product.imageUrl ||
                                'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500'
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