'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  FlaskConical,
  ShoppingBag,
  Clock,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

interface DashboardStats {
  totalLabs: number;
  pendingLabs: number;
  totalCatalogItems: number;
  totalOrders: number;
  recentLabs?: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    verificationStatus: string;
    createdAt: string;
  }>;
}

export default function LabDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLabs: 0,
    pendingLabs: 0,
    totalCatalogItems: 0,
    totalOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/labs/admin/labs/dashboard-stats`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setStats(data.data);
          } else if (data.totalLabs !== undefined) {
            setStats(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-600">Admin Dashboard Load Ho Raha Hai...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col justify-between border-r border-slate-200 bg-white p-4">
        <div>
          {/* Brand & Portal Label */}
          <div className="mb-8 px-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Gateway
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 font-bold text-xl text-white shadow-md">
                T
              </div>
              <div>
                <h1 className="text-base font-bold leading-none text-slate-900">Tabibistan</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                  Admin Portal
                </span>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            <Link
              href="/labs/dashboard"
              className="flex w-full items-center gap-3 rounded-lg bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-700 transition-colors"
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </Link>

            <Link
              href="/orders"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <ShoppingBag className="h-5 w-5" />
              Pharmacy Orders
            </Link>

            <Link
              href="/labs/orders"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <FileText className="h-5 w-5" />
              Lab Orders
            </Link>

            <Link
              href="/labs/verification"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-5 w-5" />
                Lab Verification
              </div>
              {stats.pendingLabs > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  {stats.pendingLabs}
                </span>
              )}
            </Link>

            <Link
              href="/labs/exclusions"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <SlidersHorizontal className="h-5 w-5" />
              Exclusions Manager
            </Link>

            <Link
              href="/labs/catalog"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <FlaskConical className="h-5 w-5" />
              Master Catalog
            </Link>
          </nav>
        </div>

        {/* Footer Admin User Badge */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
              A
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-900">Admin Console</p>
              <p className="text-slate-500">Super Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* Top Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-violet-700">
              LAB & DIAGNOSTICS PORTAL
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Diagnostics & Laboratory Overview
            </h1>
          </div>

          {stats.pendingLabs > 0 && (
            <Link
              href="/labs/verification"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 shadow-sm transition hover:bg-amber-100"
            >
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span>{stats.pendingLabs} Lab Approval Pending</span>
              <ChevronRight className="h-4 w-4 text-amber-600" />
            </Link>
          )}
        </div>

        {/* METRICS GRID */}
        <section aria-label="Lab metrics" className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Labs */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Labs
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">{stats.totalLabs}</p>
          </div>

          {/* Card 2: Pending Verifications */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pending Verifications
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-amber-700">{stats.pendingLabs}</p>
              {stats.pendingLabs > 0 && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  Action Required
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Catalog Items */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Catalog Items
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                <FlaskConical className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-violet-700">{stats.totalCatalogItems}</p>
          </div>

          {/* Card 4: Total Orders */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Orders
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-emerald-700">{stats.totalOrders}</p>
          </div>
        </section>

        {/* QUICK MANAGEMENT SECTION */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Action Box 1: Verification */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Laboratory Verifications</h2>
                <p className="text-xs text-slate-500">
                  Review submitted licenses, regulatory bodies, and branch locations.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Link
                href="/labs/verification"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-violet-700"
              >
                Go to Verification Table <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Action Box 2: Master Catalog */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Master Test Catalog</h2>
                <p className="text-xs text-slate-500">
                  Manage master packages, individual lab tests, and default prices.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Link
                href="/labs/catalog"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Manage Master Items <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/labs/exclusions"
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                Manage Exclusions <SlidersHorizontal className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
