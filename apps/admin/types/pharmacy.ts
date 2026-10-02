export interface PharmacyItem {
  id: string;
  pharmacyCode: string;
  name: string;
  ownerName: string;
  pharmacyType?: string;
  pharmacistName: string;
  pharmacistRegNum: string;
  logoUrl?: string;
  whatsappNumber?: string;
  phone: string;
  email: string;
  drugLicenseNumber: string;
  cnicNtnNumber: string;
  address: string;
  city: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isActive: boolean;
  createdAt?: string;
}