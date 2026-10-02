'use client';

import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Bell, 
  ShoppingBag, 
  Package, 
  Users, 
  Settings, 
  Search,
  CheckCircle2,
  UploadCloud,
  Check,
  X,
  ExternalLink,
  FileText,
  Building2
} from 'lucide-react';
import Link from 'next/link';
import { fetchNotifications, markNotificationAsRead } from '@/lib/api/notifications';
import { NotificationItem } from '@/types/notification';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read' | 'orders' | 'products' | 'pharmacies'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Prescription Preview Modal State
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Helper function to extract initials from Pharmacy/Customer Name
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const filteredNotifications = notifications
    .filter((item) => {
      const isPharmacy = item.type === 'NEW_PHARMACY_REGISTRATION' || item.category === 'pharmacies' || Boolean(item.pharmacyId);
      if (activeTab === 'unread') return !item.isRead;
      if (activeTab === 'read') return item.isRead;
      if (activeTab === 'orders') return item.category === 'orders';
      if (activeTab === 'products') return item.category === 'products';
      if (activeTab === 'pharmacies') return isPharmacy;
      return true;
    })
    .filter((item) => {
      const query = searchQuery.toLowerCase();
      const isPharmacy = item.type === 'NEW_PHARMACY_REGISTRATION' || item.category === 'pharmacies' || Boolean(item.pharmacyId);
      const pharmData = item.pharmacy || {};

      return (
        item.customerName?.toLowerCase().includes(query) ||
        item.title?.toLowerCase().includes(query) ||
        item.message?.toLowerCase().includes(query) ||
        (isPharmacy && (
          pharmData.name?.toLowerCase().includes(query) ||
          pharmData.ownerName?.toLowerCase().includes(query) ||
          pharmData.pharmacistRegNum?.toLowerCase().includes(query)
        )) ||
        item.items?.some((i) => i.productName.toLowerCase().includes(query))
      );
    });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const pharmaciesCount = notifications.filter((n) => n.type === 'NEW_PHARMACY_REGISTRATION' || n.category === 'pharmacies' || Boolean(n.pharmacyId)).length;
  const ordersCount = notifications.filter((n) => n.category === 'orders').length;
  const productsCount = notifications.filter((n) => n.category === 'products').length;

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
          <Link href="/notifications" className="flex items-center justify-between px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              Notifications
            </div>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                {unreadCount}
              </span>
            )}
          </Link>
          <Link href="/orders" className="flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5" />
              Orders
            </div>
          </Link>
          <Link href="/products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Package className="w-5 h-5" />
            Products
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
        {/* Header Title & Top Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage customer orders, pharmacy registrations, and important healthcare notifications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-60"
              />
            </div>
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-xs transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-blue-600" />
              Mark all as read
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === 'unread' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setActiveTab('read')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === 'read' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Read
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === 'orders' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Orders ({ordersCount})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === 'products' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Products ({productsCount})
          </button>
          <button
            onClick={() => setActiveTab('pharmacies')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pharmacies' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pharmacies ({pharmaciesCount})
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Notifications load ho rahi hain...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Koi notification nahi mili.</div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((item) => {
              const isPharmacyReg = item.type === 'NEW_PHARMACY_REGISTRATION' || item.category === 'pharmacies' || Boolean(item.pharmacyId);
              const pharm = item.pharmacy || {};

              const pharmacyName = pharm.name || item.title?.split(' (')[0] || 'Pharmacy Application';
              const ownerName = pharm.ownerName || 'Pharmacy Owner';
              const pharmacistRegNum = pharm.pharmacistRegNum || 'N/A';
              const cnicNtnNumber = pharm.cnicNtnNumber || 'N/A';

              const targetPath = isPharmacyReg
                ? `/pharmacies/${item.pharmacyId || item.id}`
                : item.category === 'products'
                ? `/products/${item.productId || item.id}`
                : `/orders/${item.orderId || item.id}`;

              // PHARMACY REGISTRATION NOTIFICATION CARD
              if (isPharmacyReg) {
                return (
                  <div
                    key={item.id}
                    className={`p-5 bg-white border rounded-xl shadow-xs transition flex items-start justify-between gap-4 ${
                      !item.isRead ? 'border-blue-200 bg-emerald-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Initials Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {getInitials(pharmacyName)}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-slate-800 font-normal">
                          <span className="font-bold text-slate-900">{pharmacyName}</span> has submitted a new pharmacy registration.
                        </p>
                        
                        <p className="text-xs text-slate-600">
                          Owner: <span className="font-bold text-slate-800">{ownerName}</span>
                        </p>

                        {/* Badges for Pharmacist Reg & CNIC */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-[11px] font-mono border border-slate-200">
                            Pharmacist Reg. {pharmacistRegNum}
                          </span>
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-[11px] font-mono border border-slate-200">
                            CNIC {cnicNtnNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Right Side (Stacked Order Layout) */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Link
                        href={targetPath}
                        onClick={() => {
                          if (!item.isRead) {
                            handleMarkRead(item.id);
                          }
                        }}
                        className="px-4 py-1.5 bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold rounded-md shadow-xs transition cursor-pointer inline-block text-center"
                      >
                        View Pharmacy
                      </Link>

                      {!item.isRead ? (
                        <button
                          onClick={() => handleMarkRead(item.id)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                        >
                          Read
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-300">Read</span>
                      )}
                    </div>
                  </div>
                );
              }

              // STANDARD ORDER / PRODUCT NOTIFICATION CARD
              return (
                <div
                  key={item.id}
                  className={`p-5 bg-white border rounded-xl shadow-xs transition flex flex-col gap-4 ${
                    !item.isRead ? 'border-blue-200 bg-blue-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-[#1A4B78] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {item.customerInitials || getInitials(item.customerName)}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{item.customerName || 'Customer'}</h3>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{item.title}</p>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {item.items && item.items.length > 0 ? (
                            item.items.map((prod, idx) => (
                              <span
                                key={idx}
                                className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded font-semibold border border-blue-100 text-[11px]"
                              >
                                {prod.productName} <span className="text-blue-500 font-bold">x{prod.quantity}</span>
                              </span>
                            ))
                          ) : (
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded font-medium text-[11px]">
                              Healthcare Item
                            </span>
                          )}

                          {item.orderCode && (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono text-[11px]">
                              #{item.orderCode}
                            </span>
                          )}

                          {item.prescriptionRequired ? (
                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-semibold border border-amber-200 text-[11px]">
                              ⚠️ Prescription Required *
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-200 text-[11px]">
                              ✓ Prescription Not Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Link
                        href={targetPath}
                        onClick={() => {
                          if (!item.isRead) {
                            handleMarkRead(item.id);
                          }
                        }}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs transition cursor-pointer inline-block text-center ${
                          item.category === 'products'
                            ? 'bg-teal-700 hover:bg-teal-800 text-white'
                            : 'bg-[#1D4ED8] hover:bg-blue-800 text-white'
                        }`}
                      >
                        {item.category === 'products' ? 'View Product' : 'View Order'}
                      </Link>

                      {!item.isRead ? (
                        <button
                          onClick={() => handleMarkRead(item.id)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                        >
                          Read
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-300">Read</span>
                      )}
                    </div>
                  </div>

                  {item.prescriptionRequired && (
                    <div className="mt-1 p-3.5 bg-[#FFFBEB] border border-amber-200 rounded-lg text-xs space-y-2">
                      <p className="text-amber-800 font-bold text-[11px]">
                        Doctor's Prescription * — required before order approval
                      </p>
                      {item.prescriptionUrl ? (
                        <div className="flex items-center gap-3.5 pt-1">
                          <div 
                            onClick={() => setSelectedPrescription(item.prescriptionUrl!)}
                            className="relative w-14 h-14 bg-white rounded-lg overflow-hidden border border-amber-300 shrink-0 shadow-xs flex items-center justify-center cursor-pointer group hover:border-blue-500 transition"
                          >
                            {item.prescriptionUrl.toLowerCase().includes('.pdf') ? (
                              <div className="flex flex-col items-center justify-center text-center">
                                <FileText className="w-6 h-6 text-red-500" />
                                <span className="text-[8px] font-black text-red-600 uppercase mt-0.5">PDF</span>
                              </div>
                            ) : (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={item.prescriptionUrl}
                                alt="Prescription Thumbnail"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                              />
                            )}
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span className="text-slate-700 font-semibold text-[11px]">Uploaded by customer</span>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setSelectedPrescription(item.prescriptionUrl!)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded font-semibold text-[11px] hover:bg-blue-700 transition flex items-center gap-1.5 shadow-xs w-fit cursor-pointer"
                            >
                              🔍 View Prescription
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-amber-700 bg-amber-100/50 p-2.5 rounded border border-dashed border-amber-300">
                          <UploadCloud className="w-4 h-4" />
                          <span className="font-medium text-[11px]">Upload Prescription — Image or PDF from customer</span>
                          <span className="text-amber-600 text-[10px] ml-auto">Awaiting customer upload</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* FULL PRESCRIPTION PREVIEW MODAL */}
        {selectedPrescription && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <h3 className="font-bold text-slate-800 text-sm">Doctor Prescription Document</h3>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={selectedPrescription}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6f61] text-white rounded-lg text-xs font-bold hover:bg-[#e05b4f] transition shadow-xs"
                  >
                    Open Original File
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
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