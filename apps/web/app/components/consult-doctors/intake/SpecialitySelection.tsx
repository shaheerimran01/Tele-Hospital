'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle, Search, X } from 'lucide-react';
import { getSpecialitiesApi, type Speciality } from '@/app/lib/api/consultation';
import SectionCard from './SectionCard';
import SpecialityIcon from './SpecialityIcon';

interface Props {
  selected: Speciality | null;
  onSelect: (speciality: Speciality) => void;
  showError: boolean;
}

export default function SpecialitySelection({ selected, onSelect, showError }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  // Categories come from the unfiltered list so the badges don't disappear while searching
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced fetch on search / category change
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSpecialitiesApi({
          search,
          category,
          signal: controller.signal,
        });
        setSpecialities(data);
        if (!search.trim() && category === 'All') {
          const cats = Array.from(
            new Set(data.map((s) => s.category).filter((c): c is string => !!c)),
          ).sort();
          setCategories(cats);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Could not load specialities.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search ? 250 : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, category]);

  const badges = useMemo(() => ['All', ...categories], [categories]);

  return (
    <SectionCard
      step={2}
      title="Choose a speciality"
      subtitle="Not sure? A General Physician can help with most problems."
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search e.g. skin, child, heart"
          aria-label="Search specialities"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-[#ff6f61] focus:bg-white focus:ring-2 focus:ring-[#ff6f61]/15"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {badges.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {badges.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={active}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        {loading && specialities.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-xs text-gray-500">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading specialities…
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        ) : specialities.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No speciality matches &ldquo;{search}&rdquo;. Try General Physician.
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-label="Speciality"
            className={`grid grid-cols-2 sm:grid-cols-3 gap-2.5 transition-opacity ${
              loading ? 'opacity-60' : ''
            }`}
          >
            {specialities.map((s) => {
              const active = selected?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSelect(s)}
                  className={`relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-[#ff6f61] bg-[#fff0ed] ring-1 ring-[#ff6f61]'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {active && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff6f61] text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      active ? 'bg-white text-[#ff574d]' : 'bg-[#fff0ed] text-[#ff574d]'
                    }`}
                  >
                    <SpecialityIcon iconKey={s.iconUrl} slug={s.slug} />
                  </span>
                  <span className="text-sm font-semibold text-gray-900 leading-tight pr-4">
                    {s.name}
                  </span>
                  {s.description && (
                    <span className="text-[11px] leading-snug text-gray-500 line-clamp-2">
                      {s.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showError && !selected && (
        <p className="mt-3 text-xs font-medium text-red-600">Select a speciality to continue.</p>
      )}
    </SectionCard>
  );
}
