'use client';

// Voice note for the consultation intake.
//  - Records in the browser (getUserMedia + MediaRecorder), max 2 minutes by default
//  - If the microphone can't be used, explains why and how to fix it, and offers
//    "Upload Audio File (.mp3 / .m4a / .wav)" instead
//  - In development only, a "Use test tone" button creates a short WAV so the
//    flow can be tested on machines without a microphone
// The note stays in memory; the intake form uploads it on submit.

import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleAlert, Mic, RotateCcw, Square, Trash2, Upload, Waves, X } from 'lucide-react';

export interface VoiceNote {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  /** 'file' when the patient uploaded an audio file instead of recording */
  source?: 'recording' | 'file';
  /** Original name for uploaded files, used as the upload file name */
  fileName?: string;
}

interface Props {
  value: VoiceNote | null;
  onChange: (note: VoiceNote | null) => void;
  /** Lets the parent block submit while recording */
  onRecordingChange?: (recording: boolean) => void;
  maxSeconds?: number;
  disabled?: boolean;
}

type Status = 'idle' | 'requesting' | 'recording';

type MicProblem =
  | 'insecure' // page not on https / localhost, so browsers hide the microphone
  | 'unsupported' // browser has no MediaRecorder
  | 'blocked' // permission denied for this site
  | 'not-found' // no microphone, or the OS is hiding it from the browser
  | 'busy' // another app is using the microphone
  | 'unknown';

/** Formats browsers can record, best first (Safari only supports audio/mp4). */
const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

/** Uploadable audio files: extension -> MIME type the API accepts. */
const UPLOAD_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
};
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // matches the API limit

/** Remembers the microphone the patient picked (per browser). */
const MIC_STORAGE_KEY = 'tabibistan_voice_note_mic';

/**
 * Loudness (RMS, 0..1) below which we treat the input as silent. Normal speech
 * measures roughly 0.05–0.3; a muted or wrong input stays near 0.
 */
const SILENCE_LEVEL = 0.015;

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** File extension for an audio MIME type, used when uploading. */
export function voiceNoteExtension(mimeType: string): string {
  const base = mimeType.split(';')[0];
  if (base === 'audio/mp4' || base === 'audio/x-m4a') return 'm4a';
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/mpeg') return 'mp3';
  if (base === 'audio/wav' || base === 'audio/x-wav' || base === 'audio/wave') return 'wav';
  return 'webm';
}

// ---------------------------------------------------------------------------
// Environment checks
// ---------------------------------------------------------------------------

function detectEnvironmentProblem(): MicProblem | null {
  if (typeof window === 'undefined') return null;
  // Browsers only expose the microphone on https:// or http://localhost
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
    return 'unsupported';
  }
  return null;
}

/** 'granted' | 'denied' | 'prompt', or null where the Permissions API can't tell us (Safari). */
async function queryMicPermission(): Promise<PermissionState | null> {
  try {
    const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
    return status?.state ?? null;
  } catch {
    return null;
  }
}

function problemFromError(err: unknown): MicProblem {
  const name = (err as DOMException)?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'blocked';
    case 'SecurityError':
      return window.isSecureContext ? 'blocked' : 'insecure';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'not-found';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'busy';
    default:
      return 'unknown';
  }
}

const isWindows = () => typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent);

const PROBLEM_TEXT: Record<MicProblem, { title: string; steps: () => string[] }> = {
  insecure: {
    title: 'Voice recording needs a secure connection',
    steps: () => [
      'Browsers only allow the microphone on https:// pages or on http://localhost.',
      'Open the site with https, or upload an audio file instead.',
    ],
  },
  unsupported: {
    title: "This browser can't record audio",
    steps: () => ['Try the latest Chrome, Edge, Firefox or Safari, or upload an audio file instead.'],
  },
  blocked: {
    title: 'Microphone access is blocked for this site',
    steps: () => [
      'Click the lock or settings icon at the left of the address bar.',
      'Set “Microphone” to “Allow”, then click “Try again”.',
      ...(isWindows()
        ? ['If it is already allowed, open Windows Settings → Privacy & security → Microphone and turn on microphone access for apps and desktop apps.']
        : []),
    ],
  },
  'not-found': {
    title: 'No microphone was detected',
    steps: () => [
      'Check that a microphone or headset is connected and not muted.',
      ...(isWindows()
        ? ['Open Windows Settings → Privacy & security → Microphone and turn on “Microphone access” and “Let desktop apps access your microphone”. Windows hides the microphone from browsers when these are off.']
        : ['Check your system privacy settings allow this browser to use the microphone.']),
      'Then click “Try again”, or upload an audio file instead.',
    ],
  },
  busy: {
    title: 'The microphone is being used by another app',
    steps: () => ['Close apps like Zoom, Teams or WhatsApp that may be using it, then click “Try again”.'],
  },
  unknown: {
    title: 'Microphone access is unavailable',
    steps: () => ['Please check browser permissions or upload an audio file directly.'],
  },
};

