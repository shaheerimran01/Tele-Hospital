'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiProduct } from '@/components/home/productData';
import { useCart } from '@/app/components/cart/CartContext';
import { uploadPrescriptionApi, PrescriptionResponse } from '@/app/lib/api/prescriptions';

interface ProductPurchaseCardProps {
  product: ApiProduct;
}

export default function ProductPurchaseCard({ product }: ProductPurchaseCardProps) {
  const [quantity, setQuantity] = useState(1);
  const { addProductToCart, openCart, closeCart, loading } = useCart();
  const router = useRouter();

  // Logged-in User & Prescription Upload States
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<PrescriptionResponse[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Extract Product ID safely
  const targetProductId =
    product.id || (product as any)._id || (product as any).productId;

  const isPrescriptionRequired = (product as any).prescriptionRequired ?? false;

  const price = product.price ? `Rs ${product.price}` : 'Rs 180';
  const originalPrice = product.originalPrice ? `Rs ${product.originalPrice}` : 'Rs 220';
  const discountPercent =
    product.originalPrice && product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 18;

  // LocalStorage se active logged-in User ID fetch karein
  useEffect(() => {
    try {
      const rawUser =
        localStorage.getItem('user') ||
        localStorage.getItem('userData') ||
        localStorage.getItem('auth') ||
        localStorage.getItem('currentUser') ||
        localStorage.getItem('tabibistan_user');

      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        const actualUser = parsed.user || parsed.data?.user || parsed;
        const extractedId = actualUser?.id || actualUser?._id || actualUser?.userId;

        if (extractedId) {
          setUser({ id: extractedId });
        }
      }
    } catch (err) {
      console.error('Error loading user session:', err);
    }
  }, []);

  // Multiple files upload handler
  const handlePrescriptionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!user?.id) {
      setUploadError('Prescription upload karne ke liye pehle Login karein.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadPromises = Array.from(files).map((file) =>
        uploadPrescriptionApi(user.id, file)
      );

      const results = await Promise.all(uploadPromises);
      setUploadedFiles((prev) => [...prev, ...results]);
    } catch (err: any) {
      console.error('Upload Error:', err);
      setUploadError(err.message || 'Prescription upload mein masla aaya.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5 lg:sticky lg:top-6">
      {/* Title & Brand */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
          {product.name}
        </h1>

        {product.brandName && (
          <p className="text-xs text-[#ff6f61] font-semibold mt-1">
            Marketer / Brand: <span className="underline">{product.brandName}</span>
          </p>
        )}

        {product.genericName && (
          <p className="text-xs text-gray-500 mt-1">
            SALT COMPOSITION: <span className="font-medium text-gray-700">{product.genericName}</span>
          </p>
        )}
      </div>

      {/* Pack Size */}
      <div className="border-t border-b border-gray-100 py-3 flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Pack Option:</span>
        <span className="text-xs font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded-full">
          {product.packSize || '1 Strip / Pack'}
        </span>
      </div>

      {/* Price Box */}
      <div className="bg-green-50/70 border border-green-100 rounded-xl p-4">
        <div className="flex items-baseline space-x-3">
          <span className="text-2xl font-extrabold text-gray-900">{price}</span>
          <span className="text-sm text-gray-400 line-through">{originalPrice}</span>
          <span className="text-xs font-bold bg-[#16a34a] text-white px-2 py-0.5 rounded">
            {discountPercent}% OFF
          </span>
        </div>
        <p className="text-[11px] text-green-800 font-medium mt-1">
          Inclusive of all applicable taxes
        </p>
      </div>

      {/* Delivery */}
      <div className="flex items-center space-x-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
        <svg className="w-5 h-5 text-[#ff6f61] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <div>
          <p className="font-bold text-gray-800">Express Delivery</p>
          <p className="text-gray-500 text-[11px]">
            Get it delivered by <span className="font-semibold text-gray-700">Today, 6:00 PM</span>
          </p>
        </div>
      </div>

      {/* PRESCRIPTION UPLOAD SECTION (Only renders if prescriptionRequired === true) */}
      {isPrescriptionRequired && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="text-xl">📄</span>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Prescription Required
              </h4>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-tight">
                This Medicine cannot be delivered without the doctor pescription. (PNG, JPG, PDF)
              </p>
            </div>
          </div>

          <div>
            <label className="w-full inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition shadow-xs uppercase">
              <span>{isUploading ? 'Uploading...' : '📎 Attach Prescription File(s)'}</span>
              <input
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.pdf"
                disabled={isUploading}
                onChange={handlePrescriptionUpload}
                className="hidden"
              />
            </label>
          </div>

          {uploadError && (
            <p className="text-[11px] font-bold text-red-600">
              ⚠️ {uploadError}
            </p>
          )}

          {uploadedFiles.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-amber-200/60">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">
                Uploaded ({uploadedFiles.length}):
              </span>
              <ul className="space-y-1">
                {uploadedFiles.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-200 text-xs text-gray-800"
                  >
                    <span className="truncate max-w-[180px] font-medium text-[11px]">
                      📄 {file.fileName}
                    </span>
                    <span className="text-[9px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                      Uploaded ✓
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Quantity Selector */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-bold text-gray-700 uppercase">Quantity</span>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 transition cursor-pointer"
          >
            -
          </button>
          <span className="px-4 py-1 text-sm font-bold text-gray-800">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 transition cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2">
        {/* ADD TO CART */}
        <button
          type="button"
          disabled={loading}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (targetProductId) {
              await addProductToCart(targetProductId, quantity);
              if (openCart) openCart();
            } else {
              console.error('Product ID missing:', product);
              alert('Is product ki ID database se fetch nahi ho saki.');
            }
          }}
          className="w-full bg-[#ff6f61] hover:bg-[#ff574d] text-white font-bold py-3.5 rounded-xl shadow-md transition duration-200 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          {loading ? 'ADDING TO CART...' : 'ADD TO CART'}
        </button>

        {/* BUY NOW */}
        <button
          type="button"
          disabled={loading}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (targetProductId) {
              await addProductToCart(targetProductId, quantity);
              if (closeCart) closeCart();
              router.push('/checkout');
            } else {
              console.error('Product ID missing:', product);
              alert('Is product ki ID database se fetch nahi ho saki.');
            }
          }}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition duration-200 text-sm cursor-pointer uppercase disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'PROCESSING...' : 'BUY NOW'}
        </button>
      </div>

      {/* Trust Badges */}
      <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
        <div className="flex items-center space-x-1.5">
          <span className="text-[#16a34a] font-bold text-base">✓</span>
          <span>100% Genuine Medicine</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-[#16a34a] font-bold text-base">✓</span>
          <span>Verified Pharmacy</span>
        </div>
      </div>
    </div>
  );
}