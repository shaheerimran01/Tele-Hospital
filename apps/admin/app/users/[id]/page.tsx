'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Bell, 
  ShoppingBag, 
  Package, 
  Users, 
  Settings, 
  ArrowLeft,
  Ban,
  MapPin,
  Pill,
  FileText,
  RotateCcw,
  Star,
  AlertCircle,
  Building2,
  Boxes,
  Globe,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface OrderItemDetail {
  id?: string;
  productName: string;
  quantity: number;
}

interface UserDetailData {
  id: string;
  userCode?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isActive: boolean;
  customerType: 'New' | 'Returning';
  createdAt: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  } | string;
  stats: {
    totalOrders: number;
    completed: number;
    pending: number;
    cancelled: number;
    totalSpent: number;
  };
  orders: Array<{
    id: string;
    orderCode: string;
    items: OrderItemDetail[];
    totalQuantity: number;
    date: string;
    amount: number;
    paymentStatus: string;
    status: string;
  }>;
}

const getAvatarBg = (initials: string) => {
  const colors = [
    'bg-teal-600',
    'bg-indigo-600',
    'bg-red-600',
    'bg-blue-600',
    'bg-purple-600',
    'bg-emerald-600',
  ];
  let sum = 0;
  for (let i = 0; i < initials.length; i++) sum += initials.charCodeAt(i);
  return colors[sum % colors.length];
};

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;

  const [user, setUser] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBlocking, setIsBlocking] = useState<boolean>(false);

  useEffect(() => {
    loadUserDetail();
  }, [userId]);

  const loadUserDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('User details fetch karne mein masla aaya.');
      const data = await res.json();

      const rawOrders = Array.isArray(data.orders) ? data.orders : [];
      
      const completedOrders = rawOrders.filter((o: any) => 
        o.status === 'COMPLETED' || o.status === 'Completed' || o.status === 'DELIVERED'
      ).length;
      
      const pendingOrders = rawOrders.filter((o: any) => 
        o.status === 'PENDING' || o.status === 'Pending' || o.status === 'PROCESSING' || o.status === 'CONFIRMED'
      ).length;
      
      const cancelledOrders = rawOrders.filter((o: any) => 
        o.status === 'CANCELLED' || o.status === 'Cancelled'
      ).length;

      const totalSpent = rawOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount || o.total || o.amount) || 0), 0);
      const defaultAddr = data.addresses?.find((a: any) => a.isDefault) || data.addresses?.[0];

      // Format Orders
      const formattedOrders = rawOrders.map((o: any) => {
        const items: OrderItemDetail[] = (o.items && o.items.length > 0)
          ? o.items.map((item: any) => ({
              id: item.id,
              productName: item.product?.name || item.productName || 'Product Item',
              quantity: Number(item.quantity) || 1,
            }))
          : [{
              productName: o.productName || 'Product Item',
              quantity: Number(o.quantity) || 1,
            }];

        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

        return {
          id: o.id,
          orderCode: o.orderNumber || o.orderCode || o.code || `#TB-${o.id.slice(0, 6).toUpperCase()}`,
          items,
          totalQuantity,
          date: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
          amount: Number(o.totalAmount || o.total || o.amount) || 0,
          paymentStatus: o.paymentStatus || (o.isPaid ? 'Paid' : 'Pending'),
          status: o.status || 'Pending',
        };
      });

      setUser({
        id: data.id,
        userCode: data.userCode || `USR-${data.id.slice(0, 4).toUpperCase()}`,
        firstName: data.firstName || 'User',
        lastName: data.lastName || '',
        phone: data.phone || data.phoneNumber || 'N/A',
        email: data.email || 'N/A',
        isActive: data.isActive !== false,
        customerType: rawOrders.length > 1 ? 'Returning' : 'New',
        createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
        address: defaultAddr ? {
          addressLine1: defaultAddr.addressLine1 || defaultAddr.street || '',
          addressLine2: defaultAddr.addressLine2 || '',
          city: defaultAddr.city || 'N/A',
          postalCode: defaultAddr.postalCode || 'N/A',
          country: defaultAddr.country || 'Pakistan',
        } : (data.address || 'Address not provided'),
        stats: {
          totalOrders: data.ordersCount || rawOrders.length,
          completed: completedOrders,
          pending: pendingOrders,
          cancelled: cancelledOrders,
          totalSpent: totalSpent,
        },
        orders: formattedOrders,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'User data load nahi ho saka.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!user) return;
    const actionText = user.isActive ? 'block' : 'unblock';
    if (!confirm(`Kya aap "${user.firstName} ${user.lastName}" ko ${actionText} karna chahte hain?`)) return;

    try {
      setIsBlocking(true);
      const res = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error(`User ${actionText} nahi ho saka.`);
      setUser((prev) => prev ? { ...prev, isActive: !prev.isActive } : null);
    } catch (err: any) {
      alert(err.message || 'Action failed!');
    } finally {
      setIsBlocking(false);
    }
  };

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
  const initials = user ? `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase() : 'U';
  const avatarBg = getAvatarBg(initials);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F2942] text-white flex flex-col shrink-0">
        <div className="flex items-center gap-2 p-6 font-bold text-xl tracking-wide">
          <span className="text-2xl font-black text-white">+</span> Tabibistan
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/notifications" className="flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              Notifications
            </div>
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">7</span>
          </Link>
          <Link href="/orders" className="flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5" />
              Orders
            </div>
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">6</span>
          </Link>
          <Link href="/products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Package className="w-5 h-5" />
            Products
          </Link>
          <Link href="/pharmacy-products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Boxes className="w-5 h-5" />
            Pharmacy Products
          </Link>
          <Link href="/global-catalog" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Globe className="w-5 h-5" />
            Global Catalog
          </Link>
          <Link href="/pharmacies" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Building2 className="w-5 h-5" />
            Pharmacies
          </Link>
          <Link href="/users" className="flex items-center gap-3 px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/users"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Users
            </Link>
            <span className="text-slate-300">|</span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">User Details</h1>
              <p className="text-xs text-slate-400 font-mono">
                {user ? `${user.userCode} - ${fullName}` : 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadUserDetail}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 font-medium text-xs">
            User details load ho rahe hain...
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full ${avatarBg} text-white flex items-center justify-center text-lg font-bold shadow-xs shrink-0`}>
                  {initials}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{fullName}</h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs font-mono text-slate-400">{user.userCode}</span>

                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      user.isActive 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {user.isActive ? 'Active' : 'Blocked'}
                    </span>

                    <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                      {user.customerType === 'Returning' ? (
                        <>
                          <RotateCcw className="w-3 h-3" /> Returning Customer
                        </>
                      ) : (
                        <>
                          <Star className="w-3 h-3 fill-teal-600" /> New Customer
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleBlock}
                  disabled={isBlocking}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs disabled:opacity-50 ${
                    user.isActive
                      ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  {isBlocking ? 'Updating...' : user.isActive ? 'Block User' : 'Unblock User'}
                </button>

                <Link
                  href="/users"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Users
                </Link>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-blue-700">{user.stats.totalOrders}</div>
                <div className="text-xs font-medium text-blue-600 mt-0.5">Total Orders</div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-emerald-700">{user.stats.completed}</div>
                <div className="text-xs font-medium text-emerald-600 mt-0.5">Completed</div>
              </div>

              <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-amber-700">{user.stats.pending}</div>
                <div className="text-xs font-medium text-amber-600 mt-0.5">Pending</div>
              </div>

              <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-rose-700">{user.stats.cancelled}</div>
                <div className="text-xs font-medium text-rose-600 mt-0.5">Cancelled</div>
              </div>

              <div className="bg-teal-50/60 border border-teal-100 rounded-2xl p-4 text-center col-span-2 md:col-span-1">
                <div className="text-2xl font-black text-teal-700">
                  Rs. {user.stats.totalSpent.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-teal-600 mt-0.5">Total Spent</div>
              </div>
            </div>

            {/* Personal Details & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">
                  PERSONAL DETAILS
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Full Name</span>
                    <span className="text-slate-900 font-bold text-sm mt-0.5 block">{fullName}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">User ID</span>
                    <span className="text-slate-800 font-mono font-semibold">{user.userCode}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Phone Number</span>
                    <span className="text-slate-800 font-medium">{user.phone}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Email</span>
                    <span className="text-slate-800 font-medium">{user.email}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Account Status</span>
                    <span className="text-slate-900 font-semibold">{user.isActive ? 'Active' : 'Blocked'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Customer Type</span>
                    <span className="text-slate-900 font-semibold">{user.customerType} Customer</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Registration Date</span>
                    <span className="text-slate-800 font-medium">{user.createdAt}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">
                  ADDRESS
                </h3>

                <div className="space-y-4 text-xs">
                  {typeof user.address === 'object' ? (
                    <>
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 fill-rose-100" />
                        <div>
                          <span className="text-slate-900 font-semibold text-sm leading-snug">
                            {user.address.addressLine1 || 'N/A'}
                          </span>
                          {user.address.addressLine2 && (
                            <span className="text-slate-600 block mt-0.5">
                              {user.address.addressLine2}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-medium">City</span>
                        <span className="text-slate-800 font-semibold">{user.address.city || 'N/A'}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-medium">Postal Code</span>
                        <span className="text-slate-800 font-mono">{user.address.postalCode || 'N/A'}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block font-medium">Country</span>
                        <span className="text-slate-800 font-semibold">{user.address.country || 'Pakistan'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 fill-rose-100" />
                      <span className="text-slate-800 font-medium leading-relaxed">
                        {user.address || 'Address not provided'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order History Table without Prescription Column */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  ORDER HISTORY
                </h3>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {user.orders.length} orders
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/30">
                      <th className="py-3.5 px-6">Order ID</th>
                      <th className="py-3.5 px-6">Products</th>
                      <th className="py-3.5 px-6 text-center">Total Qty</th>
                      <th className="py-3.5 px-6">Date</th>
                      <th className="py-3.5 px-6">Amount</th>
                      <th className="py-3.5 px-6">Payment</th>
                      <th className="py-3.5 px-6">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {user.orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                          Is user ne abhi tak koi order place nahi kiya.
                        </td>
                      </tr>
                    ) : (
                      user.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/60 transition">
                          {/* Order ID */}
                          <td className="py-4 px-6 font-mono font-bold text-blue-600 align-top">
                            {order.orderCode}
                          </td>

                          {/* Products */}
                          <td className="py-4 px-6 font-semibold text-slate-900 align-top">
                            <div className="flex flex-col gap-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Pill className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  <span className="text-xs font-bold text-slate-800">{item.productName}</span>
                                  <span className="text-[11px] text-slate-500 font-mono">x{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Total Quantity */}
                          <td className="py-4 px-6 text-center align-top">
                            <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md text-xs font-bold">
                              {order.totalQuantity}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="py-4 px-6 text-slate-500 font-medium whitespace-nowrap align-top">
                            {order.date}
                          </td>

                          {/* Amount */}
                          <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap align-top">
                            Rs. {order.amount.toLocaleString()}
                          </td>

                          {/* Payment */}
                          <td className="py-4 px-6 align-top">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              {order.paymentStatus}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6 align-top">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === 'COMPLETED' || order.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : order.status === 'CANCELLED' || order.status === 'Cancelled'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}