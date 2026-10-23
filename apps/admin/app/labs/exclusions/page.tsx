'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  FlaskConical,
  ShoppingBag,
  FileCheck2,
  ArrowLeft,
  AlertTriangle,
  SlidersHorizontal,
  Edit3,
  Users,
  Search,
  X,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';

interface DisabledInsight {
  testName: string;
  disabledByCount: number;
  percentage: number;
}

interface LabOffering {
  labId: string;
  labName: string;
  offeredTestsCount: number;
  totalPackageTestsCount: number;
  customPrice: number;
  disabledTests: string[];
}

interface PackageExclusionItem {
  id: string;
  title: string;
  code: string;
  itemType: 'PACKAGE' | 'INDIVIDUAL_TEST';
  category: string;
  totalTestsCount: number;
  activeLabsCount: number;
  frequentlyDisabledTests: DisabledInsight[];
  testsIncluded: string[];
  labOfferings: LabOffering[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function CatalogExclusionsPage() {
  // Filter States
  const [activeTab, setActiveTab] = useState<'PKG_EXCL' | 'IND_TEST' | 'FULL_EXCL' | 'ACTIVE'>('PKG_EXCL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [selectedPkgForEdit, setSelectedPkgForEdit] = useState<PackageExclusionItem | null>(null);
  const [selectedPkgForLabs, setSelectedPkgForLabs] = useState<PackageExclusionItem | null>(null);
  const [editingTests, setEditingTests] = useState<string[]>([]);

  const [packages, setPackages] = useState<PackageExclusionItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/labs/admin/labs/catalog-exclusions`);
        const json = await res.json();
        if (json.success) { setPackages(json.data); setSummary(json.summary); }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter Logic
  const filteredPackages = packages.filter((item) => {
    let matchesTab = true;
    if (activeTab === 'PKG_EXCL') matchesTab = item.itemType === 'PACKAGE' && item.frequentlyDisabledTests.length > 0;
    else if (activeTab === 'IND_TEST') matchesTab = item.itemType === 'INDIVIDUAL_TEST';
    else if (activeTab === 'FULL_EXCL') matchesTab = item.itemType === 'PACKAGE' && item.activeLabsCount === 0;
    else if (activeTab === 'ACTIVE') matchesTab = item.activeLabsCount > 0;
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleOpenEditModal = (pkg: PackageExclusionItem) => {
    setSelectedPkgForEdit(pkg);
    setEditingTests([...pkg.testsIncluded]);
  };

  const handleToggleTest = (testName: string) => {
    if (editingTests.includes(testName)) {
      setEditingTests(editingTests.filter((t) => t !== testName));
    } else {
      setEditingTests([...editingTests, testName]);
    }
  };

  const handleSaveMasterPackage = () => {
    if (!selectedPkgForEdit) return;
    setPackages(
      packages.map((p) =>
        p.id === selectedPkgForEdit.id
          ? {
              ...p,
              testsIncluded: editingTests,
              totalTestsCount: editingTests.length,
            }
          : p
      )
    );
    setSelectedPkgForEdit(null);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col justify-between border-r border-slate-200 bg-white p-4">
        <div>
          <div className="mb-8 px-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Gateway
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 font-bold text-xl text-white shadow-md">
                T
              </div>
              <div>
                <h1 className="text-base font-bold leading-none text-slate-900">Tabibistan</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                  Admin Portal
                </span>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            <Link
              href="/labs/dashboard"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </Link>

            <Link
              href="/labs/verification"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <FileCheck2 className="h-5 w-5" />
              Lab Verification
            </Link>

            <Link
              href="/global-catalog"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <FlaskConical className="h-5 w-5" />
              Master Catalog
            </Link>

            <Link
              href="/global-catalog/exclusions"
              className="flex w-full items-center justify-between rounded-lg bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="h-5 w-5" />
                Exclusions Manager
              </div>
            </Link>
          </nav>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
              A
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-900">Admin Console</p>
              <p className="text-slate-500">Super Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-violet-700">
              LABS & CATALOG ANALYTICS
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Package Exclusions & Sub-Test Manager
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Identify sub-tests frequently disabled by partner labs and optimize Master Packages.
            </p>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Packages with Exclusions</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary?.packagesWithExclusionsCount ?? 0}</p>
            <p className="text-[11px] text-slate-400">Packages with disabled sub-tests</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Most Disabled Test</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary?.mostDisabledTest ?? '-'}</p>
            <p className="text-[11px] text-slate-400">Disabled by {summary?.mostDisabledTestCount ?? 0} labs</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">Active Labs</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary?.activeLabsCount ?? 0}</p>
            <p className="text-[11px] text-slate-400">Labs with custom pricing/availability</p>
          </div>
        </div>

        {/* TOP FILTER TABS */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('PKG_EXCL')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeTab === 'PKG_EXCL'
                  ? 'bg-violet-600 text-white shadow'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Packages with Exclusions ({packages.filter((p) => p.itemType === 'PACKAGE' && p.frequentlyDisabledTests.length > 0).length})
            </button>
            <button
              onClick={() => setActiveTab('IND_TEST')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeTab === 'IND_TEST'
                  ? 'bg-violet-600 text-white shadow'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Individual Tests Excluded ({packages.filter((p) => p.itemType === 'INDIVIDUAL_TEST').length})
            </button>
            <button
              onClick={() => setActiveTab('FULL_EXCL')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeTab === 'FULL_EXCL'
                  ? 'bg-violet-600 text-white shadow'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Fully Excluded Packages ({summary?.fullyExcludedPackagesCount ?? 0})
            </button>
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeTab === 'ACTIVE'
                  ? 'bg-violet-600 text-white shadow'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Active Offered Items ({packages.filter((p) => p.activeLabsCount > 0).length})
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title or code..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Master Item / Package</th>
                  <th className="px-6 py-3.5">Type & Tests</th>
                  <th className="px-6 py-3.5">Active Labs</th>
                  <th className="px-6 py-3.5">Frequently Disabled Sub-Tests</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredPackages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No matching catalog items found.
                    </td>
                  </tr>
                ) : (
                  filteredPackages.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">{pkg.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {pkg.code} • {pkg.category}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit items-center rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-800 text-[10px]">
                            {pkg.itemType}
                          </span>
                          <span className="font-medium text-slate-600">
                            {pkg.totalTestsCount} {pkg.totalTestsCount === 1 ? 'Test' : 'Sub-tests'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {pkg.activeLabsCount} Labs Offering
                      </td>
                      <td className="px-6 py-4">
                        {pkg.frequentlyDisabledTests.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {pkg.frequentlyDisabledTests.map((dis) => (
                              <span
                                key={dis.testName}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                                  dis.percentage >= 60
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {dis.testName}
                                <strong className="ml-1 font-extrabold">
                                  ({dis.disabledByCount} Labs)
                                </strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No sub-tests disabled</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* VIEW LABS BREAKDOWN BUTTON */}
                          <button
                            onClick={() => setSelectedPkgForLabs(pkg)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                          >
                            <Users className="h-3.5 w-3.5 text-violet-600" />
                            View Labs ({pkg.labOfferings?.length || 0})
                          </button>

                          {/* EDIT MASTER TESTS BUTTON */}
                          <button
                            onClick={() => handleOpenEditModal(pkg)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 font-semibold text-white shadow hover:bg-violet-700 transition"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit Master
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL 1: LABS OFFERING BREAKDOWN MODAL */}
      {selectedPkgForLabs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedPkgForLabs(null)} />
          <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Lab Offerings Breakdown: {selectedPkgForLabs.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  See how many tests each partner lab is offering for this package.
                </p>
              </div>
              <button
                onClick={() => setSelectedPkgForLabs(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* LABS LIST */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {selectedPkgForLabs.labOfferings && selectedPkgForLabs.labOfferings.length > 0 ? (
                selectedPkgForLabs.labOfferings.map((lab) => (
                  <div
                    key={lab.labId}
                    className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 hover:bg-white transition text-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-violet-600" />
                        <span className="font-bold text-slate-900 text-sm">{lab.labName}</span>
                      </div>
                      <span className="font-extrabold text-violet-700 text-sm">
                        Rs. {lab.customPrice.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">Sub-tests Offered:</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-bold ${
                            lab.offeredTestsCount === lab.totalPackageTestsCount
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {lab.offeredTestsCount} / {lab.totalPackageTestsCount} Tests Offered
                        </span>
                      </div>

                      {lab.disabledTests.length > 0 && (
                        <div className="text-right">
                          <span className="text-[11px] text-red-600 font-semibold">
                            Disabled: {lab.disabledTests.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-slate-500">
                  No active lab custom pricing set for this package yet.
                </p>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4 text-right">
              <button
                onClick={() => setSelectedPkgForLabs(null)}
                className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT MASTER PACKAGE TESTS */}
      {selectedPkgForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSelectedPkgForEdit(null)}
          />
          <div className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Update Included Tests: {selectedPkgForEdit.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Uncheck tests to remove them permanently from this Master Package.
                </p>
              </div>
              <button
                onClick={() => setSelectedPkgForEdit(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {selectedPkgForEdit.testsIncluded.map((test) => {
                const isFrequentDisabled = selectedPkgForEdit.frequentlyDisabledTests.find(
                  (d) => d.testName === test
                );
                const isSelected = editingTests.includes(test);

                return (
                  <label
                    key={test}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'border-violet-200 bg-violet-50/50 text-slate-900 font-medium'
                        : 'border-slate-200 bg-slate-50 text-slate-400 line-through'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleTest(test)}
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span>{test}</span>
                    </div>

                    {isFrequentDisabled && (
                      <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 font-bold text-[10px]">
                        Disabled by {isFrequentDisabled.disabledByCount} labs ({isFrequentDisabled.percentage}%)
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                Selected: {editingTests.length} / {selectedPkgForEdit.testsIncluded.length} Tests
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedPkgForEdit(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMasterPackage}
                  className="rounded-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-violet-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
