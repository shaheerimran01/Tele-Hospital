'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const phone = searchParams.get('phone') || '';
  const flow = searchParams.get('flow') || 'login';
  const hcp = searchParams.get('hcp') === 'true';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleVerify(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');

    if (otp.length !== 6) {
      setError('Please enter the 6 digit OTP.');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Verify the OTP
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone,
            otp,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Invalid OTP',
        );
      }

      // Step 2: Route based on flow
      if (flow === 'signup') {
        // Signup flow → check if account already exists first
        const checkResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/check-account`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone }),
          },
        );

        const checkData = await checkResponse.json();

        if (checkData.exists) {
          // Account already exists → don't go to profile
          setError(
            'An account with this number already exists. Please login instead.',
          );
          return;
        }

        // No existing account → go to complete profile page
        setSuccess(true);
        setTimeout(() => {
          router.push(
            `/auth/complete-profile?phone=${encodeURIComponent(phone)}&hcp=${hcp}`,
          );
        }, 800);
      } else {
        // Login flow → check if account exists
        const checkResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/check-account`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone }),
          },
        );

        const checkData = await checkResponse.json();

        if (!checkResponse.ok) {
          throw new Error(
            checkData.message || 'Something went wrong',
          );
        }

        if (checkData.exists) {
          // Account exists → login success
          if (typeof window !== 'undefined' && checkData.user) {
            localStorage.setItem('tabibistan_user', JSON.stringify(checkData.user));
            window.dispatchEvent(new Event('auth_state_change'));
          }
          setSuccess(true);
          setTimeout(() => {
            router.push('/');
          }, 1200);
        } else {
          // No account → reject
          setError(
            'No account found with this number. Please sign up first.',
          );
        }
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Something went wrong',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-5">

      <div className="w-full max-w-[430px]">

        <div className="mb-8 flex items-center justify-center gap-2.5 w-full text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff6f61] text-white shadow-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-gray-900">
            Tabib<span className="text-[#ff6f61]">istan</span>
          </span>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm">

          <h1 className="text-center text-xl font-semibold">
            Verify your mobile number
          </h1>

          <p className="mt-2 text-center text-sm text-gray-500">
            Enter the 6 digit verification code sent to
          </p>

          <p className="mt-1 text-center text-sm font-semibold text-gray-800">
            {phone}
          </p>

          <form
            onSubmit={handleVerify}
            className="mt-7"
          >
            <input
              autoFocus
              value={otp}
              onChange={(event) =>
                setOtp(
                  event.target.value
                    .replace(/\D/g, '')
                    .slice(0, 6),
                )
              }
              placeholder="Enter OTP"
              className="h-14 w-full rounded-md border border-gray-300 text-center text-2xl tracking-[10px] outline-none focus:border-[#ff6b6b]"
            />

            {error && (
              <p className="mt-3 text-center text-sm text-red-500">
                {error}
              </p>
            )}

            {success && (
              <p className="mt-3 text-center text-sm text-green-600">
                {flow === 'signup'
                  ? 'OTP verified! Redirecting to profile...'
                  : 'OTP verified successfully!'}
              </p>
            )}

            <button
              disabled={loading || success}
              className="mt-5 h-12 w-full rounded-md bg-[#ff6b6b] text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          {error && flow === 'login' && error.includes('sign up') && (
            <button
              onClick={() => router.push('/auth/signup')}
              className="mt-4 block w-full text-center text-sm font-semibold text-[#ff6b6b] hover:underline"
            >
              Go to Sign Up
            </button>
          )}

          {error && flow === 'signup' && error.includes('login') && (
            <button
              onClick={() => router.push('/auth/login')}
              className="mt-4 block w-full text-center text-sm font-semibold text-[#ff6b6b] hover:underline"
            >
              Go to Login
            </button>
          )}

          <button
            onClick={() => router.back()}
            className="mt-5 block w-full text-center text-sm text-gray-500 hover:text-[#ff6b6b]"
          >
            Change mobile number
          </button>

        </div>
      </div>
    </main>
  );
}