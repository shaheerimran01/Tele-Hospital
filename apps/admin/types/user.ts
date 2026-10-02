export interface AdminUserItem {
  id: string;
  userCode?: string; // e.g. USR-001
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address?: string;
  ordersCount: number;
  status: 'Active' | 'Inactive';
  customerType: 'New' | 'Returning';
  healthcareProfessional?: boolean;
  createdAt?: string;
}