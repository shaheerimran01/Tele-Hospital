const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface CartProduct {
  id: string;
  name: string;
  manufacturer?: string | null;
  genericName?: string | null;
  brandName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  [key: string]: unknown;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  product: CartProduct;
}

export interface Cart {
  id: string | null;
  userId: string;
  items: CartItem[];
  totalItems: number;
}

export async function getCart(userId: string): Promise<Cart> {
  const response = await fetch(`${API_URL}/cart/${userId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch cart');
  }

  return response.json();
}

export async function addToCart(
  userId: string,
  productId: string,
  quantity = 1,
): Promise<Cart> {
  const response = await fetch(`${API_URL}/cart/${userId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId,
      quantity,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to add product to cart');
  }

  return response.json();
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  quantity: number,
): Promise<Cart> {
  const response = await fetch(
    `${API_URL}/cart/${userId}/items/${itemId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quantity,
      }),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to update cart item');
  }

  return response.json();
}

export async function removeCartItem(
  userId: string,
  itemId: string,
): Promise<Cart> {
  const response = await fetch(
    `${API_URL}/cart/${userId}/items/${itemId}`,
    {
      method: 'DELETE',
    },
  );

  if (!response.ok) {
    throw new Error('Failed to remove cart item');
  }

  return response.json();
}

export async function clearCart(userId: string): Promise<Cart> {
  const response = await fetch(`${API_URL}/cart/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to clear cart');
  }

  return response.json();
}