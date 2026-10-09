'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  LayoutDashboard, 
  Bell, 
  ShoppingBag, 
  Package, 
  Users, 
  Settings, 
  ArrowLeft,
  CheckCircle2,
  FileText,
  X,
  ExternalLink,
  MapPin,
  User,
  CreditCard,
  Calendar,
  Ban,
  Check,
  Building2,
  Boxes,
  Globe,
  Send,
  Loader2,
  MapPin as MapPinIcon,
  Phone,
  MessageCircle,
  Mail,
  AlertCircle,
  Clock,
  TrendingUp,
  XCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { fetchOrderById } from '@/lib/api/orderDetails';

const RADIUS_OPTIONS = [5, 10, 15, 20, 25, 30];

export default function SendToPharmacyPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingPharmacies, setLoadingPharmacies] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);
  const [selectedRadius, setSelectedRadius] = useState<number>(20);
  const [selectedPharmacies, setSelectedPharmacies] = useState<Set<string>>(new Set());
  const [sendingRequest, setSendingRequest] = useState<boolean>(false);
  const [sentRequests, setSentRequests] = useState<{ pharmacyId: string; sentAt: number; requestId?: string }[]>([]);
  const [pharmacyRequestStatus, setPharmacyRequestStatus] = useState<Record<string, {
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'OUT_OF_STOCK' | 'EXPIRED';
    requestId: string;
  }>>({});
  const [pharmacyAnalytics, setPharmacyAnalytics] = useState<Record<string, {
    acceptanceRate: number;
    totalRequestsReceived: number;
    acceptedCount: number;
    declinedCount: number;
    outOfStockCount: number;
    avgResponseTime: number | null;
  }>>({});
  const [now, setNow] = useState<Date>(new Date());

  // Ref to hold latest pharmacyRequestStatus for polling without triggering re-renders
  const pharmacyRequestStatusRef = useRef(pharmacyRequestStatus);
  pharmacyRequestStatusRef.current = pharmacyRequestStatus;

  // Timer for live countdown - updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Polling for real-time pharmacy request status updates (every 4 seconds)
  useEffect(() => {
    // Use ref to avoid dependency on pharmacyRequestStatus
    const getRequestIds = () => Object.values(pharmacyRequestStatusRef.current).map(r => r.requestId);
    
    const pollStatus = async () => {
      const currentStatus = pharmacyRequestStatusRef.current;
      const requestIds = Object.values(currentStatus).map(r => r.requestId);
      if (requestIds.length === 0) return;

      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const statusUpdates: Record<string, { status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'OUT_OF_STOCK' | 'EXPIRED'; requestId: string }> = { ...currentStatus };
        let hasPending = false;
        let hasChanges = false;

        for (const [pharmacyId, requestInfo] of Object.entries(currentStatus)) {
          if (requestInfo.status === 'PENDING') {
            hasPending = true;
            try {
              const res = await fetch(`${baseUrl}/orders/pharmacy-orders/${requestInfo.requestId}`, {
                headers: { 'Content-Type': 'application/json' },
              });
              if (res.ok) {
                const data = await res.json();
                const newStatus = data.status;
                if (newStatus !== requestInfo.status) {
                  hasChanges = true;
                  statusUpdates[pharmacyId] = {
                    status: newStatus,
                    requestId: requestInfo.requestId,
                  };
                }
              }
            } catch (err) {
              console.error(`Failed to fetch status for ${pharmacyId}:`, err);
            }
          }
        }

        // Only update state if there are actual changes
        if (hasChanges) {
          setPharmacyRequestStatus(statusUpdates);
        }

        // If no pending requests, we can stop polling (but keep the effect for new requests)
        if (!hasPending) {
          // Still keep polling in case new requests are sent
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollStatus(); // Initial fetch
    const interval = setInterval(pollStatus, 4000); // Poll every 4 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      loadNearbyPharmacies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, selectedRadius]);

  useEffect(() => {
    if (pharmacies.length > 0) {
      fetchPharmacyAnalytics();
    }
  }, [pharmacies]);

  const fetchPharmacyAnalytics = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const analyticsData: Record<string, {
        acceptanceRate: number;
        totalRequestsReceived: number;
        acceptedCount: number;
        declinedCount: number;
        outOfStockCount: number;
        avgResponseTime: number | null;
      }> = {};
      
      for (const pharmacy of pharmacies) {
        try {
          const res = await fetch(`${baseUrl}/orders/pharmacy-orders/analytics`, {
            headers: {
              'x-pharmacy-id': pharmacy.id,
            },
          });
          if (res.ok) {
            const data = await res.json();
            analyticsData[pharmacy.id] = {
              acceptanceRate: data.acceptanceRate ? parseFloat(data.acceptanceRate.replace('%', '')) : 0,
              totalRequestsReceived: data.totalRequests || 0,
              acceptedCount: data.accepted || 0,
              declinedCount: data.declined || 0,
              outOfStockCount: data.outOfStock || 0,
              avgResponseTime: data.avgResponseTimeSeconds || null,
            };
          } else {
            analyticsData[pharmacy.id] = getMockAnalytics(pharmacy.id);
          }
        } catch {
          analyticsData[pharmacy.id] = getMockAnalytics(pharmacy.id);
        }
      }
      setPharmacyAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to fetch pharmacy analytics:', err);
    }
  };

  const getMockAnalytics = (pharmacyId: string) => {
    const seed = pharmacyId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (max: number, min = 0) => Math.floor((seed * 9301 + 49297) % 233280 / 233280 * (max - min + 1)) + min;
    return {
      acceptanceRate: random(90, 60),
      totalRequestsReceived: random(50, 10),
      acceptedCount: 0,
      declinedCount: 0,
      outOfStockCount: 0,
      avgResponseTime: random(300, 30),
    };
  };

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrderById(orderId);
      setOrder(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Order details load karne me masla aaya.');
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyPharmacies = async () => {
    if (!orderId) return;
    setLoadingPharmacies(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/orders/${orderId}/nearby-pharmacies?radius=${selectedRadius}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to fetch nearby pharmacies');
      }
      const data = await res.json();
      setPharmacies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Nearby pharmacies load nahi ho saken.');
    } finally {
      setLoadingPharmacies(false);
    }
  };

  const handleRadiusChange = (radius: number) => {
    setSelectedRadius(radius);
  };

  const togglePharmacySelection = (pharmacyId: string) => {
    const newSelected = new Set(selectedPharmacies);
    if (newSelected.has(pharmacyId)) {
      newSelected.delete(pharmacyId);
    } else {
      newSelected.add(pharmacyId);
    }
    setSelectedPharmacies(newSelected);
  };

  const handleSendRequest = async () => {
    if (selectedPharmacies.size === 0) {
      alert('Please select at least one pharmacy to send the request to.');
      return;
    }
    setSendingRequest(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/orders/${orderId}/send-to-pharmacies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pharmacyIds: Array.from(selectedPharmacies),
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to send request');
      }
      const data = await res.json();
      alert(`Request sent to ${data.count} pharmacy(ies) successfully!`);
      
      // Track sent requests with timestamps and request IDs for countdown timer and polling
      const newSentRequests = data.requests.map((req: any) => ({
        pharmacyId: req.pharmacyId,
        sentAt: Date.now(),
        requestId: req.id,
      }));
      setSentRequests(prev => [...prev, ...newSentRequests]);
      
      // Initialize request status for polling
      const newRequestStatus: Record<string, { status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'OUT_OF_STOCK' | 'EXPIRED'; requestId: string }> = {};
      data.requests.forEach((req: any) => {
        newRequestStatus[req.pharmacyId] = { status: 'PENDING', requestId: req.id };
      });
      setPharmacyRequestStatus(prev => ({ ...prev, ...newRequestStatus }));
      
      setSelectedPharmacies(new Set());
      loadNearbyPharmacies();
    } catch (err: any) {
      alert(err.message || 'Failed to send request.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleSendToSinglePharmacy = async (pharmacyId: string) => {
    setSendingRequest(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/orders/${orderId}/send-to-pharmacies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pharmacyIds: [pharmacyId],
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to send request');
      }
      alert(`Request sent to this pharmacy successfully!`);
      
      // Track sent request with timestamp and request ID for countdown timer and polling
      const data = await res.json();
      const newRequest = data.requests[0];
      setSentRequests(prev => [...prev, { pharmacyId, sentAt: Date.now(), requestId: newRequest.id }]);
      
      // Initialize request status for polling
      setPharmacyRequestStatus(prev => ({ ...prev, [pharmacyId]: { status: 'PENDING', requestId: newRequest.id } }));
    } catch (err: any) {
      alert(err.message || 'Failed to send request.');
    } finally {
      setSendingRequest(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const st = status?.toUpperCase();
    const styles: Record<string, string> = {
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return `px-2.5 py-0.5 rounded text-[10px] font-bold border ${styles[st] || 'bg-slate-50 text-slate-700 border-slate-200'}`;
  };

  const getPharmacyTypeStyle = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'wholesale') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (t === 'hospital') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (t === 'chain') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-green-50 text-green-700 border-green-200';
  };

  const getResponseBadgeStyle = (status: string) => {
    const st = status?.toUpperCase();
    const styles: Record<string, string> = {
      ACCEPTED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      DECLINED: 'bg-rose-100 text-rose-800 border-rose-200',
      OUT_OF_STOCK: 'bg-amber-100 text-amber-800 border-amber-200',
      EXPIRED: 'bg-slate-100 text-slate-800 border-slate-200',
      PENDING: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return `px-3 py-1 rounded-xl text-xs font-bold border ${styles[st] || 'bg-slate-100 text-slate-800 border-slate-200'}`;
  };

  const getResponseBadgeContainerStyle = (status: string) => {
    const st = status?.toUpperCase();
    const styles: Record<string, string> = {
      ACCEPTED: 'bg-emerald-50 border-emerald-200',
      DECLINED: 'bg-rose-50 border-rose-200',
      OUT_OF_STOCK: 'bg-amber-50 border-amber-200',
      EXPIRED: 'bg-slate-50 border-slate-200',
      PENDING: 'bg-blue-50 border-blue-200',
    };
    return `flex items-center gap-2 p-3 rounded-xl ${styles[st] || 'bg-slate-50 border-slate-200'}`;
  };

  const getResponseBadgeIcon = (status: string) => {
    const st = status?.toUpperCase();
    if (st === 'ACCEPTED') return <CheckCircle className="w-3.5 h-3.5" />;
    if (st === 'DECLINED') return <XCircle className="w-3.5 h-3.5" />;
    if (st === 'OUT_OF_STOCK') return <AlertTriangle className="w-3.5 h-3.5" />;
    if (st === 'EXPIRED') return <Clock className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  // Calculate countdown timer for a pharmacy
  const getTimeRemaining = (pharmacyId: string): number => {
    const sentRequest = sentRequests.find(r => r.pharmacyId === pharmacyId);
    if (!sentRequest) return 60; // Default 1 minute if not sent yet
    const elapsed = Math.floor((now.getTime() - sentRequest.sentAt) / 1000);
    const remaining = 60 - elapsed;
    return Math.max(0, remaining);
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'EXPIRED';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
        <aside className="w-64 bg-[#0F2942] text-white flex flex-col shrink-0">
          <div className="flex items-center gap-2 p-6 font-bold text-xl tracking-wide">
            <span className="text-2xl font-black text-white">+</span> Tabibistan
          </div>
          <nav className="flex-1 px-4 space-y-1">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </Link>
            <Link href="/notifications" className="flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <div className="flex items-center gap-3"><Bell className="w-5 h-5" /> Notifications</div>
            </Link>
            <Link href="/orders" className="flex items-center justify-between px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
              <div className="flex items-center gap-3"><ShoppingBag className="w-5 h-5" /> Orders</div>
            </Link>
            <Link href="/products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <Package className="w-5 h-5" /> Products
            </Link>
            <Link href="/pharmacy-products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <Boxes className="w-5 h-5" /> Pharmacy Products
            </Link>
            <Link href="/global-catalog" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <Globe className="w-5 h-5" /> Global Catalog
            </Link>
            <Link href="/pharmacies" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <Building2 className="w-5 h-5" /> Pharmacies
            </Link>
            <Link href="/users" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <Users className="w-5 h-5" /> Users
            </Link>
            <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <Settings className="w-5 h-5" /> Settings
            </Link>
          </nav>
        </aside>
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
            Order details load ho rahi hain...
          </div>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
        <aside className="w-64 bg-[#0F2942] text-white flex flex-col shrink-0">
          <div className="flex items-center gap-2 p-6 font-bold text-xl tracking-wide">
            <span className="text-2xl font-black text-white">+</span> Tabibistan
          </div>
          <nav className="flex-1 px-4 space-y-1">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </Link>
            <Link href="/notifications" className="flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <div className="flex items-center gap-3"><Bell className="w-5 h-5" /> Notifications</div>
            </Link>
            <Link href="/orders" className="flex items-center justify-between px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
              <div className="flex items-center gap-3"><ShoppingBag className="w-5 h-5" /> Orders</div>
            </Link>
            <Link href="/products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <Package className="w-5 h-5" /> Products
            </Link>
            <Link href="/pharmacy-products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <Boxes className="w-5 h-5" /> Pharmacy Products
            </Link>
            <Link href="/global-catalog" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <Globe className="w-5 h-5" /> Global Catalog
            </Link>
            <Link href="/pharmacies" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <Building2 className="w-5 h-5" /> Pharmacies
            </Link>
            <Link href="/users" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <Users className="w-5 h-5" /> Users
            </Link>
            <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
              <Settings className="w-5 h-5" /> Settings
            </Link>
          </nav>
        </aside>
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 text-rose-700 text-xs font-bold">
            ⚠️ {error || 'Order nahi mil saka.'}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      <aside className="w-64 bg-[#0F2942] text-white flex flex-col shrink-0">
        <div className="flex items-center gap-2 p-6 font-bold text-xl tracking-wide">
          <span className="text-2xl font-black text-white">+</span> Tabibistan
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </Link>
          <Link href="/notifications" className="flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <div className="flex items-center gap-3"><Bell className="w-5 h-5" /> Notifications</div>
          </Link>
          <Link href="/orders" className="flex items-center justify-between px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
            <div className="flex items-center gap-3"><ShoppingBag className="w-5 h-5" /> Orders</div>
          </Link>
          <Link href="/products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Package className="w-5 h-5" /> Products
          </Link>
          <Link href="/pharmacy-products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Boxes className="w-5 h-5" /> Pharmacy Products
          </Link>
          <Link href="/global-catalog" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Globe className="w-5 h-5" /> Global Catalog
          </Link>
          <Link href="/pharmacies" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Building2 className="w-5 h-5" /> Pharmacies
          </Link>
          <Link href="/users" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Users className="w-5 h-5" /> Users
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Settings className="w-5 h-5" /> Settings
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mb-6">
          <Link
            href={`/orders/${orderId}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Order Details
          </Link>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-slate-900">{order.orderCode}</h1>
                  <span className="px-3 py-1 rounded-md font-bold text-xs border bg-emerald-50 text-emerald-700 border-emerald-200">
                    Send to Pharmacy
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Placed on {order.orderDate}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-800 mb-2">
                <MapPinIcon className="w-4 h-4" />
                Delivery Location
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{order.shippingAddress}</p>
              {order.lat && order.lng && (
                <p className="text-[11px] text-slate-500 font-mono mt-2 flex items-center gap-2">
                  <MapPinIcon className="w-3.5 h-3.5" />
                  Coordinates: Lat {order.lat.toFixed(6)}, Lng {order.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className={`px-3 py-1.5 rounded-lg font-bold text-xs border ${pharmacies.length > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {pharmacies.length} Pharmacy{pharmacies.length !== 1 ? 'ies' : ''} found within {selectedRadius}km radius
              </span>
              {order.lat && order.lng && (
                <span className="text-xs text-slate-500">Search radius: {selectedRadius}km</span>
              )}
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Search Radius</label>
              <div className="flex flex-wrap gap-2">
                {RADIUS_OPTIONS.map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => handleRadiusChange(radius)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedRadius === radius
                        ? 'bg-[#0F2942] text-white shadow-md'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer'
                    }`}
                  >
                    📍 {radius}km
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {selectedPharmacies.size > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800">
              {selectedPharmacies.size} pharmacy selected
            </span>
            <button
              onClick={handleSendRequest}
              disabled={sendingRequest}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {sendingRequest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Requests to Selected
                </>
              )}
            </button>
          </div>
        )}

        {loadingPharmacies ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p>Finding nearby pharmacies...</p>
          </div>
        ) : pharmacies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center">
            <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Pharmacies Found</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              No active pharmacies were found within a {selectedRadius}km radius of the delivery location.
              You may need to expand the search area or check if there are pharmacies in this region.
            </p>
            {order.lat == null || order.lng == null ? (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                ⚠️ This order does not have coordinates (lat/lng). Please ensure the order has a valid shipping address with coordinates.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{pharmacies.map((pharmacy) => {
              const timeRemaining = getTimeRemaining(pharmacy.id);
              const analytics = pharmacyAnalytics[pharmacy.id] || getMockAnalytics(pharmacy.id);
              const sentRequest = sentRequests.find(r => r.pharmacyId === pharmacy.id);
              const hasSentRequest = !!sentRequest;
              const isExpired = timeRemaining <= 0;
              
              // Get real-time request status from polling
              const requestStatus = pharmacyRequestStatus[pharmacy.id]?.status;
              const isPending = requestStatus === 'PENDING';
              const isResponded = requestStatus && requestStatus !== 'PENDING';
              const requestId = pharmacyRequestStatus[pharmacy.id]?.requestId || sentRequest?.requestId;

              return (
                <div key={pharmacy.id} className="border border-slate-200 rounded-2xl p-6 bg-white shadow-xs space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPharmacies.has(pharmacy.id)}
                          onChange={() => togglePharmacySelection(pharmacy.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#0F2942] focus:ring-[#0F2942]"
                        />
                        <h3 className="text-sm font-bold text-slate-900 truncate">{pharmacy.name}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className={getStatusBadgeStyle(pharmacy.status)}>{pharmacy.status}</span>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${getPharmacyTypeStyle(pharmacy.pharmacyType)}`}>
                          {pharmacy.pharmacyType || 'Retail'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg shrink-0">
                      <MapPinIcon className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">📍 {pharmacy.distanceInKm} km away</span>
                    </div>
                  </div>

                  {/* Request Status Display */}
                  {hasSentRequest && (
                    <div className="space-y-2">
                      {/* Countdown Timer - ONLY for PENDING status */}
                      {isPending && (
                        <div className={`flex items-center gap-2 p-3 rounded-xl ${isExpired ? 'bg-rose-50 border border-rose-200' : 'bg-blue-50 border border-blue-200'}`}>
                          <Clock className={`w-4 h-4 ${isExpired ? 'text-rose-600' : 'text-blue-600'}`} />
                          <span className={`text-xs font-bold font-mono ${isExpired ? 'text-rose-600' : 'text-blue-800'}`}>
                            {isExpired ? 'EXPIRED' : `Time remaining: ${formatTimeRemaining(timeRemaining)}`}
                          </span>
                        </div>
                      )}
                      
                      {/* Response Badges - for ACCEPTED, DECLINED, OUT_OF_STOCK, EXPIRED */}
                      {isResponded && (
                        <div className={getResponseBadgeContainerStyle(requestStatus || '')}>
                          {getResponseBadgeIcon(requestStatus || 'PENDING')}
                          <span className={getResponseBadgeStyle(requestStatus || '').replace('px-3 py-1 rounded-xl text-xs font-bold border ', '')}>
                            {requestStatus}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Analytics Grid */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-center">
                      <div className="text-sm font-bold text-emerald-600">{analytics.acceptanceRate}%</div>
                      <div className="text-[10px] text-slate-500">Acceptance Rate</div>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <div className="text-sm font-bold text-blue-600">{analytics.totalRequestsReceived}</div>
                      <div className="text-[10px] text-slate-500">Total Requests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-amber-600">{analytics.avgResponseTime !== null ? analytics.avgResponseTime + 's' : 'N/A'}</div>
                      <div className="text-[10px] text-slate-500">Avg Response</div>
                    </div>
                    <div className="text-center col-span-3 grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <div className="text-xs font-bold text-emerald-700">{analytics.acceptedCount}</div>
                        <div className="text-[10px] text-slate-500">Accepted</div>
                      </div>
                      <div className="p-2 bg-rose-50 rounded-lg">
                        <div className="text-xs font-bold text-rose-700">{analytics.declinedCount}</div>
                        <div className="text-[10px] text-slate-500">Declined</div>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <div className="text-xs font-bold text-amber-700">{analytics.outOfStockCount}</div>
                        <div className="text-[10px] text-slate-500">Out of Stock</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium space-y-1.5 border-t border-slate-100 pt-4">
                    <p className="flex items-center gap-1.5">
                      <MapPinIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{pharmacy.address || 'N/A'}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{pharmacy.city || 'N/A'}</span>
                    </p>
                    {pharmacy.lat && pharmacy.lng && (
                      <p className="flex items-center gap-1.5 font-mono text-slate-400">
                        <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Lat: {Number(pharmacy.lat).toFixed(6)}, Lng: {Number(pharmacy.lng).toFixed(6)}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1.5 border-t border-slate-100 pt-4">
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span><span className="font-semibold">Phone:</span> {pharmacy.phone || 'N/A'}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      <span><span className="font-semibold">WhatsApp:</span> {pharmacy.whatsappNumber || 'N/A'}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span><span className="font-semibold">Email:</span> {pharmacy.email || 'N/A'}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendToSinglePharmacy(pharmacy.id)}
                    disabled={sendingRequest || hasSentRequest}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer ${
                      hasSentRequest
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-[#0F2942] hover:bg-[#1A3A5C] text-white'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    {hasSentRequest
                      ? (isPending ? 'Request Sent (Pending)' : requestStatus || 'Request Sent')
                      : 'Send Request'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}