'use client';

import React from 'react';

export default function PaymentReturnsExpiry() {
  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs my-6">
      {/* Top Header Bar */}
      <div className="bg-[#fbf4fa] border-b border-purple-100 px-5 py-2.5">
        <h3 className="text-xs sm:text-sm font-bold text-[#6b2164]">
          Payment, Returns & Expiry
        </h3>
      </div>

      {/* 4 Feature Items */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Item 1: COD */}
        <div className="flex items-start space-x-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-base font-bold">
            💵
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Cash on delivery available</h4>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
              Get your product first, then pay us once you're sure about your order
            </p>
          </div>
        </div>

        {/* Item 2: Returns */}
        <div className="flex items-start space-x-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
          <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0 text-base font-bold">
            🔄
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">7 day free return</h4>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
              Easily return the product if you don't need it anymore
            </p>
          </div>
        </div>

        {/* Item 3: Expiry */}
        <div className="flex items-start space-x-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 text-base font-bold">
            📅
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Product expires after Apr, 2027</h4>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
              Expiry date may vary by batch. All batches have a 3-month shelf life from dispatch.
            </p>
          </div>
        </div>

        {/* Item 4: Price Info */}
        <div className="flex items-start space-x-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
          <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0 text-base font-bold">
            📄
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Price Info</h4>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
              MRP may vary by batch. Any additional charges will be clearly disclosed before purchase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}