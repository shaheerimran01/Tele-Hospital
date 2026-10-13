'use client';

// Creatable comboboxes without extra dependencies:
//  - CreatableCombobox: one value, pick from presets or type your own
//  - TagCombobox:       many values shown as chips, presets or custom

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { inputClass, inputErrorClass } from './ui';

const listClass =
  'absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-[#e2ddd2] bg-white py-1 shadow-lg';

function optionClass(active: boolean) {
  return `flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
    active ? 'bg-[#f3f1ec] text-[#141b34]' : 'text-[#3a3f52]'
  }`;
}

/** Closes a popup when the user clicks anywhere outside `ref`. */
function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}

// ---------------------------------------------------------------------------
// Single value
// ---------------------------------------------------------------------------

interface CreatableComboboxProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  invalid?: boolean;
}

export function CreatableCombobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
}: CreatableComboboxProps) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // When the doctor just opened the list, show everything instead of filtering
  const [filtering, setFiltering] = useState(false);

  useClickOutside(wrapRef, () => setOpen(false));

  const query = value.trim().toLowerCase();
  const filtered = useMemo(
    () => (filtering && query ? options.filter((o) => o.toLowerCase().includes(query)) : options),
    [filtering, query, options],
  );
  const isCustom = query !== '' && !options.some((o) => o.toLowerCase() === query);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    setFiltering(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && filtered[active]) {
        e.preventDefault();
        choose(filtered[active]);
      } else if (open) {
        e.preventDefault();
        setOpen(false); // keep the typed custom value
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setFiltering(true);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        className={`${inputClass} pr-9 ${invalid ? inputErrorClass : ''}`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Show options"
        onClick={() => {
          setFiltering(false);
          setOpen((o) => !o);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#8a8d99] hover:text-[#141b34]"
      >
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (filtered.length > 0 || isCustom) && (
        <ul id={listId} role="listbox" className={listClass}>
          {filtered.map((o, i) => {
            const selected = o.toLowerCase() === query;
            return (
              <li key={o} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={optionClass(i === active)}
                >
                  <span className="flex-1">{o}</span>
                  {selected && <Check className="h-4 w-4 text-[#141b34]" />}
                </button>
              </li>
            );
          })}
          {isCustom && (
            <li className="border-t border-[#efece5] px-3 py-2 text-xs text-[#8a8d99]">
              Using your own title: <span className="font-medium text-[#141b34]">“{value.trim()}”</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multiple values (chips)
// ---------------------------------------------------------------------------

interface TagComboboxProps {
  id: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  invalid?: boolean;
}

export function TagCombobox({ id, values, onChange, options, placeholder, invalid }: TagComboboxProps) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useClickOutside(wrapRef, () => setOpen(false));

  const has = (v: string) => values.some((x) => x.toLowerCase() === v.toLowerCase());
  const q = query.trim();
  const available = options.filter(
    (o) => !has(o) && (!q || o.toLowerCase().includes(q.toLowerCase())),
  );
  const canCreate = q !== '' && !has(q) && !options.some((o) => o.toLowerCase() === q.toLowerCase());
  // Rows: preset options, then "Add <typed>" when it is new
  const rows = [...available, ...(canCreate ? [q] : [])];

  const add = (v: string) => {
    const clean = v.trim().replace(/\s+/g, ' ').replace(/,$/, '');
    if (clean && !has(clean)) onChange([...values, clean]);
    setQuery('');
    setActive(-1);
    inputRef.current?.focus();
  };

  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === ',') {
      if (active >= 0 && rows[active]) {
        e.preventDefault();
        add(rows[active]);
      } else if (q) {
        e.preventDefault();
        add(q);
      } else if (e.key === 'Enter') {
        e.preventDefault();
      }
    } else if (e.key === 'Backspace' && !query && values.length > 0) {
      remove(values[values.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className={`flex min-h-[42px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 transition focus-within:border-[#141b34] focus-within:ring-2 focus-within:ring-[#141b34]/10 ${
          invalid ? 'border-red-400' : 'border-[#d9d3c6]'
        }`}
      >
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-md bg-[#141b34] py-1 pl-2.5 pr-1 text-xs font-medium text-white"
          >
            {v}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(v);
              }}
              aria-label={`Remove ${v}`}
              className="rounded p-0.5 hover:bg-white/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder={values.length === 0 ? placeholder : 'Add another…'}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            // A degree typed but not confirmed with Enter is kept when leaving the field
            if (q) add(q);
          }}
          className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-[#141b34] outline-none placeholder:text-gray-400"
        />
      </div>

      {open && rows.length > 0 && (
        <ul id={listId} role="listbox" aria-multiselectable="true" className={listClass}>
          {rows.map((o, i) => {
            const isNew = canCreate && i === rows.length - 1;
            return (
              <li key={`${o}-${i}`} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => add(o)}
                  className={optionClass(i === active)}
                >
                  {isNew ? (
                    <>
                      <Plus className="h-3.5 w-3.5 text-[#8a8d99]" /> Add “{o}”
                    </>
                  ) : (
                    o
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
