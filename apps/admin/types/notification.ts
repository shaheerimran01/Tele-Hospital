export interface OrderItemSummary {
  productName: string;
  quantity: number;
}

export interface NotificationItem {
  id: string;
  type?: string;
  title: string;
  message?: string;
  category?: 'orders' | 'products' | 'pharmacies';
  isRead: boolean;
  createdAt: string;

  customerName?: string;
  customerInitials?: string;
  orderId?: string;
  productId?: string;
  pharmacyId?: string;
  orderCode?: string;

  prescriptionRequired?: boolean;
  prescriptionUrl?: string | null;

  items?: OrderItemSummary[];

  pharmacy?: {
    id?: string;
    name?: string;
    ownerName?: string;
    pharmacistRegNum?: string;
    cnicNtnNumber?: string;
  };
}