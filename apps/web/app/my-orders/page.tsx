'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  FlaskConical,
  ShoppingBag,
  Calendar,
  Clock,
  Building2,
  Download,
  CheckCircle2,
  AlertCircle,
  MapPin,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  isAvailable?: boolean;
}

interface UserOrder {
  id: string;
  orderCode: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
}

interface UserLabOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  collectionType: string;
  scheduledDate: string;
  timeSlot: string;
  totalAmount: number;
  patientName: string;
  address: string;
  reportFileUrl?: string | null;
  reportUploadedAt?: string | null;
  createdAt: string;
  laboratory?: {
    id: string;
    name: string;
    phone?: string;
  };
  items: {
    id: string;
    itemTitle: string;
    price: number;
  }[];
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pharmacy' | 'labs'>('pharmacy');
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [labOrders, setLabOrders] = useState<UserLabOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem('tabibistan_user') ||
        localStorage.getItem('user') ||
        localStorage.getItem('userData');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed.user || parsed.data?.user || parsed);
      } else {
        router.push('/');
      }
    } catch {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (user?.id) {
      loadAllOrders();
    }
  }, [user?.id]);

  const loadAllOrders = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [pharmacyRes, labsRes] = await Promise.all([
        fetch(`${API_BASE}/orders?userId=${encodeURIComponent(user.id)}`).catch(() => null),
        fetch(`${API_BASE}/labs/orders?userId=${encodeURIComponent(user.id)}`).catch(() => null),
      ]);

      if (pharmacyRes && pharmacyRes.ok) {
        const data = await pharmacyRes.json();
        const mappedOrders = data.map((order: any) => ({
          id: order.id,
          orderCode: `TB-${order.id.slice(0, 8).toUpperCase()}`,
          totalAmount: order.totalAmount || 0,
          status: order.status || 'PENDING',
          paymentMethod: order.paymentMethod || 'COD',
          paymentStatus: order.paymentStatus || 'PENDING',
          createdAt: order.createdAt,
          items: order.items || [],
        }));
        setOrders(mappedOrders);
      }

      if (labsRes && labsRes.ok) {
        const labData = await labsRes.json();
        setLabOrders(Array.isArray(labData) ? labData : []);
      }
    } catch (err) {
      console.error('Failed to load user orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPharmacyStatusBadge = (status: string) => {
    const st = status.toUpperCase();
    if (st === 'COMPLETED')
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold">
          Completed
        </span>
      );
    if (st === 'PROCESSING')
      return (
        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-bold">
          Processing
        </span>
      );
    if (st === 'CONFIRMED')
      return (
        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md text-xs font-bold">
          Confirmed
        </span>
      );
    if (st === 'REVIEWING')
      return (
        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-md text-xs font-bold">
          Reviewing
        </span>
      );
    if (st === 'CANCELLED')
      return (
        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-md text-xs font-bold">
          Cancelled
        </span>
      );
    return (
      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold">
        Pending
      </span>
    );
  };

  const getLabStatusBadge = (status: string) => {
    const st = status.toUpperCase();
    if (st === 'COMPLETED' || st === 'REPORT_UPLOADED')
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {st === 'REPORT_UPLOADED' ? 'Report Ready' : 'Completed'}
        </span>
      );
    if (st === 'PROCESSING')
      return (
        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-bold">
          In Processing
        </span>
      );
    if (st === 'SAMPLE_COLLECTED')
      return (
        <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-md text-xs font-bold">
          Sample Collected
        </span>
      );
    if (st === 'CONFIRMED')
      return (
        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md text-xs font-bold">
          Confirmed
        </span>
      );
    if (st === 'CANCELLED')
      return (
        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-md text-xs font-bold">
          Cancelled
        </span>
      );
    return (
      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold">
        Pending Collection
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">My Orders</h1>
            <p className="text-xs text-gray-500 mt-1">
              Track your pharmacy medications and diagnostic laboratory bookings.
            </p>
          </div>
          <button
            onClick={loadAllOrders}
            className="self-start sm:self-center px-3.5 py-1.5 text-xs font-bold text-[#ff6f61] border border-[#ff6f61] rounded-lg hover:bg-red-50 transition cursor-pointer"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('pharmacy')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition ${
              activeTab === 'pharmacy'
                ? 'bg-white text-gray-900 shadow-xs ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Pharmacy Orders</span>
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('labs')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition ${
              activeTab === 'labs'
                ? 'bg-white text-gray-900 shadow-xs ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
            }`}
          >
            <FlaskConical className="h-4 w-4 text-emerald-600" />
            <span>Lab Diagnostic Tests</span>
            <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
              {labOrders.length}
            </span>
          </button>
        </div>

        {/* Orders List Body */}
        {loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400 text-sm">
            Orders are loading...
          </div>
        ) : activeTab === 'pharmacy' ? (
          orders.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400 text-sm space-y-3">
              <p className="text-gray-500 font-semibold">You have no active pharmacy orders.</p>
              <Link
                href="/"
                className="inline-block px-4 py-2 bg-[#ff6f61] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#e85b4d] transition"
              >
                Browse Medicines
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-gray-900 text-base">{order.orderCode}</span>
                      {getPharmacyStatusBadge(order.status)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Placed on:{' '}
                      <span className="font-semibold text-gray-800">
                        {new Date(order.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span>{item.productName}</span>
                        <span className="bg-gray-200 text-gray-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                          x{item.quantity}
                        </span>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Amount</span>
                      <span className="text-base font-black text-[#ff6f61]">
                        Rs. {order.totalAmount.toLocaleString()}
                      </span>
                    </div>

                    <Link
                      href={`/orders/${order.id}`}
                      className="px-4 py-2 bg-[#ff6f61] hover:bg-[#e85b4d] text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : labOrders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400 text-sm space-y-3">
            <p className="text-gray-500 font-semibold">You have no lab test bookings yet.</p>
            <Link
              href="/lab-tests"
              className="inline-block px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-700 transition"
            >
              Browse Lab Tests
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {labOrders.map((labOrder) => (
              <div
                key={labOrder.id}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-900 text-base">{labOrder.orderNumber}</span>
                    {getLabStatusBadge(labOrder.status)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Booked on:{' '}
                    <span className="font-semibold text-gray-800">
                      {new Date(labOrder.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Lab & Schedule Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium text-gray-900">{labOrder.laboratory?.name || 'Partner Lab'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      {new Date(labOrder.scheduledDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      • {labOrder.timeSlot}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{labOrder.address}</span>
                  </div>
                </div>

                {/* Tests Items List */}
                <div className="flex flex-wrap gap-2">
                  {labOrder.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="bg-emerald-50 text-emerald-800 border border-emerald-200/70 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>{item.itemTitle}</span>
                      <span className="text-emerald-600 font-bold">PKR {item.price.toLocaleString()}</span>
                    </span>
                  ))}
                </div>

                {/* Footer Details */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Amount</span>
                    <span className="text-base font-black text-emerald-700">
                      PKR {labOrder.totalAmount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {labOrder.reportFileUrl ? (
                      <a
                        href={labOrder.reportFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Report
                      </a>
                    ) : (
                      <Link
                        href={`/labs/orders/success?orderNumber=${encodeURIComponent(labOrder.orderNumber)}&patientName=${encodeURIComponent(labOrder.patientName)}&date=${encodeURIComponent(labOrder.scheduledDate)}&slot=${encodeURIComponent(labOrder.timeSlot)}&total=${labOrder.totalAmount}&address=${encodeURIComponent(labOrder.address)}&labName=${encodeURIComponent(labOrder.laboratory?.name || 'Partner Lab')}`}
                        className="px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5"
                      >
                        View Receipt →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
