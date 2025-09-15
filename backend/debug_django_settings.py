#!/usr/bin/env python
"""
Django 설정 디버깅 스크립트
"""
import os
import django
from django.conf import settings

# Django 설정 로드
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'easystyle_backend.settings')
django.setup()

print("🔍 Django 설정 디버깅")
print("=" * 30)

print("📊 데이터베이스 설정:")
db_config = settings.DATABASES['default']
print(f"   - ENGINE: {db_config['ENGINE']}")
print(f"   - NAME: {db_config['NAME']}")
print(f"   - USER: {db_config['USER']}")
print(f"   - PASSWORD: {'*' * len(str(db_config['PASSWORD'])) if db_config['PASSWORD'] else 'None'}")
print(f"   - HOST: {db_config['HOST']}")
print(f"   - PORT: {db_config['PORT']}")
print(f"   - OPTIONS: {db_config.get('OPTIONS', {})}")

print("\n🔍 기타 설정:")
print(f"   - DEBUG: {settings.DEBUG}")
print(f"   - SECRET_KEY: {'*' * len(settings.SECRET_KEY) if settings.SECRET_KEY else 'None'}")
print(f"   - ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
print(f"   - CORS_ALLOWED_ORIGINS: {settings.CORS_ALLOWED_ORIGINS}")
