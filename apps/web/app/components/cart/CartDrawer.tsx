'use client';

import Link from 'next/link';
import { useCart } from './CartContext';

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    closeCart,
    increaseQuantity,
    decreaseQuantity,
    removeProduct,
  } = useCart();

  if (!isCartOpen) {
    return null;
  }

  // Calculate Subtotal (Based on actual discounted price)
  const subtotal =
    cart?.items.reduce((total, item) => {
      const price = Number((item.product as any).price) || 0;
      return total + price * item.quantity;
    }, 0) || 0;

  // Calculate Total Original Price for Savings Preview
  const originalSubtotal =
    cart?.items.reduce((total, item) => {
      const originalPrice =
        Number((item.product as any).originalPrice) ||
        Number((item.product as any).price) ||
        0;
      return total + originalPrice * item.quantity;
    }, 0) || 0;

  const totalSavings = Math.max(0, originalSubtotal - subtotal);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-xs"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-[9999] flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Your Cart</h2>
            <p className="text-xs text-gray-500">
              {cart?.totalItems ?? 0} item
              {(cart?.totalItems ?? 0) !== 1 ? 's' : ''} in cart
            </p>
          </div>

          <button
            type="button"
            onClick={closeCart}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100 cursor-pointer transition"
          >
            ×
          </button>
        </div>

        {/* Items Container */}
        <div className="flex-1 overflow-y-auto p-5">
          {!cart || cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-4xl">
                🛒
              </div>

              <h3 className="text-lg font-bold text-gray-800">
                Your cart is empty
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Add some products to your cart to get started.
              </p>

              <button
                type="button"
                onClick={closeCart}
                className="mt-5 rounded-xl bg-[#ff6f61] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#e05b4f] transition cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.items.map((item) => {
                const productPrice = Number((item.product as any).price) || 0;
                const originalPrice = Number((item.product as any).originalPrice);
                const hasDiscount =
                  originalPrice && originalPrice > productPrice;

                const displayImage =
                  item.product.imageUrl ||
                  (item.product as any).image ||
                  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300';

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-2xs"
                  >
                    <div className="flex gap-3 items-center">
                      {/* Product Image */}
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100 p-1 overflow-hidden">
                        <img
                          src={displayImage}
                          alt={item.product.name}
                          className="h-full w-full object-contain"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 text-xs line-clamp-1">
                          {item.product.name}
                        </h3>

                        {item.product.manufacturer && (
                          <p className="mt-0.5 text-[10px] text-gray-500">
                            {item.product.manufacturer}
                          </p>
                        )}

                        {/* Price Display with Cut/Strikethrough Original Price */}
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-xs font-extrabold text-[#ff6f61]">
                            Rs. {productPrice * item.quantity}
                          </span>

                          {hasDiscount && (
                            <span className="text-[10px] text-gray-400 line-through">
                              Rs. {originalPrice * item.quantity}
                            </span>
                          )}
                        </div>

                        {/* Quantity Controls & Remove */}
                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                decreaseQuantity(item.id, item.quantity)
                              }
                              className="h-7 w-7 text-sm font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                            >
                              −
                            </button>

                            <span className="flex h-7 min-w-7 items-center justify-center border-x border-gray-300 bg-white text-xs font-extrabold text-gray-900 px-2">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                increaseQuantity(item.id, item.quantity)
                              }
                              className="h-7 w-7 text-sm font-bold text-gray-700 hover:bg-gray-200 transition cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeProduct(item.id)}
                            className="text-[11px] font-bold text-red-500 hover:text-red-600 transition cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div className="border-t bg-white p-5 space-y-2">
            {totalSavings > 0 && (
              <div className="flex items-center justify-between text-xs font-bold text-[#16a34a] bg-green-50 p-2 rounded-lg">
                <span>Total Savings:</span>
                <span>- Rs. {totalSavings}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Total Items</span>
              <span className="font-bold text-gray-900">
                {cart.totalItems}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm font-extrabold text-gray-900 pt-1">
              <span>Subtotal</span>
              <span className="text-base text-[#ff6f61]">Rs. {subtotal}</span>
            </div>

            {/* Active Proceed to Checkout Navigation */}
            <Link href="/checkout" onClick={closeCart} className="mt-3 block w-full">
              <button
                type="button"
                className="w-full rounded-xl bg-[#ff6f61] py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-[#e05b4f] cursor-pointer"
              >
                Proceed to Checkout
              </button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}