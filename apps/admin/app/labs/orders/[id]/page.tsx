'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  FlaskConical,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  ShoppingBag,
  User,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

const ORDER_STATUS_OPTIONS = [
  'PENDING',
  'CONFIRMED',
  'SAMPLE_COLLECTION_PENDING',
  'SAMPLE_COLLECTED',
  'PROCESSING',
  'REPORT_UPLOADED',
  'COMPLETED',
  'CANCELLED',
];

const PAYMENT_STATUS_OPTIONS = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('PENDING');

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch lab order
      let res = await fetch(`${API_BASE}/admin/labs/orders/${orderId}`);
      if (!res.ok) {
        res = await fetch(`${API_BASE}/admin/lab-orders/${orderId}`);
      }
      if (!res.ok) {
        throw new Error(`Order ${orderId} not found`);
      }
      const data = await res.json();
      setOrder(data);
      setSelectedStatus(data.status || 'PENDING');
      setSelectedPaymentStatus(data.paymentStatus || 'PENDING');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);
      setSaveSuccess(false);
      const res = await fetch(`${API_BASE}/admin/labs/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: selectedStatus,
          paymentStatus: selectedPaymentStatus,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      const updated = await res.json();
      setOrder(updated);
      setSelectedStatus(updated.status);
      setSelectedPaymentStatus(updated.paymentStatus);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error updating order status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <p className="text-sm font-medium text-slate-500">Loading order #{orderId}...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar />
        <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs max-w-md">
            <h3 className="text-lg font-bold text-slate-900">Order Not Found</h3>
            <p className="mt-2 text-xs text-slate-500">{error || 'Could not locate the requested order record.'}</p>
            <Link
              href="/labs/orders"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isHome = order.collectionType === 'HOME_COLLECTION';
  const hasCoordinates = typeof order.latitude === 'number' && typeof order.longitude === 'number';
  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address + ', ' + (order.city || ''))}`;
  const openStreetMapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${order.latitude}&mlon=${order.longitude}#map=16/${order.latitude}/${order.longitude}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(order.address + ', ' + (order.city || ''))}`;

  const reportUrl = order.reportFileUrl
    ? order.reportFileUrl.startsWith('http')
      ? order.reportFileUrl
      : `${API_BASE}${order.reportFileUrl}`
    : null;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/labs/orders"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{order.orderNumber}</h1>
                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Booked on {new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchOrder}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* STATUS UPDATE ACTION PANEL */}
        <div className="mb-8 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/50 to-white p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Manage Order & Payment Status</h2>
              <p className="text-xs text-slate-500">Update workflow milestones and payment verification status</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Order Status Dropdown */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Order Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-xs focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
                >
                  {ORDER_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status Dropdown */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Payment Status
                </label>
                <select
                  value={selectedPaymentStatus}
                  onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-xs focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
                >
                  {PAYMENT_STATUS_OPTIONS.map((pst) => (
                    <option key={pst} value={pst}>
                      {pst}
                    </option>
                  ))}
                </select>
              </div>

              {/* Update Button */}
              <div className="pt-4 sm:pt-4">
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-violet-700 transition disabled:opacity-50"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saveSuccess ? (
                    <Check className="h-4 w-4 text-emerald-300" />
                  ) : null}
                  {updating ? 'Saving...' : saveSuccess ? 'Updated!' : 'Save Status'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MEDICAL REPORT CARD (IF UPLOADED) */}
        {order.reportFileUrl && (
          <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <FileCheck2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">Patient Diagnostic Report Uploaded</h3>
                  <p className="text-xs text-emerald-700">
                    Uploaded on{' '}
                    {order.reportUploadedAt
                      ? new Date(order.reportUploadedAt).toLocaleString('en-GB', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'Recently'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={reportUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-50 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Report PDF
                </a>
                <a
                  href={reportUrl!}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 3-COLUMN DETAIL CARDS */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 1. Patient Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <User className="h-4 w-4 text-violet-600" /> Patient Details
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[11px] text-slate-400">Full Name</p>
                <p className="font-semibold text-slate-900 text-sm">{order.patientName}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Phone Number</p>
                <p className="font-medium text-slate-900">{order.patientPhone}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-slate-400">Age</p>
                  <p className="font-medium text-slate-900">{order.patientAge ? `${order.patientAge} Years` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Gender</p>
                  <p className="font-medium text-slate-900">{order.patientGender || 'Unspecified'}</p>
                </div>
              </div>
              {order.specialInstructions && (
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-800 text-[11px] border border-amber-200">
                  <span className="font-bold">Special Note: </span>
                  {order.specialInstructions}
                </div>
              )}
            </div>
          </div>

          {/* 2. Schedule & Lab Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Calendar className="h-4 w-4 text-violet-600" /> Schedule & Partner Lab
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[11px] text-slate-400">Scheduled Date & Slot</p>
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                  <Clock className="h-3.5 w-3.5 text-violet-600" />
                  {new Date(order.scheduledDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  • {order.timeSlot}
                </div>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Sample Collection Method</p>
                <p className="mt-1">
                  {isHome ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      <Home className="h-3.5 w-3.5" /> Home Sample Collection
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-600/20">
                      <Building2 className="h-3.5 w-3.5" /> Walk-In At Laboratory
                    </span>
                  )}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] text-slate-400">Assigned Laboratory</p>
                <p className="font-bold text-slate-900">{order.laboratory?.name || 'Laboratory'}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">{order.laboratory?.phone}</p>
              </div>
            </div>
          </div>

          {/* 3. Address & GPS Coordinates */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <MapPin className="h-4 w-4 text-violet-600" /> Location & GPS Coordinates
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[11px] text-slate-400">Address</p>
                <p className="font-medium text-slate-900">{order.address}</p>
                <p className="text-slate-500 text-[11px]">{order.city || 'Rawalpindi/Islamabad'}</p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">GPS Coordinates</p>
                {hasCoordinates ? (
                  <p className="font-mono text-xs font-bold text-slate-800">
                    {order.latitude?.toFixed(6)}, {order.longitude?.toFixed(6)}
                  </p>
                ) : (
                  <p className="text-slate-400 italic">No GPS coordinates recorded</p>
                )}
              </div>

              {/* Exact Pin Map Links */}
              <div className="pt-2 flex flex-col gap-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-1.5 px-3 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
                >
                  <Navigation className="h-3.5 w-3.5 text-blue-600" />
                  Open in Google Maps
                </a>
                <a
                  href={openStreetMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-1.5 px-3 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                  Open in OpenStreetMap
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ITEMIZED PRICING BREAKDOWN TABLE */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 bg-slate-50/75 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Itemized Test Breakdown</h3>
            <p className="text-xs text-slate-500">List of laboratory tests & packages ordered by the patient</p>
          </div>

          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3">#</th>
                <th scope="col" className="px-5 py-3">Test / Package Title</th>
                <th scope="col" className="px-5 py-3">Type</th>
                <th scope="col" className="px-5 py-3">Item Code</th>
                <th scope="col" className="px-5 py-3 text-right">Price (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items?.map((item: any, idx: number) => (
                <tr key={item.id || idx}>
                  <td className="px-5 py-3 text-slate-400">{idx + 1}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{item.itemTitle}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {item.itemType || 'TEST'}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-400">{item.itemCode || '—'}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">
                    PKR {Number(item.price).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Summary Breakdown */}
          <div className="border-t border-slate-200 bg-slate-50/50 p-5">
            <div className="flex flex-col items-end gap-1.5 text-xs">
              <div className="flex justify-between gap-8 min-w-[240px]">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-semibold text-slate-900">PKR {Number(order.subTotal).toLocaleString()}</span>
              </div>
              {order.homeSampleFee > 0 && (
                <div className="flex justify-between gap-8 min-w-[240px]">
                  <span className="text-slate-500">Home Sample Collection Fee:</span>
                  <span className="font-semibold text-slate-900">
                    + PKR {Number(order.homeSampleFee).toLocaleString()}
                  </span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between gap-8 min-w-[240px]">
                  <span className="text-emerald-600 font-semibold">Discount:</span>
                  <span className="font-semibold text-emerald-600">
                    - PKR {Number(order.discount).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="my-1 w-full max-w-[240px] border-t border-slate-200" />
              <div className="flex justify-between gap-8 min-w-[240px] text-sm">
                <span className="font-bold text-slate-900">Total Amount:</span>
                <span className="font-bold text-violet-700">
                  PKR {Number(order.totalAmount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-8 min-w-[240px] text-[11px] text-slate-400 mt-1">
                <span>Payment Method:</span>
                <span className="font-medium text-slate-700">{order.paymentMethod || 'CASH_ON_COLLECTION'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
