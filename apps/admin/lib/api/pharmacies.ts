import { PharmacyItem } from '@/types/pharmacy';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchPharmacies(): Promise<PharmacyItem[]> {
  const res = await fetch(`${API_BASE_URL}/pharmacies`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Pharmacies fetch nahi ho saken.');
  }

  const rawData = await res.json();
  if (!Array.isArray(rawData)) return [];

  return rawData.map((item: any): PharmacyItem => ({
    id: item.id,
    pharmacyCode: item.id ? `PH-${item.id.slice(0, 4).toUpperCase()}` : 'PH-1000',
    name: item.name || 'Pharmacy Name',
    ownerName: item.ownerName || 'N/A',
    pharmacyType: item.pharmacyType || 'Retail',
    pharmacistName: item.pharmacistName ? `Dr. ${item.pharmacistName.replace(/^Dr\.\s*/i, '')}` : 'N/A',
    pharmacistRegNum: item.pharmacistRegNum || 'N/A',
    logoUrl: item.logoUrl || null,
    whatsappNumber: item.whatsappNumber || '',
    phone: item.phone || item.whatsappNumber || 'N/A',
    email: item.email || 'N/A',
    drugLicenseNumber: item.drugLicenseNumber || 'N/A',
    cnicNtnNumber: item.cnicNtnNumber || 'N/A',
    address: item.address || item.city || 'N/A',
    city: item.city || 'N/A',
    status: item.status || 'PENDING',
    isActive: !!item.isActive,
    createdAt: item.createdAt,
  }));
}

// Single Pharmacy Fetch
export async function fetchPharmacyById(id: string): Promise<PharmacyItem | null> {
  const res = await fetch(`${API_BASE_URL}/pharmacies/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;

  const item = await res.json();
  if (!item) return null;

  return {
    id: item.id,
    pharmacyCode: item.id ? `PH-${item.id.slice(0, 4).toUpperCase()}` : 'PH-1000',
    name: item.name || 'Pharmacy Name',
    ownerName: item.ownerName || 'N/A',
    pharmacyType: item.pharmacyType || 'Retail & Online Pharmacy',
    pharmacistName: item.pharmacistName ? `Dr. ${item.pharmacistName.replace(/^Dr\.\s*/i, '')}` : 'N/A',
    pharmacistRegNum: item.pharmacistRegNum || 'N/A',
    logoUrl: item.logoUrl || null,
    whatsappNumber: item.whatsappNumber || '',
    phone: item.phone || item.whatsappNumber || 'N/A',
    email: item.email || 'N/A',
    drugLicenseNumber: item.drugLicenseNumber || 'N/A',
    cnicNtnNumber: item.cnicNtnNumber || 'N/A',
    address: item.address || item.city || 'N/A',
    city: item.city || 'N/A',
    status: item.status || 'PENDING',
    isActive: !!item.isActive,
    createdAt: item.createdAt,
    // Document Photos
    drugLicensePhotoUrl: item.drugLicensePhotoUrl || null,
    cnicFrontPhotoUrl: item.cnicFrontPhotoUrl || null,
    cnicBackPhotoUrl: item.cnicBackPhotoUrl || null,
    isOpen247: item.isOpen247,
  } as any;
}

// Update Status (Approve / Decline)
export async function updatePharmacyStatus(id: string, status: 'APPROVED' | 'REJECTED'): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/pharmacies/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, isActive: status === 'APPROVED' }),
  });
  return res.ok;
}

// Send Notification To Pharmacy
export async function sendPharmacyNotification(pharmacyId: string, message: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'ADMIN_PHARMACY_MESSAGE',
      title: 'Message from Admin',
      message,
      pharmacyId,
    }),
  });
  return res.ok;
}