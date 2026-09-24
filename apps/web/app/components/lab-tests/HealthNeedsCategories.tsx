'use client';

export default function HealthNeedsCategories() {
  const categories = [
    {
      name: 'Men',
      image:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      bgGradient: 'from-[#ffedd5] to-[#fed7aa]',
    },
    {
      name: 'Women',
      image:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      bgGradient: 'from-[#dbeafe] to-[#bfdbfe]',
    },
    {
      name: 'Liver & Kidney',
      image:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      bgGradient: 'from-[#ccfbf1] to-[#99f6e4]',
      badge: 'organ',
    },
    {
      name: 'Thyroid',
      image:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
      bgGradient: 'from-[#e0e7ff] to-[#c7d2fe]',
    },
    {
      name: 'Hormones',
      image:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      bgGradient: 'from-[#fce7f3] to-[#fbcfe8]',
    },
    {
      name: 'Allergy',
      image:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      bgGradient: 'from-[#cffafe] to-[#a5f3fc]',
    },
  ];

  return (
    <section className="py-8 bg-white">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 tracking-tight">
          Tests and packages for your health needs
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="flex flex-col items-center group cursor-pointer"
            >
              {/* Card Container */}
              <div
                className={`relative h-44 w-full overflow-hidden rounded-2xl bg-gradient-to-b ${cat.bgGradient} p-2 flex items-end justify-center shadow-2xs group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-1`}
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-38 w-full object-cover rounded-xl object-top filter contrast-[1.02]"
                  loading="lazy"
                />

                {/* Organ highlight badge if Liver & Kidney */}
                {cat.name === 'Liver & Kidney' && (
                  <div className="absolute bottom-4 right-4 bg-red-500/80 rounded-full p-1.5 text-white shadow-sm">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                )}

                {/* Throat highlight if Thyroid */}
                {cat.name === 'Thyroid' && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-500/80 rounded-full h-3.5 w-3.5 ring-4 ring-red-400/40 animate-pulse" />
                )}
              </div>

              {/* Title */}
              <span className="mt-2.5 text-center text-xs sm:text-sm font-semibold text-gray-800 group-hover:text-[#ff574d] transition">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
