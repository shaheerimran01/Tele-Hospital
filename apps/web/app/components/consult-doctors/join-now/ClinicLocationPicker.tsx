'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, Crosshair, LoaderCircle, MapPin, Search, X } from 'lucide-react';
import {
  reverseGeocodeApi,
  searchAddressApi,
  suggestPlacesApi,
  type GeocodeResult,
} from '@/app/lib/api/doctors';
import { inputClass, inputErrorClass } from './ui';

const ClinicMap = dynamic(() => import('./ClinicMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[#ece9e2]" />,
});

const SUGGEST_DELAY_MS = 300;
const MIN_QUERY = 3;

/** Text shown in the picker; the defaults are the doctor (clinic / hospital) wording */
export interface LocationPickerWording {
  title: string;
  titleHint: string;
  searchLabel: string;
  searchPlaceholder: string;
  noPin: string;
  addressLabel: string;
  addressHint: string;
  addressPlaceholder: string;
  /** used in messages, e.g. "Search for the clinic / hospital or click the map instead." */
  place: string;
}

export const CLINIC_WORDING: LocationPickerWording = {
  title: 'Clinic / Hospital Location',
  titleHint: '(search, then drag the pin to the exact building)',
  searchLabel: 'Search clinic / hospital or area',
  searchPlaceholder: 'Search clinic / hospital or area, e.g. Blue Area Islamabad',
  noPin: 'No pin yet. Nearby patients can only find clinics / hospitals that have one.',
  addressLabel: 'Clinic / Hospital Address',
  addressHint: 'filled from the map; add floor or suite if needed',
  addressPlaceholder: 'e.g. Office 4, 2nd floor, Jinnah Avenue, Blue Area, Islamabad',
  place: 'clinic / hospital',
};

interface Props {
  idPrefix: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  error?: string;
  onChange: (patch: { address?: string; latitude?: number | null; longitude?: number | null }) => void;
  wording?: Partial<LocationPickerWording>;
  /** Error under the map, e.g. "Drop a pin on the map" */
  pinError?: string;
}

