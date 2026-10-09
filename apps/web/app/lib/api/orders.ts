// apps/web/app/lib/api/orders.ts

export interface OrderItemPayload {
  productId: string;
  quantity: number;
}

export interface CreateOrderPayload {
  shippingAddress: string;
  paymentMethod: string;
  items?: OrderItemPayload[];
  lat?: number;
  lng?: number;
}

export async function placeOrderApi(userId: string, payload: CreateOrderPayload) {
  const response = await fetch(`http://localhost:4000/orders?userId=${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Order place karne me masla aaya.');
  }

  return response.json();
}