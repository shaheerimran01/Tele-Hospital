'use client';

export default function AppDownloadBanner() {
  return (
    <section className="py-8 bg-white">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#edf5fd] via-[#f5f9fe] to-[#fef8f4] border border-[#e1ecf8] p-8 sm:p-10 lg:p-12 shadow-2xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* LEFT CONTENT */}
            <div className="lg:col-span-6 z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-snug">
                Download the Tabibistan app. Trusted healthcare, at your fingertips.
              </h2>

              <p className="mt-2.5 text-xs sm:text-sm text-gray-500 font-medium">
                Book tests, track reports, and get AI-powered health insights.
              </p>

              {/* Badges & QR Row */}
              <div className="mt-8 flex flex-wrap items-center gap-5">
                {/* Store Buttons Stack */}
                <div className="flex flex-col gap-2.5">
                  {/* App Store */}
                  <a
                    href="#download"
                    className="flex h-10 items-center gap-2.5 rounded-lg bg-black px-4 text-white hover:bg-gray-800 transition shadow-xs"
                  >
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.61 1.34-.56.64-1.04 1.69-.91 2.71 1 .08 2.02-.45 2.6-1.2z" />
                    </svg>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] text-gray-300 leading-none">
                        Download on the
                      </span>
                      <span className="text-xs font-bold leading-tight">
                        App Store
                      </span>
                    </div>
                  </a>

                  {/* Google Play */}
                  <a
                    href="#download"
                    className="flex h-10 items-center gap-2.5 rounded-lg bg-black px-4 text-white hover:bg-gray-800 transition shadow-xs"
                  >
                    <svg className="h-4 w-4 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M3 20.5v-17c0-.83.67-1.5 1.5-1.5.38 0 .73.14 1 .38l12.75 8.5c.67.45.85 1.35.4 2.02-.11.17-.25.3-.4.4L5.5 21.38c-.27.24-.62.38-1 .38-.83 0-1.5-.67-1.5-1.5z" />
                    </svg>
                    <div className="flex flex-col text-left">
                      <span className="text-[8px] text-gray-300 uppercase leading-none">
                        GET IT ON
                      </span>
                      <span className="text-xs font-bold leading-tight">
                        Google Play
                      </span>
                    </div>
                  </a>
                </div>

                <span className="text-xs font-medium text-gray-400">or</span>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 shadow-xs">
                  {/* SVG representation of standard QR code */}
                  <svg className="h-16 w-16" viewBox="0 0 100 100" fill="none">
                    {/* Top Left Marker */}
                    <rect x="10" y="10" width="30" height="30" rx="4" stroke="#ff574d" strokeWidth="6" fill="white" />
                    <rect x="20" y="20" width="10" height="10" fill="#ff574d" />
                    {/* Top Right Marker */}
                    <rect x="60" y="10" width="30" height="30" rx="4" stroke="#ff574d" strokeWidth="6" fill="white" />
                    <rect x="70" y="20" width="10" height="10" fill="#ff574d" />
                    {/* Bottom Left Marker */}
                    <rect x="10" y="60" width="30" height="30" rx="4" stroke="#ff574d" strokeWidth="6" fill="white" />
                    <rect x="20" y="70" width="10" height="10" fill="#ff574d" />
                    {/* Data pixels */}
                    <rect x="46" y="12" width="8" height="8" fill="#111827" />
                    <rect x="46" y="28" width="8" height="8" fill="#111827" />
                    <rect x="12" y="46" width="8" height="8" fill="#111827" />
                    <rect x="28" y="46" width="8" height="8" fill="#111827" />
                    <rect x="46" y="46" width="8" height="8" fill="#ff574d" />
                    <rect x="62" y="46" width="8" height="8" fill="#111827" />
                    <rect x="78" y="46" width="8" height="8" fill="#111827" />
                    <rect x="46" y="62" width="8" height="8" fill="#111827" />
                    <rect x="62" y="62" width="8" height="8" fill="#111827" />
                    <rect x="78" y="62" width="8" height="8" fill="#111827" />
                    <rect x="62" y="78" width="8" height="8" fill="#ff574d" />
                    <rect x="78" y="78" width="8" height="8" fill="#111827" />
                  </svg>
                </div>
              </div>
            </div>

            {/* RIGHT: Mockup Smartphones */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end gap-3 relative">
              {/* Phone 1: Home App Screen */}
              <div className="w-[190px] sm:w-[220px] rounded-3xl border-4 border-gray-800 bg-white shadow-xl overflow-hidden text-gray-800 flex flex-col scale-95 sm:scale-100">
                {/* Phone Notch / Status */}
                <div className="bg-gray-100 px-3 py-1.5 flex items-center justify-between border-b border-gray-200">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-gray-800">
                    <span className="text-[#ff574d]">📍</span>
                    <span>Gurugram</span>
                  </div>
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                </div>

                {/* In-app Search */}
                <div className="p-2 bg-gray-50 border-b border-gray-100">
                  <div className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[9px] text-gray-400 flex items-center justify-between">
                    <span>Search for &quot;full body checkup&quot;</span>
                    <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* App Quick Icons */}
                <div className="grid grid-cols-4 gap-1 p-2 border-b border-gray-100 text-center">
                  <div className="flex flex-col items-center">
                    <div className="h-6 w-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-[9px]">📞</div>
                    <span className="text-[7px] text-gray-600 mt-0.5">Book Call</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-6 w-6 rounded-md bg-pink-50 text-pink-600 flex items-center justify-center text-[9px]">📄</div>
                    <span className="text-[7px] text-gray-600 mt-0.5">Upload</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-6 w-6 rounded-md bg-green-50 text-green-600 flex items-center justify-center text-[9px]">💬</div>
                    <span className="text-[7px] text-gray-600 mt-0.5">Whatsapp</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-6 w-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center text-[9px]">📦</div>
                    <span className="text-[7px] text-gray-600 mt-0.5">Packages</span>
                  </div>
                </div>

                {/* Blood Tests / X-Ray pills */}
                <div className="flex gap-1.5 p-2">
                  <div className="flex-1 bg-gray-900 text-white rounded-lg p-1 text-[8px] font-bold text-center">
                    Blood Tests
                  </div>
                  <div className="flex-1 bg-gray-100 text-gray-700 rounded-lg p-1 text-[8px] font-bold text-center">
                    X-ray, Scans
                  </div>
                </div>

                {/* Lab Report Banner */}
                <div className="m-2 rounded-lg bg-red-50 border border-red-100 p-2 text-center">
                  <span className="text-[7px] uppercase font-bold text-red-600 block">
                    GET LAB REPORTS
                  </span>
                  <span className="text-xs font-black text-gray-900">
                    IN 6 HOURS
                  </span>
                </div>
              </div>

              {/* Phone 2: Health Overview / Health Score */}
              <div className="w-[190px] sm:w-[220px] rounded-3xl border-4 border-gray-800 bg-[#fff5f5] shadow-xl overflow-hidden text-gray-800 flex flex-col scale-95 sm:scale-100 -ml-8 mt-6">
                {/* Phone Header */}
                <div className="bg-white px-3 py-2 flex items-center justify-between border-b border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-900">Suraj Sharma</span>
                    <span className="text-[8px] text-gray-400">Select Profile</span>
                  </div>
                  <div className="h-4 w-4 rounded-full bg-gray-200" />
                </div>

                {/* Package Card */}
                <div className="m-2.5 rounded-xl bg-white p-2.5 shadow-2xs border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-900">Health Silver Package</span>
                    <span className="text-[9px] text-[#ff574d]">📥</span>
                  </div>
                  <span className="text-[8px] text-gray-400 block mt-0.5">on 30 Aug 23</span>
                </div>

                {/* Health Overview Gauge Box */}
                <div className="m-2.5 mt-0 rounded-2xl bg-white p-3 shadow-2xs border border-gray-100 text-center flex flex-col items-center">
                  <span className="text-[8px] font-extrabold text-gray-400 tracking-wider uppercase">
                    HEALTH OVERVIEW
                  </span>

                  {/* Radial Gauge Dots */}
                  <div className="my-2 relative flex flex-col items-center justify-center">
                    <div className="h-14 w-24 border-t-8 border-r-8 border-l-8 border-orange-400 rounded-t-full flex items-end justify-center pb-1">
                      <span className="text-2xl font-black text-gray-900">96</span>
                    </div>
                  </div>

                  <span className="text-[8px] text-gray-500 font-medium">
                    Your health score &gt;
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
