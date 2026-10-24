'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  FileCheck2,
  FlaskConical,
  Home,
  LayoutDashboard,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  User,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface LabOrderItem {
  id: string;
  itemTitle: string;
  itemCode?: string | null;
  itemType: string;
  price: number;
}

export interface LabOrder {
  id: string;
  orderNumber: string;
  userId: string;
  laboratoryId: string;
  laboratory: {
    id: string;
    name: string;
    phone: string;
    logoUrl?: string | null;
  };
  collectionType: 'HOME_COLLECTION' | 'LAB_WALK_IN';
  status:
    | 'PENDING'
    | 'CONFIRMED'
    | 'SAMPLE_COLLECTION_PENDING'
    | 'SAMPLE_COLLECTED'
    | 'PROCESSING'
    | 'REPORT_UPLOADED'
    | 'COMPLETED'
    | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  subTotal: number;
  homeSampleFee: number;
  discount: number;
  totalAmount: number;
  scheduledDate: string;
  timeSlot: string;
  patientName: string;
  patientPhone: string;
  patientAge?: number | null;
  patientGender?: string | null;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  specialInstructions?: string | null;
  reportFileUrl?: string | null;
  reportUploadedAt?: string | null;
  items: LabOrderItem[];
  createdAt: string;
}

interface OrderKpis {
  totalOrders: number;
  pendingSampleCollections: number;
  completedOrders: number;
  totalRevenue: number;
}

const STATUS_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [kpis, setKpis] = useState<OrderKpis>({
    totalOrders: 0,
    pendingSampleCollections: 0,
    completedOrders: 0,
    totalRevenue: 0,
  });

  const fetchOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') {
        params.append('status', activeTab);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      let res = await fetch(`${API_BASE}/admin/labs/orders?${params.toString()}`);
      if (!res.ok) {
        res = await fetch(`${API_BASE}/admin/lab-orders?${params.toString()}`);
      }
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();

      if (data && Array.isArray(data.orders)) {
        setOrders(data.orders);
        if (data.kpis) {
          setKpis(data.kpis);
        }
      } else if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (err) {
      console.error('Error fetching admin lab orders:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const getOrderStatusBadge = (status: LabOrder['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        );
      case 'REPORT_UPLOADED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-600/20">
            Report Uploaded
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
            Processing
          </span>
        );
      case 'SAMPLE_COLLECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
            Sample Collected
          </span>
        );
      case 'SAMPLE_COLLECTION_PENDING':
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/20">
            {status === 'CONFIRMED' ? 'Confirmed' : 'Collection Pending'}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (status: LabOrder['paymentStatus']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            PAID
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
            REFUNDED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/10">
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lab Orders Management</h1>
            <p className="text-sm text-slate-500">
              Track customer bookings, scheduled tests, partner labs, and report generation in real time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchOrders(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-violet-600' : ''}`} />
            Refresh
          </button>
        </div>

        {/* TOP 4 KPI CARDS */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Total Orders Count */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Orders</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">{kpis.totalOrders}</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <ShoppingBag className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">All registered diagnostic orders</p>
          </div>

          {/* 2. Pending Sample Collections */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending Collections</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">{kpis.pendingSampleCollections}</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Awaiting phlebotomist visit / intake</p>
          </div>

          {/* 3. Completed Orders */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Completed Orders</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">{kpis.completedOrders}</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Tests processed & report issued</p>
          </div>

          {/* 4. Total Revenue Collected */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Total Revenue</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  PKR {Number(kpis.totalRevenue).toLocaleString()}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Paid and completed bookings</p>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">
            {STATUS_TABS.map((tab) => {
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

          {/* Search Bar */}
          <div className="relative min-w-[260px] sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order #, patient, lab..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* ORDERS TABLE */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          {loading && orders.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              <p className="text-sm font-medium text-slate-500">Loading lab orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 p-6 text-center">
              <ShoppingBag className="h-10 w-10 text-slate-300" />
              <h4 className="text-base font-semibold text-slate-800">No Orders Found</h4>
              <p className="max-w-sm text-xs text-slate-500">
                No orders match your active filter tab or search criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Order # & Date</th>
                    <th scope="col" className="px-5 py-3.5">Patient Details</th>
                    <th scope="col" className="px-5 py-3.5">Partner Lab</th>
                    <th scope="col" className="px-5 py-3.5">Collection Type</th>
                    <th scope="col" className="px-5 py-3.5">Total Amount</th>
                    <th scope="col" className="px-5 py-3.5">Payment</th>
                    <th scope="col" className="px-5 py-3.5">Order Status</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => {
                    const isHome = order.collectionType === 'HOME_COLLECTION';
                    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/75 transition">
                        {/* Order # & Date */}
                        <td className="px-5 py-4 font-medium text-slate-900 whitespace-nowrap">
                          <div className="font-bold text-violet-700">{order.orderNumber}</div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                            <Calendar className="h-3 w-3" />
                            {formattedDate}
                          </div>
                        </td>

                        {/* Patient Details */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{order.patientName}</div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                            <Phone className="h-3 w-3" />
                            {order.patientPhone}
                          </div>
                          {order.patientAge && (
                            <div className="text-[10px] text-slate-400">
                              Age: {order.patientAge} • {order.patientGender || 'Unspecified'}
                            </div>
                          )}
                        </td>

                        {/* Partner Lab */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <div>
                              <div className="font-semibold text-slate-900">{order.laboratory?.name || 'Assigned Lab'}</div>
                              <div className="text-[11px] text-slate-400">{order.laboratory?.phone}</div>
                            </div>
                          </div>
                        </td>

                        {/* Collection Type Badge */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {isHome ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                              <Home className="h-3 w-3" /> Home Sample
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-600/20">
                              <Building2 className="h-3 w-3" /> Walk-In
                            </span>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            PKR {Number(order.totalAmount).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {order.items?.length || 1} test item(s)
                          </div>
                        </td>

                        {/* Payment Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {getPaymentStatusBadge(order.paymentStatus)}
                        </td>

                        {/* Order Status Badge */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {getOrderStatusBadge(order.status)}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <Link
                            href={`/labs/orders/${order.id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
