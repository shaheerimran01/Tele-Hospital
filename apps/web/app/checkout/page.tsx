'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/app/components/cart/CartContext';
import { placeOrderApi } from '@/app/lib/api/orders';
import {
  uploadPrescriptionApi,
  getUserPrescriptionsApi,
  PrescriptionResponse,
} from '@/app/lib/api/prescriptions';

interface SavedLocation {
  address: string;
  city: string;
  lat: number;
  lng: number;
}

function CheckoutContent() {
  // LocalStorage se logged-in user state
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const { cart, loading: cartLoading, addProductToCart } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();

  const buyNowProductId = searchParams.get('productId');
  const buyNowQuantity = Number(searchParams.get('quantity')) || 1;

  const [buyNowProduct, setBuyNowProduct] = useState<any>(null);
  const [fetchingBuyNow, setFetchingBuyNow] = useState<boolean>(!!buyNowProductId);

  // Success State after order placement
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // Prescription States
  const [userPrescriptions, setUserPrescriptions] = useState<PrescriptionResponse[]>([]);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState<boolean>(false);
  const [isModalUploading, setIsModalUploading] = useState<boolean>(false);
  const [modalUploadError, setModalUploadError] = useState<string | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Islamabad',
    postalCode: '',
    orderNotes: '',
    lat: 0,
    lng: 0,
  });

  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'CARD' | 'WALLET'>('COD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bulletproof LocalStorage Reader for Logged-In User ID & Fetch Unattached Prescriptions
  useEffect(() => {
    async function initUserAndPrescriptions() {
      try {
        const rawUser =
          localStorage.getItem('tabibistan_user') ||
          localStorage.getItem('user') ||
          localStorage.getItem('userData') ||
          localStorage.getItem('auth') ||
          localStorage.getItem('currentUser');

        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          const actualUser = parsed.user || parsed.data?.user || parsed;
          const extractedId = actualUser?.id || actualUser?._id || actualUser?.userId;

          if (extractedId) {
            setUser({
              id: extractedId,
              email: actualUser.email || '',
              name: actualUser.name || actualUser.fullName || '',
            });

            setFormData((prev) => ({
              ...prev,
              fullName: prev.fullName || actualUser.name || actualUser.fullName || '',
              email: prev.email || actualUser.email || '',
            }));

            // Fetch user's unattached (orderId = null) prescriptions from backend
            try {
              const prescriptions = await getUserPrescriptionsApi(extractedId, true);
              setUserPrescriptions(prescriptions || []);
            } catch (pErr) {
              console.error('Error fetching prescriptions:', pErr);
            }
          }
        }
      } catch (err) {
        console.error('Error parsing user session from localStorage:', err);
      } finally {
        setAuthLoading(false);
      }
    }

    initUserAndPrescriptions();
  }, []);

