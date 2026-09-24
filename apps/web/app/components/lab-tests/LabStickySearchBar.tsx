'use client';

import { useState, useEffect } from 'react';

export default function LabStickySearchBar() {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // When scrolled past the hero search bar (~220px), make it sticky at top
      if (window.scrollY > 200) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`transition-all duration-200 z-40 bg-white ${
        isSticky
          ? 'fixed top-0 left-0 right-0 py-2.5 shadow-md border-b border-gray-200 backdrop-blur-md bg-white/95'
          : 'relative py-2 border-b border-gray-100 bg-white'
      }`}
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        <div className="flex h-11 items-center rounded-md border border-gray-300 bg-white px-3 shadow-2xs hover:border-gray-400 transition">
          {/* Location Picker */}
          <div className="flex items-center gap-1.5 pr-3 cursor-pointer shrink-0">
            <svg
              className="h-4 w-4 text-[#ff574d]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-semibold text-gray-800">Gurgaon</span>
            <svg
              className="h-3.5 w-3.5 text-[#ff6f61] ml-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="7" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </div>

          {/* Divider */}
          <div className="h-5 w-[1px] bg-gray-300 mx-1" />

          {/* Search Input */}
          <div className="flex flex-1 items-center gap-2 pl-2">
            <svg
              className="h-4 w-4 text-gray-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search tests or full body checkups"
              className="w-full bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
