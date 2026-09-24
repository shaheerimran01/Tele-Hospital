'use client';

import { useState } from 'react';

export default function TrustAndStatsSection() {
  const [showMore, setShowMore] = useState(false);

  return (
    <section className="px-4 sm:px-6 py-10 bg-white border-t border-gray-100">
      <div className="mx-auto max-w-[1360px]">
        {/* Main Heading */}
        <h2 className="text-center text-lg sm:text-xl font-bold text-gray-900 mb-8 tracking-tight">
          Pakistan&apos;s Largest Healthcare Platform
        </h2>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Card 1: Visitors */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#eefbf3] p-8 text-center border border-[#d9f7e5] transition hover:shadow-xs">
            <div className="mb-3 text-[#16a34a]">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              260m+
            </div>
            <div className="mt-1 text-xs font-semibold text-gray-500">
              Visitors
            </div>
          </div>

          {/* Card 2: Orders Delivered */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#f0f6ff] p-8 text-center border border-[#dbeafe] transition hover:shadow-xs">
            <div className="mb-3 text-[#2563eb]">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              31m+
            </div>
            <div className="mt-1 text-xs font-semibold text-gray-500">
              Orders Delivered
            </div>
          </div>

          {/* Card 3: Cities Served */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#fdf0f4] p-8 text-center border border-[#fce7ef] transition hover:shadow-xs">
            <div className="mb-3 text-[#ec4899]">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              1800+
            </div>
            <div className="mt-1 text-xs font-semibold text-gray-500">
              Cities Served
            </div>
          </div>
        </div>

        {/* 3 Value Proposition / Trust Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {/* Reliable */}
          <div className="flex flex-col items-center text-center rounded-2xl border border-gray-100 bg-white p-6 shadow-2xs">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5">Reliable</h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-[280px]">
              All medicines sourced from verified, licensed pharmacies and authorized distributors across Pakistan.
            </p>
          </div>

          {/* Secure */}
          <div className="flex flex-col items-center text-center rounded-2xl border border-gray-100 bg-white p-6 shadow-2xs">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5">Secure</h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-[280px]">
              SSL encrypted transactions with PCI DSS compliant payment processing for complete data security.
            </p>
          </div>

          {/* Affordable */}
          <div className="flex flex-col items-center text-center rounded-2xl border border-gray-100 bg-white p-6 shadow-2xs">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600 font-bold text-xl">
              <span>$</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5">Affordable</h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-[280px]">
              Save up to 30% on branded medicines and lab tests with exclusive member-only deals and offers.
            </p>
          </div>
        </div>

        {/* Certifications Box */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-4 shadow-2xs divide-x divide-gray-200">
            <div className="flex flex-col items-center px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-700 text-[9px] font-black text-gray-800">
                ISO<br />27001
              </div>
              <span className="mt-1 text-[9px] font-semibold text-gray-600">
                United Registrar<br />of Systems
              </span>
            </div>

            <div className="flex flex-col items-center px-6">
              <div className="flex h-10 w-10 items-center justify-center text-gray-700">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <span className="mt-1 text-[9px] font-semibold text-gray-600">
                UKAS Management<br />Systems - 0043
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500 max-w-md">
            Pakistan&apos;s only LegitScript and ISO/IEC 27001:2022 certified online healthcare platform.
          </p>

          {/* Collapsible Accordion Link */}
          <button
            onClick={() => setShowMore(!showMore)}
            className="mt-3 flex items-center gap-1 text-xs font-bold text-[#ff6f61] hover:text-[#e8453b] transition"
          >
            <span>Know more about Tabibistan</span>
            <svg
              className={`h-3.5 w-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showMore && (
            <div className="mt-4 max-w-2xl text-left text-xs leading-relaxed text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p>
                Tabibistan is dedicated to delivering affordable, reliable, and authentic healthcare across Pakistan.
                From life-saving medicines and everyday health essentials to certified home lab tests and licensed doctor consultations, our platform is built on transparency, safety, and rigorous pharmaceutical quality standards.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
