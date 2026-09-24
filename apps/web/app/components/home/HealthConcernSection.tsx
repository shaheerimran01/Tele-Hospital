'use client';

import Link from 'next/link';

export default function HealthConcerns() {
  const concerns = [
    {
      title: 'Diabetes',
      slug: 'diabetes',
      image: 'https://img.magnific.com/free-photo/hand-holding-blood-glucose-meter-measuring-blood-sugar-background-is-stethoscope-chart-file_1387-942.jpg',
    },
    {
      title: 'Heart Care',
      slug: 'heart-care',
      image: 'https://www.aimsindia.com/wp-content/uploads/2021/03/shutterstock_275225072-1.jpg',
    },
    {
      title: 'Stomach Care',
      slug: 'stomach-care',
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4bnsqyC-bosprJjZfqeHCuYj2D__v9_X67KN28WkQwvPrcLkBQ4nCPeC8&s=10',
    },
    {
      title: 'Liver Care',
      slug: 'liver-care',
      image: 'https://www.apollospectra.com/backend/web/uploads/1785189098.jpg',
    },
    {
      title: 'Bone & Joint Care',
      slug: 'bone-joint-care',
      image: 'https://nutraceuticalbusinessreview.com/bone-and-joint-health-ingredients-for.jpg',
    },
    {
      title: 'Kidney Care',
      slug: 'kidney-care',
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQENXwICSKB-4OyU7_kxhHpJw7yvOaGZf250zOmnoRxv20oL8A2JYiF98Y&s=10',
      fallbackBg: 'bg-[#fedfe9]',
    },
    {
      title: 'Derma Care',
      slug: 'derma-care',
      image: 'https://img.magnific.com/free-photo/woman-applying-face-cream_1303-14311.jpg?semt=ais_hybrid&w=740&q=80',
    },
    {
      title: 'Respiratory Care',
      slug: 'respiratory-care',
      image: 'https://healthprofessions.stonybrookmedicine.edu/sites/default/files/cckimages/Respiratory-Care-Program-mobile.jpg',
      fallbackBg: 'bg-[#e0f2fe]',
    },
  ];

  return (
    <section className="px-4 sm:px-6 py-4 bg-white">
      <div className="mx-auto max-w-[1360px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Shop by Health Concerns
          </h2>
        </div>

        {/* 8 Categories grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4 text-center">
          {concerns.map((item) => (
            <Link
              key={item.title}
              href={`/health-concern/${item.slug}`}
              className="group flex flex-col items-center text-center cursor-pointer"
            >
              <div
                className={`h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-2xl border border-gray-100 shadow-xs transition group-hover:scale-105 group-hover:shadow-md ${
                  item.fallbackBg || 'bg-gray-100'
                }`}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <span className="mt-2 text-xs font-semibold text-gray-800 leading-tight group-hover:text-[#ff6f61] transition">
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}