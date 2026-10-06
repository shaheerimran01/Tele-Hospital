'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Bell, 
  ShoppingBag, 
  Package, 
  Users, 
  Settings, 
  Search,
  RefreshCw,
  Eye,
  X,
  ExternalLink,
  Building2,
  Boxes,
  Globe,
} from 'lucide-react';
import { fetchAdminOrders } from '@/lib/api/orders';
import { OrderTableItem } from '@/types/order';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderTableItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  
  // Prescription Modal Preview State
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);

  useEffect(() => {
    loadOrdersData();
  }, []);

  const loadOrdersData = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders
    .filter((order) => {
      if (statusFilter !== 'All' && order.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      return (
        order.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
      }
      return new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
    });

  const getStatusBadge = (status: string) => {
    const st = status.toUpperCase();
    if (st === 'COMPLETED') {
      return <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-bold text-[11px] border border-emerald-200">Completed</span>;
    }
    if (st === 'PROCESSING') {
      return <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-bold text-[11px] border border-blue-200">Processing</span>;
    }
    if (st === 'CANCELLED') {
      return <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md font-bold text-[11px] border border-rose-200">Cancelled</span>;
    }
    return <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-bold text-[11px] border border-amber-200">Pending</span>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const st = status.toUpperCase();
    if (st === 'PAID') {
      return <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-bold text-[11px] border border-emerald-100">Paid</span>;
    }
    return <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md font-bold text-[11px] border border-rose-100">Unpaid</span>;
  };

  const getPrescriptionBadge = (item: OrderTableItem) => {
    if (item.prescriptionStatus === 'Uploaded') {
      return (
        <button
          type="button"
          onClick={() => item.prescriptionUrl && setSelectedPrescription(item.prescriptionUrl)}
          className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md font-bold text-[11px] flex items-center gap-1 hover:bg-emerald-100 transition cursor-pointer"
        >
          ✓ Uploaded
        </button>
      );
    }
    if (item.prescriptionStatus === 'Missing') {
      return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md font-bold text-[11px]">⚠️ Missing *</span>;
    }
    return <span className="text-slate-400 text-[11px] font-medium">Not Required</span>;
  };

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
          </Link>
          <Link href="/orders" className="flex items-center justify-between px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5" />
              Orders
            </div>
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

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage customer orders, payments, prescriptions, and order status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search orders, customers, or items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="All">Status: All</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>

            <button
              type="button"
              onClick={loadOrdersData}
              className="flex items-center gap-1.5 px-3.5 py-1.5 border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Update
            </button>
          </div>
        </div>

        {/* Orders Table Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Order Details</h2>
            <span className="text-xs text-slate-400 font-medium">
              Showing {filteredOrders.length} of {orders.length} Orders
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100/60">
                  <th className="py-3.5 px-5 whitespace-nowrap">Order ID</th>
                  <th className="py-3.5 px-5 whitespace-nowrap min-w-[180px]">User</th>
                  <th className="py-3.5 px-5 min-w-[280px]">Products & Quantity</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">QTY</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Payment</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Method</th>
                  <th className="py-3.5 px-5 whitespace-nowrap">Amount</th>
                  <th className="py-3.5 px-5 whitespace-nowrap">Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Prescription</th>
                  <th className="py-3.5 px-5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                      Orders load ho rahe hain...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                      Koi order nahi mila.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-5 font-bold text-blue-600 font-mono text-[11px] whitespace-nowrap">
                        {order.orderCode}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1A4B78] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {order.customerInitials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{order.customerName}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{order.customerEmail}</p>
                          </div>
                        </div>
                      </td>

                      {/* Products List Badges */}
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1.5">
                          {order.items.map((item, idx) => (
                            <span
                              key={idx}
                              className="bg-blue-50/80 text-blue-900 border border-blue-200/80 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs"
                            >
                              <span>{item.productName}</span>
                              <span className="bg-blue-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded">
                                x{item.quantity}
                              </span>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center font-bold text-slate-800 whitespace-nowrap">
                        {order.totalQuantity}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">{getStatusBadge(order.status)}</td>
                      <td className="py-4 px-4 whitespace-nowrap">{getPaymentStatusBadge(order.paymentStatus)}</td>
                      <td className="py-4 px-4 font-bold text-slate-700 uppercase text-[11px] whitespace-nowrap">
                        {order.paymentMethod}
                      </td>
                      <td className="py-4 px-5 font-extrabold text-slate-900 whitespace-nowrap">
                        Rs. {order.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-4 px-5 text-slate-500 text-[11px] whitespace-nowrap">
                        {order.orderDate}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">{getPrescriptionBadge(order)}</td>

                      {/* Clean Action Button Link */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <Link 
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold text-[11px] rounded-lg transition shadow-2xs ml-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prescription Modal Preview */}
        {selectedPrescription && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm">Doctor Prescription Document</h3>
                <div className="flex items-center gap-3">
                  <a
                    href={selectedPrescription}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                  >
                    Open Original File
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedPrescription(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-auto flex-1 flex justify-center items-center bg-slate-900/10 min-h-[450px]">
                {selectedPrescription.toLowerCase().includes('.pdf') ? (
                  <iframe
                    src={`${selectedPrescription}#toolbar=1`}
                    className="w-full h-[70vh] rounded-lg border border-slate-300 shadow-md"
                    title="Prescription PDF Preview"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedPrescription}
                    alt="Uploaded Prescription"
                    className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}