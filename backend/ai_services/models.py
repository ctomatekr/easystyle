from django.db import models
from authentication.models import User
import uuid


class AIStyleRequest(models.Model):
    """
    AI 스타일 요청 모델
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_style_requests')
    
    # 요청 정보
    style_prompt = models.TextField()
    user_image = models.ImageField(upload_to='ai_requests/user_images/', blank=True, null=True)
    
    # 처리 상태
    processing_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True)
    
    # 메타데이터
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.style_prompt[:50]}..."
    
    class Meta:
        db_table = 'easystyle_ai_style_requests'
        ordering = ['-created_at']


class AIStyleResponse(models.Model):
    """
    AI 스타일 응답 모델
    """
    request = models.OneToOneField(
        AIStyleRequest, 
        on_delete=models.CASCADE, 
        related_name='response'
    )
    
    # 생성된 결과
    generated_image = models.ImageField(upload_to='ai_responses/generated_images/')
    ai_description = models.TextField()
    confidence_score = models.FloatField(default=0.0)
    
    # 처리 정보
    processing_time = models.FloatField(null=True, blank=True)  # 초 단위
    algorithm_version = models.CharField(max_length=50, default='1.0')
    
    # 사용자 피드백
    user_rating = models.PositiveIntegerField(
        null=True, 
        blank=True,
        choices=[(i, i) for i in range(1, 6)]
    )
    user_feedback = models.TextField(blank=True)
    
    # 메타데이터
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Response for {self.request.user.username} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    class Meta:
        db_table = 'easystyle_ai_style_responses'
        ordering = ['-created_at']


class AIProductRecommendation(models.Model):
    """
    AI 상품 추천 모델
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_product_recommendations')
    style_request = models.ForeignKey(AIStyleRequest, on_delete=models.CASCADE, related_name='product_recommendations')
    
    # 추천 정보
    recommendation_prompt = models.TextField()
    recommended_products = models.JSONField(default=list)  # 추천된 상품 UUID 목록
    recommendation_reason = models.TextField()
    
    # AI 분석 정보
    user_style_analysis = models.JSONField(default=dict)  # 사용자 스타일 분석 결과
    color_palette = models.JSONField(default=list)  # 추천 색상 팔레트
    style_categories = models.JSONField(default=list)  # 추천 스타일 카테고리
    
    # 사용자 피드백
    user_rating = models.PositiveIntegerField(
        null=True, 
        blank=True,
        choices=[(i, i) for i in range(1, 6)]
    )
    user_feedback = models.TextField(blank=True)
    
    # 메타데이터
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Product recommendation for {self.user.username} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    class Meta:
        db_table = 'easystyle_ai_product_recommendations'
        ordering = ['-created_at']


class AIServiceLog(models.Model):
    """
    AI 서비스 로그 모델
    """
    LOG_LEVEL_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('debug', 'Debug'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # 로그 정보
    level = models.CharField(max_length=20, choices=LOG_LEVEL_CHOICES, default='info')
    service_name = models.CharField(max_length=100)  # 'gemini', 'nano_banana', etc.
    message = models.TextField()
    details = models.JSONField(default=dict, blank=True)
    
    # 요청 정보
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    request_id = models.CharField(max_length=100, blank=True)
    
    # 메타데이터
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.level.upper()} - {self.service_name}: {self.message[:50]}..."
    
    class Meta:
        db_table = 'easystyle_ai_service_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['service_name', 'level']),
            models.Index(fields=['created_at']),
        ]


class AIServiceConfiguration(models.Model):
    """
    AI 서비스 설정 모델
    """
    service_name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)
    configuration = models.JSONField(default=dict)
    last_updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.service_name} Configuration"
    
    class Meta:
        db_table = 'easystyle_ai_service_configurations'