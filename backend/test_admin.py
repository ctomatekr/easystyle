#!/usr/bin/env python
import os
import django
from django.conf import settings

# Django 설정 초기화
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'easystyle_backend.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model

def test_admin_functionality():
    """Admin 기능 테스트"""
    print("🔧 Admin 기능 테스트 시작...")

    # 테스트 클라이언트 생성
    client = Client()
    User = get_user_model()

    # 1. Admin 로그인 페이지 접근 테스트
    print("\n1. Admin 로그인 페이지 접근 테스트")
    response = client.get('/admin/')
    print(f"   - Status Code: {response.status_code}")
    print(f"   - Redirects to login: {'/admin/login/' in response.url if hasattr(response, 'url') else 'Yes (302)'}")

    # 2. 슈퍼유저 존재 확인
    print("\n2. 슈퍼유저 존재 확인")
    admin_users = User.objects.filter(is_superuser=True)
    print(f"   - 슈퍼유저 수: {admin_users.count()}")
    for user in admin_users:
        print(f"   - Username: {user.username}, Email: {user.email}")

    # 3. 모델 등록 확인
    print("\n3. Admin에 등록된 모델 확인")
    from django.contrib import admin

    registered_models = []
    for model, model_admin in admin.site._registry.items():
        app_label = model._meta.app_label
        model_name = model._meta.model_name
        registered_models.append(f"{app_label}.{model_name}")

    print(f"   - 등록된 모델 수: {len(registered_models)}")
    for model in sorted(registered_models):
        print(f"   - {model}")

    # 4. 각 앱별 모델 데이터 확인
    print("\n4. 데이터베이스 내용 확인")

    # Products 앱
    from products.models import ProductCategory, Brand, Store, Product
    print(f"   - ProductCategory: {ProductCategory.objects.count()}개")
    print(f"   - Brand: {Brand.objects.count()}개")
    print(f"   - Store: {Store.objects.count()}개")
    print(f"   - Product: {Product.objects.count()}개")

    # AI Services 앱
    from ai_services.models import AIStyleRequest, AIStyleResponse
    print(f"   - AIStyleRequest: {AIStyleRequest.objects.count()}개")
    print(f"   - AIStyleResponse: {AIStyleResponse.objects.count()}개")

    print("\n✅ Admin 기능 테스트 완료!")

    return True

if __name__ == '__main__':
    test_admin_functionality()