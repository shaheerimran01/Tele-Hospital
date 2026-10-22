'use client';

// Floating "Lab Cart" button and the drawer listing the chosen tests and packages
// (all at one partner lab). Also hosts the "Select Diagnostic Partner" picker.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, FlaskConical, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatPkr } from '@/app/lib/api/lab-tests';
import { useLabCart } from './lab-cart';
import { SelectLabHost, checkoutHref } from './SelectLabModal';

export default function LabCart() {
  const cart = useLabCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('lab-cart:open', show);
    return () => window.removeEventListener('lab-cart:open', show);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {cart.count > 0 && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-[#141b34] px-4 py-3 text-sm font-semibold text-white shadow-xl hover:bg-[#232c4f] sm:right-6"
        >
          <ShoppingBag className="h-4 w-4" />
          Lab Cart · {cart.count} {cart.count === 1 ? 'item' : 'items'} · {formatPkr(cart.total)}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[85] flex justify-end bg-black/40" onClick={() => setOpen(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Lab cart"
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-bold text-gray-900">Lab Cart</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {cart.count === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                <FlaskConical className="h-8 w-8 text-gray-300" />
                <p className="text-sm font-semibold text-gray-900">Your lab cart is empty</p>
                <p className="text-xs text-gray-500">Add a health package or a test to see it here.</p>
              </div>
            ) : (
              <>
                {cart.items[0] && (
                  <p className="flex items-center gap-2 border-b border-gray-100 bg-[#fff6f5] px-5 py-2.5 text-xs text-gray-700">
                    <Building2 className="h-4 w-4 shrink-0 text-[#d9443b]" />
                    <span>
                      At <span className="font-semibold text-gray-900">{cart.items[0].labName}</span> · {cart.items[0].branchName}
                    </span>
                  </p>
                )}
                <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto px-5">
                  {cart.items.map((x) => (
                    <li key={x.id} className="flex items-start gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug text-gray-900">{x.title}</p>
                        <p className="text-xs text-gray-500">
                          {x.itemType === 'PACKAGE' ? `Health package · ${x.totalTestsCount} tests` : 'Individual test'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums text-gray-900">{formatPkr(x.price)}</p>
                        {x.mrp > x.price && <p className="text-xs tabular-nums text-gray-400 line-through">{formatPkr(x.mrp)}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => cart.remove(x.id)}
                        aria-label={`Remove ${x.title}`}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="space-y-3 border-t border-gray-100 px-5 py-4">
                  {cart.savings > 0 && (
                    <p className="flex justify-between text-sm text-emerald-700">
                      <span>You save</span>
                      <span className="font-semibold tabular-nums">{formatPkr(cart.savings)}</span>
                    </p>
                  )}
                  <p className="flex justify-between text-base font-bold text-gray-900">
                    <span>Total</span>
                    <span className="tabular-nums">{formatPkr(cart.total)}</span>
                  </p>
                  {cart.items[0] && (
                    <Link
                      href={checkoutHref(cart.items[0].id, cart.items[0].laboratoryId, cart.items[0].branchId)}
                      onClick={() => setOpen(false)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff574d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#e8453b]"
                    >
                      Proceed to Checkout <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                  <button type="button" onClick={cart.clear} className="w-full text-center text-xs font-semibold text-gray-500 hover:text-rose-600">
                    Clear cart
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
      <SelectLabHost />
    </>
  );
}
