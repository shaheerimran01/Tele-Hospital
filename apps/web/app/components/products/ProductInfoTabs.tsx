'use client';

import React, { useState } from 'react';
import { ApiProduct } from '@/components/home/productData';

interface ProductInfoTabsProps {
  product: ApiProduct;
}

export default function ProductInfoTabs({ product }: ProductInfoTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'uses' | 'sideEffects' | 'working' | 'safety'>('overview');

  return (
    <div className="space-y-6">
      {/* Navigation Tabs Header */}
      <div className="border-b border-gray-200 flex space-x-4 sm:space-x-6 overflow-x-auto whitespace-nowrap no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#ff6f61] text-[#ff6f61]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Product Introduction
        </button>
        <button
          onClick={() => setActiveTab('uses')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'uses'
              ? 'border-[#ff6f61] text-[#ff6f61]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Uses & Benefits
        </button>
        <button
          onClick={() => setActiveTab('sideEffects')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'sideEffects'
              ? 'border-[#ff6f61] text-[#ff6f61]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Side Effects
        </button>
        <button
          onClick={() => setActiveTab('working')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'working'
              ? 'border-[#ff6f61] text-[#ff6f61]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          How It Works
        </button>
        <button
          onClick={() => setActiveTab('safety')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'safety'
              ? 'border-[#ff6f61] text-[#ff6f61]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Safety & Storage
        </button>
      </div>

      {/* Tab 1: Product Introduction (DB Field: description) */}
      {activeTab === 'overview' && (
        <div className="space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed">
          <h3 className="font-bold text-base text-gray-900">Product introduction</h3>
          {product.description ? (
            <p className="text-gray-600 whitespace-pre-line">{product.description}</p>
          ) : (
            <p className="text-gray-400 italic">No introduction details provided for this medicine.</p>
          )}

          {product.genericName && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 mt-2">
              <span className="font-bold block text-xs uppercase tracking-wide text-amber-800 mb-1">
                Active Salt Composition
              </span>
              <p className="text-sm font-semibold">{product.genericName}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Uses & Benefits (DB Fields: uses, benefits) */}
      {activeTab === 'uses' && (
        <div className="space-y-4 text-xs sm:text-sm text-gray-700">
          <div>
            <h3 className="font-bold text-base text-gray-900 mb-2">Uses of {product.name}</h3>
            {product.uses ? (
              <p className="text-gray-600 whitespace-pre-line">{product.uses}</p>
            ) : (
              <p className="text-gray-400 italic">No specific uses mentioned in database.</p>
            )}
          </div>

          {product.benefits && (
            <div className="bg-green-50/70 border border-green-100 rounded-xl p-4">
              <h4 className="font-bold text-green-900 mb-1">Key Benefits</h4>
              <p className="text-green-800 text-xs sm:text-sm whitespace-pre-line">{product.benefits}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Side Effects (DB Field: sideEffects) */}
      {activeTab === 'sideEffects' && (
        <div className="space-y-4 text-xs sm:text-sm text-gray-700">
          <h3 className="font-bold text-base text-gray-900">Side effects of {product.name}</h3>
          {product.sideEffects ? (
            <p className="text-gray-600 whitespace-pre-line">{product.sideEffects}</p>
          ) : (
            <p className="text-gray-400 italic">No side effects logged in database for this product.</p>
          )}
        </div>
      )}

      {/* Tab 4: How It Works & Directions (DB Fields: working, howToUse) */}
      {activeTab === 'working' && (
        <div className="space-y-4 text-xs sm:text-sm text-gray-700">
          <div>
            <h3 className="font-bold text-base text-gray-900 mb-2">How {product.name} works</h3>
            {product.working ? (
              <p className="text-gray-600 whitespace-pre-line">{product.working}</p>
            ) : (
              <p className="text-gray-400 italic">No mechanism details logged in database.</p>
            )}
          </div>

          {product.howToUse && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
              <h4 className="font-bold text-blue-900 mb-1">Directions for Use</h4>
              <p className="text-blue-800 text-xs sm:text-sm whitespace-pre-line">{product.howToUse}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Safety & Storage (DB Fields: safetyAdvice, quickTips, storage) */}
      {activeTab === 'safety' && (
        <div className="space-y-4 text-xs sm:text-sm text-gray-700">
          <h3 className="font-bold text-base text-gray-900">Safety Advice & Storage</h3>
          
          {product.safetyAdvice ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-900 text-xs space-y-1">
              <p className="font-bold">⚠️ Safety Advice:</p>
              <p className="whitespace-pre-line">{product.safetyAdvice}</p>
            </div>
          ) : (
            <p className="text-gray-400 italic">No specific safety warnings logged in database.</p>
          )}

          {product.quickTips && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-purple-900 text-xs">
              <p className="font-bold mb-1">💡 Doctor Tips:</p>
              <p className="whitespace-pre-line">{product.quickTips}</p>
            </div>
          )}

          {product.storage && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-600">
              <strong>Storage Instructions:</strong> {product.storage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}