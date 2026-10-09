'use client';

import React, { useState } from 'react';

interface SignupFormProps {
  phone?: string;
  onComplete?: (result: { alreadyRegistered: boolean; pharmacyId?: string | null }) => void;
}

export default function SignupForm({ phone, onComplete }: SignupFormProps) {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/pharmacies/auth/init`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            email: email.trim().toLowerCase(),
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        // 👈 Save phone and email for PharmacyRegisterPage
          if (typeof window !== 'undefined') {
            localStorage.setItem('pharmacyPhone', phone || '');
            localStorage.setItem('pharmacyEmail', email.trim().toLowerCase());
            // Persist pharmacyId if backend returned one (already-registered path)
            if (data.pharmacyId) {
              localStorage.setItem('pharmacyId', data.pharmacyId);
            }
          }
          onComplete?.({
          alreadyRegistered: Boolean(data.alreadyRegistered),
          pharmacyId: data.pharmacyId || null,
        });
      } else {
        setErrorMsg(data.message || 'Email save nahi ho pa raha. Dobara try karein.');
      }
    } catch (err) {
      console.error('Registration init error:', err);
      setErrorMsg('Server connection issue. Backend URL check karein.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-900">Enter Email Address</h3>
        <p className="text-xs text-slate-500 mt-1">Set up your pharmacy owner account</p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-100 text-center">
          {errorMsg}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
          Email Address
        </label>
        <input
          type="email"
          required
          placeholder="pharmacy@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Saving...' : 'Proceed to Registration Form'}
      </button>
    </form>
  );
}