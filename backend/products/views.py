from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg
from .models import (
    ProductCategory, Brand, Store, Product, 
    UserWishlist, StyleRecommendation, ProductAnalytics
)
from .serializers import (
    ProductCategorySerializer, BrandSerializer, StoreSerializer,
    ProductListSerializer, ProductDetailSerializer, UserWishlistSerializer,
    StyleRecommendationSerializer, ProductSearchSerializer, 
    ProductRecommendationSerializer
)


class ProductCategoryListView(generics.ListAPIView):
    """
    제품 카테고리 목록 API
    """
    queryset = ProductCategory.objects.filter(is_active=True)
    serializer_class = ProductCategorySerializer
    permission_classes = [permissions.AllowAny]


class BrandListView(generics.ListAPIView):
    """
    브랜드 목록 API
    """
    queryset = Brand.objects.filter(is_active=True)
    serializer_class = BrandSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'country']
    ordering_fields = ['name', 'is_premium', 'created_at']
    ordering = ['name']


class StoreListView(generics.ListAPIView):
    """
    온라인 쇼핑몰 목록 API
    """
    queryset = Store.objects.filter(is_active=True)
    serializer_class = StoreSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'is_partner', 'created_at']
    ordering = ['name']


class ProductListView(generics.ListAPIView):
    """
    제품 목록 API (검색 및 필터링 지원)
    """
    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'brand__name', 'description']
    ordering_fields = ['created_at', 'original_price', 'rating', 'review_count']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = Product.objects.filter(is_available=True).select_related(
            'brand', 'category', 'store'
        )
        
        # 고급 필터링
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category__id=category_id)
        
        brand_id = self.request.query_params.get('brand')
        if brand_id:
            queryset = queryset.filter(brand__id=brand_id)
        
        store_id = self.request.query_params.get('store')
        if store_id:
            queryset = queryset.filter(store__id=store_id)
        
        min_price = self.request.query_params.get('min_price')
        if min_price:
            queryset = queryset.filter(
                Q(sale_price__gte=min_price) | 
                (Q(sale_price__isnull=True) & Q(original_price__gte=min_price))
            )
        
        max_price = self.request.query_params.get('max_price')
        if max_price:
            queryset = queryset.filter(
                Q(sale_price__lte=max_price) | 
                (Q(sale_price__isnull=True) & Q(original_price__lte=max_price))
            )
        
        color = self.request.query_params.get('color')
        if color:
            queryset = queryset.filter(color__icontains=color)
        
        is_on_sale = self.request.query_params.get('is_on_sale')
        if is_on_sale == 'true':
            queryset = queryset.filter(sale_price__isnull=False)
        
        # 스타일 태그 필터링
        style_tags = self.request.query_params.getlist('style_tags')
        if style_tags:
            for tag in style_tags:
                queryset = queryset.filter(style_tags__contains=[tag])
        
        # 정렬 옵션
        sort_by = self.request.query_params.get('sort_by', 'newest')
        if sort_by == 'price_low':
            queryset = queryset.extra(
                select={
                    'current_price': 'CASE WHEN sale_price IS NOT NULL THEN sale_price ELSE original_price END'
                }
            ).order_by('current_price')
        elif sort_by == 'price_high':
            queryset = queryset.extra(
                select={
                    'current_price': 'CASE WHEN sale_price IS NOT NULL THEN sale_price ELSE original_price END'
                }
            ).order_by('-current_price')
        elif sort_by == 'rating':
            queryset = queryset.order_by('-rating')
        elif sort_by == 'popularity':
            queryset = queryset.annotate(
                popularity_score=Count('wishlisted_by') + Count('recommended_in')
            ).order_by('-popularity_score')
        elif sort_by == 'oldest':
            queryset = queryset.order_by('created_at')
        else:  # newest (default)
            queryset = queryset.order_by('-created_at')
        
        return queryset


class ProductDetailView(generics.RetrieveAPIView):
    """
    제품 상세 정보 API
    """
    serializer_class = ProductDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'uuid'
    
    def get_queryset(self):
        return Product.objects.select_related(
            'brand', 'category', 'store'
        ).prefetch_related('wishlisted_by')
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # 조회수 증가
        analytics, created = ProductAnalytics.objects.get_or_create(product=instance)
        analytics.view_count += 1
        analytics.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class UserWishlistView(generics.ListCreateAPIView):
    """
    사용자 위시리스트 API
    """
    serializer_class = UserWishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserWishlist.objects.filter(user=self.request.user).select_related(
            'product__brand', 'product__category', 'product__store'
        )


