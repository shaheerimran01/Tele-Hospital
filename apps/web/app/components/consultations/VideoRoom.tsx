'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquareText,
  Mic,
  MicOff,
  PhoneOff,
  ShieldCheck,
  Video,
  VideoOff,
  Volume2,
  X,
} from 'lucide-react';
import type { Viewer } from '@/app/lib/api/consultations';
import ChatPanel from './ChatPanel';
import { NO_SHOW_EXIT_HREF, NoShowCard, NotifyPatientButton, useDoctorWaiting, WaitingBanner } from './DoctorWaiting';
import EndConsultationModal from './EndConsultationModal';
import type { JoinedAccess } from './RoomGuard';
import { clock, initials, roomHref } from './room-utils';
import { ConnectionBar, EndedBanner } from './TextRoom';
import { useConsultationRoom } from './useConsultationRoom';
import { useLocalMedia, usePeerCall } from './usePeerCall';

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/** <video> bound to a MediaStream; reports when the browser blocks sound until a tap */
function StreamVideo({
  stream,
  muted,
  mirrored,
  className,
  onAutoplayBlocked,
  label,
}: {
  stream: MediaStream | null;
  muted: boolean;
  mirrored?: boolean;
  className: string;
  onAutoplayBlocked?: () => void;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    if (stream) v.play().catch(() => onAutoplayBlocked?.());
  }, [stream, onAutoplayBlocked]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      aria-label={label}
      className={`${className} ${mirrored ? '-scale-x-100' : ''}`}
    />
  );
}

