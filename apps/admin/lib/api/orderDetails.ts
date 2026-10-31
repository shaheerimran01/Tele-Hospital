import { OrderDetailsResponse } from '@/types/orderDetails';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

export async function fetchOrderById(id: string): Promise<OrderDetailsResponse> {
  const res = await fetch(`${API_BASE_URL}/orders/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Order details fetch nahi ho saken.');
  }

  const order = await res.json();
  const user = order.user;
  const rawItems = order.items || order.orderItems || [];
  const prescriptions = order.prescriptions || [];

  let customerName = 'Customer';
  let customerEmail = 'No email provided';
  let customerPhone = 'N/A';
  let customerInitials = 'CU';

  if (user) {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    customerName = fullName || user.phone || 'Customer';
    customerEmail = user.email || 'No email provided';
    customerPhone = user.phone || 'N/A';
    customerInitials = (user.firstName?.[0] || 'C') + (user.lastName?.[0] || '');
  }

  let prescriptionUrl: string | null = null;
  if (prescriptions.length > 0 && prescriptions[0]?.fileUrl) {
    const rawUrl = prescriptions[0].fileUrl;
    prescriptionUrl = rawUrl.startsWith('http')
      ? rawUrl
      : `${API_BASE_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  }

  return {
    id: order.id,
    orderCode: `TB-${order.id.slice(0, 8).toUpperCase()}`,
    customerName,
    customerEmail,
    customerPhone,
    customerInitials: customerInitials.toUpperCase(),
    items: rawItems.map((i: any) => ({
      id: i.id || Math.random().toString(),
      productName: i.productName || i.product?.name || i.name || 'Healthcare Item',
      price: i.price || 0,
      quantity: i.quantity || 1,
      total: i.total || (i.price || 0) * (i.quantity || 1),
      isAvailable: i.isAvailable !== false,
    })),
    totalAmount: order.totalAmount || 0,
    status: order.status || 'PENDING',
    paymentStatus: order.paymentStatus || 'PENDING',
    paymentMethod: order.paymentMethod || 'COD',
    shippingAddress: order.shippingAddress || 'No address specified',
    orderDate: order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Recently',
    prescriptionRequired: prescriptions.length > 0 || rawItems.some((i: any) => i.product?.prescriptionRequired),
    prescriptionUrl,
  };
}

export async function updateOrderStatusApi(orderId: string, status: string) {
  const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error('Order status update nahi ho saka.');
  }

  return res.json();
}

export async function updateItemAvailabilityApi(orderId: string, itemId: string, isAvailable: boolean) {
  const res = await fetch(`${API_BASE_URL}/orders/${orderId}/items/${itemId}/availability`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAvailable }),
  });

  if (!res.ok) {
    throw new Error('Item availability update nahi ho saki.');
  }

  return res.json();
}