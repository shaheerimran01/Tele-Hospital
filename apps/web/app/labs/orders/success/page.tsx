'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  MapPin,
  Building2,
  Receipt,
  ArrowRight,
  Home,
  FileText,
  Bell,
  Copy,
  Check,
} from 'lucide-react';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = React.useState(false);

  const orderNumber = searchParams.get('orderNumber') || 'ORD-2026-CONFIRMED';
  const patientName = searchParams.get('patientName') || 'Valued Patient';
  const scheduledDate = searchParams.get('date');
  const timeSlot = searchParams.get('slot') || '09:00 AM - 11:00 AM';
  const collectionType = searchParams.get('collectionType') || 'HOME_COLLECTION';
  const address = searchParams.get('address') || 'Provided Patient Address';
  const total = searchParams.get('total') || '0';
  const labName = searchParams.get('labName') || 'Partner Diagnostic Center';

  const formattedDate = scheduledDate
    ? new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'As scheduled';

  const copyOrderNumber = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Main Success Card */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-gray-200/50 ring-1 ring-gray-100">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-10 text-center text-white sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              Order Placed Successfully! 🎉
            </h1>
            <p className="mt-2 text-sm text-emerald-100 sm:text-base">
              Thank you for booking with Tabibistan Labs. Your diagnostic sample appointment is confirmed.
            </p>

            {/* Order Number Badge */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 backdrop-blur-md ring-1 ring-white/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Order ID:</span>
              <span className="font-mono text-base font-bold text-white">{orderNumber}</span>
              <button
                type="button"
                onClick={copyOrderNumber}
                title="Copy Order Number"
                className="ml-1 rounded p-1 hover:bg-white/20 transition text-emerald-100 hover:text-white"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-200" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Details Summary Body */}
          <div className="p-6 sm:p-10 space-y-6">
            {/* Notification Alert Banner */}
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50/80 p-4 ring-1 ring-amber-200/60">
              <Bell className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="text-xs sm:text-sm text-amber-800">
                <span className="font-semibold">Notification Sent: </span>
                A confirmation notification has been added to your Tabibistan account. Our certified phlebotomist will arrive during your scheduled time slot.
              </div>
            </div>

            {/* Appointment Details Grid */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Booking Summary
              </h2>
              <div className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between p-3.5 sm:p-4">
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>Patient Name</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 text-right">{patientName}</span>
                </div>

                <div className="flex items-center justify-between p-3.5 sm:p-4">
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>Partner Laboratory</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 text-right">{labName}</span>
                </div>

                <div className="flex items-center justify-between p-3.5 sm:p-4">
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>Scheduled Date</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 text-right">{formattedDate}</span>
                </div>

                <div className="flex items-center justify-between p-3.5 sm:p-4">
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>Time Slot</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700 text-right">{timeSlot}</span>
                </div>

                <div className="flex items-start justify-between p-3.5 sm:p-4">
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>Collection Location</span>
                  </div>
                  <span className="max-w-[55%] text-right text-sm font-semibold text-gray-900">
                    {address}
                    <span className="block text-[11px] font-normal text-gray-500">
                      {collectionType === 'HOME_COLLECTION' ? 'Home Sample Collection' : 'Lab Walk-In'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 sm:p-4 bg-emerald-50/40 rounded-b-2xl">
                  <div className="flex items-center gap-3 text-sm font-medium text-emerald-950">
                    <Receipt className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Total Amount (Cash on Collection)</span>
                  </div>
                  <span className="text-base font-extrabold text-emerald-700">
                    PKR {Number(total).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row gap-3">
              <Link
                href="/"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
              >
                <Home className="h-4 w-4" />
                <span>Back to Home</span>
              </Link>
              <Link
                href="/my-orders"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#141b34] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#141b34]/15 transition hover:bg-[#1a2342]"
              >
                <FileText className="h-4 w-4" />
                <span>View My Orders</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Support Help Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Need assistance with your lab booking? Reach out to Tabibistan Support at{' '}
          <a href="tel:+923000000000" className="font-medium text-gray-600 underline">
            +92 300 000 0000
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LabOrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto" />
            <p className="mt-4 text-sm font-medium text-gray-600">Loading order confirmation...</p>
          </div>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
