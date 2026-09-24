'use client';

import React, { useRef } from 'react';
import Link from 'next/link';

type PersonalCareItem = {
  title: string;
  slug: string;
  bgColor: string;
  image: string;
  href: string;
};

const personalCareItems: PersonalCareItem[] = [
  {
    title: 'Skin care',
    slug: 'skin-care',
    bgColor: '#ffb9b9', 
    image: 'https://domf5oio6qrcr.cloudfront.net/medialibrary/7544/conversions/724cf5e2-e067-445d-9665-2eb9a0a12c86-thumb.jpg',
    href: '/collections/skin-care-products',
  },
  {
    title: 'Hair Care',
    slug: 'hair-care',
    bgColor: '#68224b',
    image: 'https://t4.ftcdn.net/jpg/04/02/75/95/360_F_402759588_si9oFbEM4Tb60yHO5R2SfWrSLp2A5nYo.jpg',
    href: '/collections/healthy-hair-starts-here',
  },
  {
    title: 'Sexual Wellness',
    slug: 'sexual-wellness',
    bgColor: '#60afd7',
    image: 'https://static-01.daraz.pk/p/f5fc6ddd299ed9b08fed23236d129988.jpg',
    href: '/collections/sexual-wellness',
  },
  {
    title: 'Oral Care',
    slug: 'oral-care',
    bgColor: '#8173ed',
    image: 'https://images.ctfassets.net/xxv4b9mbhlgd/73PKv8BmWGnsABEP3Ld9Xh/484e94225257c541225f69a876ebdb7a/oral-dental-care.jpg',
    href: '/collections/oral-care',
  },
  {
    title: 'Elderly Care',
    slug: 'elderly-care',
    bgColor: '#b6e7f0',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRLyMb4CCHHXmLXpwcMOr59JlHDRM3ENBHG9a3YL0XeX6_UpNn_s0YseV8&s=10',
    href: '/collections/elderly-care',
  },
  {
    title: 'Baby Care',
    slug: 'baby-care',
    bgColor: '#ffb9cc',
    image: 'https://pk.herbion.com/cdn/shop/files/HerbionBabyCareKit-6.png?v=1763378539',
    href: '/collections/baby-care',
  },
  {
    title: 'Women Care',
    slug: 'women-care',
    bgColor: '#ff6ab2',
    image: 'https://womens-care.gr/wp-content/uploads/2023/07/womens-care-center.jpg',
    href: '/collections/women-care',
  },
  {
    title: 'Men Grooming',
    slug: 'men-grooming',
    bgColor: '#231414',
    image: 'https://www.merisisvp.com/hubfs/65112c70d08bee8f990c936f_Mens%20Selfcare%20Products-p-500.jpg',
    href: '/collections/men-grooming',
  },
  {
    title: 'Pet Care',
    slug: 'pet-care',
    bgColor: '#be5fc7',
    image: 'https://www.korozogroup.com/images/pet-care.jpg',
    href: '/collections/pet-care',
  },
];

export default function PersonalCareSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="px-4 sm:px-6 py-4 bg-white">
      <div className="mx-auto max-w-[1360px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 section-title-underlined">
            Personal care
          </h2>
        </div>

        {/* Carousel Container */}
        <div className="relative group">
          {/* Left Arrow */}
          <button
            onClick={() => scroll('left')}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 rounded-full border border-gray-200 bg-white p-2 shadow-md hover:bg-gray-50 text-gray-700 hover:text-[#ff6f61] transition hidden md:flex items-center justify-center cursor-pointer"
            aria-label="Previous personal care categories"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Horizontally Scrollable Track */}
          <div
            ref={scrollRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-1 no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {personalCareItems.map((item) => (
              <Link
                key={item.slug}
                href={item.href}
                className="w-[125px] sm:w-[138px] flex-shrink-0 snap-start flex flex-col rounded-2xl border border-gray-100 bg-white p-2 shadow-2xs hover:shadow-md transition cursor-pointer group/card"
              >
                {/* Colored Tile using Inline Style for Dynamic Hex Color */}
                <div
                  style={{ backgroundColor: item.bgColor }}
                  className="w-full h-36 sm:h-40 rounded-xl p-2.5 flex flex-col justify-between overflow-hidden relative transition group-hover/card:scale-[1.02]"
                >
                  {/* Category Title on Top */}
                  <h3 className="text-white text-xs sm:text-sm font-bold text-center leading-tight drop-shadow-xs">
                    {item.title}
                  </h3>

                  {/* Product Imagery at Bottom with Fixed Uniform Size */}
                  <div className="w-full flex items-center justify-center pb-1">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 p-1 shadow-xs flex items-center justify-center overflow-hidden border border-white/60">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover rounded-full transition group-hover/card:scale-110"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => scroll('right')}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 rounded-full border border-gray-200 bg-white p-2 shadow-md hover:bg-gray-50 text-gray-700 hover:text-[#ff6f61] transition hidden md:flex items-center justify-center cursor-pointer"
            aria-label="Next personal care categories"
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