'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/app/components/cart/CartContext';

// Helper for Safe Text Conversion
const getSafeText = (val?: any): string => {
  if (!val) return '';
  if (Array.isArray(val)) return val.join(',').toLowerCase();
  if (typeof val === 'object') return JSON.stringify(val).toLowerCase();
  return String(val).toLowerCase();
};

interface Product {
  id: string;
  name: string;
  slug: string;
  genericName?: string;
  manufacturer: string;
  systemOfMedicine?: string;
  systemofMedicine?: string;
  category?: string;
  subCategory?: string;
  healthConditions?: string | string[];
  tags?: string | string[];
  dosageForm?: string;
  packSize: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  prescriptionRequired?: boolean;
  isActive?: boolean;
}

const ALPHABET = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
const ITEMS_PER_PAGE = 16;

export default function AllMedicinesPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Cart Context
  const { addProductToCart, loading: cartLoading } = useCart();

  // A-Z Alphabet Filter
  const [selectedLetter, setSelectedLetter] = useState<string>('A');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Active Sidebar Filters
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDosageForm, setSelectedDosageForm] = useState<string>('all');
  const [selectedPrescription, setSelectedPrescription] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('relevance');

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:4000/products');
        if (!res.ok) throw new Error('Failed to fetch backend products');

        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
          ? data.data
          : data.products || [];

        setAllProducts(list);
      } catch (error) {
        console.error('Error fetching medicines:', error);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Base SQL "All Medicines" Filter Logic
  const medicinesList = useMemo(() => {
    return allProducts.filter((p) => {
      if (p.isActive === false) return false;

      const sysMed = getSafeText(p.systemOfMedicine || p.systemofMedicine);
      const cat = getSafeText(p.category);
      const sub = getSafeText(p.subCategory);
      const cond = getSafeText(p.healthConditions);
      const name = getSafeText(p.name);

      // 1. INCLUDE: General Medicine Indicators
      const isIncluded =
        /allopathy|homeopathy|ayurveda|unani|herbal|generic/i.test(sysMed) ||
        /medicine|medicines|prescription|pharmacy|drugs|tablets|syrup|capsules|injections/i.test(cat) ||
        /tablet|capsule|syrup|injection|ointment|pain relief|fever|cough|antibiotic|antibiotics/i.test(sub) ||
        /fever|pain|infection|diabetes|hypertension|blood pressure|cardiac|gastric|allergy|asthma/i.test(cond);

      // 2. EXCLUDE: Non-Medicine Categories & Products
      const isExcluded =
        /skin|skin care|hair|hair care|beauty|cosmetics|grooming|personal care|baby care|pet care|oral care|dental care/i.test(cat) ||
        /shampoo|conditioner|soap|face wash|lotion|cream|moisturizer|sunscreen|serum|perfume|deodorant|diaper|wipes|razor|shaving/i.test(sub) ||
        /shampoo|conditioner|soap|wash|lotion|cream|moisturizer|sunscreen|serum|perfume|deodorant|diaper|wipes|razor|shaving|toothbrush|toothpaste/i.test(name);

      return isIncluded && !isExcluded;
    });
  }, [allProducts]);

  // Extract Dynamic Filter Options
  const availableManufacturers = useMemo(() => {
    const mfgSet = new Set<string>();
    medicinesList.forEach((p) => {
      if (p.manufacturer?.trim()) mfgSet.add(p.manufacturer.trim());
    });
    return Array.from(mfgSet).sort();
  }, [medicinesList]);

  const availableCategories = useMemo(() => {
    const catSet = new Set<string>();
    medicinesList.forEach((p) => {
      if (p.category?.trim()) catSet.add(p.category.trim());
    });
    return Array.from(catSet).sort();
  }, [medicinesList]);

  const availableDosageForms = useMemo(() => {
    const formSet = new Set<string>();
    medicinesList.forEach((p) => {
      if (p.dosageForm?.trim()) formSet.add(p.dosageForm.trim());
    });
    return Array.from(formSet).sort();
  }, [medicinesList]);

  // Filtered & Alphabetically Indexed Products
  const filteredProducts = useMemo(() => {
    return medicinesList
      .filter((p) => {
        if (selectedLetter !== 'ALL') {
          const firstChar = p.name.trim().charAt(0).toUpperCase();
          if (firstChar !== selectedLetter) return false;
        }

        if (
          searchTerm.trim() &&
          !p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !getSafeText(p.genericName).includes(searchTerm.toLowerCase())
        ) {
          return false;
        }

        if (
          selectedManufacturer !== 'all' &&
          (p.manufacturer || '').trim().toLowerCase() !== selectedManufacturer.toLowerCase()
        ) {
          return false;
        }

        if (
          selectedCategory !== 'all' &&
          (p.category || '').trim().toLowerCase() !== selectedCategory.toLowerCase()
        ) {
          return false;
        }

        if (
          selectedDosageForm !== 'all' &&
          (p.dosageForm || '').trim().toLowerCase() !== selectedDosageForm.toLowerCase()
        ) {
          return false;
        }

        if (selectedPrescription !== 'all') {
          const isRx =
            p.prescriptionRequired === true ||
            String(p.prescriptionRequired).toLowerCase() === 'true';

          if (selectedPrescription === 'rx' && !isRx) return false;
          if (selectedPrescription === 'otc' && isRx) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        return a.name.localeCompare(b.name);
      });
  }, [
    medicinesList,
    selectedLetter,
    searchTerm,
    selectedManufacturer,
    selectedCategory,
    selectedDosageForm,
    selectedPrescription,
    sortBy,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedLetter,
    searchTerm,
    selectedManufacturer,
    selectedCategory,
    selectedDosageForm,
    selectedPrescription,
    sortBy,
  ]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedLetter('A');
    setSelectedManufacturer('all');
    setSelectedCategory('all');
    setSelectedDosageForm('all');
    setSelectedPrescription('all');
    setSortBy('relevance');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <Header />

      <main className="flex-grow py-4 sm:py-6 px-3 sm:px-6">
        <div className="mx-auto max-w-[1360px]">
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
            <Link href="/" className="hover:underline text-[#ff6f61]">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">All Medicines</span>
          </nav>

          {/* ALPHABET INDEX BAR */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 mb-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h1 className="text-base sm:text-xl font-bold text-gray-800">
                Medicine Index starting with -{' '}
                <span className="text-[#ff6f61]">{selectedLetter}</span>
              </h1>
              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-3 py-1 rounded-lg font-medium self-start sm:self-auto">
                Medicines can only be ordered with a valid prescription where required.
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {ALPHABET.map((letter) => (
                <button
                  key={letter}
                  onClick={() => setSelectedLetter(letter)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border text-xs sm:text-sm font-bold transition flex items-center justify-center cursor-pointer ${
                    selectedLetter === letter
                      ? 'border-gray-900 bg-gray-100 text-gray-900 shadow-xs'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Sidebar Filters */}
            <aside className="bg-white border border-gray-200 rounded-xl p-4 h-fit hidden lg:block sticky top-20 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm">Filters</h3>
                <button
                  onClick={resetAllFilters}
                  className="text-[11px] font-semibold text-[#ff6f61] hover:underline cursor-pointer"
                >
                  Reset All
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-800 mb-1.5 uppercase tracking-wider">
                  Search Medicine
                </h4>
                <input
                  type="text"
                  placeholder="Filter by name or salt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                />
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                  Prescription Type
                </h4>
                <select
                  value={selectedPrescription}
                  onChange={(e) => setSelectedPrescription(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                >
                  <option value="all">All Medicines</option>
                  <option value="rx">Prescription Required (Rx)</option>
                  <option value="otc">Non-Prescription (OTC)</option>
                </select>
              </div>

              {availableCategories.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                    Category
                  </h4>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                  >
                    <option value="all">All Categories ({availableCategories.length})</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {availableDosageForms.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                    Dosage Form
                  </h4>
                  <select
                    value={selectedDosageForm}
                    onChange={(e) => setSelectedDosageForm(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                  >
                    <option value="all">All Forms ({availableDosageForms.length})</option>
                    {availableDosageForms.map((form) => (
                      <option key={form} value={form}>
                        {form}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {availableManufacturers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                    Manufacturer
                  </h4>
                  <select
                    value={selectedManufacturer}
                    onChange={(e) => setSelectedManufacturer(e.target.value)}
                    className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                  >
                    <option value="all">
                      All Manufacturers ({availableManufacturers.length})
                    </option>
                    {availableManufacturers.map((mfg) => (
                      <option key={mfg} value={mfg}>
                        {mfg}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </aside>

            {/* Product Cards Grid & Pagination */}
            <section className="lg:col-span-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5 mb-4 shadow-2xs">
                  <span className="text-xs font-semibold text-gray-700">
                    Showing{' '}
                    <strong className="text-gray-900">{filteredProducts.length}</strong>{' '}
                    medicines starting with &quot;{selectedLetter}&quot;
                  </span>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium text-gray-800 focus:outline-none"
                  >
                    <option value="relevance">Name: A to Z</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>

                {loading ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-xs text-gray-500 font-semibold">
                    Loading medicines...
                  </div>
                ) : paginatedProducts.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-xs text-gray-500 font-semibold">
                    No medicines found starting with &quot;{selectedLetter}&quot; matching your filters.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {paginatedProducts.map((product) => {
                      const productSlug =
                        product.slug ||
                        product.name
                          .toLowerCase()
                          .replace(/\s+/g, '-')
                          .replace(/[^a-z0-9-]/g, '');

                      const isRxRequired =
                        product.prescriptionRequired === true ||
                        String(product.prescriptionRequired).toLowerCase() === 'true';

                      const hasDiscount =
                        product.originalPrice && product.originalPrice > product.price;
                      const discountPercent = hasDiscount
                        ? Math.round(
                            ((product.originalPrice! - product.price) / product.originalPrice!) * 100
                          )
                        : 0;

                      const targetProductId = product.id;

                      return (
                        <div
                          key={product.id}
                          className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between hover:shadow-md transition relative group"
                        >
                          {isRxRequired && (
                            <span className="absolute top-2 left-2 z-10 bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-red-200 uppercase">
                              Rx Required
                            </span>
                          )}

                          {hasDiscount && discountPercent > 0 && (
                            <span className="absolute top-2 right-2 z-10 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-2xs">
                              {discountPercent}% OFF
                            </span>
                          )}

                          <Link href={`/products/${productSlug}`} className="block group">
                            <div className="w-full aspect-square bg-white rounded-lg mb-3 relative overflow-hidden flex items-center justify-center p-2">
                              <Image
                                src={
                                  product.imageUrl ||
                                  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500'
                                }
                                alt={product.name}
                                width={150}
                                height={150}
                                className="object-contain max-h-32 group-hover:scale-105 transition"
                              />
                            </div>

                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                              {product.manufacturer || 'General Medicine'}
                            </span>
                            <h3 className="text-xs font-bold text-gray-900 line-clamp-2 mt-0.5 group-hover:text-[#ff6f61] transition">
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-gray-500">{product.packSize}</span>
                              {product.dosageForm && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded">
                                  {product.dosageForm}
                                </span>
                              )}
                            </div>
                          </Link>

                          <div className="mt-3 pt-2 border-t border-gray-100">
                            <div className="flex items-baseline gap-1.5 mb-2">
                              <span className="text-sm font-extrabold text-gray-900">
                                Rs. {product.price}
                              </span>
                              {hasDiscount && (
                                <span className="text-xs text-gray-400 line-through">
                                  Rs. {product.originalPrice}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={cartLoading}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                if (targetProductId) {
                                  addProductToCart(targetProductId, 1);
                                } else {
                                  console.error('Product ID missing:', product);
                                  alert('Is product ki ID database se fetch nahi ho saki.');
                                }
                              }}
                              className="w-full text-white text-xs font-bold py-2 rounded-lg bg-[#ff6f61] hover:bg-[#e05b4f] transition shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                            >
                              {cartLoading ? 'ADDING...' : 'ADD TO CART'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* NUMERIC PAGINATION BAR */}
              {totalPages > 1 && (
                <div className="mt-8 bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center justify-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg cursor-pointer"
                  >
                    <span>‹</span>
                    <span>Previous</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(
                      Math.max(0, currentPage - 5),
                      Math.min(totalPages, currentPage + 5)
                    )
                    .map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-lg border text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                          currentPage === pageNum
                            ? 'border-gray-900 bg-gray-100 text-gray-900 shadow-xs'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className="flex items-center gap-1 text-xs font-bold text-gray-900 hover:text-[#ff6f61] disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg cursor-pointer"
                  >
                    <span>Next</span>
                    <span>›</span>
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}