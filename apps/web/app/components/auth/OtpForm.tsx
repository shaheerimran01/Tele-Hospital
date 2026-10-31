'use client';

import React, { useState } from 'react';

interface OtpFormProps {
  phone?: string;
  onVerified?: (data: { exists: boolean; isFormFilled: boolean }) => void;
  onBack?: () => void;
}

export default function OtpForm({ phone, onVerified, onBack }: OtpFormProps) {
  const [otp, setOtp] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org'}/pharmacies/auth/verify-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, otp: otp.trim() }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        // Keep pharmacy identity scoped to this browser tab.
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pharmacyPhone', phone || '');
          if (data.email) sessionStorage.setItem('pharmacyEmail', data.email);
          if (data.pharmacyId) sessionStorage.setItem('pharmacyId', data.pharmacyId);
          if (data.pharmacyRegId) sessionStorage.setItem('pharmacyRegId', data.pharmacyRegId);
        }

        onVerified?.({
          exists: Boolean(data.exists),
          isFormFilled: Boolean(data.isFormFilled),
        });
      } else {
        setError(data.message || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      console.error('OTP Verify Error:', err);
      setError('Unable to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-900">Verify OTP</h3>
        <p className="text-xs text-slate-500 mt-1">
          OTP sent to <span className="font-bold text-teal-800">{phone}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-medium text-center">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
          Enter 6-Digit OTP
        </label>
        <input
          type="text"
          required
          maxLength={6}
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          className="w-full p-3 text-center tracking-widest text-lg font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="w-1/3 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading || otp.length < 6}
          className="w-2/3 py-3 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </div>
    </form>
  );
}
