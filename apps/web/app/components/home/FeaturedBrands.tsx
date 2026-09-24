import Link from 'next/link';
import Image from 'next/image';

export default function FeaturedBrands() {
  const brands = [
    { 
      name: 'GSK Pakistan', 
      slug: 'gsk-pakistan',
      count: 68,
      logo: '/GSK-Logo-2014.png' // <-- Fixed path
    },
    { name: 'Getz Pharma', slug: 'getz-pharma', count: 49, logo: '/Getz-pharma-logo-vector.png'},
    { name: 'Unilever Pakistan', slug: 'unilever-pakistan', count: 25, logo: '/7c1c60e9afaaaa3cce61e5101717796d21b7f914-1426x1080.jpg' },
    { name: 'Abbott', slug: 'abbott', count: 31, logo: '/Abbott_Laboratories_logo.svg' },
    { name: 'Cipla', slug: 'cipla', count: 23, logo: '/Cipla_logo.svg' },
    { name: 'Sanofi Pakistan', slug: 'sanofi-pakistan', count: 27, logo: '/sanofi-logo-png_seeklogo-241329.png' },
    { name: 'Reckitt Benckiser', slug: 'reckitt-benckiser-pakistan', count: 26, logo: '/images.png' },
    { name: 'Hilton Pharma', slug: 'hilton-pharma', count: 20, logo: '/aazfinwh4.webp' },
    { name: 'Himalaya', slug: 'himalaya-drug-company', count: 18, logo: '/logo-aboutus.avif' },
    { name: 'Merck Pakistan', slug: 'merck-pakistan', count: 24, logo: '/images.jpg' },
  ];

  return (
    <section className="px-4 sm:px-6 py-4 bg-white border-b border-gray-100">
      <div className="mx-auto max-w-[1360px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Featured Brands
            </h2>
            <p className="text-xs text-gray-500 hidden sm:block">
              Top pharmaceutical & healthcare manufacturers
            </p>
          </div>

          <Link
            href="/brands"
            className="rounded-full border border-[#ff6f61] px-4 py-1 text-xs font-semibold text-[#ff6f61] hover:bg-[#ff6f61] hover:text-white transition inline-block"
          >
            See all
          </Link>
        </div>

        {/* Horizontal Sliding Container */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto scroll-smooth py-2 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brand/${brand.slug}`}
              className="flex-shrink-0 w-24 sm:w-28 flex flex-col items-center group cursor-pointer"
            >
              {/* Circular Badge Card */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-gray-200 bg-gray-50 p-3 flex items-center justify-center text-center shadow-2xs group-hover:border-[#ff6f61] group-hover:bg-red-50/20 group-hover:shadow-md transition-all duration-300 relative overflow-hidden">
                {brand.logo ? (
                  <Image 
                    src={brand.logo} 
                    alt={brand.name} 
                    width={64} 
                    height={64} 
                    className="object-contain max-h-12 w-auto"
                  />
                ) : (
                  <span className="text-[11px] sm:text-xs font-bold text-gray-700 group-hover:text-[#ff6f61] transition line-clamp-2 px-1">
                    {brand.name}
                  </span>
                )}
              </div>

              {/* Sub-label for product count */}
              <span className="text-[10px] text-gray-400 font-medium mt-1.5 group-hover:text-gray-600 transition">
                {brand.count}+ Products
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}