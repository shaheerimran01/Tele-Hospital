'use client';

export default function RadiologySection() {
  const tests = [
    {
      name: 'CT Scan',
      image:
        'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'ECG',
      image:
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'X-Ray',
      image:
        'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Ultrasound',
      image:
        'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'MRI',
      image:
        'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Echo Test',
      image:
        'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80',
    },
  ];

  return (
    <section className="py-8 bg-white">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 tracking-tight">
          Radiology tests, x-rays &amp; scans
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {tests.map((test) => (
            <div
              key={test.name}
              className="flex flex-col items-center group cursor-pointer"
            >
              {/* Card Container with peach/coral background */}
              <div className="h-44 w-full overflow-hidden rounded-2xl bg-[#ffede6] p-2 flex items-center justify-center shadow-2xs group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-1">
                <img
                  src={test.image}
                  alt={test.name}
                  className="h-full w-full object-cover rounded-xl"
                  loading="lazy"
                />
              </div>

              {/* Title */}
              <span className="mt-2.5 text-center text-xs sm:text-sm font-semibold text-gray-800 group-hover:text-[#ff574d] transition">
                {test.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
