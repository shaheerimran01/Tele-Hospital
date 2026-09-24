'use client';

import { HerbItem } from './ayurvedaData';

interface HerbalCategoryRowProps {
  title: string;
  items: HerbItem[];
}

export default function HerbalCategoryRow({
  title,
  items,
}: HerbalCategoryRowProps) {
  return (
    <section className="py-6 bg-white border-b border-gray-100">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Category Header */}
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 tracking-tight">
          {title}
        </h2>

        {/* 10 Items Row (Grid on XL, Horizontal Scroll on smaller screens) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-3 sm:gap-3.5">
          {items.map((herb) => (
            <div
              key={herb.name}
              className="flex flex-col group cursor-pointer"
            >
              {/* Image Container */}
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 shadow-2xs group-hover:shadow-md transition-all duration-200">
                <img
                  src={herb.image}
                  alt={herb.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>

              {/* Title */}
              <h3 className="mt-2 text-xs font-bold text-gray-900 group-hover:text-[#ff574d] transition leading-tight line-clamp-1">
                {herb.name}
              </h3>

              {/* Excerpt */}
              <p className="mt-1 text-[10px] leading-relaxed text-gray-500 line-clamp-2">
                {herb.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
