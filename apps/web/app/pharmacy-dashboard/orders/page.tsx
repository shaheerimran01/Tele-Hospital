'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  User,
  LogOut,
  MapPin,
  ShoppingBag,
  ChevronRight,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  RefreshCw,
  Loader2,
  Phone,
  Mail,
  CheckSquare,
  MinusSquare,
  X,
} from 'lucide-react';
import { PharmacySidebar } from '@/components/pharmacy/Sidebar';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  product?: {
    name?: string;
    genericName?: string;
    manufacturer?: string;
  } | null;
}

interface Order {
  id: string;
  shippingAddress?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
  items: OrderItem[];
}

interface PharmacyOrderRequest {
  id: string;
  orderId: string;
  pharmacyId: string;
  status: string;
  requestedAt: string;
  expiresAt: string;
  respondedAt: string | null;
  responseTimeSeconds: number | null;
  availableOrderItemIds?: string[];
  order: Order;
}

interface AnalyticsData {
  totalRequests: number;
  pending: number;
  accepted: number;
  declined: number;
  outOfStock: number;
  expired: number;
  avgResponseTimeSeconds: number;
  acceptanceRate: string;
}

const getStoragePharmacyId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pharmacyId') || localStorage.getItem('userPharmacyId') || null;
};

export default function PharmacyOrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'orders' | 'analytics'>('orders');
  const [requests, setRequests] = useState<PharmacyOrderRequest[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);

  useEffect(() => {
    const storedId = getStoragePharmacyId();
    setPharmacyId(storedId);
  }, []);

  const fetchRequests = async () => {
    if (!pharmacyId) return;
    setLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/orders/pharmacy-orders`, {
        headers: {
          'x-pharmacy-id': pharmacyId,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch order requests');
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!pharmacyId) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/orders/pharmacy-orders/analytics`, {
        headers: {
          'x-pharmacy-id': pharmacyId,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResponse = async (requestId: string, status: string) => {
    if (!pharmacyId) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    try {
      const res = await fetch(`${baseUrl}/orders/pharmacy-orders/${requestId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-pharmacy-id': pharmacyId,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Response failed');
      }
      await fetchRequests();
      await fetchAnalytics();
    } catch (err: any) {
      alert(err.message || 'Failed to respond');
    }
  };

  // State for Partially Available modal
  const [partialModalOpen, setPartialModalOpen] = useState(false);
  const [partialRequestId, setPartialRequestId] = useState<string | null>(null);
  const [partialOrderItems, setPartialOrderItems] = useState<OrderItem[]>([]);
  const [selectedPartialItems, setSelectedPartialItems] = useState<Set<string>>(new Set());

  const openPartialModal = (request: PharmacyOrderRequest) => {
    setPartialRequestId(request.id);
    const items = request.order?.items || [];
    setPartialOrderItems(items);
    if (request.availableOrderItemIds && request.availableOrderItemIds.length > 0) {
      setSelectedPartialItems(new Set(request.availableOrderItemIds));
    } else {
      setSelectedPartialItems(new Set());
    }
    setPartialModalOpen(true);
  };

  const closePartialModal = () => {
    setPartialModalOpen(false);
    setPartialRequestId(null);
    setPartialOrderItems([]);
    setSelectedPartialItems(new Set());
  };

  const togglePartialItem = (itemId: string) => {
    setSelectedPartialItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAllPartialItems = () => {
    setSelectedPartialItems(new Set(partialOrderItems.map((i) => i.id)));
  };

  const clearAllPartialItems = () => {
    setSelectedPartialItems(new Set());
  };

  const handlePartialResponse = async () => {
    if (!partialRequestId || !pharmacyId || selectedPartialItems.size === 0) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    try {
      let res = await fetch(`${baseUrl}/orders/pharmacy-orders/${partialRequestId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-pharmacy-id': pharmacyId,
        },
        body: JSON.stringify({
          status: 'PARTIALLY_AVAILABLE',
          selectedOrderItemIds: Array.from(selectedPartialItems),
        }),
      });
      if (!res.ok) {
        res = await fetch(`${baseUrl}/orders/pharmacy-orders/${partialRequestId}/respond-partial`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-pharmacy-id': pharmacyId,
          },
          body: JSON.stringify({
            status: 'PARTIALLY_AVAILABLE',
            selectedOrderItemIds: Array.from(selectedPartialItems),
          }),
        });
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Partial response failed');
      }
      closePartialModal();
      await fetchRequests();
      await fetchAnalytics();
    } catch (err: any) {
      alert(err.message || 'Failed to submit partial availability');
    }
  };

  useEffect(() => {
    if (pharmacyId) {
      fetchRequests();
      fetchAnalytics();
    }
  }, [pharmacyId]);

  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (pharmacyId) {
        fetchRequests();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [pharmacyId]);

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');

  const calculateTimeLeft = (requestedAt: string): number => {
    const requestTime = new Date(requestedAt).getTime();
    const expiryTime = requestTime + 60 * 1000; // 1 minute (60 seconds) from request time
    const currentTime = now.getTime();
    const diff = expiryTime - currentTime;
    return diff > 0 ? diff : 0;
  };

  const formatTimeLeft = (ms: number): string => {
    if (ms <= 0) return '00:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!pharmacyId) {
    return (
      <div className="flex min-h-screen bg-[#F4F7F5] items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Pharmacy Not Found</h2>
          <p className="text-sm text-slate-500 mb-4">
            No pharmacy ID found in your session. Please log in as a pharmacy partner.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-[#0F5A47] hover:bg-[#1A3A5C] text-white rounded-xl text-xs font-bold transition"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F4F7F5] text-slate-800 font-sans">
      {/* Sidebar */}
      <PharmacySidebar 
        pharmacyName="Pharmacy Partner" 
        pharmacyStatus="" 
        pharmacyId={pharmacyId} 
      />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Tab Navigation for Orders vs Analytics */}
        <div className="flex gap-2 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-2.5 text-xs font-bold rounded-t-xl transition-all duration-200 ${
              activeTab === 'orders'
                ? 'bg-[#0F5A47] text-white shadow-md shadow-emerald-900/20'
                : 'text-slate-600 hover:bg-emerald-50/60 hover:text-emerald-900'
            }`}
          >
            Order Requests {pendingRequests.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-2.5 text-xs font-bold rounded-t-xl transition-all duration-200 ${
              activeTab === 'analytics'
                ? 'bg-[#0F5A47] text-white shadow-md shadow-emerald-900/20'
                : 'text-slate-600 hover:bg-emerald-50/60 hover:text-emerald-900'
            }`}
          >
            <BarChart3 className="inline-block w-3.5 h-3.5 mr-1.5" /> Analytics
          </button>
        </div>

        {activeTab === 'orders' ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <span className="text-[10px] font-extrabold text-[#0F5A47] uppercase tracking-wider block mb-1">
                  ORDER REQUESTS
                </span>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {pendingRequests.length > 0
                    ? `${pendingRequests.length} New Order Requests`
                    : 'Order Requests'}
                </h1>
              </div>
              <button
                onClick={() => {
                  fetchRequests();
                  fetchAnalytics();
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <p>Loading order requests...</p>
              </div>
            ) : error ? (
              <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 text-rose-700 text-xs font-bold">
                {error}
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center">
                <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">No Order Requests</h3>
                <p className="text-slate-500 text-sm">
                  You have no order requests at this time. Check back later for new orders!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => {
                  const timeLeft = req.status === 'PENDING' ? calculateTimeLeft(req.requestedAt) : 0;
                  const timeLeftFormatted = formatTimeLeft(timeLeft);

                  const getStatusInfo = (status: string) => {
                    switch (status) {
                      case 'ACCEPTED':
                        return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle, label: 'Accepted' };
                      case 'DECLINED':
                        return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: XCircle, label: 'Declined' };
                      case 'OUT_OF_STOCK':
                        return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertCircle, label: 'Out of Stock' };
                      case 'PARTIALLY_AVAILABLE':
                        return { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', icon: CheckSquare, label: 'Partially Available' };
                      case 'EXPIRED':
                        return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', icon: Clock, label: 'Expired' };
                      default:
                        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Clock, label: 'Pending' };
                    }
                  };

                  const statusInfo = getStatusInfo(req.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div
                      key={req.id}
                      className={`border rounded-2xl bg-white shadow-xs overflow-hidden ${statusInfo.border}`}
                    >
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${statusInfo.bg}`}>
                              <StatusIcon className={`w-5 h-5 ${statusInfo.text}`} />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">
                                Order #{req.orderId.slice(-8).toUpperCase()}
                              </h3>
                              <p className="text-xs text-slate-500">
                                {new Date(req.requestedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        {req.status === 'PENDING' && (
                          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold text-blue-800">
                              Time remaining: <span className={`font-mono ${timeLeft < 60000 ? 'text-rose-600 animate-pulse' : ''}`}>{timeLeftFormatted}</span>
                            </span>
                          </div>
                        )}

                        {req.order?.items && req.order.items.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Ordered Items ({req.order.items.length})
                              </h4>
                              {req.status === 'PARTIALLY_AVAILABLE' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                                  Partially Accepted: {req.availableOrderItemIds?.length || 0}/{req.order.items.length} Items In Stock
                                </span>
                              )}
                            </div>
                            {req.order.items.map((item) => {
                              const isMarked = req.availableOrderItemIds?.includes(item.id);
                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-center justify-between py-2.5 px-3 rounded-xl border transition ${
                                    req.status === 'PARTIALLY_AVAILABLE'
                                      ? isMarked
                                        ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                                        : 'bg-slate-50/60 border-slate-200 opacity-60'
                                      : 'bg-slate-50 border-slate-100'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold text-slate-900">{item.productName || item.product?.name}</p>
                                      {req.status === 'PARTIALLY_AVAILABLE' && (
                                        isMarked ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            <CheckCircle className="w-3 h-3 text-emerald-600" /> In Stock
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                            <XCircle className="w-3 h-3 text-rose-500" /> Out of Stock
                                          </span>
                                        )
                                      )}
                                    </div>
                                    {item.product?.genericName && (
                                      <p className="text-[10px] text-slate-500 mt-0.5">
                                        Formula: {item.product.genericName}
                                      </p>
                                    )}
                                    {item.product?.manufacturer && (
                                      <p className="text-[10px] text-slate-500">
                                        Manufacturer: {item.product.manufacturer}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-slate-600 shrink-0 ml-3">
                                    Qty: {item.quantity}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 py-4 text-center">
                            No item details available
                          </div>
                        )}

                        {req.status === 'PARTIALLY_AVAILABLE' && (
                          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              <span>{req.availableOrderItemIds?.length || 0} of {req.order?.items?.length || 0} items marked available</span>
                            </div>
                            <button
                              onClick={() => openPartialModal(req)}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              Update Stock Selection
                            </button>
                          </div>
                        )}

                        {req.status === 'PENDING' && (
                          <div className="flex gap-2 pt-4 border-t border-slate-100">
                            <button
                              onClick={() => handleResponse(req.id, 'ACCEPTED')}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleResponse(req.id, 'DECLINED')}
                              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" />
                              Decline
                            </button>
                            <button
                              onClick={() => handleResponse(req.id, 'OUT_OF_STOCK')}
                              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <AlertCircle className="w-4 h-4" />
                              Out of Stock
                            </button>
                            <button
                              onClick={() => openPartialModal(req)}
                              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <CheckSquare className="w-4 h-4" />
                              Partially Available
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <span className="text-[10px] font-extrabold text-[#0F5A47] uppercase tracking-wider block mb-1">
                  PHARMACY ANALYTICS
                </span>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Order Request Analytics</h1>
              </div>
              <button
                onClick={() => {
                  fetchRequests();
                  fetchAnalytics();
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {analytics ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center">
                  <div className="text-3xl font-black text-[#0F5A47] mb-1">{analytics.totalRequests}</div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Total Requests</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center">
                  <div className={`text-3xl font-black mb-1 ${analytics.acceptanceRate !== '0%' ? 'text-emerald-600' : 'text-slate-400'}`}>{analytics.acceptanceRate}</div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Acceptance Rate</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center">
                  <div className="text-3xl font-black text-blue-600 mb-1">{analytics.avgResponseTimeSeconds}s</div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Avg Response Time</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center">
                  <div className="text-3xl font-black text-amber-600 mb-1">{analytics.pending}</div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Pending</p>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
                No analytics data available.
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Metrics Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-black text-emerald-600">{analytics?.accepted ?? 0}</div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Accepted</p>
                </div>
                <div>
                  <div className="text-2xl font-black text-rose-600">{analytics?.declined ?? 0}</div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Declined</p>
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-600">{analytics?.outOfStock ?? 0}</div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Out of Stock</p>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-600">{analytics?.expired ?? 0}</div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Expired</p>
                </div>
              </div>
            </div>

            {requests.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider p-6 border-b">Recent Order Requests</h3>
                <div className="divide-y divide-slate-100">
                  {requests.slice(0, 10).map((req) => {
                    const timeLeft = req.status === 'PENDING' ? calculateTimeLeft(req.requestedAt) : 0;
                    return (
                      <div key={req.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Order #{req.orderId.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(req.requestedAt).toLocaleDateString()} - Status: {req.status}
                          </p>
                        </div>
                        {req.status === 'PENDING' && (
                          <span className={`text-xs font-bold ${timeLeft < 60000 ? 'text-rose-600' : 'text-blue-600'}`}>
                            {formatTimeLeft(timeLeft)} left
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Partially Available Modal */}
      {partialModalOpen && partialRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Partially Available Items</h3>
              <button
                onClick={closePartialModal}
                className="p-2 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100 bg-blue-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs text-blue-900 font-medium">
                Select the items currently in stock. You fulfill the marked items, and the admin will assign the remaining items.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={selectAllPartialItems}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-100/60 transition cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAllPartialItems}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {partialOrderItems.length > 0 ? (
                partialOrderItems.map((item) => {
                  const isSelected = selectedPartialItems.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePartialItem(item.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.productName || item.product?.name}</p>
                          {item.product?.genericName && (
                            <p className="text-[10px] text-slate-500">Formula: {item.product.genericName}</p>
                          )}
                          {item.product?.manufacturer && (
                            <p className="text-[10px] text-slate-500">Manufacturer: {item.product.manufacturer}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">Qty: {item.quantity}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="text-xs text-slate-400 py-8 text-center">No items available</div>
              )}
            </div>
            <div className="flex gap-2 p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={closePartialModal}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePartialResponse}
                disabled={selectedPartialItems.size === 0}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckSquare className="w-4 h-4 mr-1.5" />
                Submit ({selectedPartialItems.size} items)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MapPinIcon = MapPin;
