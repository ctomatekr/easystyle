from rest_framework import serializers
from .models import AIStyleRequest, AIStyleResponse, AIProductRecommendation, AIServiceLog, AIServiceConfiguration


class AIStyleRequestSerializer(serializers.ModelSerializer):
    """
    AI 스타일 요청 시리얼라이저
    """
    user = serializers.StringRelatedField(read_only=True)
    response = serializers.SerializerMethodField()
    
    class Meta:
        model = AIStyleRequest
        fields = [
            'id', 'user', 'style_prompt', 'user_image', 
            'processing_status', 'error_message', 'response',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def get_response(self, obj):
        try:
            response = obj.response
            return AIStyleResponseSerializer(response).data
        except AIStyleResponse.DoesNotExist:
            return None


class AIStyleResponseSerializer(serializers.ModelSerializer):
    """
    AI 스타일 응답 시리얼라이저
    """
    generated_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AIStyleResponse
        fields = [
            'id', 'generated_image', 'generated_image_url', 'ai_description',
            'confidence_score', 'processing_time', 'algorithm_version',
            'user_rating', 'user_feedback', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_generated_image_url(self, obj):
        if obj.generated_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.generated_image.url)
            return obj.generated_image.url
        return None


class AIProductRecommendationSerializer(serializers.ModelSerializer):
    """
    AI 상품 추천 시리얼라이저
    """
    user = serializers.StringRelatedField(read_only=True)
    style_request = AIStyleRequestSerializer(read_only=True)
    
    class Meta:
        model = AIProductRecommendation
        fields = [
            'id', 'user', 'style_request', 'recommendation_prompt',
            'recommended_products', 'recommendation_reason',
            'user_style_analysis', 'color_palette', 'style_categories',
            'user_rating', 'user_feedback', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']


class AIServiceLogSerializer(serializers.ModelSerializer):
    """
    AI 서비스 로그 시리얼라이저
    """
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = AIServiceLog
        fields = [
            'id', 'level', 'service_name', 'message', 'details',
            'user', 'request_id', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AIServiceConfigurationSerializer(serializers.ModelSerializer):
    """
    AI 서비스 설정 시리얼라이저
    """
    class Meta:
        model = AIServiceConfiguration
        fields = [
            'id', 'service_name', 'is_active', 'configuration', 'last_updated'
        ]
        read_only_fields = ['id', 'last_updated']


class StyleGenerationRequestSerializer(serializers.Serializer):
    """
    스타일 생성 요청 시리얼라이저
    """
    style_prompt = serializers.CharField(max_length=1000)
    user_image = serializers.ImageField(required=False)
    
    def validate_style_prompt(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("스타일 요청은 최소 5자 이상이어야 합니다.")
        return value.strip()


class StyleRatingSerializer(serializers.Serializer):
    """
    스타일 평점 시리얼라이저
    """
    rating = serializers.IntegerField(min_value=1, max_value=5)
    feedback = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    
    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("평점은 1-5 사이의 숫자여야 합니다.")
        return value


class ProductRecommendationRequestSerializer(serializers.Serializer):
    """
    상품 추천 요청 시리얼라이저
    """
    style_prompt = serializers.CharField(max_length=1000)
    user_image = serializers.ImageField(required=False)
    preferred_categories = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True
    )
    budget_range = serializers.CharField(max_length=50, required=False, allow_blank=True)
    color_preferences = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True
    )
    occasion = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True
    )
    
    def validate_style_prompt(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("스타일 요청은 최소 5자 이상이어야 합니다.")
        return value.strip()
    
    def validate_budget_range(self, value):
        if value and not value.strip():
            return None
        return value


class AIServiceStatusSerializer(serializers.Serializer):
    """
    AI 서비스 상태 시리얼라이저
    """
    service_status = serializers.CharField()
    gemini_configured = serializers.BooleanField()
    nano_banana_configured = serializers.BooleanField()
    available_models = serializers.ListField(child=serializers.CharField())
    timestamp = serializers.FloatField()
