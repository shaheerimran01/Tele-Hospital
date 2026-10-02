import { OrderTableItem, OrderProductItem } from '@/types/order';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchAdminOrders(): Promise<OrderTableItem[]> {
  const res = await fetch(`${API_BASE_URL}/orders`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Orders fetch nahi ho sake.');
  }

  const rawOrders = await res.json();
  if (!Array.isArray(rawOrders)) return [];

  return rawOrders.map((order: any) => {
    const user = order.user;
    
    // Multiple key fallback checks for Items array
    const rawItems = order.items || order.orderItems || order.cartItems || [];
    
    const itemsList: OrderProductItem[] = Array.isArray(rawItems) && rawItems.length > 0
      ? rawItems.map((i: any) => ({
          productName: i.productName || i.product?.name || i.name || i.title || 'Healthcare Item',
          quantity: i.quantity || 1,
        }))
      : [
          {
            productName: order.productName || 'Healthcare Item',
            quantity: 1,
          }
        ];

    const prescriptions = order.prescriptions || [];

    let customerName = 'Customer';
    let customerEmail = 'No email provided';
    let customerInitials = 'CU';

    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      customerName = fullName || user.phone || 'Customer';
      customerEmail = user.email || user.phone || 'No contact info';
      customerInitials = (user.firstName?.[0] || 'C') + (user.lastName?.[0] || '');
    }

    const totalQuantity = itemsList.reduce((sum, item) => sum + item.quantity, 0);

    let prescriptionStatus: 'Not Required' | 'Uploaded' | 'Missing' = 'Not Required';
    let prescriptionUrl: string | null = null;

    if (prescriptions.length > 0) {
      prescriptionStatus = 'Uploaded';
      const rawUrl = prescriptions[0].fileUrl;
      prescriptionUrl = rawUrl.startsWith('http')
        ? rawUrl
        : `${API_BASE_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
    } else if (rawItems.some((i: any) => i.product?.prescriptionRequired)) {
      prescriptionStatus = 'Missing';
    }

    return {
      id: order.id,
      orderCode: `TB-${order.id.slice(0, 8).toUpperCase()}`,
      customerName,
      customerEmail,
      customerInitials: customerInitials.toUpperCase(),
      items: itemsList,
      totalQuantity,
      status: order.status || 'Pending',
      paymentStatus: order.paymentStatus || 'Pending',
      paymentMethod: order.paymentMethod || 'COD',
      totalAmount: order.totalAmount || 0,
      orderDate: order.createdAt
        ? new Date(order.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Recent',
      rawDate: order.createdAt || new Date().toISOString(),
      prescriptionStatus,
      prescriptionUrl,
    };
  });
}