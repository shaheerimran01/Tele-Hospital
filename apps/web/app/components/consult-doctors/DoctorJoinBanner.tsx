'use client';

export default function DoctorJoinBanner() {
  return (
    <section className="bg-[#faf4eb] py-14 border-t border-[#f0e6d5]">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Illustration: Doctor */}
          <div className="md:col-span-5 flex justify-center">
            <div className="relative w-48 sm:w-56">
              {/* Doctor Avatar Illustration with Stethoscope and Clipboard */}
              <svg viewBox="0 0 200 200" className="w-full h-auto drop-shadow-sm" fill="none">
                {/* Circular soft blue glow */}
                <circle cx="100" cy="95" r="55" fill="#e0f2fe" />

                {/* Doctor Head */}
                <circle cx="100" cy="70" r="22" fill="#38bdf8" />
                {/* Hair */}
                <path d="M80 65 Q100 45 120 65 Q115 52 100 50 Q85 52 80 65 Z" fill="#1e3a8a" />
                {/* Neck */}
                <rect x="94" y="90" width="12" height="14" fill="#38bdf8" />

                {/* Doctor White Coat */}
                <path
                  d="M60 170 C60 115 80 102 100 102 C120 102 140 115 140 170 Z"
                  fill="#ffffff"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                />

                {/* Shirt & Stethoscope */}
                <path d="M92 102 L100 118 L108 102 Z" fill="#0284c7" />
                {/* Stethoscope around neck */}
                <path
                  d="M86 108 C86 130 114 130 114 108"
                  stroke="#64748b"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <line x1="100" y1="126" x2="100" y2="138" stroke="#64748b" strokeWidth="3" />
                <circle cx="100" cy="142" r="5" fill="#94a3b8" />

                {/* Desk with Paper and Pen */}
                <polygon points="40,165 160,165 175,185 25,185" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                {/* Prescription Paper */}
                <rect x="80" y="152" width="40" height="28" rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" transform="rotate(-5 80 152)" />
                <line x1="84" y1="160" x2="114" y2="158" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                <line x1="84" y1="166" x2="110" y2="164" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                {/* Yellow Pencil */}
                <line x1="120" y1="150" x2="130" y2="165" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Right Content */}
          <div className="md:col-span-7 flex flex-col text-center md:text-left items-center md:items-start">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Are you a doctor ?
            </h2>

            <p className="mt-2.5 text-sm sm:text-base text-gray-600 font-medium max-w-md leading-relaxed">
              Be a part of our panel of specialists and connect with your patients from anywhere.
            </p>

            <div className="mt-6">
              <button className="rounded-md bg-[#ff6b6b] px-8 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#ff5252] transition cursor-pointer">
                Join Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
