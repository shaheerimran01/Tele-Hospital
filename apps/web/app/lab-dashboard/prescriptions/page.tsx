'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  FlaskConical,
  Loader2,
  RefreshCw,
  Search,
  User,
  X,
} from 'lucide-react';
import { useLabPortal } from '@/app/components/lab-portal/LabPortalShell';
import {
  getLabPrescriptionsByLabApi,
  labFileUrl,
  type LabPrescriptionSummary,
} from '@/app/lib/api/lab-portal';

export default function LabPrescriptionsDirectoryPage() {
  const { labId } = useLabPortal();
  const [prescriptions, setPrescriptions] = useState<LabPrescriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Details Modal
  const [selectedReport, setSelectedReport] = useState<LabPrescriptionSummary | null>(null);

  const loadPrescriptions = useCallback(async () => {
    if (!labId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getLabPrescriptionsByLabApi(labId, page, search);
      setPrescriptions(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load lab prescriptions:', err);
      setError(err.message || 'Could not load diagnostic reports.');
    } finally {
      setLoading(false);
    }
  }, [labId, page, search]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPrescriptions();
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700">
            <ClipboardList className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Reports Directory</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">
            Lab Prescriptions &amp; Diagnostic Reports
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Browse and manage all official pathologist-verified diagnostic reports generated for patient orders.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadPrescriptions()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Reports Generated</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{total}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Verified &amp; Released</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-teal-700">{total}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Pathologists</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <User className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-700">Clinical Staff</p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Patient Name, Order # or Pathologist..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden"
          />
        </div>
        <button
          type="submit"
          className="rounded-2xl bg-[#141b34] px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-[#1a2342] transition"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Reports Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="mt-3 text-xs font-medium text-slate-500">Loading diagnostic prescriptions...</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">No Lab Prescriptions Found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              You haven't generated any diagnostic report prescriptions yet. Go to Patient Orders to create reports.
            </p>
            <Link
              href="/lab-dashboard/orders"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Go to Patient Orders
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Report / Order #</th>
                  <th className="px-5 py-3.5">Patient Details</th>
                  <th className="px-5 py-3.5">Date Generated</th>
                  <th className="px-5 py-3.5">Pathologist</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prescriptions.map((item) => {
                  const pdfUrl = labFileUrl(item.pdfUrl);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-slate-900">
                          {item.labOrder?.orderNumber || item.labOrderId.slice(0, 8)}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          ID: {item.id.slice(0, 8)}...
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900">{item.patientName}</span>
                        <span className="block text-[11px] text-slate-500">
                          {item.patientAge ? `${item.patientAge} Yrs` : ''}
                          {item.patientGender ? ` • ${item.patientGender}` : ''}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-medium text-slate-700">
                          {new Date(item.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {new Date(item.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-800">
                          {item.pathologistName || 'Clinical Pathologist'}
                        </span>
                        <span className="block text-[11px] text-emerald-600 font-medium">Verified Sign</span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified &amp; Released
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedReport(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Details</span>
                          </button>

                          {pdfUrl && (
                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>View PDF</span>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* REPORT DETAILS MODAL / DRAWER */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative my-8 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Diagnostic Report Overview
                </h3>
                <p className="text-xs text-slate-500">
                  Order #{selectedReport.labOrder?.orderNumber} • {selectedReport.patientName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Pathologist Snapshot */}
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pathologist</span>
                  <span className="font-bold text-slate-900">{selectedReport.pathologistName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date Released</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(selectedReport.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Parameter Results Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Parameters Analyzed
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Parameter</th>
                        <th className="px-3 py-2">Result</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2">Ref Range</th>
                        <th className="px-3 py-2">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedReport.testResults || []).map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-slate-800">{r.parameter}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{r.result}</td>
                          <td className="px-3 py-2 text-slate-500">{r.unit || '-'}</td>
                          <td className="px-3 py-2 text-slate-500">{r.referenceRange || '-'}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                r.flag === 'HIGH'
                                  ? 'bg-rose-50 text-rose-700'
                                  : r.flag === 'LOW'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {r.flag || 'NORMAL'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              {selectedReport.remarks && (
                <div className="text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Pathologist Remarks:</span>
                  <p className="rounded-xl bg-slate-50 p-3 text-slate-600 border border-slate-100">
                    {selectedReport.remarks}
                  </p>
                </div>
              )}

              {/* Instructions */}
              {selectedReport.instructions && (
                <div className="text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Patient Instructions:</span>
                  <p className="rounded-xl bg-slate-50 p-3 text-slate-600 border border-slate-100">
                    {selectedReport.instructions}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              {selectedReport.pdfUrl && (
                <a
                  href={labFileUrl(selectedReport.pdfUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Full PDF Document
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
