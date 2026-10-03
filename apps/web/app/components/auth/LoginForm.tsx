'use client';

import React, { useState } from 'react';
import { Phone, ArrowRight } from 'lucide-react';

interface LoginFormProps {
  onSubmitPhone: (phone: string) => void;
}

export default function LoginForm({ onSubmitPhone }: LoginFormProps) {
  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 1. Strict Input Control: Sirf digits allow honge aur MAX 11 digits (e.g., 03001234567)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    if (digitsOnly.length <= 11) {
      setPhone(digitsOnly);
      if (error) setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setError('A valid 10 or 11 digit mobile number is required.');
      return;
    }

    // 2. Exact Standard Format (+923001234567)
    const formattedPhone = cleanDigits.startsWith('92')
      ? `+${cleanDigits}`
      : `+92${cleanDigits.replace(/^0+/, '')}`;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/pharmacies/auth/send-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formattedPhone }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        // 3. Pass EXACT +92 formatted phone to OTP step
        onSubmitPhone(formattedPhone);
      } else {
        setError(data.message || 'Failed to send OTP code.');
      }
    } catch (err) {
      console.error('OTP Send Error:', err);
      setError('Unable to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-5">
        <h3 className="text-xl font-bold text-slate-900">Pharmacy Partner Login</h3>
        <p className="text-xs text-slate-500 mt-1">
          Enter your mobile number to receive a 6-digit OTP code
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-medium text-center">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
          Mobile Number
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-slate-500 text-sm font-semibold border-r border-slate-200 pr-2.5">
            +92
          </span>
          <input
            type="tel"
            required
            maxLength={11}
            placeholder="3001234567"
            value={phone}
            onChange={handlePhoneChange}
            className="w-full pl-16 pr-10 py-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium tracking-wide"
          />
          <Phone className="w-4 h-4 absolute right-3.5 text-slate-400" />
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
          <span>Format: 03001234567 or 3001234567</span>
          <span className={phone.length >= 10 ? 'text-teal-700 font-bold' : ''}>
            {phone.length}/11
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || phone.length < 10}
        className="w-full py-3.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? 'Sending OTP...' : 'Continue with Phone'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}