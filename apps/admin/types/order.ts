export interface OrderProductItem {
  productName: string;
  quantity: number;
}

export interface OrderTableItem {
  id: string;
  orderCode: string;
  customerName: string;
  customerEmail: string;
  customerInitials: string;
  items: OrderProductItem[];
  totalQuantity: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  orderDate: string;
  rawDate: string;
  prescriptionStatus: 'Not Required' | 'Uploaded' | 'Missing';
  prescriptionUrl?: string | null;
}