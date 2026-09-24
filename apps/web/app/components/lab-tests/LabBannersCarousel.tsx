'use client';

import { useState } from 'react';

export default function LabBannersCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <section className="py-6 bg-white">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        {/* Navigation Arrows on top-right */}
        <div className="flex justify-end gap-2 mb-3">
          <button
            onClick={() => setActiveSlide((prev) => (prev === 0 ? 2 : prev - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900 transition"
            aria-label="Previous banner"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setActiveSlide((prev) => (prev === 2 ? 0 : prev + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900 transition"
            aria-label="Next banner"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 3 Banners in Grid / Scrollable on Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Banner 1: Burgundy */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#701c36] to-[#882444] p-6 text-white min-h-[190px] flex flex-col justify-between shadow-xs">
            {/* Top Logo */}
            <div className="flex justify-end">
              <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-white/90">
                <span className="text-white font-extrabold">Tabibistan</span>
                <span className="text-white/60">|</span>
                <span className="font-medium">Labs</span>
              </div>
            </div>

            {/* Middle Content */}
            <div className="max-w-[200px] z-10">
              <h3 className="text-base font-extrabold tracking-tight uppercase leading-tight text-white">
                BHAROSE KA BADGE:
              </h3>
              <p className="text-xs text-rose-100 font-medium mt-1 leading-snug">
                worn by our phlebotomists that sets them apart
              </p>
            </div>

            {/* Graphic Badge on Right */}
            <div className="absolute right-3 bottom-3 w-36 h-28 bg-white rounded-xl shadow-lg p-2 flex flex-col justify-between text-gray-800 rotate-[-4deg] border border-gray-100">
              <div className="flex items-center justify-between border-b pb-1">
                <span className="text-[8px] font-black text-[#ff574d]">Tabibistan</span>
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              </div>
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80"
                alt="Phlebotomist badge"
                className="h-14 w-full object-cover rounded"
              />
              <span className="text-[7px] text-center font-bold text-gray-600">ID: CERTIFIED</span>
            </div>
          </div>

          {/* Banner 2: Purple */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#592160] to-[#712a7a] p-6 text-white min-h-[190px] flex flex-col justify-between shadow-xs">
            {/* Top Logo */}
            <div className="flex justify-end">
              <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-white/90">
                <span className="text-white font-extrabold">Tabibistan</span>
                <span className="text-white/60">|</span>
                <span className="font-medium">Labs</span>
              </div>
            </div>

            {/* Middle Content */}
            <div className="max-w-[190px] z-10">
              <h3 className="text-base font-extrabold text-white tracking-tight leading-tight">
                Trust what you see!
              </h3>
              <p className="text-xs text-purple-200 mt-1 leading-snug">
                Take a sneak peek into our National Reference Lab, Delhi
              </p>
              <button className="mt-4 inline-flex items-center rounded-full bg-white px-4 py-1.5 text-xs font-bold text-gray-900 shadow-sm hover:bg-gray-100 transition">
                Watch now
              </button>
            </div>

            {/* Smartphone Graphic with Video Preview */}
            <div className="absolute right-3 bottom-2 w-32 h-28 rounded-xl border-4 border-gray-900 bg-gray-900 overflow-hidden shadow-2xl rotate-[3deg]">
              <img
                src="https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=300&q=80"
                alt="Lab preview"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#712a7a] shadow">
                  <svg className="h-3.5 w-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Banner 3: Forest Green */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#176639] to-[#1f8249] p-6 text-white min-h-[190px] flex flex-col justify-between shadow-xs">
            {/* Middle Content */}
            <div className="max-w-[210px] z-10">
              <h3 className="text-base font-extrabold text-white tracking-tight leading-tight">
                Tabibistan&apos;s first National Reference Lab
              </h3>
              <p className="text-xs text-emerald-100 mt-1.5 leading-snug">
                Making lab test safer, faster &amp; accurate for you
              </p>
              <button className="mt-4 inline-flex items-center rounded-full bg-white px-4 py-1.5 text-xs font-bold text-gray-900 shadow-sm hover:bg-gray-100 transition">
                Know more
              </button>
            </div>

            {/* Doctor Photo on Right */}
            <div className="absolute -right-2 -bottom-2 w-36 h-42">
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80"
                alt="Doctor in lab coat"
                className="h-full w-full object-cover object-top mask-gradient"
              />
            </div>
          </div>
        </div>

        {/* Carousel Indicator Track with Pause Button */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <div className="h-1.5 w-32 rounded-full bg-gray-200 overflow-hidden relative">
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-300"
              style={{
                width: '33%',
                transform: `translateX(${activeSlide * 100}%)`,
              }}
            />
          </div>
          <button
            className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:text-gray-900 transition"
            aria-label="Pause carousel"
          >
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
