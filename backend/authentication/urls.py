from django.urls import path
from . import views, social_views

app_name = 'authentication'

urlpatterns = [
    # Authentication endpoints
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),

    # Social authentication
    path('social/google/', social_views.google_login, name='google_login'),
    path('social/kakao/', social_views.kakao_login, name='kakao_login'),
    path('social/disconnect/', social_views.social_disconnect, name='social_disconnect'),

    # User profile endpoints
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('profile/detail/', views.UserProfileDetailView.as_view(), name='profile-detail'),
    path('dashboard/', views.user_dashboard, name='dashboard'),

    # Password management
    path('change-password/', views.change_password, name='change-password'),

    # Style history endpoints
    path('style-history/', views.UserStyleHistoryView.as_view(), name='style-history'),
    path('style-history/<int:pk>/', views.UserStyleHistoryDetailView.as_view(), name='style-history-detail'),
]