'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/app/components/cart/CartContext';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

const COMBO_METADATA: Record<string, { title: string; image: string; description: string }> = {
  'combo-1': {
    title: 'Diabetes Monitor & Control',
    image: 'https://media.istockphoto.com/id/2129782295/photo/sugar-cubes-in-spoon-with-blood-glucose-meter-lancet-and-stethoscope-on-blue-background.jpg?s=612x612&w=0&k=20&c=RlKHR40vmxS1jGbIFaE6Jd8z4ntP65XV6r6ETQX_vz8=',
    description: 'Complete diabetic care kit containing blood glucose monitor strips, essential care supplements, and daily management medicines.',
  },
  'combo-2': {
    title: 'Complete Acne Care',
    image: 'https://img.magnific.com/free-photo/portrait-young-woman-being-confident-with-her-acne_23-2148982603.jpg?semt=ais_hybrid&w=740&q=80',
    description: 'Dermatologist-recommended skincare bundle for active acne, spot treatment, and daily skin barrier restoration.',
  },
  'combo-3': {
    title: 'Hair Fall Rescue',
    image: 'https://www.uclahealth.org/sites/default/files/styles/landscape_16x9_030000_1200x675/public/images/6d/female-hair-loss.jpg?f=8529bd25&itok=rBvRHuno',
    description: 'Complete hair revitalization bundle including anti-hair fall shampoo, nourishing biotin serum, and scalp oil.',
  },
  'combo-4': {
    title: 'Daily Brightening Skin',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTApHGGLCE1VNs0teiUXuAFFgv0P1dVHNY4ZrYkL9gvo6_i7ycZ5Gf4nRc&s=10',
    description: 'Skin glow kit with Vitamin C serum, hydrating moisturizer, and SPF daily shield cream for radiant skin.',
  },
  'combo-5': {
    title: 'Cold & Cough Relief',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWavYYyTVtQ-rO1rqxHJUvVC3KvbyMOnxNxOtRb3VKPJk4dylyHMe6eCI&s=10',
    description: 'Essential seasonal wellness pack featuring fast-acting sinus relief, cough syrup, and immunity booster tablets.',
  },
  'combo-6': {
    title: 'Bone & Joint Support',
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80',
    description: 'Comprehensive bone health bundle packed with Calcium, Vitamin D3, and Glucosamine joint care supplements.',
  },
  'combo-7': {
    title: 'Baby Essentials',
    image: 'https://static.emmasdiary.co.uk/images/default-source/affiliate/newborn-baby-essentials-checklist.jpg?sfvrsn=c2121287_0',
    description: 'Gentle daily baby care set including hypoallergenic baby lotion, wash, and moisturizing cream.',
  },
  'combo-8': {
    title: 'Oral Care Daily',
    image: 'https://img.magnific.com/free-vector/oral-hygiene-dental-care-illustration_1308-181351.jpg?semt=ais_hybrid&w=740&q=80',
    description: 'Complete dental hygiene pack with sensitivity toothpaste, antibacterial mouthwash, and soft toothbrushes.',
  },
  'combo-9': {
    title: "Men's Face Care",
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhuDo7e1Hwt8UMSg_dbc9uRB1ooeRO9ZFy6LwcCzOSnoTd1qIJk6BSqHU&s=10',
    description: "Daily grooming bundle for men including deep-cleansing face wash, oil-control moisturizer, and beard care oil.",
  },
  'combo-10': {
    title: 'Energy & Recovery',
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80',
    description: 'Vitality pack featuring multivitamin complex, CoQ10, and electrolyte energy recovery drink mix.',
  },
};

