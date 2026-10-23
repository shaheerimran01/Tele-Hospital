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
  CheckCircle2,
  XCircle,
  Phone,
  SlidersHorizontal,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface LabOffering {
  labId: string;
  labName: string;
  labPhone: string;
  isAvailable: boolean;
  customPrice: number;
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
    if (!newTestInput.trim()) return;
    if (!editingTests.includes(newTestInput.trim())) {
      setEditingTests([...editingTests, newTestInput.trim()]);
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

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10 font-sans text-slate-900">
      <div className="mx-auto max-w-7xl">
        {/* HEADER BAR */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/labs/exclusions"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  {item.itemType}
                </span>
                <span className="text-xs font-mono text-slate-500">{item.code}</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{item.title}</h1>
            </div>
          </div>

          {/* DELETE MASTER PACKAGE BUTTON */}
          <button
            onClick={handleDeleteMasterItem}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Delete Master Item from Database
          </button>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT 2 COLUMNS: SUB-TESTS MANAGEMENT */}
          <div className="space-y-6 lg:col-span-2">
            {/* INCLUDED TESTS MANAGER */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    Master Included Sub-Tests ({editingTests.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tests yahan se remove karne par master package update ho jayega.
                  </p>
                </div>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-violet-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> Save Sub-Tests Changes
                </button>
              </div>

              {/* ADD NEW TEST FIELD */}
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={newTestInput}
                  onChange={(e) => setNewTestInput(e.target.value)}
                  placeholder="Enter new sub-test name..."
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-violet-500 focus:outline-none"
                />
                <button
                  onClick={handleAddSubTest}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  <Plus className="h-4 w-4" /> Add Test
                </button>
              </div>

              {/* TEST LIST */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {editingTests.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">Is package me koi sub-tests included nahi hain.</p>
                ) : (
                  editingTests.map((testName) => (
                    <div
                      key={testName}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs bg-slate-50 hover:bg-white transition"
                    >
                      <span className="font-medium text-slate-800">{testName}</span>
                      <button
                        onClick={() => handleRemoveSubTest(testName)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove Sub-Test"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LAB BREAKDOWN & PRICING */}
          <div className="space-y-6">
            {/* LAB OFFERINGS CARD */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Partner Labs Offering ({item.labOfferings.length})
              </h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {item.labOfferings.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Kisi lab ne abhi tak pricing set nahi ki.</p>
                ) : (
                  item.labOfferings.map((lab) => (
                    <div key={lab.labId} className="rounded-lg border border-slate-200 p-3 bg-slate-50/50 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Building2 className="h-3.5 w-3.5 text-violet-600" />
                          {lab.labName}
                        </div>
                        <span className="font-extrabold text-violet-700">Rs. {lab.customPrice.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                        <span>Offered Tests:</span>
                        <strong className="text-slate-800">{lab.offeredTestsCount} / {item.testsIncluded.length}</strong>
                      </div>

                      {lab.disabledTests.length > 0 && (
                        <div className="pt-1">
                          <p className="text-[10px] font-bold text-red-600">Disabled Sub-Tests:</p>
                          <p className="text-[10px] text-red-500">{lab.disabledTests.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}