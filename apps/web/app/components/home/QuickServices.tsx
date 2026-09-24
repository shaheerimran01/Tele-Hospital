const services = [
  {
    icon: '💊',
    title: 'Pharmacy',
    text: 'Buy medicines',
  },
  {
    icon: '🧪',
    title: 'Lab Tests',
    text: 'Book tests',
  },
  {
    icon: '🐾',
    title: 'Pet Care',
    text: 'Care for pets',
  },
  {
    icon: '👨‍⚕️',
    title: 'Consults',
    text: 'Talk to a doctor',
  },
  {
    icon: '💉',
    title: 'Vaccines',
    text: 'Adult vaccines',
  },
  {
    icon: '📖',
    title: 'Health Insights',
    text: 'Learn & explore',
  },
  {
    icon: '❤️',
    title: 'Health Plans',
    text: 'Plans for you',
  },
];

export default function QuickServices() {
  return (
    <section className="bg-white px-5 pb-8">
      <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {services.map((service) => (
          <button
            key={service.title}
            className="group rounded-lg border border-gray-100 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1f1] text-2xl">
              {service.icon}
            </div>

            <div className="mt-3 text-sm font-semibold text-gray-800">
              {service.title}
            </div>

            <div className="mt-1 text-[11px] text-gray-500">
              {service.text}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}