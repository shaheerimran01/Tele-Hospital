'use client';

// Lab cart: the tests and packages the patient has picked, kept in this browser.
// (The pharmacy cart holds products only, so lab items have their own list.)

import { useCallback, useSyncExternalStore } from 'react';
import type { LabItem } from '@/app/lib/api/lab-tests';

const STORAGE_KEY = 'tabibistan_lab_cart';

export interface LabCartItem {
  id: string;
  slug: string;
  title: string;
  itemType: LabItem['itemType'];
  price: number;
  mrp: number;
  totalTestsCount: number;
}

let items: LabCartItem[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: LabCartItem[] = [];

function read(): LabCartItem[] {
  if (items) return items;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    items = Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.id === 'string') : [];
  } catch {
    items = [];
  }
  return items!;
}

function write(next: LabCartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode or storage full: the cart still works until the page is closed
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      items = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useLabCart() {
  const list = useSyncExternalStore(subscribe, read, () => EMPTY);

  const add = useCallback((item: LabItem) => {
    const current = read();
    if (current.some((x) => x.id === item.id)) return;
    write([
      ...current,
      {
        id: item.id,
        slug: item.slug,
        title: item.title,
        itemType: item.itemType,
        price: item.price,
        mrp: item.mrp,
        totalTestsCount: item.totalTestsCount,
      },
    ]);
  }, []);
  const remove = useCallback((id: string) => write(read().filter((x) => x.id !== id)), []);
  const clear = useCallback(() => write([]), []);
  const has = useCallback((id: string) => list.some((x) => x.id === id), [list]);

  return {
    items: list,
    count: list.length,
    total: list.reduce((n, x) => n + x.price, 0),
    savings: list.reduce((n, x) => n + Math.max(0, x.mrp - x.price), 0),
    add,
    remove,
    clear,
    has,
  };
}
