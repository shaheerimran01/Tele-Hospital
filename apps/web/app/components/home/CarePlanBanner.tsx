export default function CarePlanBanner() {
  return (
    <section className="px-4 sm:px-6 py-4 bg-white">
      <div className="mx-auto max-w-[1360px]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-[#ffece4] px-6 py-4 border border-[#ffdcd0]">
          <div className="flex items-center gap-4 text-left">
            {/* Avatar image */}
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80"
                alt="Member avatar"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Text details */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded bg-[#501314] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  CARE PLAN
                </span>
                <span className="text-xs text-gray-700">
                  now starting at <strong className="font-bold text-gray-900">Rs165</strong> for 3 months
                </span>
              </div>

              <p className="mt-1 text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                Get extra 5% savings on your orders. Free shipping, same-day delivery and more.
              </p>

              <p className="text-[11px] text-gray-500">
                Become a member today!
              </p>
            </div>
          </div>

          {/* Know More Button */}
          <button className="shrink-0 rounded-lg bg-[#501314] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#3f0f10] transition shadow-sm">
            Know More
          </button>
        </div>
      </div>
    </section>
  );
}
