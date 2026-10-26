'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  FileUp,
  FlaskConical,
  Home,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Upload,
  User,
  X,
} from 'lucide-react';
import {
  getLabOrdersApi,
  labFileUrl,
  updateLabOrderStatusApi,
  uploadLabReportApi,
  type LabOrderSummary,
} from '@/app/lib/api/lab-portal';
import CreateLabPrescriptionModal from '@/app/components/lab-dashboard/CreateLabPrescriptionModal';

export default function LabPortalOrdersPage() {
  const [orders, setOrders] = useState<LabOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'COMPLETED'>('ALL');

  // Updating status state
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Prescription creation modal state
  const [prescriptionModalOrder, setPrescriptionModalOrder] = useState<LabOrderSummary | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Upload modal state
  const [uploadModalOrder, setUploadModalOrder] = useState<LabOrderSummary | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const data = await getLabOrdersApi();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load lab orders:', err);
      if (!isSilent) setError(err.message || 'Could not load your laboratory orders.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 12000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: string, nextStatus: string) => {
    try {
      setProcessingId(orderId);
      await updateLabOrderStatusApi(orderId, nextStatus);
      await fetchOrders(true);
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenUploadModal = (order: LabOrderSummary) => {
    setUploadModalOrder(order);
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleCloseUploadModal = () => {
    if (uploading) return;
    setUploadModalOrder(null);
    setSelectedFile(null);
    setUploadError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        setUploadError('File size exceeds the 25 MB limit.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModalOrder || !selectedFile) {
      setUploadError('Please select a PDF diagnostic report file to upload.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      await uploadLabReportApi(uploadModalOrder.id, selectedFile);
      setUploadModalOrder(null);
      setSelectedFile(null);
      await fetchOrders(true);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload diagnostic report.');
    } finally {
      setUploading(false);
    }
  };

  // Filtered orders feed
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      search.trim() === '' ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.patientName.toLowerCase().includes(search.toLowerCase()) ||
      o.patientPhone.includes(search);

    if (!matchesSearch) return false;

    if (activeTab === 'PENDING') {
      return o.status === 'PENDING' || o.status === 'SAMPLE_COLLECTION_PENDING';
    }
    if (activeTab === 'ACTIVE') {
      return (
        o.status === 'CONFIRMED' ||
        o.status === 'SAMPLE_COLLECTED' ||
        o.status === 'PROCESSING' ||
        o.status === 'REPORT_UPLOADED'
      );
    }
    if (activeTab === 'COMPLETED') {
      return o.status === 'COMPLETED' || o.status === 'CANCELLED';
    }
    return true;
  });

  const getStatusBadge = (status: LabOrderSummary['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        );
      case 'REPORT_UPLOADED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-bold text-cyan-700 ring-1 ring-inset ring-cyan-600/20">
            <FileCheck2 className="h-3 w-3" /> Report Uploaded
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <FlaskConical className="h-3 w-3" /> In Processing
          </span>
        );
      case 'SAMPLE_COLLECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
            Sample Collected
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-600/20">
            Order Accepted
          </span>
        );
      case 'SAMPLE_COLLECTION_PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
            Sample Collection Pending
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <Clock className="h-3 w-3" /> New Booking
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-6xl pb-12">
      {/* Page Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patient Orders Feed</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage incoming diagnostic bookings, advance sample milestones, and upload verified patient test reports.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchOrders(false)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-violet-600' : ''}`} />
          Refresh Orders
        </button>
      </div>

      {/* Tabs & Search Filter */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">
          {(
            [
              { label: 'All Orders', value: 'ALL' },
              { label: 'Pending Action', value: 'PENDING' },
              { label: 'In Progress', value: 'ACTIVE' },
              { label: 'Completed', value: 'COMPLETED' },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[260px] sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order #, patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* ORDERS LIST */}
      {loading && orders.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm font-medium text-slate-500">Loading incoming orders feed...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xs">
          <FlaskConical className="h-10 w-10 text-slate-300" />
          <h4 className="text-base font-semibold text-slate-800">No Orders in this view</h4>
          <p className="max-w-sm text-xs text-slate-500">
            Orders placed by patients for your laboratory will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isHome = order.collectionType === 'HOME_COLLECTION';
            const isProcessingThis = processingId === order.id;
            const reportUrl = labFileUrl(order.reportFileUrl);

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
              >
                {/* Top Row: Order Number, Date, Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-violet-700">{order.orderNumber}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleString('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status)}
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Middle Grid: Patient Info, Scheduled Time, Location */}
                <div className="my-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                  {/* Patient Details */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Patient</p>
                    <p className="text-sm font-bold text-slate-900">{order.patientName}</p>
                    <p className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {order.patientPhone}
                    </p>
                    {order.patientAge && (
                      <p className="text-slate-500">
                        Age: {order.patientAge} • {order.patientGender || 'Unspecified'}
                      </p>
                    )}
                  </div>

                  {/* Scheduled Slot & Collection Type */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Appointment Slot</p>
                    <p className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Clock className="h-3.5 w-3.5 text-violet-600" />
                      {new Date(order.scheduledDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      ({order.timeSlot})
                    </p>
                    <div className="pt-1">
                      {isHome ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                          <Home className="h-3 w-3" /> Home Sample Collection
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          <Building2 className="h-3 w-3" /> Lab Walk-In
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address & Total */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Location & Billing</p>
                    <p className="text-slate-700 font-medium line-clamp-1">{order.address}</p>
                    <p className="text-slate-500">{order.city || 'Rawalpindi/Islamabad'}</p>
                    <p className="pt-1 text-sm font-extrabold text-slate-900">
                      PKR {Number(order.totalAmount).toLocaleString()}
                      <span className="text-[11px] font-normal text-slate-400 ml-1">
                        ({order.items?.length || 1} item)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Items Summary */}
                {order.items && order.items.length > 0 && (
                  <div className="mb-4 rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Ordered Diagnostic Tests
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item, idx) => (
                        <span
                          key={item.id || idx}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                        >
                          <FlaskConical className="h-3 w-3 text-violet-500" />
                          {item.itemTitle}
                          <span className="text-slate-400 font-normal">
                            (PKR {Number(item.price).toLocaleString()})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Row: Actions & One-Click Progression Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  {/* Report Status Preview Link */}
                  <div>
                    {order.reportFileUrl ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" /> Report Ready
                        </span>
                        <a
                          href={reportUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 underline hover:text-violet-900"
                        >
                          <ExternalLink className="h-3 w-3" /> View Uploaded PDF
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No report uploaded yet</span>
                    )}
                  </div>

                  {/* ONE-CLICK PROGRESSION & REPORT UPLOAD BUTTONS */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Progression Button 1: Accept Order */}
                    {order.status === 'PENDING' && (
                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleStatusUpdate(order.id, 'CONFIRMED')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-violet-700 transition disabled:opacity-50"
                      >
                        {isProcessingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Accept Order
                      </button>
                    )}

                    {/* Progression Button 2: Sample Collected */}
                    {(order.status === 'CONFIRMED' || order.status === 'SAMPLE_COLLECTION_PENDING') && (
                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleStatusUpdate(order.id, 'SAMPLE_COLLECTED')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
                      >
                        {isProcessingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Mark Sample Collected
                      </button>
                    )}

                    {/* Progression Button 3: In Processing */}
                    {order.status === 'SAMPLE_COLLECTED' && (
                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleStatusUpdate(order.id, 'PROCESSING')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {isProcessingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                        Move to In Processing
                      </button>
                    )}

                    {/* PRIMARY ACTION: CREATE / UPDATE LAB PRESCRIPTION */}
                    {order.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={() => setPrescriptionModalOrder(order)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                      >
                        <FileCheck2 className="h-3.5 w-3.5" />
                        {order.reportFileUrl ? 'Update Prescription' : 'Create Lab Prescription'}
                      </button>
                    )}

                    {/* Secondary Option: Manual File Upload */}
                    {order.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={() => handleOpenUploadModal(order)}
                        title="Upload existing PDF report"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-2xs hover:bg-slate-50 transition"
                      >
                        <FileUp className="h-3.5 w-3.5 text-slate-400" />
                        <span>Upload PDF</span>
                      </button>
                    )}

                    {/* Progression Button 4: Complete Order */}
                    {(order.status === 'REPORT_UPLOADED' || order.status === 'PROCESSING') && (
                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleStatusUpdate(order.id, 'COMPLETED')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        {isProcessingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Mark as Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REPORT UPLOAD MODAL */}
      {uploadModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload Diagnostic Report</h3>
                <p className="text-xs text-slate-500">
                  Order {uploadModalOrder.orderNumber} • {uploadModalOrder.patientName}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseUploadModal}
                disabled={uploading}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUpload} className="mt-4 space-y-4">
              {uploadError && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Drag / File Select Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50/20 transition"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 mb-2">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Click to select patient diagnostic report PDF'}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : 'PDF format up to 25 MB supported'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseUploadModal}
                  disabled={uploading}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-violet-700 transition disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                  {uploading ? 'Uploading Report...' : 'Upload & Save Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE LAB PRESCRIPTION MODAL */}
      {prescriptionModalOrder && (
        <CreateLabPrescriptionModal
          order={prescriptionModalOrder}
          onClose={() => setPrescriptionModalOrder(null)}
          onSuccess={(prescription) => {
            setPrescriptionModalOrder(null);
            setSuccessBanner(`Diagnostic report successfully generated for Order #${prescription.labOrder?.orderNumber || ''}! Report PDF is now attached.`);
            fetchOrders(true);
            setTimeout(() => setSuccessBanner(null), 6000);
          }}
        />
      )}

      {/* SUCCESS TOAST BANNER */}
      {successBanner && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-emerald-700 px-5 py-3.5 text-xs font-bold text-white shadow-2xl shadow-emerald-950/25">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successBanner}</span>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="ml-2 rounded p-1 hover:bg-emerald-800 transition text-emerald-200 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
