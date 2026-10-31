import { NotificationItem, OrderItemSummary } from '@/types/notification';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch(`${API_BASE_URL}/notifications`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Notifications fetch nahi ho saken.');
  }

  const rawData = await res.json();
  if (!Array.isArray(rawData)) return [];

  return rawData.map((item: any): NotificationItem => {
    const order = item.order;
    const user = order?.user;
    const pharmacy = item.pharmacy;

    // Check Notification Type
    const isPharmacyType = 
      item.type === 'NEW_PHARMACY_REGISTRATION' || 
      Boolean(item.pharmacyId) || 
      Boolean(pharmacy);

    const isOrderType = 
      Boolean(item.orderId) || 
      item.type?.toLowerCase().includes('order');

    // Assign Category
    let category: 'orders' | 'products' | 'pharmacies' = 'products';
    if (isPharmacyType) {
      category = 'pharmacies';
    } else if (isOrderType) {
      category = 'orders';
    }

    // Order Items Mapping
    const items: OrderItemSummary[] = order?.items && order.items.length > 0
      ? order.items.map((i: any) => ({
          productName: i.productName || 'Healthcare Item',
          quantity: i.quantity || 1,
        }))
      : [];

    // Safe Pharmacy Name Parsing (Fallback if pharmacy relation not populated)
    let extractedPharmacyName = pharmacy?.name;
    if (!extractedPharmacyName && isPharmacyType && item.message) {
      const match = item.message.match(/^([^(]+)/);
      if (match && match[1]) {
        extractedPharmacyName = match[1].trim();
      }
    }
    extractedPharmacyName = extractedPharmacyName || 'Pharmacy Application';

    // Customer & Avatar Initials Logic
    let customerName = 'Admin';
    let customerInitials = 'AD';

    if (isPharmacyType) {
      customerName = extractedPharmacyName;
      customerInitials = extractedPharmacyName.slice(0, 2).toUpperCase();
    } else if (user) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      customerName = name || user.phone || user.email || 'Customer';
      customerInitials = (user.firstName?.[0] || 'C') + (user.lastName?.[0] || '');
    } else if (item.title?.toLowerCase().includes('order')) {
      customerName = 'Customer';
      customerInitials = 'CU';
    }

    const prescriptions = order?.prescriptions || [];
    const hasPrescription = prescriptions.length > 0;

    let fullPrescriptionUrl: string | null = null;
    if (hasPrescription && prescriptions[0]?.fileUrl) {
      const rawUrl = prescriptions[0].fileUrl;
      fullPrescriptionUrl = rawUrl.startsWith('http')
        ? rawUrl
        : `${API_BASE_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
    }

    let formattedDate = 'Today';
    if (item.createdAt) {
      const date = new Date(item.createdAt);
      formattedDate = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    return {
      id: item.id,
      type: item.type || 'INFO',
      title: item.title || 'Notification',
      message: item.message || '',
      category,
      isRead: !!item.isRead,
      createdAt: formattedDate,

      orderId: item.orderId || undefined,
      productId: item.productId || undefined,
      pharmacyId: item.pharmacyId || pharmacy?.id || undefined,

      customerName,
      customerInitials: customerInitials.toUpperCase(),
      items,
      orderCode: order ? `TB-${order.id.slice(0, 8).toUpperCase()}` : (isOrderType ? 'TB-10245' : undefined),
      
      prescriptionRequired: hasPrescription || item.type === 'NEW_PRESCRIPTION',
      prescriptionUrl: fullPrescriptionUrl || undefined,

      // Pharmacy Object
      pharmacy: {
        id: pharmacy?.id || item.pharmacyId,
        name: extractedPharmacyName,
        ownerName: pharmacy?.ownerName || 'Pharmacy Owner',
        pharmacistRegNum: pharmacy?.pharmacistRegNum || 'N/A',
        cnicNtnNumber: pharmacy?.cnicNtnNumber || 'N/A',
      },
    };
  });
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export async function deleteNotification(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
    method: 'DELETE',
  });
  return res.ok;
}