export default function ComboDetailPage({ params }: PageProps) {
  const { slug } = use(params);

  const [comboData, setComboData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [addedToCart, setAddedToCart] = useState<boolean>(false);

  // 🛒 Cart Context Hook Integration
  const { addProductToCart, loading: cartLoading } = useCart();

  // Tag normalizer to handle Postgres array/string formats ({tag1,tag2} or ["tag1"])
  const cleanTags = (tagsVal: any): string[] => {
    if (!tagsVal) return [];
    let str = Array.isArray(tagsVal) ? tagsVal.join(',') : String(tagsVal);
    str = str.replace(/[\[\]{}"']/g, '');
    return str.split(',').map((t) => t.trim().toLowerCase());
  };

  useEffect(() => {
    async function fetchComboDetails() {
      try {
        setLoading(true);
        const res = await fetch('https://tabibistan.org/products', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch products');

        const rawData = await res.json();
        const products = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData.data)
          ? rawData.data
          : rawData.products || [];

        // Group products by combo tag
        const comboBuckets: Record<string, any[]> = {};

        products.forEach((p: any) => {
          if (p.isActive === false) return;
          const tags = cleanTags(p.tags);

          tags.forEach((tag) => {
            if (tag.startsWith('combo-')) {
              if (!comboBuckets[tag]) comboBuckets[tag] = [];
              comboBuckets[tag].push(p);
            }
          });
        });

        // Find the combo tag matching current slug
        let activeComboTag = '';
        Object.keys(comboBuckets).forEach((tag) => {
          const meta = COMBO_METADATA[tag];
          const generatedSlug = meta
            ? meta.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            : tag.replace('combo-', 'combo-deal-');

          if (slug === generatedSlug || slug.includes(tag)) {
            activeComboTag = tag;
          }
        });

        // Fallback to first tag if direct match fails
        if (!activeComboTag && Object.keys(comboBuckets).length > 0) {
          activeComboTag = Object.keys(comboBuckets)[0];
        }

        const items = comboBuckets[activeComboTag] || [];
        const meta = COMBO_METADATA[activeComboTag] || {
          title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600',
          description: 'Special curated bundle pack offering maximum health benefits and bundle savings.',
        };

        const originalTotal = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
        const discountedTotal = Math.round(originalTotal * 0.85);

        setComboData({
          tag: activeComboTag,
          title: meta.title,
          image: meta.image,
          description: meta.description,
          items,
          originalTotal,
          discountedTotal,
          savings: originalTotal - discountedTotal,
          rating: 4.8,
          reviewsCount: 340,
        });
      } catch (error) {
        console.error('Error loading combo PDP:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchComboDetails();
  }, [slug]);

  // 🛒 Add Entire Bundle To Cart Handler
  const handleAddToCart = async () => {
    if (!comboData || !comboData.items || comboData.items.length === 0) return;

    try {
      // Bundle ke saare items ko cart mein batch/sequential mode par add kar rahe hain
      for (const item of comboData.items) {
        if (item.id) {
          await addProductToCart(item.id, quantity);
        }
      }

      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    } catch (error) {
      console.error('Error adding combo bundle to cart:', error);
      alert('Bundle ko cart mein add karte waqt masla aaya hai.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
        <Header />
        <main className="flex-grow flex items-center justify-center p-12 text-xs text-gray-500 font-semibold">
          Loading Combo Bundle Details...
        </main>
        <Footer />
      </div>
    );
  }

  if (!comboData || !comboData.items.length) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center p-12 text-center">
          <h2 className="text-lg font-bold text-gray-800">Combo Deal Not Found</h2>
          <p className="text-xs text-gray-500 mt-1">
            The requested health bundle is currently unavailable or expired.
          </p>
          <Link
            href="/"
            className="mt-4 bg-[#ff6f61] text-white text-xs font-bold px-4 py-2 rounded-lg"
          >
            Back to Homepage
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <Header />

      <main className="flex-grow py-5 px-3 sm:px-6">
        <div className="mx-auto max-w-[1280px]">
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:underline text-[#ff6f61]">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-500">Popular Combo Deals</span>
            <span>/</span>
            <span className="text-gray-900 font-semibold">{comboData.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Product Image & Included Medicines List */}
            <div className="lg:col-span-8 space-y-6">
              {/* Main Bundle Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                  {/* Bundle Image */}
                  <div className="sm:col-span-5 relative aspect-square bg-orange-50/50 rounded-xl overflow-hidden border border-orange-100 flex items-center justify-center p-4">
                    <img
                      src={comboData.image}
                      alt={comboData.title}
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute top-3 left-3 bg-[#16a34a] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                      15% Bundle Discount
                    </span>
                  </div>

                  {/* Bundle Main Info */}
                  <div className="sm:col-span-7 space-y-3">
                    <span className="bg-[#ff6f61]/10 text-[#ff6f61] text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {comboData.items.length} Medicines Pack
                    </span>

                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                      {comboData.title}
                    </h1>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      {comboData.description}
                    </p>

                    {/* Ratings & Delivery */}
                    <div className="flex items-center gap-4 text-xs pt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-500 font-black">★ {comboData.rating}</span>
                        <span className="text-gray-400">({comboData.reviewsCount} reviews)</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-600 font-medium">⚡ Get by 6pm, Today</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medicines Breakdown Section */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                    Products Included in this Bundle ({comboData.items.length})
                  </h2>
                  <span className="text-xs font-semibold text-[#ff6f61]">Click any product to view details</span>
                </div>

                <div className="space-y-3">
                  {comboData.items.map((item: any, idx: number) => {
                    const productSlug =
                      item.slug ||
                      (item.name || '')
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, '');

                    const isRx =
                      item.prescriptionRequired === true ||
                      String(item.prescriptionRequired).toLowerCase() === 'true';

                    return (
                      <Link
                        key={item.id || idx}
                        href={`/products/${productSlug}`}
                        className="flex items-center justify-between gap-4 p-3.5 bg-gray-50 border border-gray-200/80 rounded-xl hover:bg-white hover:border-[#ff6f61]/40 hover:shadow-xs transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-14 h-14 bg-white rounded-lg p-1 border border-gray-200 shrink-0 flex items-center justify-center group-hover:scale-105 transition">
                            <Image
                              src={
                                item.imageUrl ||
                                'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300'
                              }
                              alt={item.name}
                              width={50}
                              height={50}
                              className="object-contain max-h-12"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-gray-900 truncate group-hover:text-[#ff6f61] transition">
                                {item.name}
                              </h3>
                              {isRx && (
                                <span className="bg-red-100 text-red-700 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-red-200 uppercase shrink-0">
                                  Rx
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {item.manufacturer || 'General Medicine'} • {item.packSize || item.dosageForm || 'Standard Pack'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-3">
                          <div>
                            <span className="text-xs font-extrabold text-gray-900 block">
                              Rs. {item.price}
                            </span>
                            {item.originalPrice && item.originalPrice > item.price && (
                              <span className="text-[10px] text-gray-400 line-through">
                                Rs. {item.originalPrice}
                              </span>
                            )}
                          </div>
                          <svg
                            className="w-4 h-4 text-gray-400 group-hover:text-[#ff6f61] group-hover:translate-x-0.5 transition"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Trust & Guarantee Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-lg block">🛡️</span>
                  <span className="text-[11px] font-bold text-gray-800 block mt-1">Authentic Products</span>
                  <span className="text-[10px] text-gray-400">Directly from verified pharmacies</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-lg block">🚚</span>
                  <span className="text-[11px] font-bold text-gray-800 block mt-1">Same Day Delivery</span>
                  <span className="text-[10px] text-gray-400">Express doorstep shipping</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                  <span className="text-lg block">🏷️</span>
                  <span className="text-[11px] font-bold text-gray-800 block mt-1">Best Value Savings</span>
                  <span className="text-[10px] text-gray-400">Flat 15% bundle discount</span>
                </div>
              </div>
            </div>

            {/* Right Column: Sticky Pricing & Action Card */}
            <div className="lg:col-span-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs sticky top-20 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-3 uppercase tracking-wider">
                  Bundle Price Summary
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Individual Total Price ({comboData.items.length} Items):</span>
                    <span className="line-through">Rs. {comboData.originalTotal * quantity}</span>
                  </div>
                  <div className="flex justify-between text-[#16a34a] font-bold">
                    <span>Bundle Discount (15% OFF):</span>
                    <span>- Rs. {comboData.savings * quantity}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
                    <span className="font-bold text-gray-900 text-sm">Final Combo Price:</span>
                    <span className="text-2xl font-black text-[#ff6f61]">
                      Rs. {comboData.discountedTotal * quantity}
                    </span>
                  </div>
                </div>

                {/* Quantity Counter */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-gray-700">Quantity:</span>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1 font-bold text-gray-600 hover:bg-gray-200 transition"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs font-bold text-gray-900 bg-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="px-3 py-1 font-bold text-gray-600 hover:bg-gray-200 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Main Action Button */}
                <button
                  type="button"
                  disabled={cartLoading}
                  onClick={handleAddToCart}
                  className={`w-full font-bold py-3.5 rounded-xl transition shadow-md text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    addedToCart
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#ff6f61] hover:bg-[#e05b4f] text-white'
                  }`}
                >
                  {cartLoading ? (
                    <span>ADDING BUNDLE...</span>
                  ) : addedToCart ? (
                    <span>✓ Added to Cart!</span>
                  ) : (
                    <span>Add Entire Bundle To Cart</span>
                  )}
                </button>

                <p className="text-[10px] text-gray-400 text-center">
                  Includes all {comboData.items.length} items listed. Prescription verify ho skti hai cart check-out par.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}