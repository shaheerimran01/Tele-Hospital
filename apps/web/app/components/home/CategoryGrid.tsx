type Props = {
  title: string;
  categories: string[];
};

const icons = [
  '🧴',
  '💇',
  '💊',
  '🌿',
  '🥗',
  '🩹',
  '🩺',
  '🧬',
  '🥛',
  '🐾',
];

export default function CategorySection({
  title,
  categories,
}: Props) {
  return (
    <section className="px-5 py-7">
      <div className="mx-auto max-w-[1280px]">

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {title}
            </h2>

            <div className="mt-2 h-1 w-10 rounded bg-[#ff6b6b]" />
          </div>

          <button className="text-sm font-semibold text-[#ff6b6b]">
            See all
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {categories.map((category, index) => (
            <button
              key={category}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#f9f9f9] text-4xl">
                {icons[index % icons.length]}
              </div>

              <p className="mt-4 text-center text-xs font-medium text-gray-700">
                {category}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}