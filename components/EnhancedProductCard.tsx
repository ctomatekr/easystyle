import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { CheckCircleIcon, RadioButtonIcon, HeartIcon } from './icons';

interface EnhancedProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: () => void;
  onWishlist?: () => void;
  isInWishlist?: boolean;
  fallbackImageUrl: string;
  showDetailedInfo?: boolean;
}

const EnhancedProductCard: React.FC<EnhancedProductCardProps> = ({ 
  product, 
  isSelected, 
  onSelect, 
  onWishlist,
  isInWishlist = false,
  fallbackImageUrl,
  showDetailedInfo = true
}) => {
  const [imgSrc, setImgSrc] = useState(product.imageUrl);
  const [showDetails, setShowDetails] = useState(false);
  const hasTriedCroppedFallback = useRef(false);

  const handleError = () => {
    if (product.croppedImageBase64 && !hasTriedCroppedFallback.current) {
      setImgSrc(`data:image/png;base64,${product.croppedImageBase64}`);
      hasTriedCroppedFallback.current = true;
    } else {
      setImgSrc(fallbackImageUrl);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price / 1300);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWishlist?.();
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDetails(!showDetails);
  };

  return (
    <div className="relative">
      <div
        onClick={onSelect}
        className={`bg-white rounded-xl overflow-hidden shadow-lg transition-all duration-300 cursor-pointer border-3 ${
          isSelected 
            ? 'border-sky-400 shadow-xl transform scale-105' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-xl'
        } relative flex flex-col`}
      >
        {/* Image Container */}
        <div className="relative w-full" style={{ paddingBottom: '125%' }}>
          <img
            src={imgSrc}
            alt={product.name}
            className="absolute top-0 left-0 w-full h-full object-cover"
            onError={handleError}
          />
          
          {/* Overlay Buttons */}
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            {/* Selection Indicator */}
            {isSelected
              ? <CheckCircleIcon className="w-7 h-7 text-sky-400 bg-white rounded-full shadow-lg" />
              : <RadioButtonIcon className="w-7 h-7 text-gray-400 bg-white rounded-full shadow-sm" />
            }
            
            {/* Wishlist Button */}
            {onWishlist && (
              <button
                onClick={handleWishlistClick}
                className="p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
              >
                <HeartIcon 
                  className={`w-6 h-6 ${isInWishlist ? 'text-red-500' : 'text-gray-400'}`} 
                  filled={isInWishlist}
                />
              </button>
            )}
          </div>

          {/* Category Badge */}
          <div className="absolute top-2 left-2">
            <span className="bg-sky-100 text-sky-800 text-xs font-medium px-2 py-1 rounded-full">
              {product.category}
            </span>
          </div>
        </div>

        {/* Product Information */}
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-gray-500 truncate font-medium uppercase tracking-wide">
                {product.brand}
              </p>
              <h3 className="text-sm font-semibold text-gray-900 mt-1 leading-tight line-clamp-2">
                {product.name}
              </h3>
            </div>
          </div>

          {/* Price and Size */}
          <div className="flex items-center justify-between mt-auto">
            <div>
              <p className="text-lg font-bold text-sky-600">{formatPrice(product.price)}</p>
              {product.recommendedSize && (
                <p className="text-xs text-gray-500 mt-1">
                  추천 사이즈: {product.recommendedSize}
                </p>
              )}
            </div>
            
            {showDetailedInfo && (
              <button
                onClick={handleDetailsClick}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-full transition-colors"
              >
                {showDetails ? '간단히' : '자세히'}
              </button>
            )}
          </div>

          {/* Store Information */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {product.storeName}에서
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && showDetailedInfo && (
        <div className="absolute top-full left-0 right-0 z-10 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">상품 상세정보</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">브랜드:</span> {product.brand}</p>
                <p><span className="font-medium">카테고리:</span> {product.category}</p>
                <p><span className="font-medium">스토어:</span> {product.storeName}</p>
                {product.recommendedSize && (
                  <p><span className="font-medium">추천 사이즈:</span> {product.recommendedSize}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onSelect}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-sky-100 text-sky-700 border border-sky-200'
                    : 'bg-sky-500 text-white hover:bg-sky-600'
                }`}
              >
                {isSelected ? '선택됨' : '상품 선택'}
              </button>
              
              <a
                href={product.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                스토어 보기
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedProductCard;