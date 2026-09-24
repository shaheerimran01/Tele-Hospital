'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');

    if (phone.length !== 10) {
      setError('Please enter a valid 10 digit mobile number.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: `+92${phone}`,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to send OTP');
      }

      router.push(
        `/auth/verify-otp?phone=${encodeURIComponent(
          `+92${phone}`,
        )}&flow=login`,
      );
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

        <button
          onClick={() => router.push('/')}
          className="mb-8 flex items-center justify-center gap-2.5 w-full text-center group cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff6f61] text-white shadow-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-gray-900">
            Tabib<span className="text-[#ff6f61]">istan</span>
          </span>
        </button>

        <div className="rounded-xl bg-white p-8 shadow-sm">

          <h1 className="text-center text-xl font-semibold">
            Sign in to your account
          </h1>

          <p className="mt-2 text-center text-sm text-gray-500">
            Enter your mobile number
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-7"
          >
            <div className="flex h-12 overflow-hidden rounded-md border border-gray-300">

              <div className="flex items-center border-r bg-gray-50 px-4 text-sm">
                +92
              </div>

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 10),
                  )
                }
                placeholder="3001234567"
                className="w-full px-4 text-sm outline-none"
              />

            </div>

            {error && (
              <p className="mt-3 text-sm text-red-500">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="mt-5 h-12 w-full rounded-md bg-[#ff6b6b] text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Get verification code'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <button
              onClick={() => router.push('/auth/signup')}
              className="font-semibold text-[#ff6b6b]"
            >
              Sign up
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}