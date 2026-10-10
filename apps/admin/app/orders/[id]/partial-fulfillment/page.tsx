'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { fetchOrderById } from '@/lib/api/orderDetails';

export default function PartialFulfillmentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [partialResponses, setPartialResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (orderId) {
      loadPartialSummary();
    }
  }, [orderId]);

  const loadPartialSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/orders/${orderId}/partial-summary`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to load partial summary');
      }
      const data = await res.json();
      setOrder(data.order);
      setPartialResponses(data.partialResponses);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load partial fulfillment data');
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationChange = (orderItemId: string, pharmacyId: string) => {
    setAllocations((prev) => ({ ...prev, [orderItemId]: pharmacyId }));
  };

  const handleConfirmAssignment = async () => {
    const allocationEntries = Object.entries(allocations);
    if (allocationEntries.length === 0) {
      alert('Please assign at least one item to a pharmacy');
      return;
    }

    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/orders/${orderId}/confirm-split-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocations: allocationEntries.map(([orderItemId, pharmacyId]) => ({
            orderItemId,
            pharmacyId,
          })),
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to confirm assignment');
      }
      const data = await res.json();
      // Show success message with created requests info
      const requestSummary = data.createdRequests?.map((r: any) => 
        `Pharmacy ${r.pharmacyId.slice(0,8)}: ${r.itemCount} item(s)`
      ).join('; ') || '';
      alert(`Split order dispatched successfully!\n${requestSummary}\n\nFresh 1-minute timers started for each pharmacy.`);
      router.push(`/orders/${orderId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to confirm assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const getPharmacyColumns = () => {
    const map = new Map<string, any>();
    partialResponses.forEach((resp, idx) => {
      const pharmacyId = resp.pharmacy?.id || resp.pharmacyId || `pharmacy-${idx}`;
      if (!map.has(pharmacyId)) {
        map.set(pharmacyId, {
          ...resp.pharmacy,
          id: pharmacyId,
          pharmacyId: pharmacyId,
        });
      }
    });
    return Array.from(map.values());
  };

  const handleAutoAssign = () => {
    const nextAllocations = { ...allocations };
    const columns = getPharmacyColumns();
    order?.items?.forEach((item: any) => {
      if (item.status !== 'ASSIGNED' && !nextAllocations[item.id]) {
        const found = columns.find((pharm) => isItemAvailableAtPharmacy(item.id, pharm.id));
        if (found) {
          nextAllocations[item.id] = found.id;
        }
      }
    });
    setAllocations(nextAllocations);
  };

  const isItemAvailableAtPharmacy = (itemId: string, pharmacyId: string) => {
    const resp = partialResponses.find((r) => r.pharmacyId === pharmacyId);
    return resp?.availableOrderItemIds?.includes(itemId) || false;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
        <aside className="w-64 bg-[#0F2942] text-white flex flex-col shrink-0">
          <div className="flex items-center gap-2 p-6 font-bold text-xl tracking-wide">
            <span className="text-2xl font-black text-white">+</span> Tabibistan
          </div>
        </aside>
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
            Loading partial fulfillment data...
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
        </aside>
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 text-rose-700 text-xs font-bold">
            ⚠️ {error || 'Order not found'}
          </div>
        </main>
      </div>
    );
  }

  const pharmacyColumns = getPharmacyColumns();
  const totalItems = order.items?.length || 0;
  const assignedItems = Object.keys(allocations).length;

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

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-slate-900">{order.orderCode}</h1>
                  <span className="px-3 py-1 rounded-md font-bold text-xs border bg-amber-50 text-amber-700 border-amber-200">
                    Partial Fulfillment Matrix
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {order.user && `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || 'Unknown Customer'}
                  {order.user?.phone && ` • ${order.user.phone}`}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="text-2xl font-black text-blue-600">{totalItems}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Total Products</div>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="text-2xl font-black text-emerald-600">{assignedItems}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Assigned</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="text-2xl font-black text-amber-600">{pharmacyColumns.length}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Pharmacies</div>
                </div>
              </div>
            </div>
          </div>

          {pharmacyColumns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center">
              <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Partial Responses</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                No pharmacies have responded with PARTIALLY_AVAILABLE status for this order.
              </p>
            </div>
          ) : (
            <React.Fragment>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Responding Pharmacies ({pharmacyColumns.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAutoAssign}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Auto-Assign Available Items
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {partialResponses.map((resp, idx) => {
                    const pharmacyId = resp.pharmacy?.id || resp.pharmacyId || `pharmacy-${idx}`;
                    return (
                      <div
                        key={`resp-card-${pharmacyId}-${idx}`}
                        className="flex items-center gap-2.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-amber-900">{resp.pharmacy?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-amber-700 font-semibold">
                            {resp.availableOrderItemIds?.length || 0} of {totalItems} item(s) in stock
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-64 sticky left-0 bg-slate-50 z-10">
                          Product
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">
                          Qty
                        </th>
                        {pharmacyColumns.map((pharmacy, pIdx) => (
                          <th
                            key={`th-col-${pharmacy.id || `pharm-${pIdx}`}`}
                            className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[150px] border-l border-slate-100"
                          >
                            <div className="font-extrabold text-slate-800">{pharmacy?.name || 'Unknown'}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{pharmacy?.pharmacyType || 'Retail'}</div>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[200px] border-l border-slate-100">
                          Assigned Pharmacy
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.items?.map((item: any, itemIdx: number) => {
                        const isAssignedInDb = item.status === 'ASSIGNED';
                        const selectedPharmId = allocations[item.id];

                        return (
                          <tr key={`tr-item-${item.id || itemIdx}`} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-3 sticky left-0 bg-white z-10">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{item.productName}</p>
                                {item.product?.genericName && (
                                  <p className="text-[10px] text-slate-500 mt-0.5">Formula: {item.product.genericName}</p>
                                )}
                                {item.product?.manufacturer && (
                                  <p className="text-[10px] text-slate-500">Mfr: {item.product.manufacturer}</p>
                                )}
                                {isAssignedInDb && item.assignedPharmacyId && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded mt-1">
                                    <CheckCircle className="w-3 h-3" /> Already Assigned
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                              {item.quantity}
                            </td>
                            {pharmacyColumns.map((pharmacy, pIdx) => {
                              const available = isItemAvailableAtPharmacy(item.id, pharmacy.id);
                              const isSelectedHere = selectedPharmId === pharmacy.id;

                              return (
                                <td
                                  key={`td-cell-${item.id || itemIdx}-${pharmacy.id || `pharm-${pIdx}`}`}
                                  className={`px-3 py-3 text-center border-l border-slate-100 transition ${
                                    isSelectedHere ? 'bg-emerald-50/50' : ''
                                  }`}
                                >
                                  {available ? (
                                    <button
                                      type="button"
                                      onClick={() => handleAllocationChange(item.id, pharmacy.id)}
                                      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        isSelectedHere
                                          ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400 ring-offset-1'
                                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      }`}
                                    >
                                      <CheckCircle className={`w-3.5 h-3.5 ${isSelectedHere ? 'text-white' : 'text-emerald-600'}`} />
                                      {isSelectedHere ? 'Selected' : 'Available'}
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg text-xs font-medium">
                                      <XCircle className="w-3.5 h-3.5 text-slate-300" /> Out of Stock
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td key={`td-assign-${item.id || itemIdx}`} className="px-4 py-3 border-l border-slate-100">
                              {isAssignedInDb ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
                                  <CheckCircle className="w-3.5 h-3.5" /> Assigned
                                </span>
                              ) : (
                                <select
                                  value={allocations[item.id] || ''}
                                  onChange={(e) => handleAllocationChange(item.id, e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                >
                                  <option value="">-- Choose Pharmacy --</option>
                                  {pharmacyColumns.map((pharmacy, pIdx) =>
                                    isItemAvailableAtPharmacy(item.id, pharmacy.id) && (
                                      <option key={`opt-${item.id || itemIdx}-${pharmacy.id || `pharm-${pIdx}`}`} value={pharmacy.id}>
                                        {pharmacy?.name || 'Unknown'} (In Stock)
                                      </option>
                                    )
                                  )}
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">
                      Allocated: <span className="font-extrabold text-slate-900">{assignedItems}</span> of {totalItems} items
                    </span>
                    {assignedItems === totalItems && totalItems > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        All Items Allocated
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmAssignment}
                    disabled={submitting || assignedItems === 0}
                    className="px-6 py-3 bg-[#0F2942] hover:bg-[#1A3A5C] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Confirming Dispatch...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Confirm & Dispatch Split Orders
                      </>
                    )}
                  </button>
                </div>
              </div>
            </React.Fragment>
          )}
        </div>
      </main>
    </div>
  );
}