// Fetch specific product if Buy Now was clicked
  useEffect(() => {
    async function fetchBuyNowProduct() {
      if (!buyNowProductId) return;
      try {
        setFetchingBuyNow(true);
        const res = await fetch(`http://localhost:4000/products/${buyNowProductId}`);
        if (res.ok) {
          const data = await res.json();
          setBuyNowProduct(data);
        } else {
          const allRes = await fetch('http://localhost:4000/products');
          const allData = await allRes.json();
          const products = Array.isArray(allData)
            ? allData
            : Array.isArray(allData.data)
              ? allData.data
              : allData.products || [];
          const found = products.find(
            (p: any) => p.id === buyNowProductId || p._id === buyNowProductId
          );
          setBuyNowProduct(found || null);
        }
      } catch (err) {
        console.error('Error fetching buy now product:', err);
      }
      finally {
        setFetchingBuyNow(false);
      }
    }

    fetchBuyNowProduct();
  }, [buyNowProductId]);

  // Load saved location from header picker
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('selected_location');
      if (saved) {
        const loc: SavedLocation = JSON.parse(saved);
        setFormData((prev) => ({
          ...prev,
          address: loc.address || prev.address,
          city: loc.city || prev.city,
          lat: loc.lat || 0,
          lng: loc.lng || 0,
        }));
      }
    } catch (err) {
      console.error('Error loading saved location:', err);
    }
  }, []);

  // Determine Items Mode
  const checkoutItems = buyNowProductId
    ? buyNowProduct
      ? [{ id: buyNowProduct.id, product: buyNowProduct, quantity: buyNowQuantity }]
      : []
    : cart?.items || [];

  // Check if any product in checkout requires a prescription
  const hasPrescriptionRequiredItems = checkoutItems.some(
    (item: any) => item.product?.prescriptionRequired === true
  );

  // Price Calculations
  const totalPrice = checkoutItems.reduce((sum: number, item: any) => {
    const price = Number(item.product?.price) || 0;
    return sum + price * item.quantity;
  }, 0);

  const originalTotal = checkoutItems.reduce((acc: number, item: any) => {
    const itemOriginal =
      Number(item.product?.originalPrice) || Number(item.product?.price) || 0;
    return acc + itemOriginal * item.quantity;
  }, 0);

  const totalSavings = Math.max(0, originalTotal - totalPrice);
  const deliveryCharges = totalPrice > 2000 || totalPrice === 0 ? 0 : 150;
  const finalPayable = totalPrice + deliveryCharges;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Upload handler inside Prescription Modal
  const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user?.id) return;

    setIsModalUploading(true);
    setModalUploadError(null);

    try {
      const uploadPromises = Array.from(files).map((file) =>
        uploadPrescriptionApi(user.id, file)
      );

      const uploadedResults = await Promise.all(uploadPromises);
      setUserPrescriptions((prev) => [...prev, ...uploadedResults]);
    } catch (err: any) {
      console.error('Modal Upload Error:', err);
      setModalUploadError(err.message || 'Prescription file upload nahi ho saki.');
    } finally {
      setIsModalUploading(false);
      e.target.value = '';
    }
  };

  // DYNAMIC ORDER PLACEMENT HANDLER WITH PRESCRIPTION VALIDATION
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !user.id) {
      setErrorMessage('Order place karne ke liye pehle Login karein.');
      return;
    }

    // CHECK: Prescription required medicines validation
    if (hasPrescriptionRequiredItems && userPrescriptions.length === 0) {
      setShowPrescriptionModal(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 2. Full Shipping Address string banayein
      const fullShippingAddress = `${formData.address}, ${formData.city}${
        formData.postalCode ? ` (${formData.postalCode})` : ''
      }${formData.orderNotes ? ` | Note: ${formData.orderNotes}` : ''}`;

      // 3. Format items array for direct payload sync
      const orderItemsPayload = checkoutItems
        .map((item: any) => ({
          productId: item.product?.id || item.product?._id || item.productId || item.id,
          quantity: item.quantity || 1,
        }))
        .filter((item: any) => item.productId);

      // 4. Backend POST /orders API call with actual user ID
      const orderResult = await placeOrderApi(user.id, {
        shippingAddress: fullShippingAddress,
        paymentMethod: paymentMethod,
        items: orderItemsPayload,
        lat: formData.lat || 0,
        lng: formData.lng || 0,
      });

      // 5. Set Placed Order State & reset pending prescriptions
      setPlacedOrder(orderResult);
      setUserPrescriptions([]);
    } catch (err: any) {
      console.error('Order Creation Failed:', err);
      setErrorMessage(err.message || 'Order place karne me error aaya. Dubara koshish karein.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ORDER SUCCESS SCREEN
  if (placedOrder) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center p-6 sm:p-12 text-center my-8">
        <div className="w-20 h-20 bg-green-100 text-[#16a34a] rounded-full flex items-center justify-center text-4xl mb-4 shadow-sm animate-bounce">
          ✓
        </div>

        <span className="text-xs font-bold text-[#16a34a] bg-green-50 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
          Order Placed Successfully
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
          Thanks! Your order has been placed.
        </h1>

        <p className="text-xs text-gray-600 max-w-md mb-6 leading-relaxed">
          Order ID: <span className="font-mono font-bold text-gray-900">{placedOrder.id}</span>
          <br />
          Your order details have been updated in the backend database and admin notifications.
        </p>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 text-left w-full max-w-md shadow-xs mb-6 space-y-3">
          <div className="flex justify-between text-xs pb-2 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Status:</span>
            <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
              {placedOrder.status || 'PENDING'}
            </span>
          </div>

          <div className="flex justify-between text-xs pb-2 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Payment Method:</span>
            <span className="font-bold text-gray-800">{placedOrder.paymentMethod}</span>
          </div>

          <div className="flex justify-between text-xs pb-2 border-b border-gray-100">
            <span className="text-gray-500 font-medium">Total Amount:</span>
            <span className="font-black text-[#ff6f61] text-sm">
              Rs. {placedOrder.totalAmount || finalPayable}
            </span>
          </div>

          {placedOrder.items && (
            <div className="pt-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase block mb-2">
                Purchased Items ({placedOrder.items.length}):
              </span>
              <ul className="space-y-1 text-xs">
                {placedOrder.items.map((item: any) => (
                  <li key={item.id} className="flex justify-between text-gray-700">
                    <span className="truncate pr-2">• {item.productName} (x{item.quantity})</span>
                    <span className="font-semibold">Rs. {item.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Link
          href="/"
          className="bg-[#ff6f61] hover:bg-[#e05b4f] text-white text-xs font-bold px-8 py-3.5 rounded-xl transition shadow-md uppercase tracking-wider"
        >
          Continue Shopping
        </Link>
      </main>
    );
  }

  if (cartLoading || fetchingBuyNow || authLoading) {
    return (
      <div className="flex-grow flex items-center justify-center p-12 text-xs font-semibold text-gray-500">
        Loading Checkout Details...
      </div>
    );
  }

  // Not Logged-In State Banner
  if (!user) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center text-2xl mb-3">
          🔒
        </div>
        <h2 className="text-lg font-bold text-gray-800">Login Required</h2>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          Checkout karne aur order place karne ke liye pehle apne account mein login karein.
        </p>
        <Link
          href="/auth/login"
          className="mt-4 bg-[#ff6f61] text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-[#e05b4f] transition shadow-xs"
        >
          Proceed to Login
        </Link>
      </div>
    );
  }

  if (!checkoutItems || checkoutItems.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-red-50 text-[#ff6f61] rounded-full flex items-center justify-center text-2xl mb-3">
          🛒
        </div>
        <h2 className="text-lg font-bold text-gray-800">No Items to Checkout</h2>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          Aap ki cart empty hai ya buy now product load nahi ho saka.
        </p>
        <Link
          href="/"
          className="mt-4 bg-[#ff6f61] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#e05b4f] transition shadow-xs"
        >
          Return to Shopping
        </Link>
      </div>
    );
  }

  return (
    <main className="flex-grow py-6 px-3 sm:px-6">
      <div className="mx-auto max-w-[1280px]">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
          <Link href="/" className="hover:underline text-[#ff6f61]">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-500">Checkout</span>
          {buyNowProductId && (
            <span className="ml-auto text-[11px] font-bold bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">
              Direct Buy Now Mode
            </span>
          )}
        </nav>

        <h1 className="text-2xl font-black text-gray-900 mb-6">Secure Checkout</h1>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

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
                <label
                  onClick={() => setPaymentMethod('COD')}
                  className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
                    paymentMethod === 'COD'
                      ? 'border-[#ff6f61] bg-red-50/30'
                      : 'border-gray-200 bg-gray-50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="accent-[#ff6f61]"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Cash on Delivery (COD)</span>
                      <span className="text-[11px] text-gray-500">Pay cash when your order reaches your doorstep.</span>
                    </div>
                  </div>
                  <span className="text-xl">💵</span>
                </label>

                <label
                  onClick={() => setPaymentMethod('WALLET')}
                  className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
                    paymentMethod === 'WALLET'
                      ? 'border-[#ff6f61] bg-red-50/30'
                      : 'border-gray-200 bg-gray-50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'WALLET'}
                      onChange={() => setPaymentMethod('WALLET')}
                      className="accent-[#ff6f61]"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">JazzCash / EasyPaisa / Mobile Wallet</span>
                      <span className="text-[11px] text-gray-500">Instant transfer via mobile wallet apps.</span>
                    </div>
                  </div>
                  <span className="text-xl">📱</span>
                </label>

                <label
                  onClick={() => setPaymentMethod('CARD')}
                  className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
                    paymentMethod === 'CARD'
                      ? 'border-[#ff6f61] bg-red-50/30'
                      : 'border-gray-200 bg-gray-50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'CARD'}
                      onChange={() => setPaymentMethod('CARD')}
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
                <span className="text-xs font-bold text-[#ff6f61]">({checkoutItems.length} Items)</span>
              </h2>

              {/* Prescription Required Alert Banner */}
              {hasPrescriptionRequiredItems && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">📄</span>
                    <div className="min-w-0">
                      <span className="font-bold text-amber-900 block text-[11px] uppercase truncate">
                        Prescription Required
                      </span>
                      <span className="text-[10px] text-amber-700 block truncate">
                        {userPrescriptions.length > 0
                          ? `${userPrescriptions.length} Prescription(s) attached`
                          : 'Order place karne par upload karna zaroori hai'}
                      </span>
                    </div>
                  </div>

                  {userPrescriptions.length > 0 ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        Attached ✓
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPrescriptionModal(true)}
                        className="text-[10px] font-bold text-[#ff6f61] hover:text-[#e05b4f] underline cursor-pointer"
                      >
                        + Add Another
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionModal(true)}
                      className="text-[10px] font-bold text-amber-900 underline hover:text-amber-700 cursor-pointer shrink-0"
                    >
                      Upload Now
                    </button>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="max-h-72 overflow-y-auto space-y-3 pr-1 divide-y divide-gray-100 no-scrollbar">
                {checkoutItems.map((item: any) => {
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
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-gray-900 truncate">{product.name}</h4>
                            {product.prescriptionRequired && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded shrink-0">
                                Rx
                              </span>
                            )}
                          </div>
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
                  <span>PLACING ORDER...</span>
                ) : (
                  <span>CONFIRM & PLACE ORDER • Rs. {finalPayable}</span>
                )}
              </button>

              <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                🔒 Guaranteed 100% Secure Checkout. Sourced directly from certified pharmacies.
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* PRESCRIPTION UPLOAD POPUP MODAL */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📄</span>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Upload Prescriptions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Aapke order mein prescription medicines shamil hain. Doctor ki prescription file upload karein. Aap ek se zyada files bhi add kar sakte hain.
            </p>

            {/* Upload Box inside Modal */}
            <div className="border-2 border-dashed border-amber-300 bg-amber-50/50 rounded-2xl p-5 text-center space-y-3">
              <span className="text-3xl block">📎</span>
              <label className="inline-block bg-[#ff6f61] hover:bg-[#e05b4f] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition shadow-xs uppercase">
                <span>
                  {isModalUploading
                    ? 'Uploading...'
                    : userPrescriptions.length > 0
                    ? '+ Add Another File'
                    : 'Select Prescription File(s)'}
                </span>
                <input
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.pdf"
                  disabled={isModalUploading}
                  onChange={handleModalFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-gray-400">Supported Formats: PNG, JPG, JPEG, PDF (Max 10MB)</p>
            </div>

            {/* Modal Upload Error */}
            {modalUploadError && (
              <p className="text-xs font-bold text-red-600 text-center">
                ⚠️ {modalUploadError}
              </p>
            )}

            {/* Modal Uploaded Files List */}
            {userPrescriptions.length > 0 && (
              <div className="space-y-1.5 pt-2 max-h-36 overflow-y-auto">
                <span className="text-[11px] font-bold text-gray-700 uppercase block">
                  Attached Prescriptions ({userPrescriptions.length}):
                </span>
                <ul className="space-y-1 text-xs">
                  {userPrescriptions.map((file) => (
                    <li key={file.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                      <span className="truncate max-w-[200px] text-gray-800 font-medium">📎 {file.fileName}</span>
                      <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">Uploaded ✓</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={userPrescriptions.length === 0}
                onClick={(e) => {
                  setShowPrescriptionModal(false);
                  handlePlaceOrder(e);
                }}
                className="flex-1 bg-[#ff6f61] hover:bg-[#e05b4f] disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs uppercase shadow-md cursor-pointer"
              >
                Continue Order
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <Header />
      <Suspense fallback={<div className="p-12 text-center text-xs font-semibold text-gray-500">Loading Checkout...</div>}>
        <CheckoutContent />
      </Suspense>
      <Footer />
    </div>
  );
}