'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface LoginFormProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function LoginForm({ isOpen: propIsOpen, onClose }: LoginFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Auth flow states
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  // Form fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [healthcareProfessional, setHealthcareProfessional] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);
  const [activeSlide, setActiveSlide] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);

  const slides = [
    {
      title: 'Health Related Queries?',
      text: 'Consult our certified doctors from anywhere, anytime, and for free. We guarantee your privacy.',
    },
    {
      title: 'Authentic Medicines',
      text: 'Get 100% genuine prescription medicines delivered right to your doorstep.',
    },
    {
      title: 'Lab Tests at Home',
      text: 'Book lab tests online and get sample collection done safely at your home.',
    },
  ];

  // Check whether user is logged in
  const checkIsLoggedIn = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const rawUser =
        localStorage.getItem('tabibistan_user') ||
        localStorage.getItem('user') ||
        localStorage.getItem('userData');

      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        const actualUser = parsed.user || parsed.data?.user || parsed;
        if (actualUser?.id || actualUser?._id || actualUser?.email || actualUser?.phone) {
          return true;
        }
      }
    } catch (err) {
      console.error('Error checking auth state:', err);
    }
    return false;
  }, []);

  // 1. Client Hydration Check
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Auth State Check & Initial Popup Trigger
  useEffect(() => {
    if (!mounted) return;

    if (propIsOpen !== undefined) {
      setIsVisible(propIsOpen);
      return;
    }

    // Do not show popup if already on dedicated auth routes
    if (pathname && pathname.startsWith('/auth')) {
      setIsVisible(false);
      return;
    }

    // Do not show customer login popup on pharmacy portal pages
    const PHARMACY_ROUTES = ['/pharmacy-dashboard', '/pharmacy-register', '/pharmacy-'];
    if (pathname && PHARMACY_ROUTES.some((route) => pathname.startsWith(route))) {
      setIsVisible(false);
      return;
    }

    const syncAuthState = () => {
      const loggedIn = checkIsLoggedIn();
      if (!loggedIn) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    syncAuthState();

    const handleAuthChange = () => {
      const loggedIn = checkIsLoggedIn();
      if (loggedIn) {
        setIsVisible(false);
      }
    };

    const handleOpenModal = (e: any) => {
      setIsVisible(true);
      if (e?.detail?.mode) {
        setMode(e.detail.mode);
      }
      setStep('phone');
      setError(null);
      setSuccessMsg(null);
    };

    window.addEventListener('auth_state_change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('open_login_modal', handleOpenModal as EventListener);

    return () => {
      window.removeEventListener('auth_state_change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('open_login_modal', handleOpenModal as EventListener);
    };
  }, [mounted, propIsOpen, pathname, checkIsLoggedIn]);

  // Resend Timer Countdown
  useEffect(() => {
    if (step !== 'otp' || resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  // Carousel Auto-slide
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isVisible, slides.length]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10 digit mobile number.');
      return;
    }

    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const formattedPhone = `+92${cleanPhone}`;

      const res = await fetch(`${apiUrl}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Unable to send OTP');
      }

      setStep('otp');
      setResendTimer(30);
      setSuccessMsg(`OTP sent to ${formattedPhone}`);
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while sending OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setSuccessMsg(null);
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const formattedPhone = `+92${phone.replace(/\D/g, '')}`;

      const res = await fetch(`${apiUrl}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Unable to resend OTP');
      }

      setResendTimer(30);
      setSuccessMsg('A new OTP has been sent successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6 digit verification code.');
      return;
    }

    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const formattedPhone = `+92${phone.replace(/\D/g, '')}`;

      // 1. Verify OTP
      const verifyRes = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          otp: cleanOtp,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.message || 'Invalid OTP code.');
      }

      // 2. Check if account exists
      const checkRes = await fetch(`${apiUrl}/auth/check-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });

      const checkData = await checkRes.json();

      if (checkData.exists && checkData.user) {
        // Account exists -> Login success!
        localStorage.setItem('tabibistan_user', JSON.stringify(checkData.user));
        window.dispatchEvent(new Event('auth_state_change'));
        setSuccessMsg('OTP verified successfully! Logging you in...');

        setTimeout(() => {
          setIsVisible(false);
          if (onClose) onClose();
          router.refresh();
        }, 800);
      } else {
        // New user -> Move to profile completion step
        setSuccessMsg('OTP verified! Please complete your profile.');
        setStep('profile');
      }
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Profile for new account
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const formattedPhone = `+92${phone.replace(/\D/g, '')}`;

      const res = await fetch(`${apiUrl}/auth/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          healthcareProfessional,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create account.');
      }

      const userData = data.user || {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: formattedPhone,
        email: email.trim(),
      };

      localStorage.setItem('tabibistan_user', JSON.stringify(userData));
      window.dispatchEvent(new Event('auth_state_change'));
      setSuccessMsg('Account created successfully! Welcome to Tabibistan.');

      setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
        router.refresh();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to create profile.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isVisible) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300"
    >
      <div className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 relative min-h-[500px]">
        
        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 text-gray-400 hover:text-gray-700 text-xl font-bold p-2 transition cursor-pointer flex items-center justify-center"
          aria-label="Close"
        >
          ✕
        </button>

        {/* LEFT COLUMN: CAROUSEL PROMOTIONAL BANNER */}
        <div className="bg-gray-50/80 p-8 sm:p-12 flex flex-col justify-between items-center text-center border-b md:border-b-0 md:border-r border-gray-100">
          <div className="my-auto space-y-4 max-w-sm">
            <h2 className="text-2xl font-bold text-gray-900 leading-snug">
              {slides[activeSlide].title}
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              {slides[activeSlide].text}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-6">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  activeSlide === idx
                    ? 'bg-[#ff6f61] w-5'
                    : 'bg-gray-300 hover:bg-gray-400 w-2'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: DYNAMIC AUTH CONTENT */}
        <div className="p-8 sm:p-10 flex flex-col justify-between bg-white">
          <div className="space-y-5">
            
            {/* TOGGLE TABS (ONLY ON PHONE STEP) */}
            {step === 'phone' && (
              <div className="flex border-b border-gray-200 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider transition border-b-2 cursor-pointer ${
                    mode === 'login'
                      ? 'border-[#ff6f61] text-[#ff6f61]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider transition border-b-2 cursor-pointer ${
                    mode === 'signup'
                      ? 'border-[#ff6f61] text-[#ff6f61]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* ERROR & SUCCESS ALERTS */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-600 text-center animate-fade-in">
                ⚠️ {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-700 text-center animate-fade-in">
                ✓ {successMsg}
              </div>
            )}

            {/* ----------------- STEP 1: PHONE NUMBER ----------------- */}
            {step === 'phone' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900">
                    {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {mode === 'login'
                      ? 'Enter your mobile number to receive verification code'
                      : 'Enter your mobile number to get started'}
                  </p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Mobile Number
                    </label>
                    <div className="flex h-12 overflow-hidden rounded-xl border border-gray-300 focus-within:border-[#ff6f61] focus-within:ring-2 focus-within:ring-[#ff6f61]/20 transition bg-white shadow-2xs">
                      <div className="flex items-center border-r border-gray-200 bg-gray-50 px-3.5 text-xs font-bold text-gray-700 select-none">
                        +92
                      </div>
                      <input
                        type="tel"
                        required
                        autoFocus
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                        }
                        placeholder="3001234567"
                        className="w-full px-3.5 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  {mode === 'signup' && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 select-none pt-1">
                      <input
                        type="checkbox"
                        checked={healthcareProfessional}
                        onChange={(e) => setHealthcareProfessional(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#ff6f61] focus:ring-[#ff6f61] cursor-pointer"
                      />
                      <span>Are you a Healthcare Professional?</span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={loading || phone.length !== 10}
                    className="w-full bg-[#ff6f61] hover:bg-[#e05b4f] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md cursor-pointer mt-2"
                  >
                    {loading ? 'Sending OTP...' : 'Get verification code'}
                  </button>
                </form>

                <div className="pt-2 text-center text-xs text-gray-500">
                  {mode === 'login' ? (
                    <span>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setError(null);
                        }}
                        className="font-bold text-[#ff6f61] hover:underline cursor-pointer"
                      >
                        Sign up
                      </button>
                    </span>
                  ) : (
                    <span>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError(null);
                        }}
                        className="font-bold text-[#ff6f61] hover:underline cursor-pointer"
                      >
                        Login
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ----------------- STEP 2: OTP VERIFICATION ----------------- */}
            {step === 'otp' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900">
                    Verify your mobile number
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the 6-digit verification code sent to
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-gray-800">
                      +92 {phone}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone');
                        setOtp('');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] font-bold text-[#ff6f61] hover:underline cursor-pointer"
                    >
                      (Edit number)
                    </button>
                  </div>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
                  <div>
                    <input
                      ref={otpInputRef}
                      autoFocus
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="• • • • • •"
                      className="h-14 w-full rounded-xl border border-gray-300 text-center text-2xl font-bold tracking-[12px] text-gray-900 outline-none focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/20 transition bg-white shadow-2xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-[#ff6f61] hover:bg-[#e05b4f] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md cursor-pointer"
                  >
                    {loading ? 'Verifying OTP...' : 'Verify & Continue'}
                  </button>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                    <span>Didn't receive the code?</span>
                    {resendTimer > 0 ? (
                      <span className="text-gray-400 font-medium">
                        Resend in {resendTimer}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading}
                        className="font-bold text-[#ff6f61] hover:underline cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* ----------------- STEP 3: COMPLETE PROFILE ----------------- */}
            {step === 'profile' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900">
                    Complete your profile
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Just a few more details to set up your Tabibistan account
                  </p>
                </div>

                <form onSubmit={handleCompleteProfile} className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className="w-full h-11 px-3 text-xs rounded-xl border border-gray-300 focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/20 outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className="w-full h-11 px-3 text-xs rounded-xl border border-gray-300 focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/20 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-11 px-3 text-xs rounded-xl border border-gray-300 focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/20 outline-none transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !firstName.trim() || !lastName.trim()}
                    className="w-full bg-[#ff6f61] hover:bg-[#e05b4f] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md cursor-pointer mt-2"
                  >
                    {loading ? 'Creating Account...' : 'Complete & Continue'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* FOOTER LINKS */}
          <div className="space-y-1 text-center pt-4 border-t border-gray-100 mt-4">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="underline hover:text-gray-600">
                Terms
              </Link>{' '}
              &{' '}
              <Link href="/privacy" className="underline hover:text-gray-600">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}