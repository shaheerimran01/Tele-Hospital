'use client';

// General advice with "Dictate Advice": the browser's own speech recognition
// (Web Speech API) types what the doctor says into the advice box in real time.
// The doctor can edit the text afterwards; it is saved as normal text.

import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleAlert, Mic, Square } from 'lucide-react';

// --- Minimal Web Speech API types (not part of TypeScript's DOM library) ----
interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternative;
}
interface SpeechResultEvent {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechResult };
}
interface SpeechErrorEvent {
  readonly error: string;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionClass(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const DICTATION_LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-IN', label: 'English (South Asia)' },
] as const;

/** Spoken punctuation, e.g. "rest for two days full stop" -> "rest for two days." */
const SPOKEN_PUNCTUATION: [RegExp, string][] = [
  [/\s*\b(full stop|period)\b/gi, '.'],
  [/\s*\bcomma\b/gi, ','],
  [/\s*\bquestion mark\b/gi, '?'],
  [/\s*\bcolon\b/gi, ':'],
  [/\s*\b(new line|next line)\b\s*/gi, '\n'],
];

function tidy(text: string) {
  let t = text;
  for (const [re, mark] of SPOKEN_PUNCTUATION) t = t.replace(re, mark);
  // Capital letter at the start and after a full stop, question mark or new line
  return t
    .replace(/[ \t]+/g, ' ')
    .replace(/^\s+/, '')
    .replace(/(^|[.?]\s+|\n)([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
}

function errorMessage(code: string): string | null {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.';
    case 'audio-capture':
      return 'No microphone was found. Connect a microphone and try again.';
    case 'network':
      return 'Dictation needs an internet connection, because the browser converts speech to text online.';
    case 'language-not-supported':
      return 'This language is not available for dictation in your browser. Choose another English option.';
    case 'no-speech':
    case 'aborted':
      return null;
    default:
      return 'Dictation stopped unexpectedly. Please try again.';
  }
}

export default function AdviceDictation({
  value,
  onChange,
  max,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  max: number;
  disabled?: boolean;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<string>('en-US');

  const recRef = useRef<Recognition | null>(null);
  /** the doctor pressed Stop (otherwise the browser's own pauses restart listening) */
  const stopRequested = useRef(false);
  /** advice text before this dictation, and what has been dictated so far */
  const baseRef = useRef('');
  const finalRef = useRef('');
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => setSupported(!!recognitionClass()), []);

  const compose = useCallback(
    (interim: string) => {
      const spoken = tidy(`${finalRef.current} ${interim}`.trim());
      const base = baseRef.current;
      const joiner = base && spoken ? (/\s$/.test(base) ? '' : /[.?!:;,]$/.test(base) ? ' ' : '. ') : '';
      onChange(`${base}${joiner}${spoken}`.slice(0, max));
    },
    [onChange, max],
  );

  const stop = useCallback(() => {
    stopRequested.current = true;
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Rec = recognitionClass();
    if (!Rec || disabled) return;
    setError(null);
    stopRequested.current = false;
    baseRef.current = valueRef.current.replace(/\s+$/, '');
    finalRef.current = '';

    const rec = new Rec();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0]?.transcript ?? '';
        if (r.isFinal) finalRef.current = `${finalRef.current} ${text}`.trim();
        else interim += text;
      }
      compose(interim);
    };
    rec.onerror = (e) => {
      const msg = errorMessage(e.error);
      if (msg) {
        stopRequested.current = true;
        setError(msg);
      }
    };
    rec.onend = () => {
      // The browser ends a session after a pause: keep listening until the doctor presses Stop
      if (!stopRequested.current && valueRef.current.length < max) {
        try {
          rec.start();
          return;
        } catch {
          // fall through: could not restart
        }
      }
      compose('');
      recRef.current = null;
      setListening(false);
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setError('Could not start dictation. Please try again.');
      recRef.current = null;
    }
  }, [compose, disabled, lang, max]);

  // Stop the microphone when leaving the page
  useEffect(
    () => () => {
      stopRequested.current = true;
      recRef.current?.abort();
    },
    [],
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {listening ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-lg bg-[#c0392b] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a93226]"
            aria-label="Stop dictation"
          >
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            Listening… <Square className="h-3.5 w-3.5 fill-current" /> Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={disabled || supported === false || value.length >= max}
            className="inline-flex items-center gap-2 rounded-lg border border-[#141b34] bg-white px-3.5 py-2 text-sm font-semibold text-[#141b34] transition hover:bg-[#141b34] hover:text-white disabled:cursor-not-allowed disabled:border-[#d9d3c6] disabled:text-[#a9a59a] disabled:hover:bg-white"
            title={supported === false ? 'Dictation is not supported in this browser' : 'Speak your advice; it is typed into the box below'}
          >
            <Mic className="h-4 w-4" /> Dictate Advice
          </button>
        )}
        <label className="sr-only" htmlFor="rx-dictation-lang">
          Dictation language
        </label>
        <select
          id="rx-dictation-lang"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          disabled={listening}
          className="rounded-lg border border-[#e2ddd2] bg-white px-2.5 py-2 text-xs text-[#3a3f52] outline-none focus:border-[#141b34] disabled:opacity-60"
        >
          {DICTATION_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-[#8a8d99]" aria-live="polite">
          {listening
            ? 'Speak clearly. Say "full stop", "comma" or "new line" for punctuation.'
            : supported === false
              ? 'Dictation works in Chrome, Edge and Safari. You can still type the advice.'
              : 'Click to speak instead of typing. You can edit the text afterwards.'}
        </span>
      </div>

      <label htmlFor="rx-advice" className="sr-only">
        General advice
      </label>
      <textarea
        id="rx-advice"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        readOnly={listening}
        rows={5}
        placeholder="e.g. Drink plenty of fluids, rest for 2 days. Follow up after one week if symptoms continue."
        className={`w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm text-[#141b34] outline-none transition placeholder:text-[#a9a59a] focus:ring-2 ${
          listening ? 'border-[#c0392b] ring-2 ring-[#c0392b]/15' : 'border-[#e2ddd2] focus:border-[#141b34] focus:ring-[#141b34]/10'
        }`}
        aria-describedby="rx-advice-count"
      />
      <div className="mt-1 flex items-start justify-between gap-3">
        {error ? (
          <p className="flex items-start gap-1.5 text-xs text-[#8f2d2d]" role="alert">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        ) : (
          <span />
        )}
        <span id="rx-advice-count" className="shrink-0 text-[11px] tabular-nums text-[#8a8d99]">
          {value.length}/{max}
        </span>
      </div>
    </div>
  );
}
