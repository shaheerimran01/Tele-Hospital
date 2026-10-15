'use client';

// WhatsApp-style voice message: play/pause, seek bar, elapsed / total time.
// The total comes from the saved duration, because browser recordings
// (Chrome's webm) often don't store their own length.

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Mic, Pause, Play } from 'lucide-react';
import { fileUrl } from '@/app/lib/api/consultations';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Only one voice message plays at a time */
let current: HTMLAudioElement | null = null;

export default function AudioPlayerBubble({
  url,
  duration,
  mine,
}: {
  url: string;
  /** seconds, from the message */
  duration?: number | null;
  mine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [total, setTotal] = useState(duration && duration > 0 ? duration : 0);
  const [failed, setFailed] = useState(false);

  useEffect(() => () => {
    if (current === audioRef.current) current = null;
  }, []);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (!a.paused) {
      a.pause();
      return;
    }
    if (current && current !== a) current.pause();
    current = a;
    setLoading(a.readyState < 2);
    try {
      if (total && a.currentTime >= total - 0.05) a.currentTime = 0;
      await a.play();
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const seek = (value: number) => {
    const a = audioRef.current;
    if (!a || !total) return;
    a.currentTime = Math.min(value, total);
    setPosition(a.currentTime);
  };

  const progress = total ? Math.min(100, (position / total) * 100) : 0;
  const track = mine ? 'bg-white/25' : 'bg-slate-200';
  const fill = mine ? 'bg-white' : 'bg-[#141b34]';

  return (
    <div className="flex w-[230px] max-w-full items-center gap-3 py-0.5 sm:w-[260px]">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
          mine ? 'bg-white text-[#141b34] hover:bg-white/90' : 'bg-[#141b34] text-white hover:bg-[#232c4f]'
        }`}
      >
        {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="relative h-5">
          <div className={`absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full ${track}`} />
          <div className={`absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full ${fill}`} style={{ width: `${progress}%` }} />
          <div
            className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${fill}`}
            style={{ left: `${progress}%` }}
            aria-hidden
          />
          <input
            type="range"
            min={0}
            max={total || 1}
            step={0.1}
            value={position}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={!total}
            aria-label="Seek voice message"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
          />
        </div>
        <div className={`mt-0.5 flex items-center justify-between text-[11px] tabular-nums ${mine ? 'text-white/75' : 'text-slate-500'}`}>
          <span className="inline-flex items-center gap-1">
            <Mic className="h-3 w-3" /> {playing || position > 0 ? clock(position) : 'Voice message'}
          </span>
          <span>{total ? clock(total) : '–:––'}</span>
        </div>
        {failed && <p className={`mt-0.5 text-[11px] ${mine ? 'text-white' : 'text-rose-600'}`}>Could not play this voice message.</p>}
      </div>
      <audio
        ref={audioRef}
        src={fileUrl(url)}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPosition(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (!total && Number.isFinite(d) && d > 0) setTotal(d);
        }}
        onError={() => setFailed(true)}
        className="hidden"
      />
    </div>
  );
}
