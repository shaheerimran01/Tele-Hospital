'use client';

// /lab-login: phone -> 4-digit OTP -> dashboard (registered lab) or registration (new lab).

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CircleAlert, FlaskConical, LoaderCircle, ShieldCheck } from 'lucide-react';
import { clearLabSession, displayPhone, getLabSession, labMeApi, sendLabOtpApi, setLabSession, toPkMobile, verifyLabOtpApi } from '@/app/lib/api/lab-portal';

const OTP_LENGTH = 4;

export default function LabLogin() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  /** Registered lab -> dashboard; new number -> registration with the phone locked */
  const routeAfterSignIn = (registered: boolean, labId: string | undefined, verifiedPhone: string) => {
    if (registered && labId) router.push(`/lab-dashboard?labId=${labId}`);
    else router.push(`/lab-registration?phone=${encodeURIComponent(verifiedPhone)}`);
  };

  // Already signed in on this tab: continue straight away
  useEffect(() => {
    const session = getLabSession();
    if (!session) {
      setChecking(false);
      return;
    }
    labMeApi()
      .then((me) => routeAfterSignIn(me.registered, me.laboratory?.id, me.phone))
      .catch(() => {
        clearLabSession();
        setChecking(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const requestOtp = async (target: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await sendLabOtpApi(target);
      setPhone(res.phone);
      setStep('otp');
      setDigits(Array(OTP_LENGTH).fill(''));
      setResendIn(res.resendAfterSeconds);
      window.setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  };

  const submitPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = toPkMobile(phoneInput);
    if (!formatted) {
      setError('Enter a valid Pakistani mobile number, e.g. 0300 1234567.');
      return;
    }
    requestOtp(formatted);
  };

  const verify = async (code: string) => {
    if (code.length !== OTP_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await verifyLabOtpApi(phone, code);
      setLabSession(res.token, res.phone);
      routeAfterSignIn(res.registered, res.laboratory?.id, res.phone);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify the code.');
      setDigits(Array(OTP_LENGTH).fill(''));
      boxes.current[0]?.focus();
      setBusy(false);
    }
  };

  const setDigit = (i: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length > 1) {
      // pasted the whole code
      const next = clean.slice(0, OTP_LENGTH).split('');
      while (next.length < OTP_LENGTH) next.push('');
      setDigits(next);
      boxes.current[Math.min(clean.length, OTP_LENGTH) - 1]?.focus();
      if (clean.length >= OTP_LENGTH) verify(next.join(''));
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < OTP_LENGTH - 1) boxes.current[i + 1]?.focus();
    if (next.every((d) => d)) verify(next.join(''));
  };

  if (checking) {
    return (
      <p className="flex flex-1 items-center justify-center gap-2 text-sm text-[#6b6f80]">
        <LoaderCircle className="h-4 w-4 animate-spin" /> Checking your session…
      </p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-[#e7e2d8] bg-white p-6 shadow-[0_1px_2px_rgba(20,27,52,0.04)] sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#141b34] text-white">
          <FlaskConical className="h-5 w-5" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#8a8d99]">Tabibistan for Laboratories</p>

        {step === 'phone' ? (
          <>
            <h1 className="mt-1 text-xl font-bold text-[#141b34]">Sign in or register your lab</h1>
            <p className="mt-1 text-sm text-[#6b6f80]">Enter your lab&apos;s primary mobile number. We&apos;ll send a 4-digit code to verify it.</p>
            <form onSubmit={submitPhone} className="mt-5 space-y-3" noValidate>
              <label htmlFor="lab-phone" className="block text-xs font-medium text-[#3a3f52]">
                Mobile number
              </label>
              <div className="flex overflow-hidden rounded-lg border border-[#d9d3c6] focus-within:border-[#141b34] focus-within:ring-2 focus-within:ring-[#141b34]/10">
                <span className="flex items-center border-r border-[#e2ddd2] bg-[#faf9f6] px-3 text-sm font-medium text-[#3a3f52]">+92</span>
                <input
                  id="lab-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  autoFocus
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="300 1234567"
                  className="min-w-0 flex-1 bg-white px-3 py-2.5 text-sm text-[#141b34] outline-none placeholder:text-gray-400"
                />
              </div>
              {error && (
                <p className="flex items-start gap-1.5 text-xs text-red-600" role="alert">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#141b34] px-4 py-3 text-sm font-semibold text-white hover:bg-[#232c4f] disabled:opacity-60"
              >
                {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Send verification code
              </button>
            </form>
            <p className="mt-4 text-xs text-[#8a8d99]">
              New to Tabibistan? Verify your number first, then you&apos;ll fill in your lab&apos;s details. This number becomes your lab&apos;s login.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-1 text-xl font-bold text-[#141b34]">Enter the 4-digit code</h1>
            <p className="mt-1 text-sm text-[#6b6f80]">
              Sent to <span className="font-semibold text-[#141b34]">{displayPhone(phone)}</span>.{' '}
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setError(null);
                }}
                className="inline-flex items-center gap-0.5 font-semibold text-[#141b34] underline"
              >
                <ArrowLeft className="h-3 w-3" /> Change number
              </button>
            </p>
            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                verify(digits.join(''));
              }}
            >
              <div className="flex justify-center gap-3" role="group" aria-label="Verification code">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      boxes.current[i] = el;
                    }}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
                    }}
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={OTP_LENGTH}
                    aria-label={`Digit ${i + 1}`}
                    disabled={busy}
                    className="h-14 w-12 rounded-xl border border-[#d9d3c6] text-center text-xl font-bold tabular-nums text-[#141b34] outline-none focus:border-[#141b34] focus:ring-2 focus:ring-[#141b34]/10 disabled:bg-[#faf9f6]"
                  />
                ))}
              </div>
              {error && (
                <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-xs text-red-600" role="alert">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || digits.some((x) => !x)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#141b34] px-4 py-3 text-sm font-semibold text-white hover:bg-[#232c4f] disabled:opacity-60"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify and continue
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-[#6b6f80]">
              {resendIn > 0 ? (
                <>Resend code in {resendIn}s</>
              ) : (
                <button type="button" onClick={() => requestOtp(phone)} disabled={busy} className="font-semibold text-[#141b34] underline">
                  Resend code
                </button>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
