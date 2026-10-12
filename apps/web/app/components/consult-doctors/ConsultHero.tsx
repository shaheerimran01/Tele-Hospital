'use client';

import Link from 'next/link';

export default function ConsultHero() {
  return (
    <section className="py-10 lg:py-14 bg-white overflow-hidden">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* LEFT CONTENT */}
          <div className="lg:col-span-7 flex flex-col">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-gray-900 tracking-tight leading-[1.2]">
              Online doctor consultation with qualified doctors
            </h1>

            <p className="mt-3 text-lg sm:text-xl font-semibold text-gray-700">
              Starting at ₹199
            </p>

            {/* 3 Key Feature Icons in a Row */}
            <div className="mt-7 flex flex-wrap items-center gap-6 sm:gap-8">
              {/* Feature 1: Talk within 30 min */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ff6f61] border border-orange-100">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15 15" />
                    <line x1="12" y1="2" x2="12" y2="4" strokeWidth="2.5" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-800 leading-snug">
                  Talk within 30 min
                </span>
              </div>

              {/* Feature 2: Free follow up for 3 days */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-800 leading-snug">
                  Free follow up for 3 days
                </span>
              </div>

              {/* Feature 3: Get a valid prescription */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#ff574d] border border-rose-100">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    <text x="8" y="10" fontSize="6" fontWeight="bold" fill="currentColor">Rx</text>
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-800 leading-snug">
                  Get a valid prescription
                </span>
              </div>
            </div>

            {/* Consult Now CTA Button */}
            <div className="mt-8">
              <Link
                href="/consult-doctors/intake"
                className="inline-block rounded-md bg-[#ff6b6b] px-8 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#ff5252] transition cursor-pointer"
              >
                Consult now
              </Link>
            </div>
          </div>

          {/* RIGHT ILLUSTRATION */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px]">
              {/* Soft circular background backdrop */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#fff7ed] via-[#fef3c7] to-[#fffbeb] rounded-full filter blur-2xl opacity-70 -z-10" />

              {/* SVG Doctor Video Call Scene */}
              <svg
                viewBox="0 0 420 320"
                className="w-full h-auto drop-shadow-sm"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Wall calendar / Chart */}
                <rect x="350" y="40" width="35" height="42" rx="4" fill="#fef3c7" stroke="#374151" strokeWidth="2" />
                <rect x="350" y="40" width="35" height="10" fill="#f59e0b" />
                <circle cx="360" cy="60" r="2.5" fill="#d97706" />
                <circle cx="370" cy="60" r="2.5" fill="#d97706" />
                <circle cx="360" cy="70" r="2.5" fill="#d97706" />
                <circle cx="370" cy="70" r="2.5" fill="#d97706" />

                {/* Patient Bed Frame */}
                <rect x="50" y="240" width="310" height="16" rx="3" fill="#e5e7eb" stroke="#374151" strokeWidth="2.5" />
                {/* Bed legs */}
                <line x1="60" y1="256" x2="60" y2="280" stroke="#374151" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="350" y1="256" x2="350" y2="280" stroke="#374151" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="205" y1="256" x2="205" y2="280" stroke="#374151" strokeWidth="3" strokeLinecap="round" />

                {/* Yellow Bed Blanket */}
                <path
                  d="M55 240 Q75 190 120 195 Q180 185 240 190 Q290 185 350 240 Z"
                  fill="#fde68a"
                  stroke="#374151"
                  strokeWidth="2.5"
                />
                {/* Pillow */}
                <rect x="320" y="165" width="30" height="50" rx="8" fill="#f3f4f6" stroke="#374151" strokeWidth="2" />

                {/* Patient Sitting up */}
                {/* Hair */}
                <circle cx="335" cy="145" r="14" fill="#1f2937" />
                <circle cx="347" cy="147" r="6" fill="#1f2937" />
                {/* Face */}
                <circle cx="330" cy="148" r="9" fill="#fcd34d" />
                {/* Body / Pajamas */}
                <path d="M315 160 C310 180 300 215 295 230 L340 230 C345 200 345 175 340 160 Z" fill="#047857" stroke="#374151" strokeWidth="2" />
                {/* Hand holding phone */}
                <path d="M310 185 L285 180" stroke="#374151" strokeWidth="4" strokeLinecap="round" />
                {/* Mobile Phone */}
                <rect x="280" y="165" width="12" height="22" rx="2" fill="#ef4444" stroke="#374151" strokeWidth="2" transform="rotate(-15 280 165)" />

                {/* Video Call Screen with Doctor on the left */}
                <rect x="40" y="20" width="165" height="135" rx="14" fill="#ffffff" stroke="#374151" strokeWidth="2.5" />
                {/* Doctor Head */}
                <circle cx="95" cy="65" r="16" fill="#fed7aa" stroke="#374151" strokeWidth="2" />
                {/* Doctor Hair & Glasses */}
                <path d="M80 60 Q95 45 110 60" fill="#1f2937" />
                <rect x="85" y="62" width="8" height="6" rx="1" fill="none" stroke="#374151" strokeWidth="1.5" />
                <rect x="97" y="62" width="8" height="6" rx="1" fill="none" stroke="#374151" strokeWidth="1.5" />
                <line x1="93" y1="65" x2="97" y2="65" stroke="#374151" strokeWidth="1.5" />
                {/* Doctor Coat & Stethoscope */}
                <path d="M65 130 C65 95 80 85 95 85 C110 85 125 95 125 130 Z" fill="#ffffff" stroke="#374151" strokeWidth="2" />
                <path d="M85 88 C85 105 105 105 105 88" fill="none" stroke="#dc2626" strokeWidth="2" />
                <circle cx="95" cy="107" r="3" fill="#9ca3af" />
                {/* Doctor Hand Wave */}
                <path d="M125 105 Q140 95 145 80" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="146" cy="78" r="4" fill="#fed7aa" />

                {/* Medical monitor in background */}
                <rect x="145" y="35" width="45" height="35" rx="3" fill="#f3f4f6" stroke="#374151" strokeWidth="1.5" />
                <path d="M150 55 H160 L163 48 L168 62 L172 52 L175 55 H185" fill="none" stroke="#10b981" strokeWidth="1.5" />

                {/* Speech Bubbles */}
                <path d="M215 50 H275 Q285 50 285 60 V75 Q285 85 275 85 H235 L220 95 V85 H215 Q205 85 205 75 V60 Q205 50 215 50 Z" fill="#ffffff" stroke="#374151" strokeWidth="2" />
                <line x1="218" y1="63" x2="265" y2="63" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
                <line x1="218" y1="73" x2="250" y2="73" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
