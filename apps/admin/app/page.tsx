'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Bell, 
  ShoppingBag, 
  Package, 
  Users, 
  Settings, 
  UserCheck, 
  Box, 
  Clock, 
  ShoppingBag as OrderIcon, 
  CheckCircle, 
  AlertTriangle, 
  ShoppingCart,
  RefreshCw
} from 'lucide-react';
import { fetchAdminDashboardData } from '@/lib/api/dashboard';
import { AdminDashboardSummary } from '@/types/dashboard';

export default function Home() {
  const [data, setData] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = () => {
    setLoading(true);
    setError(null);
    fetchAdminDashboardData()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Dashboard data load karne me issue aaya.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'completed':
        return (
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
        );
      case 'user':
        return (
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
        );
      case 'alert':
        return (
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'order':
      default:
        return (
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <OrderIcon className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F2942] text-white flex flex-col shrink-0">
        <div className="flex items-center gap-2 p-6 font-bold text-xl tracking-wide">
          <span className="text-2xl font-black text-white">+</span> Tabibistan
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/notifications" className="flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              Notifications
            </div>
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
              {data ? data.unreadNotificationsCount : 0}
            </span>
          </Link>
          <Link href="/orders" className="flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5" />
              Orders
            </div>
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
              {data ? data.pendingOrders : 0}
            </span>
          </Link>
          <Link href="/products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Package className="w-5 h-5" />
            Products
          </Link>
          <Link href="/users" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
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
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Overview of your healthcare store and recent activity</p>
          </div>
          
          <button
            onClick={loadDashboardData}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer flex items-center gap-2 text-xs font-semibold shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </header>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200 shadow-2xs">
            Backend (Port 4000) se dashboard data load ho raha hai...
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm mb-6 font-semibold">
            ⚠️ {error}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Card 1: Total Users */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-slate-900">{data?.totalUsers}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">Total Registered Users</div>
              </div>

              {/* Card 2: Total Products */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Box className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-slate-900">{data?.totalProducts}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">Total Products</div>
              </div>

              {/* Card 3: Total Orders */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-slate-900">{data?.totalOrders}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">Total Orders</div>
              </div>

              {/* Card 4: Pending Orders */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-slate-900">{data?.pendingOrders}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">Pending Orders</div>
              </div>
            </div>

            {/* Recent Orders Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs mb-8 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">Recent Orders</h2>
                <Link href="/orders" className="text-xs font-bold text-blue-600 hover:underline">
                  View All Orders →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3.5 px-6">Order ID</th>
                      <th className="py-3.5 px-6">User Name</th>
                      <th className="py-3.5 px-6">Products</th>
                      <th className="py-3.5 px-6 text-right">Order Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {data?.recentOrders && data.recentOrders.length > 0 ? (
                      data.recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-6 text-slate-500 font-mono font-bold">
                            {order.orderCode}
                          </td>

                          <td className="py-4 px-6 font-bold text-slate-800">
                            {order.userName}
                          </td>

                          {/* MULTIPLE PRODUCTS RENDERING */}
                          <td className="py-4 px-6">
                            {order.products && order.products.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {order.products.map((prod, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                                  >
                                    {prod}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="font-semibold text-slate-700">
                                {order.productName || 'N/A'}
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-6 text-right text-slate-500 font-medium">
                            {order.orderDate}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          Koi recent order nahi mila.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Notifications Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">Recent Notifications</h2>
                <Link href="/notifications" className="text-xs font-bold text-blue-600 hover:underline">
                  View All Notifications →
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {data?.recentNotifications && data.recentNotifications.length > 0 ? (
                  data.recentNotifications.map((notification) => (
                    <div key={notification.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition">
                      {getNotificationIcon(notification.type)}
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{notification.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{notification.message}</p>
                      </div>
                      <span className="ml-auto text-[10px] text-slate-400 font-medium">
                        {notification.createdAt}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Koi recent notification nahi hai.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}