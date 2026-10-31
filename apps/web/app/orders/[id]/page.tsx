'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface OrderItem {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
  isAvailable?: boolean;
}

interface Prescription {
  id: string;
  fileUrl: string;
}

interface CustomerOrderDetails {
  id: string;
  orderCode: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: string;
  orderDate: string;
  items: OrderItem[];
  prescriptions: Prescription[];
}

const STATUS_STEPS = ['PENDING', 'REVIEWING', 'CONFIRMED', 'PROCESSING', 'COMPLETED'];

export default function CustomerOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<CustomerOrderDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`https://tabibistan.org/orders/${orderId}`);
      if (!res.ok) {
        throw new Error('Order details load nahi ho sakay.');
      }
      const data = await res.json();

      const rawItems = data.items || [];
      const prescriptions = data.prescriptions || [];

      let rawPrescriptionUrl: string | null = null;
      if (prescriptions.length > 0 && prescriptions[0]?.fileUrl) {
        const url = prescriptions[0].fileUrl;
        rawPrescriptionUrl = url.startsWith('http') ? url : `https://tabibistan.org${url.startsWith('/') ? '' : '/'}${url}`;
      }

      setOrder({
        id: data.id,
        orderCode: `TB-${data.id.slice(0, 8).toUpperCase()}`,
        totalAmount: data.totalAmount || 0,
        status: data.status || 'PENDING',
        paymentStatus: data.paymentStatus || 'PENDING',
        paymentMethod: data.paymentMethod || 'COD',
        shippingAddress: data.shippingAddress || 'No address specified',
        orderDate: data.createdAt
          ? new Date(data.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Recently',
        items: rawItems.map((i: any) => ({
          id: i.id || Math.random().toString(),
          productName: i.productName || i.product?.name || 'Healthcare Item',
          price: i.price || 0,
          quantity: i.quantity || 1,
          total: i.total || (i.price || 0) * (i.quantity || 1),
          isAvailable: i.isAvailable !== false,
        })),
        prescriptions,
      });

      if (rawPrescriptionUrl) {
        setSelectedPrescription(null); // default closed
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Order load karne mein masla aaya.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const st = status.toUpperCase();
    if (st === 'COMPLETED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (st === 'PROCESSING') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (st === 'CONFIRMED') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (st === 'REVIEWING') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (st === 'CANCELLED') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const getCurrentStepIndex = (status: string) => {
    const idx = STATUS_STEPS.indexOf(status.toUpperCase());
    return idx === -1 ? 0 : idx;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/notifications"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#ff6f61] hover:underline"
          >
            ← Back to Notifications
          </Link>

          <button
            onClick={loadOrder}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800"
          >
            🔄 Refresh Status
          </button>
        </div>

        {loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400 text-sm">
            Order details load ho rahi hain...
          </div>
        ) : error || !order ? (
          <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 text-rose-700 text-xs font-bold">
            ⚠️ {error || 'Order nahi mila.'}
          </div>
        ) : (
          <>
            {/* Top Info Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black text-gray-900">{order.orderCode}</h1>
                    <span className={`px-3 py-1 rounded-md text-xs font-bold border ${getStatusBadgeClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Placed on {order.orderDate}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-extrabold block">Total Amount</span>
                  <span className="text-lg font-black text-[#ff6f61]">Rs. {order.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Progress Stepper Bar (if not cancelled) */}
              {order.status.toUpperCase() !== 'CANCELLED' ? (
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Order Progress</p>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {STATUS_STEPS.map((step, idx) => {
                      const currentIdx = getCurrentStepIndex(order.status);
                      const isDone = idx <= currentIdx;

                      return (
                        <div key={step} className="space-y-1.5">
                          <div className={`h-2 rounded-full transition-all ${isDone ? 'bg-[#ff6f61]' : 'bg-gray-100'}`} />
                          <span className={`text-[10px] font-bold block truncate ${isDone ? 'text-gray-900' : 'text-gray-300'}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold text-center">
                  ❌ This order has been cancelled.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Items */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                  <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Ordered Items ({order.items.length})
                  </h2>

                  <div className="divide-y divide-gray-100">
                    {order.items.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${!item.isAvailable ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {item.productName}
                            </span>
                            {!item.isAvailable && (
                              <span className="bg-rose-100 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded border border-rose-200">
                                Not Available in Stock
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400">
                            Rs. {item.price.toLocaleString()} x {item.quantity}
                          </p>
                        </div>

                        <span className="text-xs font-black text-gray-900">
                          Rs. {item.total.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="border-t border-gray-100 pt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span>Rs. {order.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Delivery Fee</span>
                      <span className="text-emerald-600 font-bold">Free</span>
                    </div>
                    <div className="flex justify-between font-black text-gray-900 text-sm pt-2 border-t border-gray-100">
                      <span>Total Amount</span>
                      <span className="text-[#ff6f61]">Rs. {order.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Prescription Notice */}
                {order.prescriptions.length > 0 && (
                  <div className="bg-[#FFFBEB] p-5 rounded-2xl border border-amber-200 space-y-2">
                    <h3 className="text-xs font-bold text-amber-900 uppercase">Attached Prescription</h3>
                    <p className="text-xs text-amber-800">
                      Doctor prescription is uploaded and linked to this order.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Sidebar: Shipping & Payment */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    📍 Shipping Address
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {order.shippingAddress}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    💳 Payment Details
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Method</span>
                      <span className="font-bold text-gray-800 uppercase">{order.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        order.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}