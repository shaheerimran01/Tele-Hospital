export default function LabTestsSection() {
  const packages = [
    {
      lab: 'LabPath',
      title: 'Essential Health Package',
      testsCount: '56 tests included',
      price: 'Rs2,700',
      originalPrice: 'Rs4,500',
      discount: '40% off',
    },
    {
      lab: 'Medlab',
      title: 'Full Body Checkup Premium',
      testsCount: '82 tests included',
      price: 'Rs3,850',
      originalPrice: 'Rs7,000',
      discount: '45% off',
    },
    {
      lab: 'Vitalab',
      title: 'Diabetes Screening Panel',
      testsCount: '12 tests included',
      price: 'Rs1,320',
      originalPrice: 'Rs2,200',
      discount: '40% off',
    },
    {
      lab: 'Cardiolab',
      title: 'Heart Health Complete',
      testsCount: '34 tests included',
      price: 'Rs3,300',
      originalPrice: 'Rs6,000',
      discount: '45% off',
    },
  ];

  return (
    <section className="px-4 sm:px-6 py-5 bg-white">
      <div className="mx-auto max-w-[1360px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Full Body Health Checkups
          </h2>

          <button className="rounded-full border border-[#ff6f61] px-4 py-1 text-xs font-semibold text-[#ff6f61] hover:bg-[#ff6f61] hover:text-white transition">
            See all
          </button>
        </div>

        {/* 4 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.title}
              className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-2xs hover:shadow-md transition"
            >
              <div>
                {/* Badges */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded bg-[#eff6ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">
                    {pkg.lab}
                  </span>
                  <span className="flex items-center gap-0.5 rounded bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#10b981]">
                    ✓ SAFE
                  </span>
                </div>

                {/* Title & tests */}
                <h3 className="text-sm font-bold text-gray-900 leading-snug">
                  {pkg.title}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {pkg.testsCount}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-gray-100">
                {/* Pricing */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-base font-extrabold text-gray-900">
                    {pkg.price}
                  </span>
                  <span className="text-xs text-gray-400 line-through">
                    {pkg.originalPrice}
                  </span>
                  <span className="text-xs font-bold text-[#10b981]">
                    {pkg.discount}
                  </span>
                </div>

                {/* Book Now Button */}
                <button className="w-full rounded-md border border-[#ff6f61] py-2 text-xs font-bold text-[#ff6f61] hover:bg-[#ff6f61] hover:text-white transition">
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}