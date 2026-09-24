export default function HeroSection() {
  return (
    <section className="px-4 sm:px-6 pt-4 pb-2 bg-white">
      <div className="mx-auto max-w-[1360px]">
        {/* Two Main Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Banner 1: Health Checkups */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2563eb] via-[#3b82f6] to-[#60a5fa] p-6 sm:p-8 text-white min-h-[220px] flex flex-col justify-between shadow-sm">
            {/* Background Doctor Illustration/Image overlay */}
            <div
              className="absolute right-0 top-0 bottom-0 w-[48%] bg-cover bg-center bg-no-repeat opacity-95 pointer-events-none"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=700&q=80')`,
                maskImage: 'linear-gradient(to right, transparent, black 30%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)',
              }}
            />

            <div className="relative z-10 max-w-[320px]">
              <span className="inline-block rounded-full bg-[#1e3a8a]/60 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-100 backdrop-blur-xs mb-3">
                HEALTH CHECKUPS
              </span>

              <h2 className="text-xl sm:text-2xl font-extrabold leading-tight tracking-tight text-white">
                Prioritize Your Health &amp; Stay Ahead of Risks
              </h2>

              <p className="mt-2 text-sm font-semibold text-blue-50">
                <span className="text-[#fde047] font-bold">Enjoy up to 50% off</span> on full body checkups
              </p>
            </div>

            {/* Slider Arrow Icon */}
            <div className="relative z-10 pt-4">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#2563eb] shadow-md hover:bg-gray-100 transition"
                aria-label="Next slide"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Banner 2: Weight Management */}
          <div className="relative overflow-hidden rounded-2xl bg-[#1a1f2e] p-6 sm:p-8 text-white min-h-[220px] flex flex-col justify-between shadow-sm">
            {/* Doctor photo overlay on right */}
            <div
              className="absolute right-0 top-0 bottom-0 w-[45%] bg-cover bg-top bg-no-repeat opacity-90 pointer-events-none"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=700&q=80')`,
                maskImage: 'linear-gradient(to right, transparent, black 25%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 25%)',
              }}
            />

            <div className="relative z-10 max-w-[340px]">
              <h2 className="text-xl sm:text-2xl font-extrabold leading-tight text-white">
                Let&apos;s talk weight <br />
                <span className="text-[#ff6f61]">Responsibly</span>
              </h2>

              {/* Tags */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['Obesity', 'Metabolic Imbalance', 'Heart Diseases', 'PCOS/PCOD'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-gray-600/70 bg-[#262c3e]/80 px-2.5 py-0.5 text-[10px] text-gray-300 backdrop-blur-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Book a consult button */}
            <div className="relative z-10 pt-4">
              <button className="rounded-lg bg-white px-5 py-2 text-xs font-bold text-gray-900 shadow hover:bg-gray-100 transition">
                Book a Consult
              </button>
            </div>
          </div>
        </div>

        {/* Carousel indicator dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <span className="h-1.5 w-6 rounded-full bg-[#ff574d]" />
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
        </div>

        {/* Platform Title */}
        <div className="text-center mt-7 mb-2">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
            Tabibistan: Pakistan&apos;s Leading Online Pharmacy &amp; Healthcare Platform
          </h1>
        </div>
      </div>
    </section>
  );
}