import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';

/** Quick link under the consultation summary for patients who already booked. */
export default function MyAppointmentsCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0ed] text-[#ff6f61]">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900">Looking for your existing bookings?</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            View and manage all your past and upcoming doctor appointments.
          </p>
        </div>
      </div>
      <Link
        href="/consult-doctors/my-appointments"
        className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#ff6f61] bg-white px-4 py-2.5 text-sm font-bold text-[#e8453b] transition hover:bg-[#fff5f3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6f61] focus-visible:ring-offset-2"
      >
        View My Appointments
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}
