'use client';

export default function HowItWorksSteps() {
  const steps = [
    {
      number: 1,
      title: 'Easy online booking',
      description:
        'Search for tests and packages, book your preferred time slot and enter your address for seamless at-home lab tests.',
      image:
        'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=400&q=80',
    },
    {
      number: 2,
      title: 'Live tracking of phlebotomist',
      description:
        "Track our trained phlebotomist's real time location for seamless sample collection.",
      image:
        'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=400&q=80',
    },
    {
      number: 3,
      title: 'Safe Sample Collection',
      description:
        'Our phlebotomists follow strict safety protocols to collect samples safely at home and on time.',
      image:
        'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=400&q=80',
    },
    {
      number: 4,
      title: 'Sample received at lab',
      description:
        'Samples are transported securely to our accredited labs with world-class machines for testing by qualified experts.',
      image:
        'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=400&q=80',
    },
    {
      number: 5,
      title: 'Quick, Doctor-Verified Reports',
      description:
        'Get doctor-approved reports via email and WhatsApp, with options for doctor follow-ups and AI insights.',
      image:
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80',
    },
  ];

  return (
    <section className="py-10 bg-white">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 tracking-tight">
          How does home sample collection work?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:shadow-md transition-shadow"
            >
              {/* Image with Step Number Overlay */}
              <div className="relative h-44 w-full overflow-hidden rounded-xl bg-gray-100">
                <img
                  src={step.image}
                  alt={step.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {/* Large Dark Step Number Badge */}
                <div className="absolute top-2 left-2 flex h-11 w-9 items-center justify-center rounded-lg bg-black/65 backdrop-blur-xs text-white font-extrabold text-2xl shadow-md">
                  {step.number}
                </div>
              </div>

              {/* Title */}
              <h3 className="mt-4 text-sm font-bold text-gray-900 leading-snug">
                {step.title}
              </h3>

              {/* Description */}
              <p className="mt-2 text-xs text-gray-500 leading-relaxed font-normal">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
