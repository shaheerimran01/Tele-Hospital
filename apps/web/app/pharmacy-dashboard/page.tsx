'use client';

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  User, 
  LogOut, 
  MapPin, 
  AlertCircle,
  Radio,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

export default function SellerDashboardPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'personal'>('dashboard');

  // Dummy catalog items that need fixing
  const fixableProducts = [
    {
      id: '1',
      initial: 'A',
      name: 'Augmentin 625mg',
      company: 'GSK Pakistan',
      issue: 'Price is higher than Original Price (MRP)',
    },
    {
      id: '2',
      initial: 'P',
      name: 'Panadol Extra',
      company: 'Haleon Pakistan',
      issue: 'Image URL is missing',
    },
    {
      id: '3',
      initial: 'A',
      name: 'Amoxil Suspension',
      company: 'GSK Pakistan',
      issue: 'Mark Prescription Required (antibiotic)',
    },
    {
      id: '4',
      initial: 'B',
      name: 'Brufen 400mg',
      company: 'Abbott Laboratories',
      issue: 'Strength is missing',
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="p-6 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-lg">
              +
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base leading-none">Tabibistan</h2>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">SELLER PORTAL</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="px-4 space-y-1 mt-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-50 text-teal-900 border border-emerald-200/60'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4 text-teal-800" />
                Dashboard
              </div>
              <span className="bg-teal-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                4
              </span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-emerald-50 text-teal-900 border border-emerald-200/60'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Package className="w-4 h-4 text-slate-500" />
              Products
            </button>

            <button
              onClick={() => setActiveTab('personal')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-emerald-50 text-teal-900 border border-emerald-200/60'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User className="w-4 h-4 text-slate-500" />
              Personal Details
            </button>
          </nav>
        </div>

        {/* User Profile & Logout Bottom */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">Noor Pharmacy</h4>
              <span className="text-[10px] text-slate-400 font-medium">Pharmacy Owner</span>
            </div>
          </div>

          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block mb-1">
              PHARMACY OPERATIONS
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-slate-500">
            <span className="hover:text-slate-800 cursor-pointer">Registration</span>
            <span className="hover:text-slate-800 cursor-pointer">Onboarding</span>
            
            <div className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-full text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              Incoming order
            </div>
          </div>
        </div>

        {/* Pharmacy Title Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Noor Pharmacy</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Hazro, Attock
            </p>
          </div>

          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-[11px] font-bold">
            Online
          </span>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Orders Today */}
          <div className="bg-white p-5 rounded-2xl border-2 border-emerald-800 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium block mb-2">Orders today</span>
            <p className="text-3xl font-extrabold text-slate-900 mb-2">18</p>
            <span className="text-[11px] font-semibold text-emerald-600">
              +12% from yesterday
            </span>
          </div>

          {/* Card 2: Sales */}
          <div className="bg-white p-5 rounded-2xl border-2 border-emerald-800 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium block mb-2">Sales</span>
            <p className="text-3xl font-extrabold text-slate-900 mb-2">
              <span className="text-lg font-bold text-slate-600">Rs</span> 48,260
            </p>
            <span className="text-[11px] font-semibold text-slate-400">
              Rs 8,450 pending
            </span>
          </div>

          {/* Card 3: Live Products */}
          <div className="bg-white p-5 rounded-2xl border-2 border-emerald-800 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium block mb-2">Live products</span>
            <p className="text-3xl font-extrabold text-slate-900 mb-2">224</p>
            <span className="text-[11px] font-semibold text-slate-400">
              57 under review
            </span>
          </div>

          {/* Card 4: Need Fixing */}
          <div className="bg-white p-5 rounded-2xl border-2 border-rose-500 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium block mb-2">Need fixing</span>
            <p className="text-3xl font-extrabold text-rose-600 mb-2">4</p>
            <span className="text-[11px] font-bold text-rose-500">
              Action required
            </span>
          </div>
        </div>

        {/* Catalog Health Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          {/* Catalog Health Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block mb-0.5">
                CATALOG HEALTH
              </span>
              <h3 className="text-base font-bold text-slate-900">Products that need fixing</h3>
            </div>
            <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-bold text-xs flex items-center justify-center">
              4
            </span>
          </div>

          {/* Products List */}
          <div className="divide-y divide-slate-100">
            {fixableProducts.map((prod) => (
              <div key={prod.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {prod.initial}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{prod.name}</h4>
                    <span className="text-[11px] text-slate-400 font-medium">{prod.company}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between md:justify-end w-full md:w-auto">
                  <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[11px] font-semibold px-3 py-1 rounded-full">
                    {prod.issue}
                  </span>

                  <button className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap">
                    Fix now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}