export default function ClinicLocationPicker({
  idPrefix,
  address,
  latitude,
  longitude,
  error,
  onChange,
  wording,
  pinError,
}: Props) {
  const w = { ...CLINIC_WORDING, ...wording };
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const reverseRequest = useRef(0);
  const hasPin = latitude != null && longitude != null;

  // Debounced autocomplete while typing
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const near = hasPin ? { latitude: latitude!, longitude: longitude! } : undefined;
        const found = await suggestPlacesApi(q, controller.signal, near);
        setSuggestions(found);
        setActive(-1);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, SUGGEST_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // Only re-run when the text changes, not when the pin moves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Close the suggestion list when clicking elsewhere
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /** Fills the address from coordinates; ignores answers to older requests. */
  const fillAddressFrom = async (lat: number, lng: number) => {
    const requestId = ++reverseRequest.current;
    setResolvingAddress(true);
    try {
      const resolved = await reverseGeocodeApi(lat, lng);
      if (requestId !== reverseRequest.current) return;
      if (resolved) onChange({ address: resolved });
      else setMessage('Pin set, but no street address was found here. Please type the address below.');
    } catch {
      if (requestId === reverseRequest.current) {
        setMessage('Pin set. Could not look up the address, so please type it below.');
      }
    } finally {
      if (requestId === reverseRequest.current) setResolvingAddress(false);
    }
  };

  const pickSuggestion = (r: GeocodeResult) => {
    reverseRequest.current++; // cancel any pending reverse lookup
    setResolvingAddress(false);
    onChange({ address: r.displayName, latitude: r.latitude, longitude: r.longitude });
    setQuery(r.title ?? r.displayName);
    setSuggestions([]);
    setOpen(false);
    setMessage(null);
  };

  /** Enter without choosing a suggestion: one-off lookup, take the best match. */
  const searchNow = async () => {
    const q = query.trim();
    if (q.length < MIN_QUERY) return;
    setSearching(true);
    setMessage(null);
    try {
      const found = suggestions.length > 0 ? suggestions : await searchAddressApi(q);
      if (found[0]) pickSuggestion(found[0]);
      else setMessage('No place found. Try a nearby landmark, or click the map to drop the pin.');
    } catch {
      setMessage('Search is unavailable right now. Click the map to drop the pin instead.');
    } finally {
      setSearching(false);
    }
  };

  const onPinMoved = (lat: number, lng: number) => {
    setMessage(null);
    onChange({ latitude: lat, longitude: lng });
    fillAddressFrom(lat, lng);
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setMessage('Your browser does not support location access.');
      return;
    }
    setLocating(true);
    setMessage(null);
    setOpen(false);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        onPinMoved(coords.latitude, coords.longitude);
      },
      (err) => {
        setLocating(false);
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? `Location permission was denied. Search for the ${w.place} or click the map instead.`
            : `Could not get your location. Search for the ${w.place} or click the map instead.`,
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && active >= 0 && suggestions[active]) pickSuggestion(suggestions[active]);
      else searchNow();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#e2ddd2] bg-white p-4" id={`field-${idPrefix}.address`}>
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[#141b34]">
        <MapPin className="h-4 w-4" /> {w.title}
        <span className="font-normal text-[#8a8d99]">{w.titleHint}</span>
      </p>

      {/* Map with the search bar floating on top */}
      <div className={`relative z-0 h-80 overflow-hidden rounded-lg border ${pinError ? 'border-red-400' : 'border-[#e2ddd2]'}`}>
        <ClinicMap latitude={latitude} longitude={longitude} onPick={onPinMoved} />

        <div ref={searchBoxRef} className="absolute left-3 right-3 top-3 z-[1000]">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8d99]" />
              <input
                type="search"
                role="combobox"
                aria-expanded={open}
                aria-autocomplete="list"
                aria-label={w.searchLabel}
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => suggestions.length > 0 && setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder={w.searchPlaceholder}
                className="w-full rounded-lg border border-[#d9d3c6] bg-white py-2.5 pl-9 pr-9 text-sm text-[#141b34] shadow-md outline-none placeholder:text-gray-400 focus:border-[#141b34]"
              />
              {searching ? (
                <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#8a8d99]" />
              ) : query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery('');
                    setSuggestions([]);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#8a8d99] hover:text-[#141b34]"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              title="Use my current location"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#141b34] px-3 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-[#232c4f] disabled:opacity-60"
            >
              {locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              <span className="hidden sm:inline">Use my current location</span>
            </button>
          </div>

          {open && query.trim().length >= MIN_QUERY && !searching && (
            <ul
              role="listbox"
              className="mt-1 max-h-60 overflow-auto rounded-lg border border-[#e2ddd2] bg-white py-1 shadow-lg"
            >
              {suggestions.length === 0 ? (
                <li className="px-3 py-2 text-xs text-[#8a8d99]">
                  No matches. Try another spelling, or click the map to drop the pin.
                </li>
              ) : (
                suggestions.map((r, i) => (
                  <li key={`${r.latitude},${r.longitude},${i}`} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pickSuggestion(r)}
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left ${
                        i === active ? 'bg-[#f3f1ec]' : ''
                      }`}
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8a8d99]" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-[#141b34]">{r.title}</span>
                        <span className="block truncate text-[11px] text-[#8a8d99]">{r.displayName}</span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {!hasPin && (
          <p className="pointer-events-none absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-3 py-1 text-[11px] text-[#3a3f52] shadow">
            Search above, or click the map to drop a pin
          </p>
        )}
      </div>

      {/* Coordinates / status */}
      <div className="mt-2 min-h-[18px] text-xs">
        {hasPin ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[#2f7a4b]">
            <Check className="h-3.5 w-3.5" /> Pin set
            <span className="text-[#8a8d99]">
              {latitude!.toFixed(5)}, {longitude!.toFixed(5)} · drag the pin to fine-tune
            </span>
            <button
              type="button"
              onClick={() => {
                reverseRequest.current++;
                setResolvingAddress(false);
                onChange({ latitude: null, longitude: null });
              }}
              className="text-[#8a8d99] underline hover:text-red-600"
            >
              Remove pin
            </button>
          </p>
        ) : (
          <p className={pinError ? 'text-red-600' : 'text-[#8a8d99]'} role={pinError ? 'alert' : undefined}>
            {pinError ?? w.noPin}
          </p>
        )}
        {message && <p className="mt-1 text-[#8a6d1f]">{message}</p>}
      </div>

      {/* Address (auto-filled, editable) */}
      <div className="mt-3">
        <label htmlFor={`${idPrefix}-address`} className="mb-1.5 flex items-center gap-2 text-xs font-medium text-[#3a3f52]">
          <span>
            {w.addressLabel}<span className="ml-0.5 text-red-500">*</span>
          </span>
          <span className="font-normal text-[#8a8d99]">{w.addressHint}</span>
          {resolvingAddress && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#8a8d99]" />}
        </label>
        <textarea
          id={`${idPrefix}-address`}
          rows={2}
          value={address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder={w.addressPlaceholder}
          className={`${inputClass} resize-y ${error ? inputErrorClass : ''}`}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
