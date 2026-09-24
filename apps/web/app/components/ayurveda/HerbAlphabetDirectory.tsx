'use client';

import { useState } from 'react';
import { azHerbDirectory } from './ayurvedaData';

export default function HerbAlphabetDirectory() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const [selectedLetter, setSelectedLetter] = useState('A');

  // Fallback to 'A' if selected letter doesn't have custom data
  const currentItems = azHerbDirectory[selectedLetter] || azHerbDirectory['A'];

  return (
    <section className="py-10 bg-[#fafafa] border-b border-gray-200">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Title */}
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 tracking-tight">
          Starting with - {selectedLetter}
        </h2>

        {/* Alphabet Filter Bar */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 p-3 rounded-xl border border-gray-200 bg-white shadow-2xs mb-8 overflow-x-auto">
          {alphabet.map((letter) => {
            const isSelected = selectedLetter === letter;
            return (
              <button
                key={letter}
                onClick={() => setSelectedLetter(letter)}
                className={`flex h-8 w-8 items-center justify-center rounded border text-xs font-bold transition cursor-pointer shrink-0 ${
                  isSelected
                    ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                }`}
                aria-label={`Show herbs starting with ${letter}`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* 5-Column Grid of Herb Directory Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
          {currentItems.map((herb) => (
            <div
              key={herb.name}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 shadow-2xs hover:shadow-xs hover:border-gray-300 transition group cursor-pointer"
            >
              {/* Thumbnail Image */}
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-gray-100">
                <img
                  src={herb.image}
                  alt={herb.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              </div>

              {/* Text Info */}
              <div className="flex flex-col min-w-0 flex-1">
                <h3 className="text-xs font-bold text-[#ff574d] group-hover:text-[#e8453b] transition truncate leading-snug">
                  {herb.name}
                </h3>
                <p className="text-[10px] leading-snug text-gray-500 line-clamp-2 mt-0.5 font-normal">
                  {herb.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
