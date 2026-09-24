'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/app/components/cart/CartContext';

export default function CheckoutPage() {
  const { cart, loading } = useCart();

  // Safely extract cart items
  const cartItems = cart?.items || [];

  // Calculate Total Price safely
  const totalPrice = cartItems.reduce((sum: number, item: any) => {
    const price = Number(item.product?.price) || 0;
    return sum + price * item.quantity;
  }, 0);

  // Calculate Original Total for Savings Calculation
  const originalTotal = cartItems.reduce((acc: number, item: any) => {
    const itemOriginal =
      Number(item.product?.originalPrice) || Number(item.product?.price) || 0;
    return acc + itemOriginal * item.quantity;
  }, 0);

  const totalSavings = Math.max(0, originalTotal - totalPrice);

  // Form States
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Islamabad',
    postalCode: '',
    orderNotes: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'wallet'>('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delivery Charges Calculation
  const deliveryCharges = totalPrice > 2000 ? 0 : 150;
  const finalPayable = totalPrice + deliveryCharges;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Backend order API integration baad me hogi
    setTimeout(() => {
      alert('Order Placed Successfully! (Frontend Prototype)');
      setIsSubmitting(false);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
        <Header />
        <main className="flex-grow flex items-center justify-center p-12 text-xs font-semibold text-gray-500">
          Loading Checkout Details...
        </main>
        <Footer />
      </div>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 bg-red-50 text-[#ff6f61] rounded-full flex items-center justify-center text-2xl mb-3">
            🛒
          </div>
          <h2 className="text-lg font-bold text-gray-800">Your Cart is Empty</h2>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Checkout karne ke liye pehle apni cart mein products add karein.
          </p>
          <Link
            href="/"
            className="mt-4 bg-[#ff6f61] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#e05b4f] transition shadow-xs"
          >
            Return to Shopping
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <Header />

      <main className="flex-grow py-6 px-3 sm:px-6">
        <div className="mx-auto max-w-[1280px]">
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:underline text-[#ff6f61]">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-500">Cart</span>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Checkout</span>
          </nav>

          <h1 className="text-2xl font-black text-gray-900 mb-6">Secure Checkout</h1>

          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Delivery & Shipping Information */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Customer Info Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
                <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#ff6f61]/10 text-[#ff6f61] flex items-center justify-center text-xs font-black">
                    1
                  </span>
                  Contact Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      placeholder="e.g. Shaheer Imran"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="shaheer@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="03XX-XXXXXXX"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
                <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#ff6f61]/10 text-[#ff6f61] flex items-center justify-center text-xs font-black">
                    2
                  </span>
                  Shipping Address
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Street Address *</label>
                    <input
                      type="text"
                      name="address"
                      required
                      placeholder="House No, Street Name, Sector/Area"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                    >
                      <option value="Islamabad">Islamabad</option>
                      <option value="Rawalpindi">Rawalpindi</option>
                      <option value="Lahore">Lahore</option>
                      <option value="Karachi">Karachi</option>
                      <option value="Peshawar">Peshawar</option>
                      <option value="Quetta">Quetta</option>
                      <option value="Faisalabad">Faisalabad</option>
                      <option value="Multan">Multan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Postal Code (Optional)</label>
                    <input
                      type="text"
                      name="postalCode"
                      placeholder="44000"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Order Notes / Landmark (Optional)</label>
                    <textarea
                      name="orderNotes"
                      rows={2}
                      placeholder="e.g. Deliver between 2pm to 5pm / Near Main Mosque"
                      value={formData.orderNotes}
                      onChange={handleInputChange}
                      className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#ff6f61]"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Options Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
                <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#ff6f61]/10 text-[#ff6f61] flex items-center justify-center text-xs font-black">
                    3
                  </span>
                  Payment Method
                </h2>

                <div className="space-y-3">
                  {/* Option 1: Cash on Delivery */}
                  <label
                    onClick={() => setPaymentMethod('cod')}
                    className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
                      paymentMethod === 'cod'
                        ? 'border-[#ff6f61] bg-red-50/30'
                        : 'border-gray-200 bg-gray-50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="accent-[#ff6f61]"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">Cash on Delivery (COD)</span>
                        <span className="text-[11px] text-gray-500">Pay cash when your order reaches your doorstep.</span>
                      </div>
                    </div>
                    <span className="text-xl">💵</span>
                  </label>

                  {/* Option 2: JazzCash / EasyPaisa */}
                  <label
                    onClick={() => setPaymentMethod('wallet')}
                    className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
                      paymentMethod === 'wallet'
                        ? 'border-[#ff6f61] bg-red-50/30'
                        : 'border-gray-200 bg-gray-50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'wallet'}
                        onChange={() => setPaymentMethod('wallet')}
                        className="accent-[#ff6f61]"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">JazzCash / EasyPaisa / Mobile Wallet</span>
                        <span className="text-[11px] text-gray-500">Instant transfer via mobile wallet apps.</span>
                      </div>
                    </div>
                    <span className="text-xl">📱</span>
                  </label>

                  {/* Option 3: Credit / Debit Card */}
                  <label
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
                      paymentMethod === 'card'
                        ? 'border-[#ff6f61] bg-red-50/30'
                        : 'border-gray-200 bg-gray-50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'card'}
                        onChange={() => setPaymentMethod('card')}
                        className="accent-[#ff6f61]"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">Credit / Debit Card</span>
                        <span className="text-[11px] text-gray-500">Visa, MasterCard, PayPak accepted.</span>
                      </div>
                    </div>
                    <span className="text-xl">💳</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs sticky top-20 space-y-4">
                <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 uppercase tracking-wider flex justify-between items-center">
                  <span>Order Summary</span>
                  <span className="text-xs font-bold text-[#ff6f61]">({cartItems.length} Items)</span>
                </h2>

                {/* Items List */}
                <div className="max-h-72 overflow-y-auto space-y-3 pr-1 divide-y divide-gray-100 no-scrollbar">
                  {cartItems.map((item: any) => {
                    const product = item.product || {};
                    const price = Number(product.price) || 0;
                    const originalPrice = Number(product.originalPrice);
                    const displayImage =
                      product.imageUrl ||
                      product.image ||
                      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300';

                    return (
                      <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center p-1 shrink-0 relative">
                            <Image
                              src={displayImage}
                              alt={product.name || 'Product'}
                              width={40}
                              height={40}
                              className="object-contain max-h-10"
                            />
                            <span className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                              {item.quantity}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate">{product.name}</h4>
                            <p className="text-[10px] text-gray-500">{product.packSize || 'Standard Pack'}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-gray-900 block">
                            Rs. {price * item.quantity}
                          </span>
                          {originalPrice > price && (
                            <span className="text-[10px] text-gray-400 line-through block">
                              Rs. {originalPrice * item.quantity}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Price Breakdown */}
                <div className="pt-3 border-t border-gray-100 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-bold text-gray-900">Rs. {totalPrice}</span>
                  </div>

                  {totalSavings > 0 && (
                    <div className="flex justify-between text-[#16a34a] font-bold">
                      <span>Total Savings:</span>
                      <span>- Rs. {totalSavings}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Charges:</span>
                    {deliveryCharges === 0 ? (
                      <span className="text-[#16a34a] font-bold uppercase text-[10px] bg-green-50 px-2 py-0.5 rounded">
                        FREE
                      </span>
                    ) : (
                      <span className="font-bold text-gray-900">Rs. {deliveryCharges}</span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                    <span className="font-extrabold text-gray-900 text-sm">Total Payable:</span>
                    <span className="text-2xl font-black text-[#ff6f61]">
                      Rs. {finalPayable}
                    </span>
                  </div>
                </div>

                {/* Place Order CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#ff6f61] hover:bg-[#e05b4f] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Placing Order...</span>
                  ) : (
                    <span>Confirm & Place Order • Rs. {finalPayable}</span>
                  )}
                </button>

                <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                  🔒 Guaranteed 100% Secure Checkout. Sourced directly from certified pharmacies.
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}