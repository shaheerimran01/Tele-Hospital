'use client';

export default function LabTestsHero() {
  return (
    <section className="py-8 bg-white">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 flex flex-col">
            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-[1.2]">
              Book lab tests online from trusted and certified labs
            </h1>

            {/* Big Search Bar */}
            <div className="mt-6 flex h-13 items-center rounded-full border border-gray-200 bg-white p-1.5 pl-4 shadow-sm hover:border-gray-300 transition">
              {/* Location */}
              <div className="flex items-center gap-1.5 pr-3 cursor-pointer shrink-0">
                <svg
                  className="h-4 w-4 text-[#ff574d]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs font-semibold text-gray-800">Gurgaon</span>
                <svg
                  className="h-3.5 w-3.5 text-[#ff6f61] ml-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="7" />
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                </svg>
              </div>

              {/* Divider */}
              <div className="h-5 w-[1px] bg-gray-300 mx-2" />

              {/* Search Input */}
              <input
                type="text"
                placeholder="Search tests or full body checkups"
                className="w-full bg-transparent text-xs sm:text-sm text-gray-800 outline-none placeholder:text-gray-500 pr-3"
              />

              {/* Red Round Search Button */}
              <button
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff574d] text-white hover:bg-[#e8453b] transition shadow-sm"
                aria-label="Search"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>

            {/* Quick Action Badges */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {/* Book via Phone */}
              <button className="flex items-center gap-2 rounded-xl border border-[#d2e8fa] bg-[#e8f3fc] px-4 py-2.5 text-xs font-semibold text-[#0066cc] hover:bg-[#d9ecfa] transition">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#0066cc] shadow-2xs">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.28-.28.36-.67.25-1.02A11.36 11.36 0 018.98 4c0-.55-.45-1-1-1H4.5c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM12 3v10l3-3h6V3h-9z" />
                  </svg>
                </div>
                <span>Book via Phone Call</span>
              </button>

              {/* Quick Order */}
              <button className="flex items-center gap-2 rounded-xl border border-[#fbd0d9] bg-[#fde8ec] px-4 py-2.5 text-xs font-semibold text-[#d93b65] hover:bg-[#fbdde4] transition">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#d93b65] shadow-2xs">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span>Quick Order</span>
              </button>

              {/* Book via Whatsapp */}
              <button className="flex items-center gap-2 rounded-xl border border-[#cbeed9] bg-[#e8f8f0] px-4 py-2.5 text-xs font-semibold text-[#16a34a] hover:bg-[#ddf4e7] transition">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#16a34a] shadow-2xs">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                </div>
                <span>Book via Whatsapp</span>
              </button>
            </div>

            {/* Find tests & packages for your needs Card */}
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold text-gray-900 mb-3.5">
                Find tests & packages for your needs
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {/* Full Body Packages (span 3) */}
                <div className="sm:col-span-3 flex items-center justify-between rounded-xl border border-gray-100 bg-[#f9fafb] p-3.5 hover:border-gray-200 hover:bg-white transition cursor-pointer group shadow-2xs">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 group-hover:text-[#ff574d] transition leading-tight">
                      Full Body
                    </h3>
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#ff574d] transition">
                      Packages
                    </span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e8f8f0] text-[#16a34a]">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h3v3M21 3h-3v3M3 21h3v-3M21 21h-3v-3" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>

                {/* X Rays, Scans & More (span 3) */}
                <div className="sm:col-span-3 flex items-center justify-between rounded-xl border border-gray-100 bg-[#f9fafb] p-3.5 hover:border-gray-200 hover:bg-white transition cursor-pointer group shadow-2xs">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 group-hover:text-[#ff574d] transition leading-tight">
                      X Rays, Scans &
                    </h3>
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#ff574d] transition">
                      More
                    </span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e8f3fc] text-[#0066cc]">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.8" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9c0 2 1 3 3 3s3-1 3-3M9 15c0-2 1-3 3-3s3 1 3 3M12 3v18" />
                    </svg>
                  </div>
                </div>

                {/* Fever Tests (span 2) */}
                <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-gray-100 bg-[#f9fafb] p-3 hover:border-gray-200 hover:bg-white transition cursor-pointer group shadow-2xs">
                  <span className="text-xs font-bold text-gray-900 group-hover:text-[#ff574d] transition">
                    Fever Tests
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f3fc] text-[#0066cc]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2c-1.1 0-2 .9-2 2v9.17c-1.22.91-2 2.36-2 3.83 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.47-.78-2.92-2-3.83V4c0-1.1-.9-2-2-2zm0 18c-1.66 0-3-1.34-3-3 0-.97.47-1.87 1.25-2.42.23-.17.38-.43.38-.72V5h2.74v8.86c0 .29.14.56.38.72.78.55 1.25 1.45 1.25 2.42 0 1.66-1.34 3-3 3z" />
                    </svg>
                  </div>
                </div>

                {/* Diabetes Tests (span 2) */}
                <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-gray-100 bg-[#f9fafb] p-3 hover:border-gray-200 hover:bg-white transition cursor-pointer group shadow-2xs">
                  <span className="text-xs font-bold text-gray-900 group-hover:text-[#ff574d] transition leading-tight">
                    Diabetes<br />Tests
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fde8ec] text-[#d93b65]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                </div>

                {/* Vitamins Tests (span 2) */}
                <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-gray-100 bg-[#f9fafb] p-3 hover:border-gray-200 hover:bg-white transition cursor-pointer group shadow-2xs">
                  <span className="text-xs font-bold text-gray-900 group-hover:text-[#ff574d] transition leading-tight">
                    Vitamins<br />Tests
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3e8ff] text-[#9333ea]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547" />
                      <circle cx="12" cy="12" r="4" strokeWidth="2" />
                      <circle cx="5" cy="8" r="2" />
                      <circle cx="19" cy="8" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 2x2 Photo Cards Grid */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
            {/* Card 1: NABL Certified Labs */}
            <div className="relative overflow-hidden rounded-2xl aspect-[4/3.3] group cursor-pointer shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80"
                alt="Trusted NABL certified labs"
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent flex flex-col justify-end p-3.5">
                <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Trusted NABL certified labs
                </h3>
                <p className="text-[10px] sm:text-[11px] text-gray-200 mt-0.5 font-normal">
                  Hygienic & safety assured testing
                </p>
              </div>
            </div>

            {/* Card 2: Wide Coverage Across India */}
            <div className="relative overflow-hidden rounded-2xl aspect-[4/3.3] group cursor-pointer shadow-sm bg-gray-900">
              <img
                src="https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80"
                alt="Wide coverage"
                className="h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              {/* Tabibistan Labs Logo Badge */}
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-black text-gray-900 tracking-wider">
                Tabibistan | <span className="font-semibold">Labs</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent flex flex-col justify-end p-3.5">
                <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Wide coverage across india
                </h3>
                <p className="text-[10px] sm:text-[11px] text-gray-200 mt-0.5 font-normal">
                  Most trusted service in 55+ cities
                </p>
              </div>
            </div>

            {/* Card 3: Home sample collection */}
            <div className="relative overflow-hidden rounded-2xl aspect-[4/3.3] group cursor-pointer shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=600&q=80"
                alt="Home sample collection"
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent flex flex-col justify-end p-3.5">
                <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Home sample collection
                </h3>
                <p className="text-[10px] sm:text-[11px] text-gray-200 mt-0.5 font-normal">
                  Safe pickup at your doorstep
                </p>
              </div>
            </div>

            {/* Card 4: Fast, accurate reports */}
            <div className="relative overflow-hidden rounded-2xl aspect-[4/3.3] group cursor-pointer shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80"
                alt="Fast, accurate reports"
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent flex flex-col justify-end p-3.5">
                <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Fast, accurate reports
                </h3>
                <p className="text-[10px] sm:text-[11px] text-gray-200 mt-0.5 font-normal">
                  Doctor-verified, delivered on time
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
