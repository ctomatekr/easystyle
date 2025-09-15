import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { CheckCircleIcon, RadioButtonIcon } from './icons';

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: () => void;
  fallbackImageUrl: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isSelected, onSelect, fallbackImageUrl }) => {
  const [imgSrc, setImgSrc] = useState(product.imageUrl);
  const hasTriedCroppedFallback = useRef(false);

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price / 1300); // Approximate USD conversion
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
