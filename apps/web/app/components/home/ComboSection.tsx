'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useCart } from '@/app/components/cart/CartContext';

export type ComboDeal = {
  id?: string;
  itemIds?: string[]; // 👈 Real Database Product IDs Array
  name: string;
  size?: string;
  packSize?: string;
  rating?: number;
  reviewsCount?: number;
  delivery?: string;
  price: string | number;
  originalPrice?: string | number;
  discount?: string | number;
  image?: string;
  imageUrl?: string;
  slug?: string;
  includedProducts?: string[];
};

type Props = {
  combos?: ComboDeal[];
};

export default function ComboSection({ combos = [] }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { addProductToCart, loading } = useCart();

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const safeCombos = Array.isArray(combos) ? combos : [];

  if (safeCombos.length === 0) return null;

  return (
    <section className="px-4 sm:px-6 py-4 bg-white">
      <div className="mx-auto max-w-[1360px]">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#ff6f61] border border-orange-200">
              BUNDLE
            </span>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 section-title-underlined">
              Popular Combo Deals
            </h2>
          </div>
        </div>

        {/* Carousel Track */}
        <div className="relative group">
          {/* Left Arrow Button */}
          <button
            onClick={() => scroll('left')}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 rounded-full border border-gray-200 bg-white p-2 shadow-md hover:bg-gray-50 text-gray-700 hover:text-[#ff6f61] transition hidden md:flex items-center justify-center cursor-pointer"
            aria-label="Previous Combos"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Horizontally Scrollable Track */}
          <div
            ref={scrollContainerRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-1 no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {safeCombos.map((combo, index) => {
              const comboSlug =
                combo.slug ||
                (combo.name || '')
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '');

              const displayImage =
                combo.imageUrl ||
                combo.image ||
                'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300';
              const displaySize = combo.packSize || combo.size || 'Combo Pack';

              const formattedPrice =
                typeof combo.price === 'number' ? `Rs.${combo.price}` : combo.price;
              const formattedOriginalPrice =
                combo.originalPrice && typeof combo.originalPrice === 'number'
                  ? `Rs.${combo.originalPrice}`
                  : combo.originalPrice;

              return (
                <Link
                  key={`${combo.id || combo.name}-${index}`}
                  href={`/combos/${comboSlug}`}
                  className="w-[185px] sm:w-[210px] md:w-[220px] flex-shrink-0 snap-start flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-2xs hover:shadow-md transition cursor-pointer group/card"
                >
                  <div>
                    {/* Product Image */}
                    <div className="relative mb-2.5 h-32 w-full overflow-hidden rounded-xl bg-gray-50 flex items-center justify-center">
                      <img
                        src={displayImage}
                        alt={combo.name || 'Combo Deal'}
                        className="h-full w-full object-contain p-2 transition group-hover/card:scale-105"
                      />
                    </div>

                    {/* Combo Title */}
                    <h3 className="line-clamp-2 text-xs font-bold text-gray-900 leading-snug group-hover/card:text-[#ff6f61] transition">
                      {combo.name}
                    </h3>

                    {/* Pack Size / Item Count */}
                    <p className="mt-1 text-[10px] font-bold text-[#ff6f61] uppercase tracking-wide">
                      {displaySize}
                    </p>

                    {/* Included Items List */}
                    {combo.includedProducts && combo.includedProducts.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-200 space-y-0.5">
                        {combo.includedProducts.map((itemName, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="text-[10px] font-medium text-gray-600 line-clamp-1 flex items-center gap-1.5"
                          >
                            <span className="w-1 h-1 rounded-full bg-[#ff6f61] shrink-0" />
                            <span className="truncate">{itemName}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rating */}
                    <div className="mt-2 flex items-center gap-1 text-[10px]">
                      <div className="flex text-[#16a34a]">
                        {'★'.repeat(Math.floor(combo.rating || 4))}
                      </div>
                      <span className="font-bold text-gray-700">{combo.rating || 4.5}</span>
                      <span className="text-gray-400">({combo.reviewsCount || 320})</span>
                    </div>

                    {/* Delivery */}
                    <p className="mt-0.5 text-[10px] text-gray-500">
                      {combo.delivery || 'Get by 6pm, today'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100">
                    {/* Prices */}
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-extrabold text-gray-900">
                        {formattedPrice}
                      </span>
                      {formattedOriginalPrice && (
                        <span className="text-[10px] text-gray-400 line-through">
                          {formattedOriginalPrice}
                        </span>
                      )}
                      {combo.discount && (
                        <span className="text-[10px] font-bold text-[#16a34a]">
                          {typeof combo.discount === 'number'
                            ? `${combo.discount}% off`
                            : combo.discount}
                        </span>
                      )}
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (combo.itemIds && combo.itemIds.length > 0) {
                          for (const productId of combo.itemIds) {
                            await addProductToCart(productId, 1);
                          }
                        } else if (combo.id) {
                          await addProductToCart(combo.id, 1);
                        } else {
                          console.error('Product IDs missing for combo:', combo);
                        }
                      }}
                      className="mt-2 w-full rounded-md bg-[#fff0ed] py-1.5 text-xs font-bold text-[#ff6f61] hover:bg-[#ffe0d8] transition cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Adding...' : 'Add to Cart'}
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Right Arrow Button */}
          <button
            onClick={() => scroll('right')}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 rounded-full border border-gray-200 bg-white p-2 shadow-md hover:bg-gray-50 text-gray-700 hover:text-[#ff6f61] transition hidden md:flex items-center justify-center cursor-pointer"
            aria-label="Next Combos"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}