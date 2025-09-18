import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { CheckCircleIcon, RadioButtonIcon } from './icons';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: () => void;
  fallbackImageUrl: string;
  showCartButton?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isSelected, onSelect, fallbackImageUrl, showCartButton = false }) => {
  const [imgSrc, setImgSrc] = useState(product.imageUrl);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const hasTriedCroppedFallback = useRef(false);
  const { addToCart, isInCart } = useCart();
  const { isAuthenticated } = useAuth();

  const handleError = () => {
    // 1순위: 실제 상품 이미지 (초기값)
    // 2순위: AI가 생성한 부분 확대 이미지
    if (product.croppedImageBase64 && !hasTriedCroppedFallback.current) {
      setImgSrc(`data:image/png;base64,${product.croppedImageBase64}`);
      hasTriedCroppedFallback.current = true;
    } else {
    // 3순위: 전체 스타일링 이미지
      setImgSrc(fallbackImageUrl);
    }
  };

  // 모든 제품이 KRW 국내 쇼핑몰 제품이므로 KRW 형식으로 통일
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      alert('로그인이 필요합니다.');
      return;
    }

    setIsAddingToCart(true);
    const success = await addToCart(
      product.id,
      product.recommendedSize || '',
      1
    );

    if (success) {
      // 성공 피드백은 context에서 관리됨
    }
    setIsAddingToCart(false);
  };

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-xl overflow-hidden shadow-lg transition-all duration-300 cursor-pointer border-3 ${isSelected ? 'border-sky-400 shadow-xl transform scale-105' : 'border-gray-200 hover:border-gray-300'} relative flex flex-col`}
    >
      <div className="relative w-full" style={{ paddingBottom: '125%' }}>
        <img
          src={imgSrc}
          alt={product.name}
          className="absolute top-0 left-0 w-full h-full object-cover"
          onError={handleError}
        />
      </div>
      <div className="p-3 flex flex-col flex-grow">
        <p className="text-xs text-gray-500 truncate font-medium">{product.brand}</p>
        <h3 className="text-sm font-semibold text-gray-900 mt-1 h-10 leading-tight">{product.name}</h3>
        <div className="flex-grow"></div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-lg font-bold text-sky-600">{formatPrice(product.price)}</p>
          {product.recommendedSize && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              사이즈: {product.recommendedSize}
            </span>
          )}
        </div>

        {/* 장바구니 버튼 */}
        {showCartButton && (
          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart || isInCart(product.id, product.recommendedSize)}
            className={`mt-3 px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
              isInCart(product.id, product.recommendedSize)
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'bg-sky-500 text-white hover:bg-sky-600 disabled:bg-gray-300'
            }`}
          >
            {isAddingToCart
              ? '추가 중...'
              : isInCart(product.id, product.recommendedSize)
              ? '장바구니에 있음'
              : '장바구니 추가'
            }
          </button>
        )}
      </div>
      <div className="absolute top-2 right-2">
        {isSelected
          ? <CheckCircleIcon className="w-7 h-7 text-sky-400 bg-white rounded-full shadow-lg" />
          : <RadioButtonIcon className="w-7 h-7 text-gray-400 bg-white rounded-full shadow-sm" />
        }
      </div>
    </div>
  );
};

export default ProductCard;
