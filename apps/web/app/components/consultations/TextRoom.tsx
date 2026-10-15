'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CircleCheck, Clock, LogOut, PhoneOff, WifiOff } from 'lucide-react';
import type { Viewer } from '@/app/lib/api/consultations';
import TextChatPanel from '@/app/consultations/[appointmentId]/text/components/TextChatPanel';
import EndConsultationModal from './EndConsultationModal';
import type { JoinedAccess } from './RoomGuard';
import { clock, displayTime, initials, roomHref } from './room-utils';
import { useConsultationRoom } from './useConsultationRoom';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function ConnectionBar({ status, error }: { status: string; error: string | null }) {
  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white" role="alert">
        <WifiOff className="h-3.5 w-3.5" /> {error}
      </div>
    );
  }
  if (status === 'reconnecting' || status === 'connecting') {
    return (
      <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white" role="status">
        <WifiOff className="h-3.5 w-3.5" /> {status === 'connecting' ? 'Connecting to the room…' : 'Connection lost. Reconnecting…'}
      </div>
    );
  }
  return null;
}

export function EndedBanner({ endedBy, onView }: { endedBy: string; onView: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
      <div className="flex max-w-md items-center gap-3 rounded-xl bg-[#141b34] px-4 py-3 text-sm text-white shadow-2xl" role="status">
        <CircleCheck className="h-5 w-5 shrink-0 text-emerald-400" />
        <span className="flex-1">{endedBy} ended the consultation.</span>
        <button type="button" onClick={onView} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
          View Summary
        </button>
      </div>
    </div>
  );
}

export default function TextRoom({ appointmentId, access, viewer }: { appointmentId: string; access: JoinedAccess; viewer: Viewer }) {
  const router = useRouter();
  const room = useConsultationRoom({ appointmentId, ticket: access.rtcToken, viewer });
  const [confirming, setConfirming] = useState(false);
  const now = useNow();
  const a = access.appointment;
  const other = access.other.name;
  const doctorView = viewer.role === 'DOCTOR';
  const subtitle = doctorView ? `Patient${a.symptoms.length ? ` · ${a.symptoms.slice(0, 2).join(', ')}` : ''}` : a.doctor.speciality;

  const summary = () => router.replace(roomHref(appointmentId, null, viewer.role));
  const leave = () => router.replace(roomHref(appointmentId, null, viewer.role, 'left=1'));

  // When the doctor ends the session, show the summary shortly after
  useEffect(() => {
    if (!room.ended) return;
    const t = window.setTimeout(summary, 4000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.ended]);

  const endsIn = (new Date(access.endsAt).getTime() - now) / 1000;

  return (
    <div className="flex h-[100dvh] flex-col bg-[#f4f6fb]">
      {/* Conversation header */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-5">
        <button type="button" onClick={() => setConfirming(true)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Leave the consultation">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#141b34] text-sm font-bold text-white">
          {initials(other)}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${room.otherOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
            aria-hidden
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{other}</p>
          <p className="flex items-center gap-2 truncate text-xs text-slate-500">
            <span className={`inline-flex items-center gap-1 font-semibold ${room.otherOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
              {room.otherOnline ? 'Online' : 'Offline'}
            </span>
            <span className="truncate">· {subtitle}</span>
          </p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:inline-flex" title="Scheduled time">
          <Clock className="h-3.5 w-3.5" />
          {displayTime(a.startTime)} – {displayTime(a.endTime)}
          {endsIn > 0 && endsIn < 3600 && <span className="tabular-nums text-slate-400">· {clock(endsIn)} left</span>}
        </span>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${doctorView ? 'bg-rose-600 text-white hover:bg-rose-700' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
        >
          {doctorView ? <PhoneOff className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
          <span className="hidden sm:inline">{doctorView ? 'End Consultation' : 'Leave'}</span>
        </button>
      </header>
      <ConnectionBar status={room.status} error={room.error} />

      {/* Joined / left notices */}
      <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {room.notices.map((n) => (
          <span key={n.id} className={`rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-lg ${n.tone === 'leave' ? 'bg-slate-700' : 'bg-emerald-600'}`}>
            {n.text}
          </span>
        ))}
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
        <TextChatPanel
          room={room}
          appointmentId={appointmentId}
          ticket={access.rtcToken}
          otherName={other}
          disabled={!!room.ended || (room.status === 'closed' && !!room.error)}
        />
      </div>

      {room.ended && <EndedBanner endedBy={room.ended.endedBy} onView={summary} />}
      {confirming && (
        <EndConsultationModal
          role={viewer.role}
          appointmentId={appointmentId}
          doctorToken={viewer.role === 'DOCTOR' ? viewer.token : undefined}
          otherName={other}
          onClose={() => setConfirming(false)}
          onEnded={summary}
          onLeave={leave}
        />
      )}
    </div>
  );
}
