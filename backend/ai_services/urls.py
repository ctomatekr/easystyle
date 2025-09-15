from django.urls import path
from . import views

app_name = 'ai_services'

urlpatterns = [
    # AI 스타일 생성
    path('generate-style/', views.generate_style, name='generate-style'),
    
    # 스타일 히스토리
    path('style-history/', views.get_style_history, name='style-history'),
    path('style-response/<int:response_id>/', views.get_style_response, name='style-response'),
    path('style-response/<int:response_id>/rate/', views.rate_style_response, name='rate-style-response'),
    
    # AI 서비스 상태
    path('status/', views.ai_service_status, name='ai-service-status'),
]