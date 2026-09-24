'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  addToCart as addToCartApi,
  getCart,
  removeCartItem,
  updateCartItem,
  type Cart,
} from './cart-api';

interface CartContextType {
  cart: Cart | null;
  cartCount: number;
  isCartOpen: boolean;
  loading: boolean;
  openCart: () => void;
  closeCart: () => void;
  refreshCart: () => Promise<void>;
  addProductToCart: (
    productId: string,
    quantity?: number,
  ) => Promise<void>;
  increaseQuantity: (itemId: string, quantity: number) => Promise<void>;
  decreaseQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeProduct: (itemId: string) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const getLoggedInUserId = () => {
    try {
      const storedUser = localStorage.getItem('tabibistan_user');

      if (!storedUser) {
        return null;
      }

      const user = JSON.parse(storedUser);

      return user?.id ?? null;
    } catch {
      return null;
    }
  };

  const refreshCart = async () => {
    const userId = getLoggedInUserId();

    if (!userId) {
      setCart(null);
      return;
    }

    try {
      setLoading(true);

      const data = await getCart(userId);

      setCart(data);
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const openCart = () => {
    setIsCartOpen(true);
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  const addProductToCart = async (
    productId: string,
    quantity = 1,
  ) => {
    const userId = getLoggedInUserId();

    if (!userId) {
      alert('Please login before adding products to cart.');
      return;
    }

    try {
      setLoading(true);

      const updatedCart = await addToCartApi(
        userId,
        productId,
        quantity,
      );

      setCart(updatedCart);

      // Open cart immediately after adding product
      setIsCartOpen(true);
    } catch (error) {
      console.error('Failed to add product:', error);

      alert('Unable to add product to cart.');
    } finally {
      setLoading(false);
    }
  };

  const increaseQuantity = async (
    itemId: string,
    quantity: number,
  ) => {
    const userId = getLoggedInUserId();

    if (!userId) return;

    try {
      const updatedCart = await updateCartItem(
        userId,
        itemId,
        quantity + 1,
      );

      setCart(updatedCart);
    } catch (error) {
      console.error('Failed to increase quantity:', error);
    }
  };

  const decreaseQuantity = async (
    itemId: string,
    quantity: number,
  ) => {
    const userId = getLoggedInUserId();

    if (!userId) return;

    if (quantity <= 1) {
      await removeProduct(itemId);
      return;
    }

    try {
      const updatedCart = await updateCartItem(
        userId,
        itemId,
        quantity - 1,
      );

      setCart(updatedCart);
    } catch (error) {
      console.error('Failed to decrease quantity:', error);
    }
  };

  const removeProduct = async (itemId: string) => {
    const userId = getLoggedInUserId();

    if (!userId) return;

    try {
      const updatedCart = await removeCartItem(
        userId,
        itemId,
      );

      setCart(updatedCart);
    } catch (error) {
      console.error('Failed to remove product:', error);
    }
  };

  const cartCount = cart?.totalItems ?? 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        isCartOpen,
        loading,
        openCart,
        closeCart,
        refreshCart,
        addProductToCart,
        increaseQuantity,
        decreaseQuantity,
        removeProduct,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      'useCart must be used inside CartProvider',
    );
  }

  return context;
}