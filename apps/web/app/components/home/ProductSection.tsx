'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useCart } from '@/app/components/cart/CartContext';

export type Product = {
  id?: string;
  _id?: string;
  productId?: string;
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
  manufacturer?: string;
  saleTag?: string;
  includedProducts?: string[];
};

type Props = {
  title: string;
  hasAdBadge?: boolean;
  hasUnderline?: boolean;
  products?: Product[];
  showSeeAll?: boolean;
  seeAllLink?: string;
};

export default function ProductSection({
  title,
  hasAdBadge = false,
  hasUnderline = true,
  products = [],
  showSeeAll = true,
  seeAllLink,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { addProductToCart, loading } = useCart();

  const dynamicSeeAllLink =
    seeAllLink ||
    `/collections/${title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}`;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <section className="px-4 sm:px-6 py-4 bg-white">
      <div className="mx-auto max-w-[1360px]">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {hasAdBadge && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500 border border-gray-200">
                AD
              </span>
            )}
            <h2
              className={`text-base sm:text-lg font-bold text-gray-900 ${
                hasUnderline ? 'section-title-underlined' : ''
              }`}
            >
              {title}
            </h2>
          </div>

          {showSeeAll && (
            <Link
              href={dynamicSeeAllLink}
              className="rounded-md border border-[#ff6f61] px-3.5 py-1 text-xs font-semibold text-[#ff6f61] hover:bg-[#ff6f61] hover:text-white transition cursor-pointer flex items-center gap-1 group/btn"
            >
              <span>See all</span>
              <svg
                className="w-3 h-3 transition group-hover/btn:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Carousel Container */}
        <div className="relative group">
          {/* Left Arrow Button */}
          <button
            onClick={() => scroll('left')}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 rounded-full border border-gray-200 bg-white p-2 shadow-md hover:bg-gray-50 text-gray-700 hover:text-[#ff6f61] transition hidden md:flex items-center justify-center cursor-pointer"
            aria-label="Previous Products"
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
            {safeProducts.map((product, index) => {
              // Extract target ID safely
              const targetProductId = product.id || product._id || product.productId;

              const productSlug =
                product.slug ||
                (product.name || '')
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '');

              const displayImage =
                product.imageUrl ||
                product.image ||
                'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300';
              const displaySize = product.packSize || product.size || 'Pack of 1';

              const formattedPrice =
                typeof product.price === 'number' ? `Rs. ${product.price}` : product.price;
              const formattedOriginalPrice =
                product.originalPrice && typeof product.originalPrice === 'number'
                  ? `Rs. ${product.originalPrice}`
                  : product.originalPrice;

              return (
                <Link
                  key={`${product.name || 'product'}-${index}`}
                  href={`/products/${productSlug}`}
                  className="w-[175px] sm:w-[200px] md:w-[210px] flex-shrink-0 snap-start flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-2xs hover:shadow-md transition cursor-pointer group/card"
                >
                  <div>
                    {/* Product Image */}
                    <div className="relative mb-2.5 h-32 w-full overflow-hidden rounded-xl bg-white flex items-center justify-center">
                      <img
                        src={displayImage}
                        alt={product.name || 'Product'}
                        className="h-full w-full object-contain p-2 transition group-hover/card:scale-105"
                      />
                    </div>

                    {/* Name */}
                    <h3 className="line-clamp-2 min-h-[32px] text-xs font-bold text-gray-900 leading-snug group-hover/card:text-[#ff6f61] transition">
                      {product.name}
                    </h3>

                    {/* Pack Size */}
                    <p className="mt-0.5 text-[10px] text-gray-500">{displaySize}</p>

                    {/* Rating */}
                    <div className="mt-1 flex items-center gap-1 text-[10px]">
                      <div className="flex text-[#16a34a]">
                        {'★'.repeat(Math.floor(product.rating || 4))}
                      </div>
                      <span className="font-bold text-gray-700">{product.rating || 4.2}</span>
                      <span className="text-gray-400">({product.reviewsCount || 120})</span>
                    </div>

                    {/* Delivery */}
                    <p className="mt-0.5 text-[10px] text-gray-500">
                      {product.delivery || 'Get by 7pm, Today'}
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
                      {product.discount && (
                        <span className="text-[10px] font-bold text-[#16a34a]">
                          {typeof product.discount === 'number'
                            ? `${product.discount}% off`
                            : product.discount}
                        </span>
                      )}
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (targetProductId) {
                          addProductToCart(targetProductId, 1);
                        } else {
                          console.error('Product ID missing for product:', product);
                          alert('Is product ki ID database se fetch nahi ho saki.');
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
            aria-label="Next Products"
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