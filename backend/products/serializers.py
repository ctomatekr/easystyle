from rest_framework import serializers
from .models import (
    ProductCategory, Brand, Store, Product, 
    UserWishlist, StyleRecommendation, ProductAnalytics
)


class ProductCategorySerializer(serializers.ModelSerializer):
    """
    제품 카테고리 시리얼라이저
    """
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductCategory
        fields = [
            'id', 'name', 'name_en', 'description', 'icon', 
            'sort_order', 'is_active', 'product_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_product_count(self, obj):
        return obj.products.filter(is_available=True).count()


class BrandSerializer(serializers.ModelSerializer):
    """
    브랜드 시리얼라이저
    """
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Brand
        fields = [
            'id', 'name', 'description', 'logo', 'website', 
            'country', 'is_premium', 'is_active', 'product_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_product_count(self, obj):
        return obj.products.filter(is_available=True).count()


class StoreSerializer(serializers.ModelSerializer):
    """
    온라인 쇼핑몰 시리얼라이저
    """
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Store
        fields = [
            'id', 'name', 'website', 'is_partner', 'is_active', 
            'product_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'api_key', 'api_secret']
    
    def get_product_count(self, obj):
        return obj.products.filter(is_available=True).count()


class ProductListSerializer(serializers.ModelSerializer):
    """
    제품 목록용 간단한 시리얼라이저
    """
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    category_name = serializers.CharField(source='category.name_en', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    current_price = serializers.ReadOnlyField()
    is_on_sale = serializers.ReadOnlyField()
    discount_percentage = serializers.ReadOnlyField()
    is_wishlisted = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'uuid', 'name', 'brand_name', 'category_name', 'store_name',
            'current_price', 'original_price', 'sale_price', 'currency',
            'is_on_sale', 'discount_percentage', 'color', 'main_image',
            'rating', 'review_count', 'is_available', 'is_wishlisted',
            'product_url', 'recommended_size'
        ]
    
    def get_is_wishlisted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.wishlisted_by.filter(user=request.user).exists()
        return False


class ProductDetailSerializer(serializers.ModelSerializer):
    """
    제품 상세 정보용 시리얼라이저
    """
    brand = BrandSerializer(read_only=True)
    category = ProductCategorySerializer(read_only=True)
    store = StoreSerializer(read_only=True)
    current_price = serializers.ReadOnlyField()
    is_on_sale = serializers.ReadOnlyField()
    discount_percentage = serializers.ReadOnlyField()
    is_wishlisted = serializers.SerializerMethodField()
    analytics = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'uuid', 'name', 'description', 'brand', 'category', 'store',
            'current_price', 'original_price', 'sale_price', 'currency',
            'is_on_sale', 'discount_percentage', 'color', 'material',
            'sizes_available', 'recommended_size', 'main_image', 
            'additional_images', 'style_tags', 'season', 'occasion',
            'product_url', 'affiliate_url', 'is_available', 'stock_status',
            'rating', 'review_count', 'ai_confidence_score', 
            'ai_style_match_score', 'is_wishlisted', 'analytics',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['uuid', 'created_at', 'updated_at']
    
    def get_is_wishlisted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.wishlisted_by.filter(user=request.user).exists()
        return False
    
    def get_analytics(self, obj):
        try:
            analytics = obj.analytics
            return {
                'view_count': analytics.view_count,
                'click_count': analytics.click_count,
                'wishlist_count': analytics.wishlist_count,
                'recommendation_count': analytics.recommendation_count,
                'times_used_in_styling': analytics.times_used_in_styling,
                'average_style_rating': analytics.average_style_rating,
            }
        except ProductAnalytics.DoesNotExist:
            return None


class UserWishlistSerializer(serializers.ModelSerializer):
    """
    사용자 위시리스트 시리얼라이저
    """
    product = ProductListSerializer(read_only=True)
    product_uuid = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = UserWishlist
        fields = ['id', 'product', 'product_uuid', 'added_at', 'notes']
        read_only_fields = ['id', 'added_at']
    
    def create(self, validated_data):
        product_uuid = validated_data.pop('product_uuid')
        try:
            product = Product.objects.get(uuid=product_uuid)
            validated_data['product'] = product
            validated_data['user'] = self.context['request'].user
            return super().create(validated_data)
        except Product.DoesNotExist:
            raise serializers.ValidationError('Product not found')


class StyleRecommendationSerializer(serializers.ModelSerializer):
    """
    스타일 추천 시리얼라이저
    """
    products = ProductListSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = StyleRecommendation
        fields = [
            'id', 'user', 'products', 'style_prompt', 'generated_image',
            'ai_description', 'confidence_score', 'user_rating', 
            'user_feedback', 'processing_time', 'algorithm_version',
            'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']


class ProductSearchSerializer(serializers.Serializer):
    """
    제품 검색용 시리얼라이저
    """
    query = serializers.CharField(max_length=200, required=False)
    category = serializers.UUIDField(required=False)
    brand = serializers.UUIDField(required=False)
    store = serializers.UUIDField(required=False)
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    color = serializers.CharField(max_length=100, required=False)
    size = serializers.CharField(max_length=50, required=False)
    style_tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False
    )
    season = serializers.CharField(max_length=20, required=False)
    is_on_sale = serializers.BooleanField(required=False)
    sort_by = serializers.ChoiceField(
        choices=[
            'newest', 'oldest', 'price_low', 'price_high', 
            'rating', 'popularity', 'relevance'
        ],
        default='newest'
    )


class ProductRecommendationSerializer(serializers.Serializer):
    """
    제품 추천 요청용 시리얼라이저
    """
    style_prompt = serializers.CharField(max_length=1000)
    user_image = serializers.ImageField(required=False)
    preferred_categories = serializers.ListField(
        child=serializers.UUIDField(),
        required=False
    )
    budget_range = serializers.CharField(max_length=50, required=False)
    occasion = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False
    )
    color_preferences = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False
    )