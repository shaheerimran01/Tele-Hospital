'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  User,
  LogOut,
  ShoppingBag,
  ChevronRight,
} from 'lucide-react';

const navigation = [
  { href: '/pharmacy-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pharmacy-dashboard/orders', label: 'Order Requests', icon: ShoppingBag },
  { href: '/pharmacy-dashboard/products', label: 'Products Catalog', icon: Package },
  { href: '/pharmacy-dashboard/personal-details', label: 'Personal Details', icon: User },
];

export function PharmacySidebar({ pharmacyName, pharmacyStatus, pharmacyId }: { pharmacyName?: string | null; pharmacyStatus?: string | null; pharmacyId?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="w-64 bg-white border-r border-emerald-100 flex flex-col justify-between shrink-0 shadow-xs">
      <div>
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

        <nav className="p-4 space-y-1.5">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive(item.href)
                  ? 'bg-[#0F5A47] text-white shadow-md shadow-emerald-900/20'
                  : 'text-slate-600 hover:bg-emerald-50/60 hover:text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4 h-4 ${isActive(item.href) ? 'text-emerald-300' : 'text-slate-500'}`} />
                {item.label}
              </div>
              {isActive(item.href) ? (
                <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-emerald-50 space-y-3 bg-emerald-50/30">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-[#0F5A47] text-white flex items-center justify-center font-bold text-sm shadow-sm uppercase">
            {pharmacyName?.substring(0, 2) || 'P'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
              {pharmacyName || 'Pharmacy Partner'}
            </h4>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
              {pharmacyStatus === 'APPROVED' ? 'Verified Partner' : 'Verification Pending'}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('pharmacyId');
              sessionStorage.removeItem('userPharmacyId');
              sessionStorage.removeItem('pharmacyPhone');
              sessionStorage.removeItem('pharmacyEmail');
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
  );
}
