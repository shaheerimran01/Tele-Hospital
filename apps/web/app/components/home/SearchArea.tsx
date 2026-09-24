export default function SearchArea() {
  return (
    <section className="bg-white px-5 py-7">
      <div className="mx-auto max-w-[1000px] text-center">

        <h1 className="text-2xl font-semibold text-gray-900">
          Your health, our priority
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Search medicines, health products, lab tests and more
        </p>

        <div className="mx-auto mt-5 flex h-14 max-w-[760px] items-center rounded-md border border-gray-300 bg-white px-5 shadow-sm">
          <span className="mr-3 text-2xl text-gray-400">
            ⌕
          </span>

          <input
            placeholder="Search medicines, products, tests..."
            className="w-full text-sm outline-none"
          />

          <button className="rounded-md bg-[#ff6b6b] px-7 py-2.5 text-sm font-semibold text-white">
            Search
          </button>
        </div>
      </div>
    </section>
  );
}