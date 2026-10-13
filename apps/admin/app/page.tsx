import Link from 'next/link';

const portals = [
  {
    emoji: '💊',
    eyebrow: 'PHARMACY PORTAL',
    title: 'Pharmacy Management',
    description: 'Review pharmacy onboarding applications, verify drug licenses, and track store approvals.',
    href: '/pharmacy-dashboard',
    action: 'Go to Pharmacy Portal',
    color: 'emerald',
  },
  {
    emoji: '🩺',
    eyebrow: 'DOCTOR PORTAL',
    title: 'Doctor Management',
    description: 'Onboard medical specialists, review PMDC certifications, and manage clinic locations.',
    href: '/doctor-dashboard',
    action: 'Go to Doctor Portal',
    color: 'blue',
  },
  {
    emoji: '🧪',
    eyebrow: 'LAB & DIAGNOSTICS PORTAL',
    title: 'Lab & Diagnostics',
    description: 'Manage partner diagnostic centers, test packages, and report submissions.',
    href: '/lab-dashboard',
    action: 'Go to Lab Portal',
    color: 'violet',
  },
];

const styles = {
  emerald: { icon: 'bg-emerald-50', border: 'group-hover:border-emerald-200', button: 'bg-emerald-700 hover:bg-emerald-800' },
  blue: { icon: 'bg-blue-50', border: 'group-hover:border-blue-200', button: 'bg-blue-700 hover:bg-blue-800' },
  violet: { icon: 'bg-violet-50', border: 'group-hover:border-violet-200', button: 'bg-violet-700 hover:bg-violet-800' },
} as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900 sm:px-8 lg:px-12 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> TABIBISTAN ADMINISTRATION
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Tabibistan Admin Control Center</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">Select a portal below to manage registrations, approvals, and domain operations.</p>
        </header>

        <section aria-label="Admin portals" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {portals.map((portal) => {
            const style = styles[portal.color as keyof typeof styles];
            return (
              <Link key={portal.href} href={portal.href} className={`group flex min-h-80 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg ${style.border}`}>
                <div className="flex items-start justify-between">
                  <span aria-hidden="true" className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${style.icon}`}>{portal.emoji}</span>
                  <span className="text-[10px] font-bold tracking-[0.15em] text-slate-400">{portal.eyebrow}</span>
                </div>
                <h2 className="mt-7 text-xl font-semibold text-slate-900">{portal.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{portal.description}</p>
                <span className={`mt-6 inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${style.button}`}>
                  {portal.action} <span aria-hidden="true">➔</span>
                </span>
              </Link>
            );
          })}
        </section>

        <footer className="mt-12 border-t border-slate-200 pt-5 text-xs text-slate-500">Tabibistan · Administration portals</footer>
      </div>
    </main>
  );
}
