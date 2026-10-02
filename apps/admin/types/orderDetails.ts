export interface OrderDetailItem {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
  isAvailable?: boolean;
}

export interface OrderDetailsResponse {
  id: string;
  orderCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerInitials: string;
  items: OrderDetailItem[];
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: string;
  orderDate: string;
  prescriptionRequired: boolean;
  prescriptionUrl: string | null;
}