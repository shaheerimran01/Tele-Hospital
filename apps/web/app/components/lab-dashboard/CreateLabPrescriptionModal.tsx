'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  FlaskConical,
  Loader2,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  createLabPrescriptionApi,
  type CreateLabPrescriptionPayload,
  type LabOrderSummary,
  type LabPrescriptionSummary,
  type TestResultItem,
} from '@/app/lib/api/lab-portal';

interface Props {
  order: LabOrderSummary | null;
  onClose: () => void;
  onSuccess: (prescription: LabPrescriptionSummary) => void;
}

export default function CreateLabPrescriptionModal({ order, onClose, onSuccess }: Props) {
  const [pathologistName, setPathologistName] = useState('Dr. Asad Malik (Consultant Pathologist)');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('MALE');
  const [remarks, setRemarks] = useState('All analyzed diagnostic parameters documented above. Clinical correlation advised.');
  const [instructions, setInstructions] = useState('Maintain regular hydration. Follow-up consultation with physician recommended.');

  const [rows, setRows] = useState<TestResultItem[]>([
    {
      testName: 'Complete Blood Count (CBC)',
      parameter: 'Hemoglobin (Hb)',
      result: '14.5',
      unit: 'g/dL',
      referenceRange: '13.5 - 17.5',
      flag: 'NORMAL',
    },
    {
      testName: 'Complete Blood Count (CBC)',
      parameter: 'Total Leukocyte Count (TLC)',
      result: '7,800',
      unit: '/cumm',
      referenceRange: '4,000 - 11,000',
      flag: 'NORMAL',
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setPatientName(order.patientName || '');
      setPatientAge(order.patientAge ? String(order.patientAge) : '');
      setPatientGender(order.patientGender || 'MALE');

      // If order has items, generate initial parameter rows
      if (order.items && order.items.length > 0) {
        const initialRows: TestResultItem[] = order.items.map((item) => ({
          testName: item.itemTitle,
          parameter: `${item.itemTitle} Index`,
          result: 'Normal',
          unit: 'Index',
          referenceRange: 'Standard',
          flag: 'NORMAL',
        }));
        setRows(initialRows);
      }
    }
  }, [order]);

  if (!order) return null;

  const handleAddRow = () => {
    const lastTestName = rows[rows.length - 1]?.testName || (order.items[0]?.itemTitle ?? 'Diagnostic Test');
    setRows([
      ...rows,
      {
        testName: lastTestName,
        parameter: '',
        result: '',
        unit: '',
        referenceRange: '',
        flag: 'NORMAL',
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: keyof TestResultItem, value: string) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setError('Patient name is required');
      return;
    }

    const validRows = rows.filter((r) => r.parameter.trim() && r.result.trim());
    if (validRows.length === 0) {
      setError('Please add at least one test parameter result');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: CreateLabPrescriptionPayload = {
        labOrderId: order.id,
        laboratoryId: order.laboratoryId,
        userId: order.userId || (order as any).user?.id || 'guest',
        pathologistName: pathologistName.trim(),
        patientName: patientName.trim(),
        patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
        patientGender: patientGender || undefined,
        testResults: validRows,
        remarks: remarks.trim() || undefined,
        instructions: instructions.trim() || undefined,
      };

      const result = await createLabPrescriptionApi(payload);
      onSuccess(result);
    } catch (err: any) {
      console.error('Failed to create lab prescription:', err);
      setError(err.message || 'Failed to generate diagnostic report. Please check details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative my-8 w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-700">
              <FileCheck2 className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Official Diagnostic Report Flow</span>
            </div>
            <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
              Create Lab Prescription &amp; Report
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Order #{order.orderNumber} • {order.items.map((i) => i.itemTitle).join(', ')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Top Section: Pathologist & Patient Snapshot */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50/70 p-4 border border-slate-100 sm:grid-cols-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Consultant Pathologist Name
              </label>
              <input
                type="text"
                required
                value={pathologistName}
                onChange={(e) => setPathologistName(e.target.value)}
                placeholder="Dr. Full Name (Degrees, Pathologist)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Patient Name
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Age (Yrs)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 shadow-2xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Gender
                </label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-900 shadow-2xs"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Middle Section: Dynamic Test Results Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Structured Parameter Test Results
                </h3>
                <p className="text-xs text-slate-500">
                  Enter observed diagnostic values and reference intervals for the generated PDF.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Parameter Row
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Test Name</th>
                    <th className="px-3 py-2.5">Parameter Analyzed</th>
                    <th className="px-3 py-2.5">Observed Result</th>
                    <th className="px-3 py-2.5">Unit</th>
                    <th className="px-3 py-2.5">Reference Range</th>
                    <th className="px-3 py-2.5">Flag</th>
                    <th className="px-2 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={row.testName}
                          onChange={(e) => handleRowChange(idx, 'testName', e.target.value)}
                          placeholder="e.g. Lipid Profile"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={row.parameter}
                          onChange={(e) => handleRowChange(idx, 'parameter', e.target.value)}
                          placeholder="e.g. Total Cholesterol"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={row.result}
                          onChange={(e) => handleRowChange(idx, 'result', e.target.value)}
                          placeholder="e.g. 175"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.unit || ''}
                          onChange={(e) => handleRowChange(idx, 'unit', e.target.value)}
                          placeholder="mg/dL"
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.referenceRange || ''}
                          onChange={(e) => handleRowChange(idx, 'referenceRange', e.target.value)}
                          placeholder="< 200"
                          className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={row.flag || 'NORMAL'}
                          onChange={(e) => handleRowChange(idx, 'flag', e.target.value)}
                          className={`rounded-lg border px-2 py-1.5 text-xs font-bold ${
                            row.flag === 'HIGH'
                              ? 'border-rose-300 bg-rose-50 text-rose-700'
                              : row.flag === 'LOW'
                                ? 'border-amber-300 bg-amber-50 text-amber-700'
                                : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <option value="NORMAL">NORMAL</option>
                          <option value="HIGH">HIGH</option>
                          <option value="LOW">LOW</option>
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={rows.length <= 1}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 transition"
                          title="Delete parameter row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Section: Pathologist Remarks & Patient Instructions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Pathologist Remarks &amp; Interpretation
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Diagnostic summary or clinical impression..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Patient Instructions / Advice
              </label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Follow-up guidance, repeat test instructions..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-700/20 hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating Official Report PDF...</span>
                </>
              ) : (
                <>
                  <FileCheck2 className="h-4 w-4" />
                  <span>Generate Diagnostic Report &amp; Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
