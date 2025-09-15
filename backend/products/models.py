from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from authentication.models import User
import uuid


class ProductCategory(models.Model):
    """
    제품 카테고리 모델
    상의, 하의, 신발, 액세서리 등을 관리
    """
    name = models.CharField(max_length=100, unique=True)
    name_en = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # CSS icon class
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name_en
    
    class Meta:
        db_table = 'easystyle_product_categories'
        ordering = ['sort_order', 'name_en']


class Brand(models.Model):
    """
    브랜드 정보 모델
    """
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='brands/', blank=True, null=True)
    website = models.URLField(blank=True)
    country = models.CharField(max_length=100, blank=True)
    is_premium = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'easystyle_brands'
        ordering = ['name']


class Store(models.Model):
    """
    온라인 쇼핑몰 정보 모델
    """
    name = models.CharField(max_length=200, unique=True)
    website = models.URLField()
    api_endpoint = models.URLField(blank=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    is_partner = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # API 연동 정보
    api_key = models.CharField(max_length=500, blank=True)
    api_secret = models.CharField(max_length=500, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        db_table = 'easystyle_stores'
        ordering = ['name']


class Product(models.Model):
    """
    제품 정보 모델
    """
    # 기본 정보
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE, related_name='products')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products')
    
    # 가격 정보
    original_price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='KRW')
    
    # 제품 상세 정보
    color = models.CharField(max_length=100, blank=True)
    material = models.CharField(max_length=200, blank=True)
    sizes_available = models.JSONField(default=list, blank=True)
    recommended_size = models.CharField(max_length=50, blank=True)
    
    # 이미지 정보
    main_image = models.URLField()
    additional_images = models.JSONField(default=list, blank=True)
    ai_processed_image = models.ImageField(upload_to='products/ai_processed/', blank=True, null=True)
    
    # 스타일링 정보
    style_tags = models.JSONField(default=list, blank=True)  # ["casual", "formal", "sporty"]
    season = models.CharField(max_length=20, blank=True)  # spring, summer, fall, winter
    occasion = models.JSONField(default=list, blank=True)  # ["work", "date", "party"]
    
    # 외부 연동 정보
    external_id = models.CharField(max_length=200, blank=True)  # 쇼핑몰 상품 ID
    product_url = models.URLField()
    affiliate_url = models.URLField(blank=True)
    
    # 상태 및 재고
    is_available = models.BooleanField(default=True)
    stock_status = models.CharField(max_length=50, default='in_stock')
    last_updated_price = models.DateTimeField(auto_now=True)
    
    # 평점 및 리뷰
    rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)]
    )
    review_count = models.PositiveIntegerField(default=0)
    
    # AI 분석 정보
    ai_confidence_score = models.FloatField(null=True, blank=True)
    ai_style_match_score = models.FloatField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.brand.name} - {self.name}"
    
    @property
    def current_price(self):
        """현재 판매 가격 반환 (할인가 우선)"""
        return self.sale_price if self.sale_price else self.original_price
    
    @property
    def is_on_sale(self):
        """할인 중인지 확인"""
        return self.sale_price is not None and self.sale_price < self.original_price
    
    @property
    def discount_percentage(self):
        """할인율 계산"""
        if self.is_on_sale:
            return round(((self.original_price - self.sale_price) / self.original_price) * 100, 1)
        return 0
    
    class Meta:
        db_table = 'easystyle_products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'brand']),
            models.Index(fields=['store', 'is_available']),
            models.Index(fields=['created_at']),
        ]


class UserWishlist(models.Model):
    """
    사용자 위시리스트 모델
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlisted_by')
    added_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.product.name}"
    
    class Meta:
        db_table = 'easystyle_user_wishlist'
        unique_together = ['user', 'product']
        ordering = ['-added_at']


class StyleRecommendation(models.Model):
    """
    AI 스타일 추천 기록 모델
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='product_style_recommendations')
    products = models.ManyToManyField(Product, related_name='recommended_in')
    
    # 추천 정보
    style_prompt = models.TextField()
    generated_image = models.ImageField(upload_to='style_recommendations/')
    ai_description = models.TextField()
    confidence_score = models.FloatField()
    
    # 사용자 피드백
    user_rating = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    user_feedback = models.TextField(blank=True)
    
    # 메타데이터
    processing_time = models.FloatField(null=True, blank=True)
    algorithm_version = models.CharField(max_length=50, default='1.0')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    class Meta:
        db_table = 'easystyle_style_recommendations'
        ordering = ['-created_at']


class ProductAnalytics(models.Model):
    """
    제품 분석 및 통계 모델
    """
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='analytics')
    
    # 노출 및 클릭 통계
    view_count = models.PositiveIntegerField(default=0)
    click_count = models.PositiveIntegerField(default=0)
    wishlist_count = models.PositiveIntegerField(default=0)
    recommendation_count = models.PositiveIntegerField(default=0)
    
    # 스타일링 통계
    times_used_in_styling = models.PositiveIntegerField(default=0)
    average_style_rating = models.FloatField(null=True, blank=True)
    popular_combinations = models.JSONField(default=list, blank=True)
    
    # 사용자 선호도 분석
    age_group_popularity = models.JSONField(default=dict, blank=True)
    style_category_fit = models.JSONField(default=dict, blank=True)
    
    last_updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Analytics for {self.product.name}"
    
    class Meta:
        db_table = 'easystyle_product_analytics'
