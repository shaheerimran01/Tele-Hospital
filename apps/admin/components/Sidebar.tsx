'use client';

import Link from 'next/link';
import { FileCheck2, FileText, FlaskConical, LayoutDashboard, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/labs/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Pharmacy Orders', icon: ShoppingBag },
  { href: '/labs/orders', label: 'Lab Orders', icon: FileText },
  { href: '/labs/verification', label: 'Lab Verification', icon: FileCheck2 },
  { href: '/labs/catalog', label: 'Master Catalog', icon: FlaskConical },
  { href: '/labs/exclusions', label: 'Exclusions Manager', icon: SlidersHorizontal },
];

/** Shared navigation for all laboratory administration routes. */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl font-bold text-white shadow-md">T</div>
          <div><h1 className="text-base font-bold text-slate-900">Tabibistan</h1><p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Admin Portal</p></div>
        </div>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <Icon className="h-5 w-5" />{item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
