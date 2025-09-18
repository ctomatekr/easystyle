import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiUtils, cartAPI } from '../services/apiService';

// 장바구니 아이템 타입 정의
interface CartProduct {
  uuid: string;
  name: string;
  brand_name: string;
  category_name: string;
  current_price: number;
  original_price: number;
  sale_price?: number;
  main_image: string;
  is_on_sale: boolean;
  discount_percentage: number;
}

interface CartItem {
  id: number;
  product: CartProduct;
  size: string;
  quantity: number;
  style_set_id?: string;
  subtotal: number;
  added_at: string;
}

interface Cart {
  id: number;
  user: string;
  items: CartItem[];
  total_items: number;
  total_price: number;
  created_at: string;
  updated_at: string;
}

// 장바구니 컨텍스트 타입
interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;

  // 장바구니 조회
  fetchCart: () => Promise<void>;

  // 상품 추가
  addToCart: (productUuid: string, size?: string, quantity?: number, styleSetId?: string) => Promise<boolean>;

  // 수량 변경
  updateCartItem: (itemId: number, quantity: number) => Promise<boolean>;

  // 상품 제거
  removeFromCart: (itemId: number) => Promise<boolean>;

  // 장바구니 비우기
  clearCart: () => Promise<boolean>;

  // 헬퍼 함수들
  isInCart: (productUuid: string, size?: string) => boolean;
  getCartItemCount: () => number;
  getCartTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingCart, setFetchingCart] = useState(false); // 중복 요청 방지


  // 장바구니 조회
  const fetchCart = async () => {
    if (!apiUtils.isAuthenticated()) {
      setCart(null);
      return;
    }

    // 이미 요청 중이면 중복 요청 방지
    if (fetchingCart) {
      return;
    }

    try {
      setFetchingCart(true);
      setLoading(true);
      setError(null);
      const cartData = await cartAPI.getCart();
      setCart(cartData);
    } catch (err: any) {
      console.error('Error fetching cart:', err);
      setError(err.message || 'Failed to load cart');
      setCart(null);
    } finally {
      setLoading(false);
      setFetchingCart(false);
    }
  };

  // 상품 추가
  const addToCart = async (
    productUuid: string,
    size = '',
    quantity = 1,
    styleSetId = ''
  ): Promise<boolean> => {
    if (!apiUtils.isAuthenticated()) {
      setError('로그인이 필요합니다.');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const cartData = await cartAPI.addToCart({
        product_uuid: productUuid,
        size,
        quantity,
        style_set_id: styleSetId
      });

      setCart(cartData);
      return true;
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      setError(err.message || 'Failed to add item to cart');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 수량 변경
  const updateCartItem = async (itemId: number, quantity: number): Promise<boolean> => {
    if (!apiUtils.isAuthenticated()) {
      setError('로그인이 필요합니다.');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const cartData = await cartAPI.updateCartItem(itemId, quantity);

      setCart(cartData);
      return true;
    } catch (err: any) {
      console.error('Error updating cart item:', err);
      setError(err.message || 'Failed to update cart item');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 상품 제거
  const removeFromCart = async (itemId: number): Promise<boolean> => {
    if (!apiUtils.isAuthenticated()) {
      setError('로그인이 필요합니다.');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const cartData = await cartAPI.removeFromCart(itemId);

      setCart(cartData);
      return true;
    } catch (err: any) {
      console.error('Error removing from cart:', err);
      setError(err.message || 'Failed to remove item from cart');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 장바구니 비우기
  const clearCart = async (): Promise<boolean> => {
    if (!apiUtils.isAuthenticated()) {
      setError('로그인이 필요합니다.');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const cartData = await cartAPI.clearCart();

      setCart(cartData);
      return true;
    } catch (err: any) {
      console.error('Error clearing cart:', err);
      setError(err.message || 'Failed to clear cart');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 헬퍼 함수들
  const isInCart = (productUuid: string, size = ''): boolean => {
    if (!cart || !cart.items) return false;

    return cart.items.some(item =>
      item.product.uuid === productUuid &&
      item.size === size
    );
  };

  const getCartItemCount = (): number => {
    return cart?.total_items || 0;
  };

  const getCartTotal = (): number => {
    return cart?.total_price || 0;
  };

  // 인증 상태 변경 시 장바구니 조회 (컴포넌트 마운트 시 한 번만)
  useEffect(() => {
    if (apiUtils.isAuthenticated()) {
      fetchCart();
    }
  }, []);

  // 로그인 상태 변경 감지 (로컬스토리지 변경 감지)
  useEffect(() => {
    const handleStorageChange = () => {
      if (apiUtils.isAuthenticated() && !cart) {
        fetchCart();
      } else if (!apiUtils.isAuthenticated() && cart) {
        setCart(null);
      }
    };

    // 로컬스토리지 변경 이벤트 리스너
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // dependency 제거하여 무한 루프 방지

  const value: CartContextType = {
    cart,
    loading,
    error,
    fetchCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    isInCart,
    getCartItemCount,
    getCartTotal,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};