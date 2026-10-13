'use client';

// Doctor-only session. Deliberately separate from the patient login:
//  - stored in sessionStorage (per browser tab), never localStorage
//  - keys: doctor_token, doctor_data
//  - never reads or writes the patient keys (tabibistan_user, user, …)

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import type { DoctorRegistration } from '@/app/lib/api/doctors';

export const DOCTOR_TOKEN_KEY = 'doctor_token';
export const DOCTOR_DATA_KEY = 'doctor_data';

export const DOCTOR_ROUTES = {
  auth: '/consult-doctors/auth',
  form: '/consult-doctors/join-now',
  dashboard: '/consult-doctors/doctor-dashboard',
} as const;

interface DoctorAuthValue {
  /** false until sessionStorage has been read (avoids hydration mismatches) */
  ready: boolean;
  token: string | null;
  doctor: DoctorRegistration | null;
  isAuthenticated: boolean;
  login: (token: string, doctor: DoctorRegistration) => void;
  updateDoctor: (patch: Partial<DoctorRegistration>) => void;
  logout: () => void;
}

const DoctorAuthContext = createContext<DoctorAuthValue | null>(null);

/** True when the token's `exp` (seconds) is in the past. Signature is checked by the API. */
function isTokenExpired(token: string): boolean {
  try {
    const body = token.split('.')[1];
    const json = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
    const { exp } = JSON.parse(json) as { exp?: number };
    return typeof exp !== 'number' || exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function readSession(): { token: string | null; doctor: DoctorRegistration | null } {
  try {
    const token = sessionStorage.getItem(DOCTOR_TOKEN_KEY);
    const raw = sessionStorage.getItem(DOCTOR_DATA_KEY);
    if (!token || !raw || isTokenExpired(token)) {
      sessionStorage.removeItem(DOCTOR_TOKEN_KEY);
      sessionStorage.removeItem(DOCTOR_DATA_KEY);
      return { token: null, doctor: null };
    }
    return { token, doctor: JSON.parse(raw) as DoctorRegistration };
  } catch {
    return { token: null, doctor: null };
  }
}

export function DoctorAuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<DoctorRegistration | null>(null);

  useEffect(() => {
    const session = readSession();
    setToken(session.token);
    setDoctor(session.doctor);
    setReady(true);
  }, []);

  const login = useCallback((newToken: string, data: DoctorRegistration) => {
    try {
      sessionStorage.setItem(DOCTOR_TOKEN_KEY, newToken);
      sessionStorage.setItem(DOCTOR_DATA_KEY, JSON.stringify(data));
    } catch {
      // Storage blocked: the session still works until the tab is refreshed
    }
    setToken(newToken);
    setDoctor(data);
  }, []);

  const updateDoctor = useCallback((patch: Partial<DoctorRegistration>) => {
    setDoctor((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try {
        sessionStorage.setItem(DOCTOR_DATA_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(DOCTOR_TOKEN_KEY);
      sessionStorage.removeItem(DOCTOR_DATA_KEY);
    } catch {
      // ignore
    }
    setToken(null);
    setDoctor(null);
  }, []);

  const value = useMemo<DoctorAuthValue>(
    () => ({
      ready,
      token,
      doctor,
      isAuthenticated: Boolean(token && doctor),
      login,
      updateDoctor,
      logout,
    }),
    [ready, token, doctor, login, updateDoctor, logout],
  );

  return <DoctorAuthContext.Provider value={value}>{children}</DoctorAuthContext.Provider>;
}

export function useDoctorAuth(): DoctorAuthValue {
  const ctx = useContext(DoctorAuthContext);
  if (!ctx) throw new Error('useDoctorAuth must be used inside <DoctorAuthProvider>');
  return ctx;
}

/** Where a signed-in doctor belongs. */
export function doctorHomeRoute(doctor: DoctorRegistration | null) {
  return doctor?.isFormFilled ? DOCTOR_ROUTES.dashboard : DOCTOR_ROUTES.form;
}

// ---------------------------------------------------------------------------
// Route guard
// ---------------------------------------------------------------------------

function FullPageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center py-32 text-sm text-[#6b6f80]">
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Checking your doctor session…
    </div>
  );
}

/**
 * - require="form":      needs a session; doctors who already submitted go to the dashboard
 * - require="dashboard": needs a session and a submitted form, otherwise the form
 *
 * The form/dashboard decision is made once when the page opens, so a doctor who
 * submits the form can still see the confirmation screen before moving on.
 */
export function DoctorRouteGuard({
  require,
  children,
}: {
  require: 'form' | 'dashboard';
  children: React.ReactNode;
}) {
  const { ready, isAuthenticated, doctor } = useDoctorAuth();
  const router = useRouter();
  const decided = useRef<'allow' | 'redirect' | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!ready) return;

    // Logged out (or token expired) at any point -> back to the phone/OTP screen
    if (!isAuthenticated) {
      decided.current = 'redirect';
      setAllowed(false);
      router.replace(DOCTOR_ROUTES.auth);
      return;
    }

    if (decided.current === 'allow') return;

    const filled = Boolean(doctor?.isFormFilled);
    if (require === 'form' && filled) {
      decided.current = 'redirect';
      router.replace(DOCTOR_ROUTES.dashboard);
      return;
    }
    if (require === 'dashboard' && !filled) {
      decided.current = 'redirect';
      router.replace(DOCTOR_ROUTES.form);
      return;
    }
    decided.current = 'allow';
    setAllowed(true);
  }, [ready, isAuthenticated, doctor, require, router]);

  return allowed ? <>{children}</> : <FullPageLoader />;
}
