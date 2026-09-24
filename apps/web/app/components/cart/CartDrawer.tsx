'use client';

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

  // Calculate Subtotal
  const subtotal =
    cart?.items.reduce((total, item) => {
      const price = (item.product as any).price || 0;
      return total + price * item.quantity;
    }, 0) || 0;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-[9999] flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Your Cart
            </h2>

            <p className="text-sm text-gray-500">
              {cart?.totalItems ?? 0} item
              {(cart?.totalItems ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={closeCart}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5">
          {!cart || cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-4xl">
                🛒
              </div>

              <h3 className="text-lg font-semibold text-gray-800">
                Your cart is empty
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Add some products to your cart.
              </p>

              <button
                type="button"
                onClick={closeCart}
                className="mt-5 rounded-md bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.items.map((item) => {
                // 🛠️ Image source check (imageUrl or image)
                const displayImage =
                  item.product.imageUrl ||
                  (item.product as any).image ||
                  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300';

                const productPrice = (item.product as any).price;

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex gap-3 items-center">
                      {/* Product Real Image */}
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-gray-50 border border-gray-100 p-1 overflow-hidden">
                        <img
                          src={displayImage}
                          alt={item.product.name}
                          className="h-full w-full object-contain"
                        />
                      </div>

                      {/* Product information */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                          {item.product.name}
                        </h3>

                        {item.product.manufacturer && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {item.product.manufacturer}
                          </p>
                        )}

                        {item.product.strength && (
                          <p className="text-xs text-gray-500">
                            {item.product.strength}
                          </p>
                        )}

                        {productPrice && (
                          <p className="mt-1 text-xs font-bold text-gray-900">
                            {typeof productPrice === 'number'
                              ? `Rs. ${productPrice * item.quantity}`
                              : productPrice}
                          </p>
                        )}

                        {/* Quantity controls */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded border border-gray-300">
                            <button
                              type="button"
                              onClick={() =>
                                decreaseQuantity(
                                  item.id,
                                  item.quantity,
                                )
                              }
                              className="h-8 w-8 text-lg hover:bg-gray-100 cursor-pointer"
                            >
                              −
                            </button>

                            <span className="flex h-8 min-w-8 items-center justify-center border-x border-gray-300 text-sm font-semibold">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                increaseQuantity(
                                  item.id,
                                  item.quantity,
                                )
                              }
                              className="h-8 w-8 text-lg hover:bg-gray-100 cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeProduct(item.id)
                            }
                            className="text-xs font-medium text-red-500 hover:text-red-600 cursor-pointer"
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
          <div className="border-t bg-white p-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Total Items</span>
              <span className="font-semibold text-gray-900">
                {cart.totalItems}
              </span>
            </div>

            {subtotal > 0 && (
              <div className="flex items-center justify-between text-sm font-bold text-gray-900">
                <span>Subtotal</span>
                <span>Rs. {subtotal}</span>
              </div>
            )}

            {/* Checkout intentionally disabled for now */}
            <button
              type="button"
              disabled
              className="mt-4 w-full cursor-not-allowed rounded-md bg-gray-200 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider"
            >
              Checkout — Coming Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}