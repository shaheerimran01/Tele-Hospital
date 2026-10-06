'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  User, 
  LogOut, 
  MapPin, 
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  ShoppingBag,
  ChevronRight,
  ShieldCheck,
  FileText,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DocumentIssue {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'personal'>('dashboard');
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Dynamic State for Logged-In Pharmacy
  const [pharmacyInfo, setPharmacyInfo] = useState({
    name: 'Pharmacy Partner',
    city: 'Location Pending',
    status: 'PENDING',
    productsCount: 0,
  });

  // Dynamic Document Issues / Notifications matched by Pharmacy ID
  const [documentIssues, setDocumentIssues] = useState<DocumentIssue[]>([]);

  // Fetch Logged-in Pharmacy Details, Products Count & Specific Notifications
  useEffect(() => {
    async function loadDashboardData() {
      if (typeof window === 'undefined') return;

      const activeId = 
        localStorage.getItem('pharmacyId') || 
        localStorage.getItem('userPharmacyId');

      if (!activeId) {
        setLoading(false);
        return;
      }

      setPharmacyId(activeId);

      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        
        // 1. Fetch Pharmacy details & associated products count
        const pharmacyRes = await fetch(`${baseUrl}/pharmacies/${activeId}`);
        if (pharmacyRes.ok) {
          const data = await pharmacyRes.json();
          
          // Products count calculation directly from PharmacyProduct relation
          const realProductsCount = Array.isArray(data.products) 
            ? data.products.length 
            : (data._count?.products || 0);

          setPharmacyInfo({
            name: data.name || 'Pharmacy Partner',
            city: data.city ? `${data.city}, Pakistan` : 'Pakistan',
            status: data.status || 'PENDING',
            productsCount: realProductsCount,
          });
        }

        // 2. Fetch Notifications matched specifically to this Pharmacy ID, Type & Title
        const notifRes = await fetch(`${baseUrl}/notifications?pharmacyId=${activeId}`);
        if (notifRes.ok) {
          const notifications = await notifRes.json();
          
          // Filter notifications matching pharmacyId, type === 'ADMIN_PHARMACY_MESSAGE', title === 'Message from Admin' or action required
          if (Array.isArray(notifications)) {
            const fixingNotifs = notifications.filter(
              (n: any) => 
                n.pharmacyId === activeId && 
                (n.type === 'ADMIN_PHARMACY_MESSAGE' || n.type === 'DOCUMENT_REJECTED' || n.type === 'ACTION_REQUIRED') &&
                (n.title === 'Message from Admin' || n.title === 'Document Action Required' || !n.isRead)
            );
            
            setDocumentIssues(
              fixingNotifs.map((n: any) => ({
                id: n.id,
                title: n.title || 'Message from Admin',
                message: n.message || 'Please review your uploaded documents.',
                type: n.type || 'ADMIN_PHARMACY_MESSAGE',
                createdAt: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Recent',
              }))
            );
          }
        }
      } catch (err) {
        console.error('Dashboard data fetching error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F4F7F5] text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-emerald-100 flex flex-col justify-between shrink-0 shadow-xs">
        <div>
          {/* Logo Banner */}
          <div className="p-6 flex items-center gap-3 border-b border-emerald-50">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F5A47] to-emerald-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-900/20">
              +
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg leading-none tracking-tight">
                Tabibistan
              </h2>
              <span className="text-[10px] font-extrabold text-emerald-700 tracking-wider uppercase block mt-1">
                SELLER PORTAL
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#0F5A47] text-white shadow-md shadow-emerald-900/20'
                  : 'text-slate-600 hover:bg-emerald-50/60 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-emerald-300' : 'text-slate-500'}`} />
                Dashboard
              </div>
              {documentIssues.length > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                  {documentIssues.length}
                </span>
              )}
            </button>

            <Link
              href="/pharmacy-dashboard/products"
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#0F5A47] text-white shadow-md shadow-emerald-900/20'
                  : 'text-slate-600 hover:bg-emerald-50/60 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-slate-500" />
                Products Catalog
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            {/* Added Link Route for Personal Details */}
            <Link
              href="/pharmacy-dashboard/personal-details"
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-[#0F5A47] text-white shadow-md shadow-emerald-900/20'
                  : 'text-slate-600 hover:bg-emerald-50/60 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-500" />
                Personal Details
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </nav>
        </div>

        {/* Dynamic User Profile & Logout */}
        <div className="p-4 border-t border-emerald-50 space-y-3 bg-emerald-50/30">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-[#0F5A47] text-white flex items-center justify-center font-bold text-sm shadow-sm uppercase">
              {pharmacyInfo.name.substring(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">{pharmacyInfo.name}</h4>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                {pharmacyInfo.status === 'APPROVED' ? 'Verified Partner' : 'Verification Pending'}
              </span>
            </div>
          </div>

          <button 
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('pharmacyId');
                localStorage.removeItem('pharmacyPhone');
                router.push('/');
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-emerald-100/80 shadow-xs">
          <div>
            <span className="text-[10px] font-extrabold text-[#0F5A47] uppercase tracking-wider block mb-1">
              PHARMACY OPERATIONS & OVERVIEW
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-600 flex-wrap">
            <Link 
              href="/pharmacy-register"
              className="px-3.5 py-2 hover:bg-emerald-50 text-slate-700 hover:text-[#0F5A47] rounded-xl transition"
            >
              Registration
            </Link>
            <span className="px-3.5 py-2 hover:bg-emerald-50 text-slate-700 hover:text-[#0F5A47] rounded-xl cursor-pointer transition">
              Onboarding
            </span>
            
            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200/80 px-3.5 py-2 rounded-xl text-xs font-bold animate-pulse">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>
              Incoming order active
            </div>
          </div>
        </div>

        {/* Dynamic Green Pharmacy Banner */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#0F5A47] to-teal-800 p-6 rounded-2xl text-white shadow-md shadow-emerald-950/10 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-extrabold tracking-tight">
                {loading ? 'Loading Pharmacy...' : pharmacyInfo.name}
              </h2>
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <p className="text-xs text-emerald-100 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-300" />
              {pharmacyInfo.city}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="bg-emerald-400/20 backdrop-blur-md text-emerald-200 border border-emerald-300/30 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {pharmacyInfo.status}
            </span>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Card 1: Orders Today */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs hover:border-emerald-300 transition group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Orders Today</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0F5A47] flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 mb-2">18</p>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12% from yesterday
            </span>
          </div>

          {/* Card 2: Sales */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs hover:border-emerald-300 transition group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Sales</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0F5A47] flex items-center justify-center font-bold">
                Rs
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 mb-2">
              <span className="text-base font-bold text-slate-400">Rs</span> 48,260
            </p>
            <span className="text-[11px] font-semibold text-slate-400">
              Rs 8,450 pending settlement
            </span>
          </div>

          {/* Card 3: Products (Fetched directly from PharmacyProducts table) */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs hover:border-emerald-300 transition group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Products</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0F5A47] flex items-center justify-center font-bold">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 mb-2">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-[#0F5A47]" /> : pharmacyInfo.productsCount}
            </p>
            <span className="text-[11px] font-semibold text-slate-400">
              Specific to this pharmacy
            </span>
          </div>

          {/* Card 4: Need Fixing (Notification Count Matched by Pharmacy ID) */}
          <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs hover:border-rose-300 transition group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-rose-600 font-bold uppercase tracking-wider">Need Fixing</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-rose-600 mb-2">{documentIssues.length}</p>
            <span className="text-[11px] font-bold text-rose-500">
              Action required on document
            </span>
          </div>
        </div>

        {/* Dynamic Documents Fixing Section (Matched via Notifications Backend) */}
        <div className="bg-white border border-emerald-100 rounded-2xl shadow-xs overflow-hidden">
          {/* Section Header */}
          <div className="p-6 border-b border-emerald-50 flex items-center justify-between bg-emerald-50/20">
            <div>
              <span className="text-[10px] font-extrabold text-[#0F5A47] uppercase tracking-wider block mb-0.5">
                VERIFICATION & DOCUMENTATION HEALTH
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">Documents That Need Fixing</h3>
            </div>
            <Link 
              href="/pharmacy-register"
              className="text-xs font-bold text-[#0F5A47] hover:text-emerald-900 flex items-center gap-1 cursor-pointer transition"
            >
              Re-upload Documents <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Fixable Documents List / Dynamic Notifications */}
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#0F5A47]" /> Loading document issues...
              </div>
            ) : documentIssues.length > 0 ? (
              documentIssues.map((doc) => (
                <div 
                  key={doc.id} 
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-emerald-50/30 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0F5A47] to-emerald-800 text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0F5A47] transition">
                        {doc.title}
                      </h4>
                      <span className="text-xs text-slate-500 font-medium block mt-0.5">{doc.message}</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-1 block">{doc.createdAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between md:justify-end w-full md:w-auto">
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold border bg-rose-50 text-rose-700 border-rose-200">
                      Action Required
                    </span>

                    <button 
                      onClick={() => router.push('/pharmacy-register')}
                      className="px-4 py-2 bg-[#0F5A47] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1"
                    >
                      Fix Document
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2 bg-emerald-50/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                All clear! No document issues found for this pharmacy.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}