class UserWishlistDetailView(generics.RetrieveDestroyAPIView):
    """
    위시리스트 개별 항목 관리 API
    """
    serializer_class = UserWishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserWishlist.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_wishlist(request):
    """
    위시리스트 토글 API (추가/제거)
    """
    product_uuid = request.data.get('product_uuid')
    if not product_uuid:
        return Response({'error': 'Product UUID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        product = Product.objects.get(uuid=product_uuid)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    wishlist_item, created = UserWishlist.objects.get_or_create(
        user=request.user,
        product=product
    )
    
    if not created:
        # 이미 위시리스트에 있으면 제거
        wishlist_item.delete()
        # 분석 데이터 업데이트
        analytics, _ = ProductAnalytics.objects.get_or_create(product=product)
        analytics.wishlist_count = max(0, analytics.wishlist_count - 1)
        analytics.save()
        return Response({'message': 'Removed from wishlist', 'wishlisted': False})
    else:
        # 위시리스트에 추가
        analytics, _ = ProductAnalytics.objects.get_or_create(product=product)
        analytics.wishlist_count += 1
        analytics.save()
        return Response({'message': 'Added to wishlist', 'wishlisted': True})


class StyleRecommendationListView(generics.ListCreateAPIView):
    """
    스타일 추천 기록 API
    """
    serializer_class = StyleRecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return StyleRecommendation.objects.filter(user=self.request.user).prefetch_related(
            'products__brand', 'products__category', 'products__store'
        )
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def search_products(request):
    """
    고급 제품 검색 API
    """
    serializer = ProductSearchSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        
        queryset = Product.objects.filter(is_available=True).select_related(
            'brand', 'category', 'store'
        )
        
        # 검색 쿼리 적용
        if data.get('query'):
            query = data['query']
            queryset = queryset.filter(
                Q(name__icontains=query) |
                Q(brand__name__icontains=query) |
                Q(description__icontains=query) |
                Q(style_tags__contains=[query])
            )
        
        # 다양한 필터 적용
        if data.get('category'):
            queryset = queryset.filter(category__id=data['category'])
        
        if data.get('brand'):
            queryset = queryset.filter(brand__id=data['brand'])
        
        if data.get('store'):
            queryset = queryset.filter(store__id=data['store'])
        
        if data.get('min_price'):
            queryset = queryset.filter(
                Q(sale_price__gte=data['min_price']) | 
                (Q(sale_price__isnull=True) & Q(original_price__gte=data['min_price']))
            )
        
        if data.get('max_price'):
            queryset = queryset.filter(
                Q(sale_price__lte=data['max_price']) | 
                (Q(sale_price__isnull=True) & Q(original_price__lte=data['max_price']))
            )
        
        if data.get('color'):
            queryset = queryset.filter(color__icontains=data['color'])
        
        if data.get('size'):
            queryset = queryset.filter(sizes_available__contains=[data['size']])
        
        if data.get('style_tags'):
            for tag in data['style_tags']:
                queryset = queryset.filter(style_tags__contains=[tag])
        
        if data.get('season'):
            queryset = queryset.filter(season=data['season'])
        
        if data.get('is_on_sale'):
            queryset = queryset.filter(sale_price__isnull=False)
        
        # 정렬 적용
        sort_by = data.get('sort_by', 'newest')
        if sort_by == 'price_low':
            queryset = queryset.extra(
                select={
                    'current_price': 'CASE WHEN sale_price IS NOT NULL THEN sale_price ELSE original_price END'
                }
            ).order_by('current_price')
        elif sort_by == 'price_high':
            queryset = queryset.extra(
                select={
                    'current_price': 'CASE WHEN sale_price IS NOT NULL THEN sale_price ELSE original_price END'
                }
            ).order_by('-current_price')
        elif sort_by == 'rating':
            queryset = queryset.order_by('-rating')
        elif sort_by == 'popularity':
            queryset = queryset.annotate(
                popularity_score=Count('wishlisted_by') + Count('recommended_in')
            ).order_by('-popularity_score')
        elif sort_by == 'oldest':
            queryset = queryset.order_by('created_at')
        else:
            queryset = queryset.order_by('-created_at')
        
        # 페이지네이션 적용
        page_size = 20
        page = int(request.data.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size
        
        total_count = queryset.count()
        products = queryset[start:end]
        
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        
        return Response({
            'results': serializer.data,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'has_next': end < total_count,
            'has_previous': page > 1
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def product_statistics(request):
    """
    제품 통계 API
    """
    stats = {
        'total_products': Product.objects.filter(is_available=True).count(),
        'total_brands': Brand.objects.filter(is_active=True).count(),
        'total_stores': Store.objects.filter(is_active=True).count(),
        'categories': []
    }
    
    # 카테고리별 제품 수
    categories = ProductCategory.objects.filter(is_active=True).annotate(
        product_count=Count('products', filter=Q(products__is_available=True))
    )
    
    for category in categories:
        stats['categories'].append({
            'id': category.id,
            'name': category.name_en,
            'product_count': category.product_count
        })
    
    return Response(stats)
