export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  healthcareProfessional?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  status: string;
  shippingAddress?: string;
  paymentMethod?: string;
  items?: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  user: User;
  totalOrders: number;
  recentOrder: Order | null;
  recentNotification: Notification | null;
}

export interface OrderTableItem {
  id: string;
  orderCode: string;
  userName: string;
  productName: string;
  products?: string[]; // Multiple products support ke liye optional array
  orderDate: string;
  status: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type?: 'order' | 'completed' | 'user' | 'alert' | 'info';
}

export interface AdminDashboardSummary {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  recentOrders: OrderTableItem[];
  recentNotifications: NotificationItem[];
  unreadNotificationsCount: number;
}