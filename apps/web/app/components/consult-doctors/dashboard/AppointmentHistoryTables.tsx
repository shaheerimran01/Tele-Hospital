'use client';

// Tables for the Appointments page's "Completed" and "Declined / Cancelled" tabs.

import Link from 'next/link';
import { FilePlus2, FileText, MessageSquareText, PencilLine, Video } from 'lucide-react';
import { prescriptionPdfUrl } from '@/app/lib/api/prescriptions-doctor';
import { ModeBadge, PatientCell, StatusBadge, btnBase } from './AppointmentTable';
import { displayTime, formatDay, pkr, type DashboardAppointment } from './dashboard-data';

export const prescriptionHref = (appointmentId: string) =>
  `/consult-doctors/doctor-dashboard/prescriptions/new?appointmentId=${encodeURIComponent(appointmentId)}`;

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-sm font-semibold text-[#141b34]">{title}</p>
      <p className="mt-1 text-sm text-[#6b6f80]">{text}</p>
    </div>
  );
}

function When({ a }: { a: DashboardAppointment }) {
  return (
    <div className="whitespace-nowrap">
      <p className="text-sm font-semibold text-[#141b34]">{formatDay(a.appointmentDate)}</p>
      <p className="text-xs text-[#6b6f80]">
        {displayTime(a.startTime)} – {displayTime(a.endTime)}
      </p>
    </div>
  );
}

function Fee({ a }: { a: DashboardAppointment }) {
  return (
    <div className="whitespace-nowrap">
      <p className="text-sm font-semibold tabular-nums text-[#141b34]">{pkr(a.fee)}</p>
      <p className={`text-xs ${a.paymentStatus === 'PAID' ? 'text-[#2f6b45]' : 'text-[#8a8d99]'}`}>
        {a.paymentStatus === 'PAID' ? 'Paid' : a.paymentStatus === 'REFUNDED' ? 'Refunded' : 'Unpaid'}
      </p>
    </div>
  );
}

function CompletedActions({ a, onViewChat }: { a: DashboardAppointment; onViewChat: (a: DashboardAppointment) => void }) {
  const pdf = a.prescription?.pdfUrl ?? a.prescriptionUrl ?? null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pdf ? (
        <>
          <a
            href={prescriptionPdfUrl(pdf)}
            target="_blank"
            rel="noreferrer"
            className={`${btnBase} bg-[#2f6b45] text-white hover:bg-[#275a3a]`}
          >
            <FileText className="h-3.5 w-3.5" /> View Prescription
          </a>
          <Link
            href={prescriptionHref(a.id)}
            className={`${btnBase} border border-[#dde1ec] bg-white text-[#3a4366] hover:bg-[#f4f5fa]`}
            title="Edit the prescription and generate a new PDF"
          >
            <PencilLine className="h-3.5 w-3.5" /> Edit
          </Link>
        </>
      ) : (
        <Link href={prescriptionHref(a.id)} className={`${btnBase} bg-[#b38a3a] text-white hover:bg-[#9c7630]`}>
          <FilePlus2 className="h-3.5 w-3.5" /> Create Prescription
        </Link>
      )}
      {a.serviceMode === 'TEXT' && (
        <button
          type="button"
          onClick={() => onViewChat(a)}
          className={`${btnBase} border border-[#dde1ec] bg-white text-[#3a4366] hover:bg-[#f4f5fa]`}
        >
          <MessageSquareText className="h-3.5 w-3.5" /> View Chat Summary
        </button>
      )}
      {a.serviceMode === 'VIDEO' && (
        <Link
          href={`/consultations/${encodeURIComponent(a.id)}?as=doctor`}
          className={`${btnBase} border border-[#dde1ec] bg-white text-[#3a4366] hover:bg-[#f4f5fa]`}
        >
          <Video className="h-3.5 w-3.5" /> View Summary
        </Link>
      )}
    </div>
  );
}

export function CompletedTable({ rows, onViewChat }: { rows: DashboardAppointment[]; onViewChat: (a: DashboardAppointment) => void }) {
  if (rows.length === 0) {
    return <Empty title="No completed consultations yet" text="Consultations you finish will appear here with their prescriptions." />;
  }
  return (
    <>
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#efece5] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8d99]">
              <th scope="col" className="px-6 py-3">Patient</th>
              <th scope="col" className="whitespace-nowrap px-3 py-3">Date &amp; time</th>
              <th scope="col" className="px-3 py-3">Service mode</th>
              <th scope="col" className="px-3 py-3">Fee</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="py-3 pl-3 pr-5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1eee7]">
            {rows.map((a) => (
              <tr key={a.id} className="align-middle transition hover:bg-[#fbfaf6]">
                <td className="px-6 py-4"><div className="w-[200px]"><PatientCell a={a} /></div></td>
                <td className="px-3 py-4"><When a={a} /></td>
                <td className="px-3 py-4"><ModeBadge mode={a.serviceMode} clinicName={a.clinic?.name} short /></td>
                <td className="px-3 py-4"><Fee a={a} /></td>
                <td className="px-3 py-4"><StatusBadge status={a.status} /></td>
                <td className="w-full py-4 pl-3 pr-5"><CompletedActions a={a} onViewChat={onViewChat} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-[#f1eee7] xl:hidden">
        {rows.map((a) => (
          <li key={a.id} className="space-y-3 px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <PatientCell a={a} />
              <StatusBadge status={a.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <When a={a} />
              <ModeBadge mode={a.serviceMode} clinicName={a.clinic?.name} short />
              <Fee a={a} />
            </div>
            <CompletedActions a={a} onViewChat={onViewChat} />
          </li>
        ))}
      </ul>
    </>
  );
}

export function CancelledTable({ rows }: { rows: DashboardAppointment[] }) {
  if (rows.length === 0) {
    return <Empty title="No declined or cancelled appointments" text="Requests you decline and cancelled bookings will appear here." />;
  }
  const reason = (a: DashboardAppointment) =>
    a.cancelReason ? <span title={a.cancelReason}>{a.cancelReason}</span> : <span className="text-[#a9a59a]">No reason recorded</span>;
  return (
    <>
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#efece5] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8d99]">
              <th scope="col" className="px-6 py-3">Patient</th>
              <th scope="col" className="whitespace-nowrap px-3 py-3">Date &amp; time</th>
              <th scope="col" className="px-3 py-3">Service mode</th>
              <th scope="col" className="px-3 py-3">Fee</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="py-3 pl-3 pr-5">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1eee7]">
            {rows.map((a) => (
              <tr key={a.id} className="align-middle">
                <td className="px-6 py-4"><div className="w-[200px]"><PatientCell a={a} /></div></td>
                <td className="px-3 py-4"><When a={a} /></td>
                <td className="px-3 py-4"><ModeBadge mode={a.serviceMode} clinicName={a.clinic?.name} short /></td>
                <td className="px-3 py-4"><Fee a={a} /></td>
                <td className="px-3 py-4"><StatusBadge status={a.status} /></td>
                <td className="w-full py-4 pl-3 pr-5 text-sm text-[#3a3f52]"><p className="line-clamp-2 max-w-[360px]">{reason(a)}</p></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-[#f1eee7] xl:hidden">
        {rows.map((a) => (
          <li key={a.id} className="space-y-3 px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <PatientCell a={a} />
              <StatusBadge status={a.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <When a={a} />
              <ModeBadge mode={a.serviceMode} clinicName={a.clinic?.name} short />
              <Fee a={a} />
            </div>
            <p className="text-sm text-[#3a3f52]">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8a8d99]">Reason: </span>
              {reason(a)}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
