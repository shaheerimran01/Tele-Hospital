'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, LoaderCircle, Phone, ShieldCheck, Stethoscope } from 'lucide-react';
import {
  ApiError,
  sendDoctorOtpApi,
  verifyDoctorOtpApi,
  type SendDoctorOtpResponse,
} from '@/app/lib/api/doctors';
import {
  doctorHomeRoute,
  useDoctorAuth,
} from '@/app/consult-doctors/context/DoctorAuthContext';

/** 03001234567 / 3001234567 / +923001234567 -> "3001234567" (10 digits) or null */
function toNationalNumber(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('92')) digits = digits.slice(2);
  digits = digits.replace(/^0+/, '');
  return /^3\d{9}$/.test(digits) ? digits : null;
}

const formatForDisplay = (national: string) =>
  `+92 ${national.slice(0, 3)} ${national.slice(3)}`;

export default function DoctorAuthScreen() {
  const router = useRouter();
  const { ready, isAuthenticated, doctor, login } = useDoctorAuth();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [national, setNational] = useState<string | null>(null);
  const [account, setAccount] = useState<SendDoctorOtpResponse | null>(null);
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  // Already signed in on this tab: go straight to the form or dashboard
  useEffect(() => {
    if (ready && isAuthenticated && !redirecting) {
      setRedirecting(true);
      router.replace(doctorHomeRoute(doctor));
    }
  }, [ready, isAuthenticated, doctor, router, redirecting]);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendOtp = async (number: string) => {
    setSending(true);
    setError(null);
    try {
      const res = await sendDoctorOtpApi(`+92${number}`);
      setAccount(res);
      setNational(number);
      setStep('otp');
      setOtp('');
      setResendIn(res.resendAfterSeconds ?? 30);
      setTimeout(() => otpRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof ApiError ? err.messages[0] : 'Could not reach the server. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const onSubmitPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const number = toNationalNumber(phoneInput);
    if (!number) {
      setError('Enter a valid Pakistani mobile number, e.g. 0300 1234567.');
      return;
    }
    sendOtp(number);
  };

  const verify = async (code: string) => {
    if (!national || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await verifyDoctorOtpApi(`+92${national}`, code);
      login(res.token, { ...res.doctorRegistration, isFormFilled: res.isFormFilled });
      setRedirecting(true);
      router.replace(doctorHomeRoute({ ...res.doctorRegistration, isFormFilled: res.isFormFilled }));
    } catch (err) {
      setError(err instanceof ApiError ? err.messages[0] : 'Could not reach the server. Please try again.');
      setOtp('');
      otpRef.current?.focus();
      setVerifying(false);
    }
  };

  const onOtpChange = (value: string) => {
    const code = value.replace(/\D/g, '').slice(0, 6);
    setOtp(code);
    if (error) setError(null);
    if (code.length === 6) verify(code);
  };

  if (!ready || redirecting) {
    return (
      <div className="flex flex-1 items-center justify-center py-32 text-sm text-[#6b6f80]">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
        {redirecting ? 'Signing you in…' : 'Loading…'}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <div className="rounded-2xl border border-[#e7e2d8] bg-white px-6 py-8 shadow-[0_1px_2px_rgba(20,27,52,0.04)] sm:px-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#141b34] text-white">
          <Stethoscope className="h-5 w-5" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#a8873a]">For doctors</p>
        <h1 className="mt-1.5 text-2xl font-semibold text-[#141b34]">
          {step === 'phone' ? 'Join or sign in' : 'Enter the OTP'}
        </h1>

        {step === 'phone' ? (
          <form onSubmit={onSubmitPhone} noValidate className="mt-6">
            <p className="text-sm text-[#6b6f80]">
              Use your mobile number. New doctors fill in their profile next; returning doctors go
              to their dashboard.
            </p>

            <label htmlFor="doctor-phone" className="mt-6 mb-1.5 block text-xs font-medium text-[#3a3f52]">
              Mobile number
            </label>
            <div
              className={`flex items-center rounded-lg border bg-white transition focus-within:border-[#141b34] focus-within:ring-2 focus-within:ring-[#141b34]/10 ${
                error ? 'border-red-400' : 'border-[#d9d3c6]'
              }`}
            >
              <span className="flex items-center gap-1.5 border-r border-[#e7e2d8] px-3 py-2.5 text-sm text-[#3a3f52]">
                <Phone className="h-4 w-4 text-[#8a8d99]" /> +92
              </span>
              <input
                id="doctor-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                autoFocus
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="300 1234567"
                className="w-full rounded-r-lg bg-transparent px-3 py-2.5 text-sm text-[#141b34] outline-none placeholder:text-gray-400"
              />
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#b38a3a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9c7630] disabled:opacity-60"
            >
              {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {sending ? 'Sending OTP…' : 'Send OTP'}
              {!sending && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (otp.length === 6) verify(otp);
            }}
            className="mt-6"
          >
            <p className="text-sm text-[#6b6f80]">
              We sent a 6-digit code to{' '}
              <span className="font-semibold text-[#141b34]">{national && formatForDisplay(national)}</span>.
            </p>

            {account?.exists ? (
              <p className="mt-3 rounded-lg bg-[#f3f7f4] px-3 py-2 text-xs text-[#2f5e41]">
                Welcome back!{' '}
                {account.email ? (
                  <>
                    Your account is linked to <span className="font-semibold">{account.email}</span>.
                  </>
                ) : (
                  'We found your doctor account.'
                )}
              </p>
            ) : (
              <p className="mt-3 rounded-lg bg-[#fdf6e7] px-3 py-2 text-xs text-[#7a5d1a]">
                New here? After verifying, you&apos;ll fill in your doctor profile.
              </p>
            )}

            <label htmlFor="doctor-otp" className="mt-6 mb-1.5 block text-xs font-medium text-[#3a3f52]">
              One-time password
            </label>
            <input
              ref={otpRef}
              id="doctor-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => onOtpChange(e.target.value)}
              disabled={verifying}
              placeholder="••••••"
              className={`w-full rounded-lg border bg-white px-3 py-3 text-center font-mono text-2xl tracking-[0.6em] text-[#141b34] outline-none transition placeholder:text-gray-300 focus:border-[#141b34] focus:ring-2 focus:ring-[#141b34]/10 disabled:bg-gray-50 ${
                error ? 'border-red-400' : 'border-[#d9d3c6]'
              }`}
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={verifying || otp.length !== 6}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#b38a3a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9c7630] disabled:opacity-60"
            >
              {verifying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {verifying ? 'Verifying…' : 'Verify OTP'}
            </button>

            <div className="mt-4 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setError(null);
                  setOtp('');
                }}
                className="inline-flex items-center gap-1 text-[#6b6f80] hover:text-[#141b34]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Change number
              </button>
              <button
                type="button"
                disabled={resendIn > 0 || sending}
                onClick={() => national && sendOtp(national)}
                className="font-medium text-[#141b34] underline disabled:no-underline disabled:text-[#a9a59a]"
              >
                {sending ? 'Sending…' : resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
              </button>
            </div>

            {process.env.NODE_ENV !== 'production' && (
              <p className="mt-5 rounded-md bg-gray-50 px-3 py-2 text-[11px] text-[#8a8d99]">
                Development: SMS isn&apos;t connected yet, so the OTP is printed in the API terminal.
              </p>
            )}
          </form>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-[#8a8d99]">
        Doctor sign-in is separate from patient accounts and lasts only for this browser tab.
      </p>
    </div>
  );
}
