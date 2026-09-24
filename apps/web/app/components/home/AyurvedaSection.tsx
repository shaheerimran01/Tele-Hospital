export default function AyurvedaSection() {
  const herbs = [
    {
      name: 'Chyawanprash',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
      description: 'Ancient Ayurvedic tonic for immunity, energy and vitality made with amla and 40+ herbs.',
    },
    {
      name: 'Ashwagandha',
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=400&q=80',
      description: 'Adaptogenic root for stress relief, improved sleep and enhanced physical endurance.',
    },
    {
      name: 'Triphala',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
      description: 'Three-fruit formula for digestive balance, detoxification and gut microbiome support.',
    },
    {
      name: 'Shatavari',
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
      description: "Women's herb for hormonal balance, reproductive health and natural lactation support.",
    },
    {
      name: 'Giloy (Guduchi)',
      image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80',
      description: 'Fever-fighting immunomodulator with anti-inflammatory and antioxidant properties.',
    },
    {
      name: 'Haritaki',
      image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=400&q=80',
      description: 'Rejuvenating fruit used for digestion, cognitive clarity and respiratory wellness.',
    },
  ];

  return (
    <section id="ayurveda" className="px-4 sm:px-6 py-5 bg-white">
      <div className="mx-auto max-w-[1360px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 section-title-underlined">
            Ayurveda
          </h2>

          <button className="rounded-full border border-[#ff6f61] px-4 py-1 text-xs font-semibold text-[#ff6f61] hover:bg-[#ff6f61] hover:text-white transition cursor-pointer">
            See all
          </button>
        </div>

        {/* 6 Herbal Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {herbs.map((item) => (
            <div
              key={item.name}
              className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xs hover:shadow-md transition"
            >
              <div className="h-32 w-full overflow-hidden bg-gray-100">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover transition hover:scale-105"
                />
              </div>

              <div className="p-3">
                <h3 className="text-xs font-bold text-gray-900">
                  {item.name}
                </h3>
                <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
