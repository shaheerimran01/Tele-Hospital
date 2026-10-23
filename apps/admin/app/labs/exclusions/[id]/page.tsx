'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Trash2,
  Save,
  Plus,
  AlertTriangle,
  FlaskConical,
  Phone,
  Search,
  Tag,
  DollarSign,
  Activity,
  X,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface LabOffering {
  labId: string;
  labName: string;
  labPhone: string;
  isAvailable: boolean;
  hasCustomPrice: boolean;
  customPrice: number;
  masterPrice: number;
  disabledTests: string[];
  offeredTestsCount: number;
}

interface MasterPackageDetails {
  id: string;
  title: string;
  code: string;
  itemType: 'PACKAGE' | 'INDIVIDUAL_TEST';
  category: string;
  basePrice: number;
  discountPrice: number;
  testsIncluded: string[];
  labOfferings: LabOffering[];
}

export default function ExclusionsDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const packageId = params?.id as string;

  const [item, setItem] = useState<MasterPackageDetails | null>(null);
  const [editingTests, setEditingTests] = useState<string[]>([]);
  const [newTestInput, setNewTestInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/labs/admin/labs/catalog-exclusions/${packageId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setItem(json.data);
        setEditingTests(json.data.testsIncluded || []);
      }
    } catch (error) {
      console.error('Failed to load package details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (packageId) fetchDetails();
  }, [packageId]);

  const handleRemoveSubTest = (testName: string) => {
    setEditingTests(editingTests.filter((t) => t !== testName));
  };

  const handleAddSubTest = () => {
    const trimmed = newTestInput.trim();
    if (!trimmed) return;
    if (!editingTests.includes(trimmed)) {
      setEditingTests([...editingTests, trimmed]);
    }
    setNewTestInput('');
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/labs/admin/labs/catalog-exclusions/${packageId}/tests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testsIncluded: editingTests }),
      });
      if (res.ok) {
        alert('Master sub-tests list update ho gayi hai.');
        fetchDetails();
      }
    } catch (error) {
      console.error('Failed to save changes:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMasterItem = async () => {
    if (!window.confirm('Kya aap waqai is item ko original database se permanently delete karna chahte hain?')) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/labs/admin/labs/catalog-exclusions/${packageId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('Item database se permanently remove ho gaya hai.');
        router.push('/labs/exclusions');
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent"></div>
          <p className="text-xs font-semibold text-slate-600">Details load ho rahi hain...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-slate-600">Master Catalog Item nahi mila.</p>
          <Link href="/labs/exclusions" className="mt-4 inline-block font-semibold text-violet-600">
            ← Back to Exclusions Manager
          </Link>
        </div>
      </div>
    );
  }

  const activeLabsOfferingCount = (item.labOfferings || []).filter((l) => l.isAvailable !== false).length;

  const filteredSubTests = editingTests.filter((test) =>
    test.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl">
        {/* HEADER BAR */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/labs/exclusions"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Catalog
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  {item.itemType}
                </span>
                <span className="text-xs font-mono text-slate-500 font-semibold">{item.code}</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{item.title}</h1>
            </div>
          </div>

          {/* DELETE MASTER PACKAGE BUTTON */}
          <button
            onClick={handleDeleteMasterItem}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Delete Master Item from Database
          </button>
        </div>

        {/* TOP SUMMARY METADATA GRID */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Category & Code */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Category & Code
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Tag className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-sm font-bold text-slate-900 truncate" title={item.category || 'General'}>
                {item.category || 'General'}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Code:</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 border border-slate-200/60">
                  {item.code || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Master Base Price */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Master Base Price
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-extrabold text-slate-900">
                Rs. {typeof item.basePrice === 'number' ? item.basePrice.toLocaleString() : (item.basePrice || '0')}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Master catalog reference price</p>
            </div>
          </div>

          {/* Card 3: Master Discount Price */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Master Discount Price
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-extrabold text-violet-700">
                Rs. {typeof item.discountPrice === 'number' ? item.discountPrice.toLocaleString() : (item.discountPrice ?? item.basePrice ?? '0')}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Default discounted consumer price</p>
            </div>
          </div>

          {/* Card 4: Active Labs Count */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Active Labs Offering
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-slate-900">
                  {activeLabsOfferingCount} Labs Active
                </span>
                <span className="text-xs text-slate-400">
                  / {item.labOfferings.length} Total
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Labs actively offering this test/package</p>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT 2 COLUMNS: SUB-TESTS MANAGEMENT */}
          <div className="space-y-6 lg:col-span-2">
            {/* INCLUDED TESTS MANAGER */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                      Master Included Sub-Tests
                    </h2>
                    <span className="rounded-full bg-violet-100 border border-violet-200 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                      {editingTests.length} Tests
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Tests yahan se remove ya add karne par master package update ho jayega.
                  </p>
                </div>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Sub-Tests Changes'}
                </button>
              </div>

              {/* QUICK FILTER SEARCH BOX */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter sub-tests in this package..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-9 text-xs text-slate-800 placeholder:text-slate-400 transition focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* ADD NEW TEST FIELD */}
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={newTestInput}
                  onChange={(e) => setNewTestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubTest();
                    }
                  }}
                  placeholder="Enter new sub-test name and press Add..."
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/10"
                />
                <button
                  onClick={handleAddSubTest}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-200 active:scale-95"
                >
                  <Plus className="h-4 w-4 text-slate-600" /> Add Test
                </button>
              </div>

              {/* TEST LIST */}
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {editingTests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <FlaskConical className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-500">Is package me koi sub-tests included nahi hain.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Upar text field me naya sub-test name enter karke add karein.</p>
                  </div>
                ) : filteredSubTests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <Search className="h-6 w-6 text-slate-300 mb-1" />
                    <p className="text-xs font-semibold text-slate-500">&quot;{searchQuery}&quot; se match hone wala koi sub-test nahi mila.</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-xs font-bold text-violet-600 hover:underline"
                    >
                      Clear filter
                    </button>
                  </div>
                ) : (
                  filteredSubTests.map((testName) => (
                    <div
                      key={testName}
                      className="group flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 text-xs transition hover:border-slate-300 hover:bg-white hover:shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-[10px] font-bold text-slate-600">
                          {editingTests.indexOf(testName) + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{testName}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveSubTest(testName)}
                        className="rounded p-1.5 text-slate-400 opacity-80 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                        title="Remove Sub-Test from Package"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              {editingTests.length > 0 && (
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-3">
                  <span>
                    Showing {filteredSubTests.length} of {editingTests.length} tests
                  </span>
                  {searchQuery && (
                    <span className="font-medium text-violet-600">Filtered view active</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: LAB BREAKDOWN & PRICING */}
          <div className="space-y-6">
            {/* LAB OFFERINGS CARD */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Partner Labs Offering ({item.labOfferings.length})
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activeLabsOfferingCount} of {item.labOfferings.length} labs active
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                  {item.labOfferings.length} Registered
                </span>
              </div>

              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {item.labOfferings.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Kisi lab ne abhi tak pricing set nahi ki.
                  </p>
                ) : (
                  item.labOfferings.map((lab) => {
                    const isUnavailable = lab.isAvailable === false;
                    const displayPrice = lab.hasCustomPrice
                      ? (lab.customPrice ? Number(lab.customPrice).toLocaleString() : '0')
                      : (lab.masterPrice ? Number(lab.masterPrice).toLocaleString() : '0');

                    return (
                      <div
                        key={lab.labId}
                        className={`rounded-lg border p-3 text-xs space-y-2 transition ${
                          isUnavailable
                            ? 'border-red-200 bg-red-50/20 shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        {/* Lab Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
                              <Building2 className={`h-3.5 w-3.5 shrink-0 ${isUnavailable ? 'text-red-500' : 'text-violet-600'}`} />
                              <span className="truncate">{lab.labName}</span>
                            </div>
                            {lab.labPhone && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span>{lab.labPhone}</span>
                              </div>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`font-extrabold ${isUnavailable ? 'text-slate-400 line-through text-[11px]' : 'text-violet-700'}`}>
                              Rs. {displayPrice}
                            </span>
                            {!lab.hasCustomPrice && (
                              <p className="text-[10px] text-slate-400 italic">No custom price updated by this lab</p>
                            )}
                          </div>
                        </div>

                        {/* Status Badges Row */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {isUnavailable && (
                            <span className="rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-[10px] font-bold text-red-700 inline-block">
                              Package Not Offered / Marked Unavailable
                            </span>
                          )}

                          {lab.hasCustomPrice ? (
                            <span className="rounded-full bg-violet-100 border border-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                              Custom Price Set
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              Using Default Master Price
                            </span>
                          )}
                        </div>

                        {/* Offered Tests Row */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60">
                          <span>Offered Tests:</span>
                          {isUnavailable ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-red-600 line-through">
                                0 / {item.testsIncluded.length}
                              </span>
                              <span className="rounded bg-red-100 border border-red-200 px-1.5 py-0.2 text-[9px] font-extrabold text-red-700 uppercase">
                                Unavailable
                              </span>
                            </div>
                          ) : (
                            <strong className="text-slate-800 font-bold">
                              {lab.offeredTestsCount} / {item.testsIncluded.length}
                            </strong>
                          )}
                        </div>

                        {/* Disabled Sub-Tests breakdown */}
                        {lab.disabledTests.length > 0 && (
                          <div className="pt-1 border-t border-slate-200/40">
                            <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Disabled Sub-Tests ({lab.disabledTests.length}):
                            </p>
                            <p className="text-[10px] text-red-500 mt-0.5 leading-relaxed">
                              {lab.disabledTests.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
