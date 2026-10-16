import { redirect } from 'next/navigation';

// The prescriptions list lives inside the Doctor Portal (sidebar > Prescriptions).
export default function DoctorPrescriptionsPage() {
  redirect('/consult-doctors/doctor-dashboard?view=prescriptions');
}
