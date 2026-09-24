'use client';

export default function ConsultStats() {
  const stats = [
    {
      value: '30L+',
      label: 'Total Consultations',
    },
    {
      value: '3k+',
      label: 'Daily Consultations',
    },
    {
      value: '22+',
      label: 'Specialities',
    },
  ];

  return (
    <section className="py-4 bg-white">
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {stats.map((stat) => (
              <div key={stat.label} className="pt-4 first:pt-0 sm:pt-0 sm:px-4">
                <div className="text-3xl sm:text-4xl lg:text-[40px] font-black text-[#ff574d] tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-1.5 text-sm sm:text-base font-bold text-gray-800">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
