import { DoctorAuthProvider } from './context/DoctorAuthContext';

// Makes the doctor session (sessionStorage only) available to every
// /consult-doctors page. It has no visual effect on the existing pages.
export default function ConsultDoctorsLayout({ children }: { children: React.ReactNode }) {
  return <DoctorAuthProvider>{children}</DoctorAuthProvider>;
}
