'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TrustAndStatsSection from '@/components/home/TrustAndStatsSection';
import ProductPurchaseCard from './ProductPurchaseCard';
import ProductInfoTabs from './ProductInfoTabs';
import PaymentReturnsExpiry from './PaymentReturnsExpiry';
import { ApiProduct } from '@/components/home/productData';

interface ProductDetailViewProps {
  slug: string;
}

export default function ProductDetailView({ slug }: ProductDetailViewProps) {
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:4000/products', { cache: 'no-store' });
        if (res.ok) {
          const products: ApiProduct[] = await res.json();
          const matched = products.find(
            (p) => p.slug.toLowerCase() === slug.toLowerCase() || p.id === slug
          );
          if (matched) {
            setProduct(matched);
          }
        }
      } catch (err) {
        console.error('Error fetching PDP:', err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500 font-semibold">
          Loading medicine details from database...
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Medicine Not Found</h1>
          <p className="text-gray-500 mb-6">The requested product could not be found in the database catalogue.</p>
          <Link
            href="/"
            className="inline-block bg-[#ff6f61] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#ff574d] transition"
          >
            Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const productImage =
    product.imageUrl && product.imageUrl.trim() !== ''
      ? product.imageUrl
      : 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Header />

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-200 py-2.5 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-xs text-gray-500 flex items-center space-x-2 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-[#ff6f61]">Home</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{product.category || 'Medicines'}</span>
          <span>/</span>
          <span className="text-gray-900 font-semibold truncate">{product.name}</span>
        </div>
      </div>

      {/* Main PDP Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (7 cols): Image, Specs & Info Tabs */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
            
            {/* Image Box */}
            <div className="relative w-full h-80 sm:h-96 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center p-6 overflow-hidden group">
              <img
                src={productImage}
                alt={product.name}
                className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
              />
              {product.prescriptionRequired && (
                <div className="absolute top-4 left-4 bg-red-50 border border-red-200 text-red-600 font-bold text-xs px-2.5 py-1 rounded-md flex items-center gap-1">
                  <span>Rx</span> Prescription Required
                </div>
              )}
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Form</p>
                <p className="text-xs font-bold text-gray-800 mt-0.5">{product.dosageForm || 'Tablet'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Strength</p>
                <p className="text-xs font-bold text-gray-800 mt-0.5">{product.strength || 'Standard'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Pack Size</p>
                <p className="text-xs font-bold text-gray-800 mt-0.5">{product.packSize || 'Strip'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Manufacturer</p>
                <p className="text-xs font-bold text-gray-800 mt-0.5 truncate">{product.manufacturer || 'Pharma'}</p>
              </div>
            </div>

            {/* Medical Info Tabs */}
            <ProductInfoTabs product={product} />
          </div>

          {/* Right Column (5 cols): Sticky Purchase Card */}
          <div className="lg:col-span-5">
            <ProductPurchaseCard product={product} />
          </div>

        </div>

        {/* Screenshot 1.png Bar: Payment, Returns & Expiry */}
        <PaymentReturnsExpiry />
      </main>

      {/* Trust & Stats Section right before Footer */}
      <TrustAndStatsSection />

      <Footer />
    </div>
  );
}