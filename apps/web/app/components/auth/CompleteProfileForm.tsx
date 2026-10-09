'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, User, Phone, MapPin } from 'lucide-react';

export default function CompleteProfileForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const storedPhone = localStorage.getItem('pharmacyPhone') || phone;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/pharmacies/auth/complete-profile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, phone: storedPhone, address: address.trim() }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        if (typeof window !== 'undefined' && data.pharmacyId) {
          localStorage.setItem('pharmacyId', data.pharmacyId);
        }
        router.push('/pharmacy-dashboard');
      } else {
        setErrorMsg(data.message || 'Failed to complete profile. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Server connection issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-900">Complete Your Profile</h3>
        <p className="text-xs text-slate-500 mt-1">Set up your pharmacy owner account</p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-100 text-center">
          {errorMsg}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            required
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full pl-10 pr-3 py-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
          Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="tel"
            required
            placeholder="+92 XXX XXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full pl-10 pr-3 py-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
          Address
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <textarea
            placeholder="Enter your full address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full pl-10 pr-3 py-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 resize-none"
            rows={3}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? 'Saving...' : (
          <>
            <Check className="w-4 h-4" />
            Complete Profile
          </>
        )}
      </button>
    </form>
  );
}
