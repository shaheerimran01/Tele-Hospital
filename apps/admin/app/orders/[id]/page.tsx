'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { fetchOrderById, updateOrderStatusApi, updateItemAvailabilityApi } from '@/lib/api/orderDetails';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { value: 'REVIEWING', label: 'Reviewing', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { value: 'CONFIRMED', label: 'Confirmed', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  { value: 'PROCESSING', label: 'Processing', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { value: 'COMPLETED', label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { value: 'CANCELLED', label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
];

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

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

  const handleStatusChange = async (newStatus: string) => {
    if (!orderId) return;
    try {
      setUpdatingStatus(true);
      await updateOrderStatusApi(orderId, newStatus);
      setOrder((prev: any) => ({ ...prev, status: newStatus }));
    } catch (err: any) {
      alert(err.message || 'Status update nahi ho saka.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const toggleItemAvailability = async (itemId: string, currentAvailable: boolean) => {
    if (!orderId) return;
    const nextState = !currentAvailable;
    try {
      setUpdatingItem(itemId);
      await updateItemAvailabilityApi(orderId, itemId, nextState);
      setOrder((prev: any) => ({
        ...prev,
        items: prev.items.map((item: any) =>
          item.id === itemId ? { ...item, isAvailable: nextState } : item
        ),
      }));
    } catch (err: any) {
      alert(err.message || 'Item availability update nahi ho saki.');
    } finally {
      setUpdatingItem(null);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const st = status?.toUpperCase();
    const found = STATUS_OPTIONS.find((s) => s.value === st);
    return found ? `${found.bg} ${found.text} ${found.border}` : 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
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

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mb-6">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Orders
          </Link>

          {order && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-slate-900">{order.orderCode}</h1>
                  <span className={`px-3 py-1 rounded-md font-bold text-xs border ${getStatusBadgeStyle(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Placed on {order.orderDate}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Update Status:</span>
                <select
                  disabled={updatingStatus}
                  value={order.status?.toUpperCase()}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 hover:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {updatingStatus && <span className="text-[11px] text-blue-600 font-semibold animate-pulse">Saving...</span>}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
            Order details load ho rahi hain...
          </div>
        ) : error || !order ? (
          <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 text-rose-700 text-xs font-bold">
            ⚠️ {error || 'Order nahi mil saka.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                  Ordered Items ({order.items.length})
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4 text-center">Price</th>
                        <th className="py-3 px-4 text-center">Qty</th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4 text-right">Availability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {order.items.map((item: any) => (
                        <tr key={item.id} className={`hover:bg-slate-50/50 transition ${!item.isAvailable ? 'bg-rose-50/30' : ''}`}>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className={!item.isAvailable ? 'line-through text-slate-400' : ''}>
                                {item.productName}
                              </span>
                              {item.isAvailable ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Available
                                </span>
                              ) : (
                                <span className="bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Not Available
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-600">
                            Rs. {item.price.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold">
                            x{item.quantity}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            Rs. {item.total.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              disabled={updatingItem === item.id}
                              onClick={() => toggleItemAvailability(item.id, item.isAvailable)}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer shadow-2xs disabled:opacity-50 ${
                                item.isAvailable
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white'
                              }`}
                            >
                              {updatingItem === item.id ? (
                                <span className="animate-pulse">Updating...</span>
                              ) : item.isAvailable ? (
                                <>
                                  <Ban className="w-3.5 h-3.5" />
                                  Mark Not Available
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Mark Available
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-100 mt-6 pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>Rs. {order.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Shipping Fee</span>
                    <span className="text-emerald-600 font-bold">Free</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 text-sm pt-2 border-t border-slate-100">
                    <span>Total Amount</span>
                    <span className="text-blue-600">Rs. {order.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {order.prescriptionRequired && (
                <div className="bg-[#FFFBEB] rounded-2xl border border-amber-200 p-6 space-y-3">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Doctor's Prescription
                  </h3>

                  {order.prescriptionUrl ? (
                    <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-amber-200">
                      <div 
                        onClick={() => setSelectedPrescription(order.prescriptionUrl)}
                        className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0 cursor-pointer flex items-center justify-center hover:opacity-80 transition"
                      >
                        {order.prescriptionUrl.toLowerCase().includes('.pdf') ? (
                          <div className="flex flex-col items-center">
                            <FileText className="w-6 h-6 text-red-500" />
                            <span className="text-[8px] font-black text-red-600">PDF</span>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={order.prescriptionUrl} alt="Prescription" className="w-full h-full object-cover" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-slate-800">Prescription Attached</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Customer uploaded valid prescription document.</p>
                      </div>

                      <button
                        onClick={() => setSelectedPrescription(order.prescriptionUrl)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                      >
                        View Full Screen
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-100/60 text-amber-800 rounded-xl text-xs font-medium border border-dashed border-amber-300">
                      ⚠️ Customer has not uploaded a prescription for this order yet.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" /> Customer Information
                </h3>

                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-[#1A4B78] text-white flex items-center justify-center font-bold text-sm">
                    {order.customerInitials}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{order.customerName}</p>
                    <p className="text-xs text-slate-400">{order.customerEmail}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
                    <span className="font-semibold text-slate-700">{order.customerPhone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">User Reference ID</span>
                    <span className="font-mono text-slate-600 text-[11px]">{order.id}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" /> Payment Details
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Payment Method</span>
                    <span className="font-bold text-slate-900 uppercase bg-slate-100 px-2.5 py-1 rounded-md">
                      {order.paymentMethod}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Payment Status</span>
                    <span className={`font-bold px-2.5 py-1 rounded-md ${
                      order.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" /> Shipping Address
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {order.shippingAddress}
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedPrescription && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
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