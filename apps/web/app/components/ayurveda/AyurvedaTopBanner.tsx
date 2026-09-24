'use client';

export default function AyurvedaTopBanner() {
  return (
    <div className="border-b border-[#fed7aa]/50 bg-gradient-to-r from-[#fffbf5] via-[#fff7ed] to-[#fffbf5] py-3 px-4 sm:px-6">
      <div className="mx-auto max-w-[1360px] flex flex-wrap items-center justify-between gap-4">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold tracking-tight text-emerald-800 font-serif">
              حکمت
            </span>
            <span className="text-[10px] text-gray-500 font-medium ml-1">
              Powered by
            </span>
          </div>

          <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
            <span className="text-xs font-black tracking-wider text-[#15803d]">
              QARSHI
            </span>
            <span className="text-xs text-gray-400">&amp;</span>
            <span className="text-xs font-bold text-gray-900">
              Tabib<span className="text-[#ff6f61]">istan</span>
            </span>
          </div>
        </div>

        {/* Center / Right: Read more in Urdu CTA */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs sm:text-sm font-medium text-gray-800">
            To read more about Ayurveda in{' '}
            <span className="font-bold text-gray-900">urdu</span>
          </span>

          <button className="rounded-md bg-[#ff6b6b] px-6 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#ff5252] transition cursor-pointer uppercase tracking-wider">
            Click Here
          </button>
        </div>
      </div>
    </div>
  );
}
