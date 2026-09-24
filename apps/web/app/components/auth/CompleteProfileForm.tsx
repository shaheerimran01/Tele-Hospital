'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function CompleteProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const phone = searchParams.get('phone') || '';
  const hcp = searchParams.get('hcp') === 'true';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [healthcareProfessional, setHealthcareProfessional] =
    useState(hcp);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');

    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }

    if (!lastName.trim()) {
      setError('Last name is required.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/create-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim() || undefined,
            healthcareProfessional,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to create account',
        );
      }

      if (typeof window !== 'undefined') {
        const userData = data.user || {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone,
          email: email.trim(),
        };
        localStorage.setItem('tabibistan_user', JSON.stringify(userData));
        window.dispatchEvent(new Event('auth_state_change'));
      }

      setSuccess(true);

      setTimeout(() => {
        router.push('/');
      }, 1200);
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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7] px-5 py-10">

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

          <h1 className="text-center text-xl font-semibold text-gray-900">
            Complete your profile
          </h1>

          <p className="mt-2 text-center text-sm text-gray-500">
            Fill in your details to create your account
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-5"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                className="h-12 w-full rounded-md border border-gray-300 px-4 text-sm outline-none focus:border-[#ff6b6b]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                className="h-12 w-full rounded-md border border-gray-300 px-4 text-sm outline-none focus:border-[#ff6b6b]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="h-12 w-full rounded-md border border-gray-300 px-4 text-sm outline-none focus:border-[#ff6b6b]"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={healthcareProfessional}
                onChange={(e) =>
                  setHealthcareProfessional(e.target.checked)
                }
                className="h-4 w-4 accent-[#ff6b6b]"
              />
              I am a healthcare professional
            </label>

            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-green-600">
                Account created successfully! Redirecting...
              </p>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="h-12 w-full rounded-md bg-[#ff6b6b] text-sm font-semibold text-white transition hover:bg-[#ff5757] disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Phone: <span className="font-medium text-gray-600">{phone}</span>
          </p>

        </div>
      </div>
    </main>
  );
}