// ---------------------------------------------------------------------------
// Development helper: a short WAV tone, so the flow can be tested without a mic
// ---------------------------------------------------------------------------

function makeTestToneWav(seconds = 3, frequency = 440, sampleRate = 16000): Blob {
  const samples = seconds * sampleRate;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) =>
    [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));

  write(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  write(36, 'data');
  view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const fade = Math.min(1, i / 800, (samples - i) / 800);
    view.setInt16(44 + i * 2, Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.3 * fade * 32767, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Reads an audio file's length in seconds (0 if the browser can't tell). */
function readDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) ? Math.round(value) : 0);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(0);
    setTimeout(() => done(0), 4000);
    audio.src = url;
  });
}

/**
 * Chrome saves MediaRecorder audio without a length, so the player shows no
 * total time. Seeking far ahead makes the browser work it out, then we rewind.
 */
function fixUnknownDuration(e: React.SyntheticEvent<HTMLAudioElement>) {
  const audio = e.currentTarget;
  if (audio.duration !== Infinity || audio.dataset.durationFixed) return;
  audio.dataset.durationFixed = '1';
  let rewound = false;
  const rewind = () => {
    if (rewound) return;
    rewound = true;
    audio.removeEventListener('durationchange', rewind);
    audio.currentTime = 0;
  };
  // Seeking past the end makes the browser read the real length, then we rewind.
  // The timeout makes sure playback always starts from 0, even if no event fires.
  audio.addEventListener('durationchange', rewind);
  setTimeout(rewind, 1000);
  try {
    audio.currentTime = 1e101;
  } catch {
    rewind();
  }
}

/** Live input loudness from a MediaStream, using the Web Audio API. */
function startLevelMeter(stream: MediaStream, onLevel: (rms: number, peak: number) => void): () => void {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return () => {};

  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser); // not connected to the speakers, so there is no echo
  const data = new Float32Array(analyser.fftSize);

  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
      const a = Math.abs(data[i]);
      if (a > peak) peak = a;
    }
    onLevel(Math.sqrt(sum / data.length), peak);
  }, 50);

  // Some browsers start the context suspended until it is resumed
  ctx.resume().catch(() => {});

  return () => {
    clearInterval(timer);
    source.disconnect();
    ctx.close().catch(() => {});
  };
}

