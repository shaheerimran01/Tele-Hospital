import Link from 'next/link';
import { ArrowLeft, FlaskConical } from 'lucide-react';

const metrics = [
  { label: 'Total Labs', value: 0, color: 'text-slate-900' },
  { label: 'Pending Verifications', value: 0, color: 'text-amber-700' },
  { label: 'Active Tests', value: 0, color: 'text-violet-700' },
];

export default function LabDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" /> Back to Admin Gateway
        </Link>
        <header className="mt-8 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><FlaskConical className="h-6 w-6" /></span>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-violet-700">LAB &amp; DIAGNOSTICS PORTAL</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Lab &amp; Diagnostic Center Portal</h1>
          </div>
        </header>

        <section aria-label="Lab metrics" className="mt-8 grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{metric.label}</p>
            <p className={`mt-3 text-3xl font-bold ${metric.color}`}>{metric.value}</p>
          </article>)}
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold">Lab Applications</h2>
            <p className="mt-1 text-sm text-slate-500">Review partner diagnostic center applications and verification status.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Diagnostic Center</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Test Packages</th><th className="px-5 py-3">Status</th></tr></thead>
              <tbody><tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">No pending lab applications found.</td></tr></tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
