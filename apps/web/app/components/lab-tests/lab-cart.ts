'use client';

// Lab cart: the tests and packages the patient has picked, each with the partner
// lab (and branch) chosen for it and that lab's price. Kept in this browser.
// One lab per cart: tests are booked together at the same lab.

import { useCallback, useSyncExternalStore } from 'react';
import type { LabItem, LabPartner } from '@/app/lib/api/lab-tests';

const STORAGE_KEY = 'tabibistan_lab_cart_v2';

export interface LabCartItem {
  id: string;
  slug: string;
  title: string;
  itemType: LabItem['itemType'];
  totalTestsCount: number;
  /** the chosen lab's price */
  price: number;
  mrp: number;
  laboratoryId: string;
  labName: string;
  branchId: string;
  branchName: string;
  hasHomeSample: boolean;
  homeSampleFee: number | null;
}

let items: LabCartItem[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: LabCartItem[] = [];

function read(): LabCartItem[] {
  if (items) return items;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    items = Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.id === 'string' && typeof x.laboratoryId === 'string') : [];
  } catch {
    items = [];
  }
  return items!;
}

function write(next: LabCartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.removeItem('tabibistan_lab_cart'); // old cart without a chosen lab
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

export type CartableItem = Pick<LabItem, 'id' | 'slug' | 'title' | 'itemType' | 'totalTestsCount'>;

export function toCartItem(item: CartableItem, partner: LabPartner, branchId = partner.nearestBranch.id): LabCartItem {
  const branch = partner.branches.find((b) => b.id === branchId) ?? partner.branches[0];
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    itemType: item.itemType,
    totalTestsCount: item.totalTestsCount,
    price: partner.offeredPrice,
    mrp: partner.originalPrice,
    laboratoryId: partner.laboratoryId,
    labName: partner.labName,
    branchId: branch?.id ?? partner.nearestBranch.id,
    branchName: branch?.name ?? partner.nearestBranch.name,
    hasHomeSample: partner.hasHomeSample,
    homeSampleFee: partner.homeSampleFee,
  };
}

export function useLabCart() {
  const list = useSyncExternalStore(subscribe, read, () => EMPTY);

  /** Adds (or re-prices) an item at the chosen lab. Items from another lab are replaced: one lab per booking. */
  const addWithLab = useCallback((item: CartableItem, partner: LabPartner, branchId?: string) => {
    const next = toCartItem(item, partner, branchId);
    const sameLab = read().filter((x) => x.laboratoryId === next.laboratoryId && x.id !== next.id);
    write([...sameLab.map((x) => ({ ...x, branchId: next.branchId, branchName: next.branchName })), next]);
  }, []);
  /** Update items in place (fresh prices, branch change) */
  const update = useCallback((fn: (x: LabCartItem) => LabCartItem) => write(read().map(fn)), []);
  const remove = useCallback((id: string) => write(read().filter((x) => x.id !== id)), []);
  const clear = useCallback(() => write([]), []);
  const has = useCallback((id: string) => list.some((x) => x.id === id), [list]);

  return {
    items: list,
    count: list.length,
    /** the lab of the items in the cart (one lab per cart) */
    lab: list[0] ? { id: list[0].laboratoryId, name: list[0].labName } : null,
    total: list.reduce((n, x) => n + x.price, 0),
    savings: list.reduce((n, x) => n + Math.max(0, x.mrp - x.price), 0),
    addWithLab,
    update,
    remove,
    clear,
    has,
  };
}
