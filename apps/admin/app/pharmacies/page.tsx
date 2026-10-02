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
  RotateCw,
  Eye,
  Building2
} from 'lucide-react';
import Link from 'next/link';
import { fetchPharmacies } from '@/lib/api/pharmacies';
import { PharmacyItem } from '@/types/pharmacy';

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<PharmacyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadPharmacies();
  }, []);

  const loadPharmacies = async () => {
    try {
      setLoading(true);
      const data = await fetchPharmacies();
      setPharmacies(data);
    } catch (err) {
      console.error('Failed to load pharmacies:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'PH';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const filteredPharmacies = pharmacies.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.ownerName.toLowerCase().includes(query) ||
      p.pharmacyCode.toLowerCase().includes(query) ||
      p.phone.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F2942] text-white flex flex-col shrink-0">
        <div className="flex items-center gap-2 p-6 font-bold text-xl tracking-wide">
          <span className="text-2xl font-black text-white">+</span> TABIIISTAN
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/notifications" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Bell className="w-5 h-5" />
            Notifications
          </Link>
          <Link href="/orders" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <ShoppingBag className="w-5 h-5" />
            Orders
          </Link>
          <Link href="/products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Package className="w-5 h-5" />
            Products
          </Link>
          <Link href="/users" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link href="/pharmacies" className="flex items-center gap-3 px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
            <Building2 className="w-5 h-5" />
            Pharmacies
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-x-auto">
        {/* Header Breadcrumb & Title */}
        <div className="mb-6">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            TABIBISTAN / PHARMACIES
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacies</h1>
        </div>

        {/* Search Bar & Refresh Action */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search pharmacy, owner, ID or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          <button
            onClick={loadPharmacies}
            title="Refresh Pharmacies"
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>

        {/* Pharmacies Data Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Pharmacy Name</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Pharmacist</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Address</th>
                  <th className="py-3.5 px-4">CNIC</th>
                  <th className="py-3.5 px-4">Drug Licence</th>
                  <th className="py-3.5 px-4">Pharmacist Reg.</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      Pharmacies load ho rahi hain...
                    </td>
                  </tr>
                ) : filteredPharmacies.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      Koi pharmacy record nahi mila.
                    </td>
                  </tr>
                ) : (
                  filteredPharmacies.map((item) => {
                    const isPending = item.status === 'PENDING' || !item.isActive;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        {/* ID */}
                        <td className="py-4 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {item.pharmacyCode}
                        </td>

                        {/* Pharmacy Name + Avatar + Status Badge */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {getInitials(item.name)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{item.name}</span>
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                                  isPending
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {isPending ? 'Pending' : 'Active'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Owner Name */}
                        <td className="py-4 px-4 text-slate-700 font-medium whitespace-nowrap">
                          {item.ownerName}
                        </td>

                        {/* Pharmacist Name */}
                        <td className="py-4 px-4 text-slate-700 font-medium whitespace-nowrap">
                          {item.pharmacistName}
                        </td>

                        {/* Phone */}
                        <td className="py-4 px-4 text-slate-600 font-mono whitespace-nowrap">
                          {item.phone}
                        </td>

                        {/* Email */}
                        <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                          {item.email}
                        </td>

                        {/* Address */}
                        <td className="py-4 px-4 text-slate-600 max-w-xs truncate" title={item.address}>
                          {item.address}
                        </td>

                        {/* CNIC */}
                        <td className="py-4 px-4 text-slate-600 font-mono whitespace-nowrap">
                          {item.cnicNtnNumber}
                        </td>

                        {/* Drug Licence */}
                        <td className="py-4 px-4 text-slate-600 font-mono whitespace-nowrap">
                          {item.drugLicenseNumber}
                        </td>

                        {/* Pharmacist Reg */}
                        <td className="py-4 px-4 text-slate-600 font-mono whitespace-nowrap">
                          {item.pharmacistRegNum}
                        </td>

                        {/* Action Link */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <Link
                            href={`/pharmacies/${item.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg transition border border-emerald-200"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-700" />
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}