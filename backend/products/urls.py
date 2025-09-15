from django.urls import path
from . import views

app_name = 'products'

urlpatterns = [
    # 제품 카테고리 및 기본 정보
    path('categories/', views.ProductCategoryListView.as_view(), name='categories'),
    path('brands/', views.BrandListView.as_view(), name='brands'),
    path('stores/', views.StoreListView.as_view(), name='stores'),
    path('statistics/', views.product_statistics, name='statistics'),
    
    # 제품 관련
    path('', views.ProductListView.as_view(), name='product-list'),
    path('<uuid:uuid>/', views.ProductDetailView.as_view(), name='product-detail'),
    path('search/', views.search_products, name='search-products'),
    
    # 위시리스트
    path('wishlist/', views.UserWishlistView.as_view(), name='wishlist'),
    path('wishlist/<int:pk>/', views.UserWishlistDetailView.as_view(), name='wishlist-detail'),
    path('wishlist/toggle/', views.toggle_wishlist, name='toggle-wishlist'),
    
    # 스타일 추천
    path('recommendations/', views.StyleRecommendationListView.as_view(), name='recommendations'),
]