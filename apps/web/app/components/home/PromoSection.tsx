export default function PromoSection() {
  return (
    <section className="px-5 py-8">
      <div className="mx-auto grid max-w-[1280px] gap-5 md:grid-cols-2">

        <div className="rounded-xl bg-[#ffeded] p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#ff6b6b]">
            Tabibistan
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Better healthcare, better prices
          </h2>

          <p className="mt-3 max-w-[450px] text-sm leading-6 text-gray-600">
            Discover trusted healthcare products and services
            from the comfort of your home.
          </p>

          <button className="mt-6 rounded-md bg-[#ff6b6b] px-6 py-3 text-sm font-semibold text-white">
            Explore now
          </button>
        </div>

        <div className="rounded-xl bg-[#edf6ff] p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Healthcare at your fingertips
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Take control of your health
          </h2>

          <p className="mt-3 max-w-[450px] text-sm leading-6 text-gray-600">
            Shop medicines, book tests and connect with healthcare
            professionals in one place.
          </p>

          <button className="mt-6 rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white">
            Learn more
          </button>
        </div>

      </div>
    </section>
  );
}