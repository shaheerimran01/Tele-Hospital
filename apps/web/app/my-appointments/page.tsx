import { redirect } from 'next/navigation';

// Short address for the patient's appointments page (like /my-orders).
export default function MyAppointmentsShortcut() {
  redirect('/consult-doctors/my-appointments');
}
