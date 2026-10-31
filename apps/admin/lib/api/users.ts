import { AdminUserItem } from '@/types/user';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

export async function fetchAdminUsers(): Promise<AdminUserItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/users`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error('Failed to fetch users');
    }
    const data = await res.json();

    // Backend response format fallback & normalization
    return data.map((u: any, index: number) => {
      const codeNumber = String(index + 1).padStart(3, '0');
      const orders = u.ordersCount ?? u.orders?.length ?? 0;

      return {
        id: u.id,
        userCode: u.userCode || `USR-${codeNumber}`,
        firstName: u.firstName || 'User',
        lastName: u.lastName || '',
        phone: u.phone || u.phoneNumber || 'N/A',
        email: u.email || 'N/A',
        address: u.address || u.shippingAddress || u.city || 'Address not provided',
        ordersCount: orders,
        status: u.isActive === false ? 'Inactive' : 'Active',
        customerType: orders > 1 ? 'Returning' : 'New',
        healthcareProfessional: u.healthcareProfessional || false,
        createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A',
      };
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}