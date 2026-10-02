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
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertCircle,
  Star,
  RotateCcw
} from 'lucide-react';
import { fetchAdminUsers } from '@/lib/api/users';
import { AdminUserItem } from '@/types/user';

// Helper function to generate avatar background colors based on name initials
const getAvatarBg = (initials: string) => {
  const colors = [
    'bg-teal-600',
    'bg-indigo-600',
    'bg-red-600',
    'bg-blue-600',
    'bg-purple-600',
    'bg-emerald-600',
    'bg-amber-600',
  ];
  let charCodeSum = 0;
  for (let i = 0; i < initials.length; i++) {
    charCodeSum += initials.charCodeAt(i);
  }
  return colors[charCodeSum % colors.length];
};

// Smart Pagination Helper Function (Ellipsis '...' ke sath)
const getPaginationPages = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, '...', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedOrdersFilter, setSelectedOrdersFilter] = useState<string>('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  useEffect(() => {
    loadUsersData();
  }, []);

  const loadUsersData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Database se users load nahi ho sake.');
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic over Backend Users Data
  const filteredUsers = users.filter((u) => {
    // 1. Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      const matchName = fullName.includes(q);
      const matchCode = u.userCode?.toLowerCase().includes(q);
      const matchPhone = u.phone.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchPhone && !matchEmail) return false;
    }

    // 2. Status filter
    if (selectedStatus !== 'All' && u.status !== selectedStatus) {
      return false;
    }

    // 3. Customer Type filter
    if (selectedType !== 'All') {
      if (selectedType === 'New' && u.customerType !== 'New') return false;
      if (selectedType === 'Returning' && u.customerType !== 'Returning') return false;
      if (selectedType === 'Professional' && !u.healthcareProfessional) return false;
    }

    // 4. Orders count filter
    if (selectedOrdersFilter !== 'All') {
      if (selectedOrdersFilter === 'Has Orders' && u.ordersCount === 0) return false;
      if (selectedOrdersFilter === 'No Orders' && u.ordersCount > 0) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">7</span>
          </Link>
          <Link href="/orders" className="flex items-center justify-between px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5" />
              Orders
            </div>
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">6</span>
          </Link>
          <Link href="/products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Package className="w-5 h-5" />
            Products
          </Link>
          <Link href="/users" className="flex items-center gap-3 px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
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
        {/* Header Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage customers, contact information, addresses, account status, and order history.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users by name, User ID, phone number, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Filters Toolbar & Count */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="text-slate-500">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold focus:outline-none"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="text-slate-500">Type:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold focus:outline-none"
              >
                <option value="All">All</option>
                <option value="New">New Customer</option>
                <option value="Returning">Returning Customer</option>
                <option value="Professional">Healthcare Professional</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="text-slate-500">Orders:</span>
              <select
                value={selectedOrdersFilter}
                onChange={(e) => setSelectedOrdersFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold focus:outline-none"
              >
                <option value="All">All</option>
                <option value="Has Orders">Has Orders</option>
                <option value="No Orders">No Orders</option>
              </select>
            </div>

            <button
              onClick={loadUsersData}
              className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer flex items-center gap-1.5 font-medium text-xs shadow-2xs"
              title="Refresh Users List"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right side showing total users tag */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Showing {paginatedUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
            </span>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-bold">
              {filteredUsers.length} Users
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Users Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Customer List</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/30">
                  <th className="py-3.5 px-6">User ID</th>
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Phone</th>
                  <th className="py-3.5 px-6">Email</th>
                  <th className="py-3.5 px-6">Address</th>
                  <th className="py-3.5 px-6">Orders</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Customer Type</th>
                  <th className="py-3.5 px-6 text-center">View</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      Database se users load ho rahe hain...
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      Koi user nahi mila.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase() || 'U';
                    const avatarBg = getAvatarBg(initials);

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition">
                        {/* 1. USER ID */}
                        <td className="py-4 px-6 font-mono font-bold text-blue-600">
                          {user.userCode}
                        </td>

                        {/* 2. NAME + AVATAR */}
                        <td className="py-4 px-6 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full ${avatarBg} text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs`}>
                              {initials}
                            </div>
                            <span className="whitespace-nowrap">{user.firstName} {user.lastName}</span>
                          </div>
                        </td>

                        {/* 3. PHONE */}
                        <td className="py-4 px-6 text-slate-600 whitespace-nowrap font-medium">
                          {user.phone}
                        </td>

                        {/* 4. EMAIL */}
                        <td className="py-4 px-6 text-slate-600 font-medium">
                          {user.email}
                        </td>

                        {/* 5. ADDRESS */}
                        <td className="py-4 px-6 text-slate-500 max-w-[220px] truncate" title={user.address}>
                          {user.address}
                        </td>

                        {/* 6. ORDERS COUNT BADGE */}
                        <td className="py-4 px-6">
                          <span className="bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full text-[11px] border border-blue-100 inline-block">
                            {user.ordersCount} Orders
                          </span>
                        </td>

                        {/* 7. STATUS BADGE */}
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                            user.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {user.status}
                          </span>
                        </td>

                        {/* 8. CUSTOMER TYPE BADGE */}
                        <td className="py-4 px-6">
                          {user.customerType === 'Returning' ? (
                            <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" /> Returning
                            </span>
                          ) : (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                              <Star className="w-3 h-3 fill-blue-600" /> New
                            </span>
                          )}
                        </td>

                        {/* 9. VIEW BUTTON */}
                        <td className="py-4 px-6 text-center">
                          <Link
                            href={`/users/${user.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1 border border-blue-200 hover:bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg transition cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
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

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 text-xs text-slate-500 font-medium">
            <div className="whitespace-nowrap font-medium text-slate-600">
              Page <span className="font-bold text-slate-800">{currentPage}</span> of{' '}
              <span className="font-bold text-slate-800">{totalPages}</span> —{' '}
              <span className="font-bold text-slate-800">{filteredUsers.length}</span> total customers
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPaginationPages(currentPage, totalPages).map((page, idx) => {
                if (page === '...') {
                  return (
                    <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 font-bold select-none">
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(Number(page))}
                    className={`min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                      currentPage === page
                        ? 'bg-[#1A3A5C] text-white shadow-2xs'
                        : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}