import { AdminDashboardSummary, OrderTableItem, NotificationItem } from '@/types/dashboard';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tabibistan.org';

export async function fetchAdminDashboardData(): Promise<AdminDashboardSummary> {
  // Direct Global Admin API Calls
  const [productsRes, notificationsRes, ordersRes, usersRes] = await Promise.all([
    fetch(`${API_BASE_URL}/products`, { cache: 'no-store' }),
    fetch(`${API_BASE_URL}/notifications`, { cache: 'no-store' }),
    fetch(`${API_BASE_URL}/orders`, { cache: 'no-store' }), // ALL ORDERS
    fetch(`${API_BASE_URL}/users`, { cache: 'no-store' }),   // ALL USERS
  ]);

  // 1. Process All Orders
  let orders: any[] = [];
  if (ordersRes.ok) {
    const rawOrders = await ordersRes.json();
    orders = Array.isArray(rawOrders) ? rawOrders : [];
  }

  const totalOrders = orders.length;

  // Pending orders calculation across whole store
  const pendingOrders = orders.filter(
    (order) => order.status && order.status.toString().toUpperCase() === 'PENDING'
  ).length;

  // 2. Process All Users
  let totalUsers = 0;
  if (usersRes.ok) {
    const usersData = await usersRes.json();
    totalUsers = Array.isArray(usersData) ? usersData.length : (usersData.total || 0);
  }

  // 3. Process All Products
  let totalProducts = 0;
  if (productsRes.ok) {
    const productsData = await productsRes.json();
    totalProducts = productsData.total || (Array.isArray(productsData) ? productsData.length : 0);
  }

  // 4. Process Notifications
  let notificationsList: NotificationItem[] = [];
  if (notificationsRes.ok) {
    const rawNotifications = await notificationsRes.json();
    if (Array.isArray(rawNotifications)) {
      notificationsList = rawNotifications.map((n: any) => ({
        id: n.id,
        title: n.title || 'Notification',
        message: n.message || '',
        createdAt: n.createdAt
          ? new Date(n.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Recently',
        type: n.type || 'info',
      }));
    }
  }

  // 5. Recent 5 Orders Table Formatting with MULTIPLE PRODUCTS Extraction
  const recentOrders: OrderTableItem[] = orders.slice(0, 5).map((order: any) => {
    // Smart User Name Extractor Logic
    let customerName = 'Customer';

    if (order.user) {
      const firstName = order.user.firstName?.trim() || '';
      const lastName = order.user.lastName?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim();

      if (fullName.length > 0) {
        customerName = fullName;
      } else if (order.user.phone) {
        customerName = `User (${order.user.phone})`;
      } else if (order.user.email) {
        customerName = order.user.email.split('@')[0];
      }
    }

    // 👈 EXTRACT ALL ITEMS IN ORDER (Not just first item)
    const itemsList: string[] = Array.isArray(order.items) && order.items.length > 0
      ? order.items.map((item: any) => {
          const name = item.productName || item.product?.name || 'Healthcare Item';
          return item.quantity && item.quantity > 1 ? `${name} (x${item.quantity})` : name;
        })
      : ['Healthcare Item'];

    return {
      id: order.id,
      orderCode: `TB-${order.id.slice(0, 5).toUpperCase()}`,
      userName: customerName,
      productName: itemsList.join(', '),
      products: itemsList, // 👈 Multi-product array
      orderDate: order.createdAt
        ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Recent',
      status: order.status || 'PENDING',
    };
  });

  return {
    totalUsers,
    totalProducts,
    totalOrders,
    pendingOrders,
    recentOrders,
    recentNotifications: notificationsList.slice(0, 5),
    unreadNotificationsCount: notificationsList.length,
  };
}