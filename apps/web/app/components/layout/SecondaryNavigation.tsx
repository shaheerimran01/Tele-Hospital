const items = [
  'Cancer Care',
  'Ayurveda',
  'Partnerships',
  'Health Articles',
  'Offers',
  'All diseases',
  'All medicines',
  'Medicines by therapeutic class',
];

export default function SecondaryNavigation() {
  return (
    <nav className="border-b border-gray-200 bg-[#fafafa]">
      <div className="mx-auto flex max-w-[1280px] items-center gap-7 overflow-x-auto px-5 py-3">
        {items.map((item, index) => (
          <button
            key={item}
            className="whitespace-nowrap text-xs text-gray-600 hover:text-[#ff6b6b]"
          >
            {item}
            {index === 2 && (
              <span className="ml-1 rounded bg-[#ff6b6b] px-1 py-0.5 text-[8px] text-white">
                NEW
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}