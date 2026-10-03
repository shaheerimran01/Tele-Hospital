'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Store, ShieldCheck, CheckCircle2 } from 'lucide-react';
import LoginForm from './LoginForm';
import OtpForm from './OtpForm';
import SignupForm from './SignupForm';

interface PharmacyAuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function PharmacyAuthModal({ 
  isOpen: initialIsOpen = false, 
  onClose: externalOnClose 
}: PharmacyAuthModalProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState<boolean>(initialIsOpen);
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'EMAIL'>('PHONE');
  const [phone, setPhone] = useState<string>('');

  // Sync external prop changes
  useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  // Safe Global Event Listener
  useEffect(() => {
    const handleOpenModal = () => {
      setStep('PHONE');
      setPhone('');
      setIsOpen(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('open-pharmacy-auth', handleOpenModal);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-pharmacy-auth', handleOpenModal);
      }
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setStep('PHONE');
    setPhone('');
    if (externalOnClose) externalOnClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden relative z-50">
        
        {/* PREMIUM BRANDING HEADER BANNER */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 p-6 text-white relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer backdrop-blur-xs"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> DRAP Verified Partner Network
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
              <Store className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Tabibistan Partner Portal</h2>
              <p className="text-xs text-teal-100/80">Connect your pharmacy & start serving online orders</p>
            </div>
          </div>

          {/* VISUAL STEP PROGRESS INDICATOR */}
          <div className="mt-6 flex items-center justify-between text-xs font-semibold text-teal-100 border-t border-white/10 pt-3">
            <div className={`flex items-center gap-1.5 ${step === 'PHONE' ? 'text-white font-bold' : 'text-teal-200/50'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'PHONE' ? 'bg-emerald-400 text-teal-950 font-extrabold' : 'bg-white/10'}`}>1</span>
              Phone
            </div>
            <div className="h-0.5 w-10 bg-white/10 rounded-full" />
            <div className={`flex items-center gap-1.5 ${step === 'OTP' ? 'text-white font-bold' : 'text-teal-200/50'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'OTP' ? 'bg-emerald-400 text-teal-950 font-extrabold' : 'bg-white/10'}`}>2</span>
              Verify OTP
            </div>
            <div className="h-0.5 w-10 bg-white/10 rounded-full" />
            <div className={`flex items-center gap-1.5 ${step === 'EMAIL' ? 'text-white font-bold' : 'text-teal-200/50'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'EMAIL' ? 'bg-emerald-400 text-teal-950 font-extrabold' : 'bg-white/10'}`}>3</span>
              Account Setup
            </div>
          </div>
        </div>

        {/* MODAL FORM CONTENT */}
        <div className="p-6">
          {step === 'PHONE' && (
            <LoginForm 
              onSubmitPhone={(submittedPhone) => { 
                setPhone(submittedPhone); 
                setStep('OTP'); 
              }} 
            />
          )}

          {step === 'OTP' && (
            <OtpForm
              phone={phone}
              onVerified={(data) => {
                if (data.exists) {
                  handleClose();
                  router.push(data.isFormFilled ? '/pharmacy-dashboard' : '/pharmacy-register');
                } else {
                  setStep('EMAIL');
                }
              }}
              onBack={() => setStep('PHONE')}
            />
          )}

          {step === 'EMAIL' && (
            <SignupForm
              phone={phone}
              onComplete={({ alreadyRegistered }) => {
                handleClose();
                router.push(alreadyRegistered ? '/pharmacy-dashboard' : '/pharmacy-register');
              }}
            />
          )}
        </div>

        {/* FOOTER HIGHLIGHTS */}
        <div className="border-t border-slate-100 bg-slate-50/70 p-3.5 px-6 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fast Approval
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Direct Settlements
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Dedicated Support
          </span>
        </div>

      </div>
    </div>
  );
}