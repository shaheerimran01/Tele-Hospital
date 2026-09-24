const items = [
  'Buy medicines',
  'Buy health products',
  'Book lab tests',
  'Consult a doctor',
  'Tabibistan Care Plan',
];

export default function PrimaryNavigation() {
  return (
    <nav className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-[1280px] items-center gap-8 overflow-x-auto px-5 py-4">
        {items.map((item) => (
          <button
            key={item}
            className="whitespace-nowrap text-sm font-medium text-gray-700 transition hover:text-[#ff6b6b]"
          >
            {item}
          </button>
        ))}
      </div>
    </nav>
  );
}