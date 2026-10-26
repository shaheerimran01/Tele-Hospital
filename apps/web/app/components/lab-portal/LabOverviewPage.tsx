'use client';

// /lab-dashboard: status banner, 4 summary cards, quick links, and the
// "Action Required: Fix Your Details" list built from the admin's review notes.

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Building2, CircleAlert, Clock, FileText, FlaskConical, LoaderCircle, Settings, ShieldAlert, ShoppingBag, Tag, Wallet } from 'lucide-react';
import { formatPkr } from '@/app/lib/api/lab-tests';
import { resubmitLabApi } from '@/app/lib/api/lab-portal';
import { FIX_PAGE as TARGET, fixHref } from './fix-routing';
import { useLabPortal } from './LabPortalShell';

export default function LabOverviewPage() {
  const { overview, href, refresh } = useLabPortal();
  const { laboratory: lab, stats, issues, canResubmit } = overview;
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  /** REJECTED, or the board left notes on the lab */
  const needsFix = lab.verificationStatus === 'REJECTED' || Boolean(lab.rejectionReason?.trim());

  const resubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      await resubmitLabApi();
      await refresh();
      setMessage({ tone: 'ok', text: 'Thank you. Your details were sent back to the Tabibistan Medical Board for review.' });
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Could not resubmit. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const registration =
    lab.verificationStatus === 'APPROVED'
      ? { value: 'Verified & Live', note: 'Patients can find and book your lab', tone: 'text-[#2f7a4b]', Icon: BadgeCheck }
      : lab.verificationStatus === 'REJECTED' || needsFix
        ? { value: 'Action Required', note: 'Fix the items below and resubmit', tone: 'text-red-700', Icon: ShieldAlert }
        : { value: 'PENDING Approval', note: 'Our medical board is reviewing your details', tone: 'text-sky-800', Icon: Clock };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#141b34] sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-[#6b6f80]">An overview of {lab.name} on Tabibistan.</p>
      </div>

      {/* Verification banner (open admin notes show in the sticky notice at the top instead) */}
      {needsFix ? null : lab.verificationStatus === 'APPROVED' ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[#2f7a4b]/20 bg-[#e8f3ec] px-4 py-3.5">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2f7a4b]" />
          <div>
            <p className="text-sm font-semibold text-[#1f5a35]">Verified Diagnostic Partner</p>
            <p className="text-xs text-[#2f7a4b]">Your lab is approved and visible to patients on Tabibistan.</p>
          </div>
        </div>
      ) : lab.verificationStatus === 'PENDING' ? (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3.5" role="status">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
          <div>
            <p className="text-sm font-semibold text-sky-900">Under Review by Tabibistan Medical Board</p>
            <p className="text-xs text-sky-800">
              We&apos;re checking your license and medical staff details. You can set up your tests and prices meanwhile; patients see them once you&apos;re approved.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5" role="alert">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-800">Action Required</p>
            <p className="text-xs text-red-700">Our medical board could not approve your lab yet. See the notes below, fix the details and resubmit.</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Registration Status" Icon={registration.Icon}>
          <p className={`text-lg font-bold ${registration.tone}`}>{registration.value}</p>
          <p className="text-xs text-[#8a8d99]">{registration.note}</p>
        </Card>
        <Card label="Total Sales & Revenue" Icon={Wallet}>
          <p className="text-lg font-bold tabular-nums text-[#141b34]">{formatPkr(stats.bookings.revenue)}</p>
          <p className="text-xs text-[#8a8d99]">
            {stats.bookings.completed} completed · {stats.bookings.pending} pending bookings
          </p>
          {!stats.bookings.tracked && <p className="mt-1 text-[11px] text-[#8a8d99]">Bookings appear here once patients start booking your lab.</p>}
        </Card>
        <Card label="Active Branches" Icon={Building2}>
          <p className="text-lg font-bold tabular-nums text-[#141b34]">{stats.activeBranches}</p>
          <p className="text-xs text-[#8a8d99]">{stats.branches === 1 ? '1 registered center' : `${stats.branches} registered centers`}</p>
        </Card>
        <Card label="Custom Priced Items" Icon={Tag}>
          <p className="text-lg font-bold tabular-nums text-[#141b34]">{stats.customPriced}</p>
          <p className="text-xs text-[#8a8d99]">
            {stats.unavailableItems > 0 ? `${stats.unavailableItems} switched off` : 'Tests and packages with your own price'}
          </p>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href={href('/lab-dashboard/orders')} Icon={ShoppingBag} title="Patient Orders" text="Incoming bookings & reports" />
        <QuickLink href={href('/lab-dashboard/manage-tests')} Icon={FlaskConical} title="Set prices & availability" text="Manage your tests and packages" />
        <QuickLink href={href('/lab-dashboard/branches')} Icon={Building2} title="Branches" text="Medical staff, phones and addresses" />
        <QuickLink href={href('/lab-dashboard/documents')} Icon={FileText} title="Documents & licensing" text="License number and document" />
      </div>

      {/* Fix Now */}
      {(issues.length > 0 || canResubmit) && (
        <section aria-labelledby="fix-title" className="overflow-hidden rounded-2xl border border-red-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <CircleAlert className="h-5 w-5 text-red-600" />
              <h2 id="fix-title" className="text-sm font-bold text-red-800">
                Action Required: Fix Your Details
              </h2>
            </div>
            <span className="text-xs text-red-700">{issues.length === 1 ? '1 item flagged by our medical board' : `${issues.length} items flagged by our medical board`}</span>
          </header>
          {issues.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="sr-only sm:not-sr-only">
                <tr className="border-b border-[#f0ede6] text-left text-[11px] uppercase tracking-wide text-[#8a8d99]">
                  <th className="px-5 py-2 font-semibold">Reviewer note</th>
                  <th className="hidden px-5 py-2 font-semibold sm:table-cell">Where to fix</th>
                  <th className="px-5 py-2 text-right font-semibold">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede6]">
                {issues.map((issue) => (
                  <tr key={issue.id}>
                    <td className="px-4 py-3 text-[#141b34] sm:px-5">
                      {issue.text}
                      <span className="mt-0.5 block text-xs text-[#8a8d99] sm:hidden">{TARGET[issue.target].label}</span>
                    </td>
                    <td className="hidden px-5 py-3 text-xs text-[#6b6f80] sm:table-cell">{TARGET[issue.target].label}</td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <Link
                        href={fixHref(href, issue)}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        {issue.target === 'documents' ? 'Fix Now' : `Update ${issue.target === 'branches' ? 'Branches' : 'Profile'}`} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-4 text-sm text-[#3a3f52]">Our medical board did not leave specific notes. Please review your documents and details, then resubmit.</p>
          )}
          <footer className="flex flex-col gap-3 border-t border-[#f0ede6] bg-[#faf9f6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-[#6b6f80]">When you have fixed everything, send your lab back for review.</p>
            <button
              type="button"
              onClick={resubmit}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#141b34] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#232c4f] disabled:opacity-60"
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />} Resubmit for Review
            </button>
          </footer>
        </section>
      )}
      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.tone === 'ok' ? 'bg-[#e8f3ec] text-[#1f5a35]' : 'bg-red-50 text-red-700'}`} role="status">
          {message.text}
        </p>
      )}

      {lab.verificationStatus !== 'REJECTED' && !issues.length && (
        <p className="flex items-center gap-1.5 text-xs text-[#8a8d99]">
          <Settings className="h-3.5 w-3.5" /> Keep your contact details current in{' '}
          <Link href={href('/lab-dashboard/profile')} className="font-semibold text-[#3a3f52] underline">
            Lab Profile
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function Card({ label, Icon, children }: { label: string; Icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#e7e2d8] bg-white px-4 py-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-[#6b6f80]">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3f1ec] text-[#3a3f52]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {children}
    </div>
  );
}

function QuickLink({ href, Icon, title, text }: { href: string; Icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-2xl border border-[#e7e2d8] bg-white px-4 py-3 hover:border-[#c9c2b3]">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#141b34] text-white">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#141b34]">{title}</span>
        <span className="block truncate text-xs text-[#8a8d99]">{text}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-[#b9b3a5] transition group-hover:translate-x-0.5" />
    </Link>
  );
}
