// Reads the logged-in patient the same way the rest of the web app does
// (LoginForm stores it in localStorage as `tabibistan_user`).

export interface PatientSession {
  id: string;
  name: string;
  phone?: string | null;
}

export function readPatientSession(): PatientSession | null {
  try {
    const raw =
      localStorage.getItem('tabibistan_user') ||
      localStorage.getItem('user') ||
      localStorage.getItem('userData');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const u = parsed?.user || parsed?.data?.user || parsed;
    const id = u?.id || u?._id || u?.userId;
    if (!id) return null;
    const name =
      [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.name || u.fullName || 'You';
    const phone = typeof u.phone === 'string' && u.phone.trim() ? u.phone.trim() : null;
    return { id, name, phone };
  } catch {
    return null;
  }
}

export function openPatientLogin() {
  window.dispatchEvent(new CustomEvent('open_login_modal', { detail: { mode: 'login' } }));
}