function ControlButton({
  onClick,
  active,
  label,
  children,
  danger = false,
  badge,
  disabled,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
  danger?: boolean;
  badge?: number;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={!danger ? !active : undefined}
      title={label}
      className={`relative flex h-12 w-12 items-center justify-center rounded-full transition sm:h-14 sm:w-14 disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? 'bg-rose-600 text-white hover:bg-rose-700'
          : active
            ? 'bg-white/15 text-white hover:bg-white/25'
            : 'bg-white text-slate-900 hover:bg-slate-200'
      }`}
    >
      {children}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-[20px] rounded-full bg-[#ff6f61] px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export default function VideoRoom({ appointmentId, access, viewer }: { appointmentId: string; access: JoinedAccess; viewer: Viewer }) {
  const router = useRouter();
  const room = useConsultationRoom({ appointmentId, ticket: access.rtcToken, viewer });
  const media = useLocalMedia();
  const call = usePeerCall({ room, iceServers: access.iceServers, localStream: media.stream, mediaReady: media.ready });
  const [chatOpen, setChatOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const waiting = useDoctorWaiting({ room, access, viewer });
  const now = useNow();
  const onSoundBlocked = useCallback(() => setSoundBlocked(true), []);

  const a = access.appointment;
  const other = access.other.name;
  const doctorView = viewer.role === 'DOCTOR';
  const subtitle = doctorView ? `Patient${a.symptoms.length ? ` · ${a.symptoms.slice(0, 2).join(', ')}` : ''}` : a.doctor.speciality;

  // Tell the other side when the camera/mic is switched off
  const { sendMediaState } = room;
  useEffect(() => {
    if (room.status === 'connected') sendMediaState(media.audioOn, media.videoOn);
  }, [media.audioOn, media.videoOn, room.status, sendMediaState]);

  useEffect(() => setMediaNotice(media.error), [media.error]);

  const stopAndGo = (href: string) => {
    call.hangUp();
    media.stop();
    router.replace(href);
  };
  const summary = () => stopAndGo(roomHref(appointmentId, null, viewer.role));
  const leave = () => stopAndGo(roomHref(appointmentId, null, viewer.role, 'left=1'));

  useEffect(() => {
    if (!room.ended) return;
    call.hangUp();
    media.stop();
    const t = window.setTimeout(summary, 4000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.ended]);

  const elapsed = call.connectedAt ? (now - call.connectedAt) / 1000 : 0;
  const endsIn = (new Date(access.endsAt).getTime() - now) / 1000;
  const remoteVideoOn = room.otherMedia.video && !!call.remoteStream?.getVideoTracks().length;

  const status =
    !room.otherOnline
      ? `Waiting for ${other} to join…`
      : call.state === 'connected'
        ? remoteVideoOn
          ? null
          : `${other} turned off their camera`
        : call.state === 'reconnecting'
          ? 'Reconnecting the call…'
          : `Connecting to ${other}…`;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0b1020] text-white">
      <ConnectionBar status={room.status} error={room.error} />

      <div className="relative min-h-0 flex-1">
        {/* Remote participant */}
        <StreamVideo
          stream={call.remoteStream}
          muted={false}
          label={`${other} video`}
          onAutoplayBlocked={onSoundBlocked}
          className={`absolute inset-0 h-full w-full bg-black object-contain sm:object-cover ${remoteVideoOn && call.state === 'connected' ? '' : 'invisible'}`}
        />
        {status && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <span className={`flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-3xl font-bold ${!room.otherOnline ? 'animate-pulse' : ''}`}>
              {initials(other)}
            </span>
            <p className="text-sm text-white/80" role="status">
              {status}
            </p>
            {!room.otherOnline && (
              <p className="max-w-sm text-xs text-white/50">
                {doctorView ? 'The patient can join from their My Appointments page.' : 'Your doctor will join at the scheduled time. Please keep this page open.'}
              </p>
            )}
            <NoShowCard
              waiting={waiting}
              tone="dark"
              appointmentId={appointmentId}
              viewer={viewer}
              appointmentNum={a.appointmentNum}
              onExit={() => stopAndGo(NO_SHOW_EXIT_HREF)}
            />
          </div>
        )}

        {/* Top banner */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 pb-10 pt-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{other}</p>
            <p className="truncate text-xs text-white/70">{subtitle}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold tabular-nums">
              {call.state === 'connected' ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden /> Live · {clock(elapsed)}
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-white/40" aria-hidden /> Not connected
                </>
              )}
            </span>
            <span className="text-[11px] text-white/60 tabular-nums">
              {endsIn > 0 ? `Scheduled end in ${clock(endsIn)}` : 'Past the scheduled end time'}
            </span>
          </div>
        </div>

        {/* Waiting for the patient (doctor) */}
        {(waiting.timerActive || waiting.patientLeft) && (
          <div className="pointer-events-none absolute inset-x-0 top-[4.5rem] z-20 flex justify-center px-4">
            <WaitingBanner waiting={waiting} tone="dark" patientName={other} />
          </div>
        )}

        {/* Joined / left notices */}
        <div className={`pointer-events-none absolute inset-x-0 z-20 ${waiting.timerActive || waiting.patientLeft ? 'top-36' : 'top-20'} flex flex-col items-center gap-2 px-4`} aria-live="polite">
          {room.notices.map((n) => (
            <span key={n.id} className={`rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg ${n.tone === 'leave' ? 'bg-slate-700' : 'bg-emerald-600'}`}>
              {n.text}
            </span>
          ))}
          {mediaNotice && (
            <span className="pointer-events-auto flex max-w-md items-start gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold shadow-lg" role="alert">
              {mediaNotice}
              <button type="button" onClick={() => setMediaNotice(null)} aria-label="Dismiss" className="shrink-0">
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
          {soundBlocked && call.remoteStream && (
            <button
              type="button"
              onClick={() => {
                document.querySelectorAll('video').forEach((v) => v.play().catch(() => undefined));
                setSoundBlocked(false);
              }}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg"
            >
              <Volume2 className="h-4 w-4" /> Tap to turn on sound
            </button>
          )}
          {call.state === 'connected' && !room.otherMedia.audio && (
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs">
              <MicOff className="mr-1 inline h-3.5 w-3.5" /> {other} is muted
            </span>
          )}
        </div>

        {/* Your camera (picture-in-picture) */}
        <div className={`absolute bottom-24 right-3 z-10 aspect-video w-32 overflow-hidden rounded-xl bg-slate-800 shadow-2xl ring-2 ring-white/20 sm:bottom-28 sm:right-6 sm:w-56 ${chatOpen ? 'sm:right-[25rem]' : ''}`}>
          <StreamVideo stream={media.stream} muted mirrored label="Your camera" className={`h-full w-full object-cover ${media.videoOn ? '' : 'invisible'}`} />
          {!media.videoOn && (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-white/60">
              <VideoOff className="mr-1 h-4 w-4" /> Camera off
            </span>
          )}
          <span className="absolute bottom-1 left-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px]">You{media.audioOn ? '' : ' · muted'}</span>
        </div>

        {/* Chat drawer */}
        {chatOpen && (
          <aside className="absolute inset-y-0 right-0 z-30 flex w-full flex-col bg-white text-slate-900 shadow-2xl sm:w-96" aria-label="Chat">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold">Chat with {other}</p>
              <button type="button" onClick={() => setChatOpen(false)} aria-label="Close chat" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ChatPanel room={room} appointmentId={appointmentId} ticket={access.rtcToken} otherName={other} active={chatOpen} disabled={!!room.ended} />
            </div>
          </aside>
        )}

        {/* Call controls */}
        <div className={`absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-black/70 to-transparent pb-5 pt-10 ${chatOpen ? 'sm:right-96' : ''}`}>
          <div className="flex flex-col items-center gap-3">
          <NotifyPatientButton waiting={waiting} tone="dark" />
          <div className="flex items-center gap-3 rounded-full bg-black/40 px-4 py-2.5 backdrop-blur sm:gap-4">
            <ControlButton onClick={media.toggleAudio} active={media.audioOn} disabled={!media.hasAudio} label={media.audioOn ? 'Mute microphone' : 'Unmute microphone'}>
              {media.audioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </ControlButton>
            <ControlButton onClick={media.toggleVideo} active={media.videoOn} disabled={!media.hasVideo} label={media.videoOn ? 'Turn camera off' : 'Turn camera on'}>
              {media.videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </ControlButton>
            <ControlButton onClick={() => setChatOpen((o) => !o)} active={!chatOpen} label={chatOpen ? 'Close chat' : 'Open chat'} badge={chatOpen ? 0 : room.unreadFromOther}>
              <MessageSquareText className="h-5 w-5" />
            </ControlButton>
            <ControlButton onClick={() => setConfirming(true)} active danger label={doctorView ? 'End consultation call' : 'Leave consultation'}>
              <PhoneOff className="h-5 w-5" />
            </ControlButton>
          </div>
          </div>
        </div>

        <p className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-1 text-[10px] text-white/40 sm:inline-flex">
          <ShieldCheck className="h-3 w-3" /> Video goes directly between you and {other}
        </p>
      </div>

      {room.ended && <EndedBanner endedBy={room.ended.endedBy} onView={summary} noShow={room.ended.outcome === 'NO_SHOW'} />}
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
