'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  isAvailable?: boolean;
}

interface UserOrder {
  id: string;
  orderCode: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem('tabibistan_user') ||
        localStorage.getItem('user') ||
        localStorage.getItem('userData');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed.user || parsed.data?.user || parsed);
      } else {
        router.push('/');
      }
    } catch {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (user?.id) {
      loadUserOrders();
    }
  }, [user?.id]);

  const loadUserOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:4000/orders?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        const mappedOrders = data.map((order: any) => ({
          id: order.id,
          orderCode: `TB-${order.id.slice(0, 8).toUpperCase()}`,
          totalAmount: order.totalAmount || 0,
          status: order.status || 'PENDING',
          paymentMethod: order.paymentMethod || 'COD',
          paymentStatus: order.paymentStatus || 'PENDING',
          createdAt: order.createdAt,
          items: order.items || [],
        }));
        setOrders(mappedOrders);
      }
    } catch (err) {
      console.error('Failed to load user orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const st = status.toUpperCase();
    if (st === 'COMPLETED') return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold">Completed</span>;
    if (st === 'PROCESSING') return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-xs font-bold">Processing</span>;
    if (st === 'CONFIRMED') return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md text-xs font-bold">Confirmed</span>;
    if (st === 'REVIEWING') return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-md text-xs font-bold">Reviewing</span>;
    if (st === 'CANCELLED') return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-md text-xs font-bold">Cancelled</span>;
    return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold">Pending</span>;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">My Orders</h1>
            <p className="text-xs text-gray-500 mt-1">
              Aapke tamam past aur active orders ki list yahan hai.
            </p>
          </div>
          <button
            onClick={loadUserOrders}
            className="px-3.5 py-1.5 text-xs font-bold text-[#ff6f61] border border-[#ff6f61] rounded-lg hover:bg-red-50 transition cursor-pointer"
          >
            🔄 Refresh Orders
          </button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400 text-sm">
            Orders load ho rahe hain...
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400 text-sm space-y-3">
            <p className="text-gray-500 font-semibold">Aap ne abhi tak koi order nahi kiya.</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-[#ff6f61] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#e85b4d] transition"
            >
              Start Shopping Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-900 text-base">{order.orderCode}</span>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="text-xs text-gray-500">
                    Placed on:{' '}
                    <span className="font-semibold text-gray-800">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Items Badges Preview */}
                <div className="flex flex-wrap gap-2">
                  {order.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>{item.productName}</span>
                      <span className="bg-gray-200 text-gray-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                        x{item.quantity}
                      </span>
                    </span>
                  ))}
                </div>

                {/* Order Bottom Details */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Amount</span>
                    <span className="text-base font-black text-[#ff6f61]">
                      Rs. {order.totalAmount.toLocaleString()}
                    </span>
                  </div>

                  <Link
                    href={`/orders/${order.id}`}
                    className="px-4 py-2 bg-[#ff6f61] hover:bg-[#e85b4d] text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}