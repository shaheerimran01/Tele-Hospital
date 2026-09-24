export default function QuickOrder() {
  return (
    <section className="bg-white px-5 pb-8">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-5 rounded-xl bg-[#fff5f5] px-7 py-6 md:flex-row">

        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
            📄
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Upload your prescription
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Upload your prescription and get your medicines delivered.
            </p>
          </div>
        </div>

        <button className="rounded-md bg-[#ff6b6b] px-8 py-3 text-sm font-semibold text-white">
          Order now
        </button>
      </div>
    </section>
  );
}