function LevelBars({ level }: { level: number }) {
  // Square-root scale so normal speech (RMS ~0.02–0.15) fills about half to most of the bars
  const lit = Math.min(12, Math.round(Math.sqrt(Math.min(level, 0.25) / 0.25) * 12));
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className={`w-1 rounded-sm transition-colors ${i < lit ? (i > 9 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-gray-200'}`}
          style={{ height: `${30 + i * 6}%` }}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoiceRecorder({
  value,
  onChange,
  onRecordingChange,
  maxSeconds = 120,
  disabled,
}: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [problem, setProblem] = useState<MicProblem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [hearsSound, setHearsSound] = useState(false);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [micId, setMicId] = useState<string>('');
  const [activeMicLabel, setActiveMicLabel] = useState<string | null>(null);
  const [silentWarning, setSilentWarning] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopMeterRef = useRef<(() => void) | null>(null);
  const peakRef = useRef(0);
  const meterRanRef = useRef(false);
  const isDev = process.env.NODE_ENV !== 'production';

  // Environment problems (http, old browser) are known before any click.
  // Checked after mount so server and browser render the same markup.
  useEffect(() => {
    const envProblem = detectEnvironmentProblem();
    if (envProblem) setProblem(envProblem);
  }, []);

  /** Lists microphones (names only appear after the patient has allowed access once). */
  const refreshMics = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices?.enumerateDevices?.();
      const inputs = (all ?? []).filter((d) => d.kind === 'audioinput' && d.deviceId);
      setMics(inputs);
      setMicId((current) => {
        const saved = current || (() => {
          try {
            return localStorage.getItem(MIC_STORAGE_KEY) ?? '';
          } catch {
            return '';
          }
        })();
        return inputs.some((d) => d.deviceId === saved) ? saved : '';
      });
    } catch {
      // enumerateDevices unavailable: the browser default is used
    }
  }, []);

  useEffect(() => {
    refreshMics();
    const md = navigator.mediaDevices;
    md?.addEventListener?.('devicechange', refreshMics);
    return () => md?.removeEventListener?.('devicechange', refreshMics);
  }, [refreshMics]);

  const chooseMic = (id: string) => {
    setMicId(id);
    try {
      if (id) localStorage.setItem(MIC_STORAGE_KEY, id);
      else localStorage.removeItem(MIC_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // If the site is blocked and the patient allows it in the address bar, clear the error
  useEffect(() => {
    let permission: PermissionStatus | null = null;
    const onChange = () => {
      if (permission?.state !== 'denied') setProblem((p) => (p === 'blocked' ? null : p));
    };
    navigator.permissions
      ?.query({ name: 'microphone' as PermissionName })
      .then((s) => {
        permission = s;
        s.addEventListener('change', onChange);
      })
      .catch(() => {});
    return () => permission?.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    onRecordingChange?.(status !== 'idle');
  }, [status, onRecordingChange]);

  // Object URL for the <audio> player
  useEffect(() => {
    if (!value) {
      setPlaybackUrl(null);
      return;
    }
    const url = URL.createObjectURL(value.blob);
    setPlaybackUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const releaseMic = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    stopMeterRef.current?.();
    stopMeterRef.current = null;
    setLevel(0);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Stop the mic if the page is left mid-recording
  useEffect(
    () => () => {
      cancelledRef.current = true;
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      releaseMic();
    },
    [releaseMic],
  );

  const stop = useCallback((cancel = false) => {
    cancelledRef.current = cancel;
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  const start = async () => {
    if (disabled || status !== 'idle') return;
    setNotice(null);

    const envProblem = detectEnvironmentProblem();
    if (envProblem) {
      setProblem(envProblem);
      return;
    }

    // Already blocked: say how to unblock instead of failing silently
    if ((await queryMicPermission()) === 'denied') {
      setProblem('blocked');
      return;
    }

    setProblem(null);
    setSilentWarning(false);
    setStatus('requesting'); // the browser shows its "Allow microphone?" prompt now

    const voiceProcessing = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    let stream: MediaStream;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: micId ? { ...voiceProcessing, deviceId: { exact: micId } } : voiceProcessing,
        });
      } catch (deviceError) {
        // The saved microphone may have been unplugged: fall back to the default one
        if (!micId || problemFromError(deviceError) !== 'not-found') throw deviceError;
        chooseMic('');
        stream = await navigator.mediaDevices.getUserMedia({ audio: voiceProcessing });
      }
    } catch (firstError) {
      // The patient may have just clicked "Block" on the prompt. Browsers name that
      // error differently, so the permission state is the reliable signal.
      const first =
        (await queryMicPermission()) === 'denied' ? 'blocked' : problemFromError(firstError);
      if (first === 'blocked' || first === 'insecure') {
        setStatus('idle');
        setProblem(first);
        return;
      }
      // Some laptops reject the processing options; retry with the plainest request
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (secondError) {
        setStatus('idle');
        setProblem(
          (await queryMicPermission()) === 'denied' ? 'blocked' : problemFromError(secondError),
        );
        return;
      }
    }

    let recorder: MediaRecorder;
    const mimeType = PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setStatus('idle');
      setProblem('unsupported');
      return;
    }

    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];
    cancelledRef.current = false;

    // Show which microphone is really being used, and watch its loudness
    const track = stream.getAudioTracks()[0];
    setActiveMicLabel(track?.label || null);
    refreshMics(); // device names become available once access is allowed
    peakRef.current = 0;
    setHearsSound(false);
    try {
      stopMeterRef.current = startLevelMeter(stream, (rms, peak) => {
        setLevel(rms);
        // Short sharp sounds count too, so brief speech isn't mistaken for silence
        const loudness = Math.max(rms, peak / 4);
        if (loudness > peakRef.current) peakRef.current = loudness;
        if (loudness >= SILENCE_LEVEL) setHearsSound(true);
      });
    } catch {
      stopMeterRef.current = null;
    }
    meterRanRef.current = stopMeterRef.current !== null;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onerror = () => {
      cancelledRef.current = true;
      releaseMic();
      setStatus('idle');
      setProblem('unknown');
    };
    recorder.onstop = () => {
      const duration = Math.min((Date.now() - startedAtRef.current) / 1000, maxSeconds);
      releaseMic();
      setStatus('idle');
      setElapsed(0);
      if (cancelledRef.current) return;

      const type = recorder.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size === 0 || duration < 1) {
        setNotice('The recording was too short. Please try again.');
        return;
      }
      // Only judge silence when the meter actually ran
      setSilentWarning(meterRanRef.current && peakRef.current < SILENCE_LEVEL);
      onChange({ blob, mimeType: type, durationSeconds: Math.round(duration), source: 'recording' });
    };

    startedAtRef.current = Date.now();
    recorder.start(1000);
    setElapsed(0);
    setStatus('recording');

    timerRef.current = setInterval(() => {
      const secs = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(secs);
      if (secs >= maxSeconds) stop(); // auto-save at the limit
    }, 250);
  };

  const onFilePicked = async (file: File | undefined) => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    setNotice(null);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = UPLOAD_TYPES[ext];
    if (!mimeType) {
      setNotice('Please choose an .mp3, .m4a or .wav audio file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setNotice('The audio file must be 10 MB or smaller.');
      return;
    }
    // Some systems report no type (or an odd one) for audio files, so set it from the extension
    const blob = file.type === mimeType ? file : new File([file], file.name, { type: mimeType });
    const durationSeconds = await readDuration(blob);
    onChange({ blob, mimeType, durationSeconds, source: 'file', fileName: file.name });
  };

  const useTestTone = () => {
    const blob = makeTestToneWav(3);
    onChange({ blob, mimeType: 'audio/wav', durationSeconds: 3, source: 'file', fileName: 'test-tone.wav' });
  };

  // ---------------------------------------------------------------------------
  // Recording in progress
  // ---------------------------------------------------------------------------

  const micSelect =
    mics.length > 1 ? (
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <Mic className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="shrink-0">Microphone</span>
        <select
          value={micId}
          onChange={(e) => chooseMic(e.target.value)}
          className="min-w-0 max-w-[260px] truncate rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-800 outline-none focus:border-[#ff6f61]"
        >
          <option value="">System default</option>
          {mics.map((m, i) => (
            <option key={m.deviceId} value={m.deviceId}>
              {m.label || `Microphone ${i + 1}`}
            </option>
          ))}
        </select>
      </label>
    ) : null;

  const silenceTips = [
    'Make sure the microphone is not muted (many laptops have a mute key or light).',
    ...(isWindows()
      ? ['In Windows Settings → System → Sound → Input, choose your microphone, speak and check the volume bar moves, and set Input volume above 50%.']
      : ['In your system sound settings, check the input device and its volume.']),
    ...(mics.length > 1 ? ['Or pick another microphone below and record again.'] : []),
  ];

  if (status !== 'idle') {
    const pct = Math.min((elapsed / maxSeconds) * 100, 100);
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3" role="status" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              {status === 'recording' && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              )}
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            {status === 'requesting' ? (
              <span className="text-sm font-semibold text-red-700">
                Waiting for microphone… <span className="font-normal">choose “Allow” if your browser asks</span>
              </span>
            ) : (
              <>
                <span className="text-sm font-semibold text-red-700">Recording</span>
                <span className="font-mono text-sm text-gray-700">
                  {mmss(elapsed)} <span className="text-gray-400">/ {mmss(maxSeconds)} max</span>
                </span>
                <LevelBars level={level} />
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => stop(false)}
              disabled={status !== 'recording'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              <Square className="h-3.5 w-3.5 fill-current" /> Stop &amp; Save
            </button>
            <button
              type="button"
              onClick={() => stop(true)}
              disabled={status !== 'recording'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
        {status === 'recording' && (
          <>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-red-100">
              <div className="h-full bg-red-500 transition-[width] duration-200" style={{ width: `${pct}%` }} />
            </div>
            {activeMicLabel && (
              <p className="mt-2 truncate text-[11px] text-gray-500">Using: {activeMicLabel}</p>
            )}
            {elapsed > 3 && !hearsSound && meterRanRef.current && (
              <p className="mt-1.5 text-xs font-medium text-amber-700">
                We can&apos;t hear anything yet. Check the microphone isn&apos;t muted, or stop and choose another
                microphone.
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // A note is attached (recorded or uploaded)
  // ---------------------------------------------------------------------------

  if (value && playbackUrl) {
    const isFile = value.source === 'file';
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-gray-700">
            {isFile ? <Upload className="h-3.5 w-3.5 shrink-0 text-[#ff574d]" /> : <Mic className="h-3.5 w-3.5 shrink-0 text-[#ff574d]" />}
            <span className="truncate">
              {isFile ? value.fileName ?? 'Audio file' : 'Voice note'}
              {value.durationSeconds > 0 ? ` · ${mmss(value.durationSeconds)}` : ''}
            </span>
          </p>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setNotice(null);
            }}
            disabled={disabled}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label={isFile ? 'Remove audio file' : 'Delete voice note and record again'}
          >
            <Trash2 className="h-3.5 w-3.5" /> {isFile ? 'Remove' : 'Re-record'}
          </button>
        </div>
        {!isFile && silentWarning && (
          <div role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <CircleAlert className="h-4 w-4 shrink-0" /> This recording seems to be silent
            </p>
            {activeMicLabel && <p className="mt-1 text-amber-800">It was recorded from: {activeMicLabel}</p>}
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-amber-800">
              {silenceTips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {micSelect && <div className="mt-2.5">{micSelect}</div>}
          </div>
        )}
        <audio
          controls
          src={playbackUrl}
          className="h-10 w-full"
          preload="metadata"
          onLoadedMetadata={fixUnknownDuration}
        >
          Your browser cannot play this recording.
        </audio>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Idle: record / upload buttons, plus help when the microphone can't be used
  // ---------------------------------------------------------------------------

  const help = problem ? PROBLEM_TEXT[problem] : null;
  const canRetry = problem !== 'insecure' && problem !== 'unsupported';

  return (
    <div className="space-y-3">
      {micSelect && !problem && micSelect}
      <div className="flex flex-wrap items-center gap-2">
        {(!problem || canRetry) && (
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#ff6f61] bg-white px-4 py-2.5 text-sm font-bold text-[#e8453b] transition hover:bg-[#fff0ed] disabled:opacity-50"
          >
            {problem ? <RotateCcw className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {problem ? 'Try again' : 'Record Voice Note'}
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-700 transition hover:border-gray-400 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" /> Upload Audio File (.mp3 / .m4a / .wav)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav"
          className="hidden"
          onChange={(e) => onFilePicked(e.target.files?.[0])}
        />
        {!problem && (
          <span className="text-[11px] text-gray-400">Record up to {Math.round(maxSeconds / 60)} minutes</span>
        )}
      </div>

      {help && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <p className="flex items-center gap-1.5 font-semibold">
            <CircleAlert className="h-4 w-4 shrink-0" /> {help.title}
          </p>
          <p className="mt-1 text-amber-800">
            Microphone access is unavailable. Please check browser permissions or upload an audio file directly.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
            {help.steps().map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {isDev && (
            <button
              type="button"
              onClick={useTestTone}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-100"
            >
              <Waves className="h-3.5 w-3.5" /> Use test tone (development only)
            </button>
          )}
        </div>
      )}

      {notice && (
        <p className="text-xs text-red-600" role="alert">
          {notice}
        </p>
      )}
    </div>
  );
}
