import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width = 'w-full', 
  height = 'h-4' 
}) => (
  <div 
    className={`${width} ${height} bg-slate-700 rounded-md animate-pulse ${className}`}
  />
);

export const ImageSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-700 rounded-lg animate-pulse flex items-center justify-center ${className}`}>
    <svg className="w-12 h-12 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
    </svg>
  </div>
);

export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-slate-800 rounded-lg p-4 space-y-3 animate-pulse">
    <ImageSkeleton className="w-full aspect-square" />
    <Skeleton height="h-3" width="w-3/4" />
    <Skeleton height="h-4" width="w-1/2" />
    <Skeleton height="h-3" width="w-2/3" />
  </div>
);

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

export const StyleResultSkeleton: React.FC = () => (
  <div className="p-4 md:p-6 space-y-6 animate-pulse">
    {/* Styled Image Skeleton */}
    <ImageSkeleton className="w-full aspect-square" />
    
    {/* Description Skeleton */}
    <div className="space-y-3">
      <Skeleton height="h-6" width="w-2/3" />
      <Skeleton height="h-4" width="w-full" />
      <Skeleton height="h-4" width="w-4/5" />
      <Skeleton height="h-4" width="w-3/4" />
    </div>
    
    {/* Products Section */}
    <div className="space-y-4">
      <Skeleton height="h-6" width="w-1/3" />
      <ProductGridSkeleton count={6} />
    </div>
  </div>
);

export const LoadingSkeleton: React.FC<{ 
  type?: 'card' | 'list' | 'image' | 'text' | 'product-grid' | 'style-result';
  count?: number;
}> = ({ type = 'text', count = 1 }) => {
  switch (type) {
    case 'card':
      return (
        <div className="space-y-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 space-y-3">
              <Skeleton height="h-4" width="w-3/4" />
              <Skeleton height="h-3" width="w-1/2" />
            </div>
          ))}
        </div>
      );
    
    case 'list':
      return (
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton width="w-8" height="h-8" className="rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton height="h-3" width="w-2/3" />
                <Skeleton height="h-2" width="w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );
    
    case 'image':
      return <ImageSkeleton className="w-full aspect-square" />;
    
    case 'product-grid':
      return <ProductGridSkeleton count={count} />;
    
    case 'style-result':
      return <StyleResultSkeleton />;
    
    default:
      return (
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      );
  }
};

export default LoadingSkeleton;