'use client';

// Doctor Portal > Prescriptions: every digital prescription the doctor has issued,
// plus completed consultations that still need one.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, FilePlus2, FileText, LoaderCircle, PencilLine, Search } from 'lucide-react';
import { ApiError } from '@/app/lib/api/doctors';
import { getMyPrescriptionsApi, prescriptionPdfUrl, type PrescriptionListItem } from '@/app/lib/api/prescriptions-doctor';
import { ModeBadge, btnBase } from './AppointmentTable';
import { prescriptionHref } from './AppointmentHistoryTables';
import { SectionCard } from './DashboardHome';
import { ViewHeader } from './DashboardViews';
import { displayTime, formatDay, type DoctorDashboardData } from './dashboard-data';

const issuedOn = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function PrescriptionsView({
  token,
  data,
  onAuthError,
}: {
  token: string;
  data: DoctorDashboardData | null;
  /** 401: the dashboard signs the doctor out */
  onAuthError: (err: unknown) => boolean;
}) {
  const [items, setItems] = useState<PrescriptionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await getMyPrescriptionsApi(token));
    } catch (err) {
      if (onAuthError(err)) return;
      setError(err instanceof ApiError ? err.messages[0] : 'Could not load your prescriptions.');
    }
  }, [token, onAuthError]);

  // Also reloads when the header's Refresh button reloads the dashboard
  useEffect(() => {
    load();
  }, [load, data]);

  const awaiting = (data?.completed ?? []).filter((a) => !a.prescription && !a.prescriptionUrl);
  const q = query.trim().toLowerCase();
  const shown = (items ?? []).filter(
    (p) => !q || p.patientName.toLowerCase().includes(q) || p.appointmentNum.toLowerCase().includes(q) || (p.diagnosis ?? '').toLowerCase().includes(q),
  );

  return (
    <>
      <ViewHeader
        title="Prescriptions"
        text="Digital prescriptions you have issued. Patients are notified and can download the PDF from My Appointments."
      />

      <div className="space-y-6">
        {awaiting.length > 0 && (
          <SectionCard title="Waiting for a prescription" subtitle={`${awaiting.length} completed consultation${awaiting.length === 1 ? '' : 's'} without a prescription`}>
            <ul className="divide-y divide-[#f1eee7]">
              {awaiting.slice(0, 8).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#141b34]">{a.patientName}</p>
                    <p className="text-xs text-[#6b6f80]">
                      {formatDay(a.appointmentDate)}, {displayTime(a.startTime)} · <span className="font-mono">{a.appointmentNum}</span>
                    </p>
                  </div>
                  <ModeBadge mode={a.serviceMode} clinicName={a.clinic?.name} short />
                  <Link href={prescriptionHref(a.id)} className={`${btnBase} bg-[#b38a3a] text-white hover:bg-[#9c7630]`}>
                    <FilePlus2 className="h-3.5 w-3.5" /> Create Prescription
                  </Link>
                </li>
              ))}
            </ul>
            {awaiting.length > 8 && (
              <p className="border-t border-[#efece5] px-6 py-3 text-xs text-[#8a8d99]">
                {awaiting.length - 8} more in Appointments → Completed.
              </p>
            )}
          </SectionCard>
        )}

        <SectionCard
          title="Issued prescriptions"
          subtitle={items ? `${items.length} prescription${items.length === 1 ? '' : 's'}` : undefined}
          action={
            <label className="relative block w-full sm:w-64">
              <span className="sr-only">Search prescriptions</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a9a59a]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search patient or APT number"
                className="w-full rounded-lg border border-[#e2ddd2] bg-[#fbfaf6] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#141b34] focus:bg-white"
              />
            </label>
          }
        >
          {error ? (
            <p className="flex items-center gap-2 px-6 py-6 text-sm text-[#8f2d2d]" role="alert">
              <CircleAlert className="h-4 w-4" /> {error}
            </p>
          ) : !items ? (
            <p className="flex items-center gap-2 px-6 py-8 text-sm text-[#6b6f80]">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading prescriptions…
            </p>
          ) : shown.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[#141b34]">{items.length ? 'No prescriptions match your search' : 'No prescriptions yet'}</p>
              <p className="mt-1 text-sm text-[#6b6f80]">
                {items.length ? 'Try another name or appointment number.' : 'Open Appointments → Completed and choose Create Prescription.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#f1eee7]">
              {shown.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f7f1e4] text-[#7b5d22]" aria-hidden>
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#141b34]">{p.patientName}</p>
                    <p className="truncate text-xs text-[#6b6f80]" title={p.diagnosis ?? undefined}>
                      {p.diagnosis || 'No diagnosis entered'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#8a8d99]">
                      {p.medicineCount} medicine{p.medicineCount === 1 ? '' : 's'}
                      {p.labTests.length ? ` · ${p.labTests.length} lab test${p.labTests.length === 1 ? '' : 's'}` : ''} · Consultation{' '}
                      {formatDay(p.appointmentDate)} · <span className="font-mono">{p.appointmentNum}</span>
                    </p>
                  </div>
                  <div className="text-right text-xs text-[#6b6f80]">
                    <p className="font-semibold text-[#3a3f52]">Issued {issuedOn(p.createdAt)}</p>
                    {issuedOn(p.updatedAt) !== issuedOn(p.createdAt) && <p>Updated {issuedOn(p.updatedAt)}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.pdfUrl && (
                      <a href={prescriptionPdfUrl(p.pdfUrl)} target="_blank" rel="noreferrer" className={`${btnBase} bg-[#2f6b45] text-white hover:bg-[#275a3a]`}>
                        <FileText className="h-3.5 w-3.5" /> View PDF
                      </a>
                    )}
                    <Link href={prescriptionHref(p.appointmentId)} className={`${btnBase} border border-[#dde1ec] bg-white text-[#3a4366] hover:bg-[#f4f5fa]`}>
                      <PencilLine className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}
