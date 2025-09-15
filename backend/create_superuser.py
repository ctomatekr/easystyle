#!/usr/bin/env python
import os
import django
from django.conf import settings

# Django 설정 초기화
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'easystyle_backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# 슈퍼유저가 이미 존재하는지 확인
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@easystyle.com',
        password='easystyle123!'
    )
    print("슈퍼유저가 성공적으로 생성되었습니다.")
    print("Username: admin")
    print("Email: admin@easystyle.com")
    print("Password: easystyle123!")
else:
    print("슈퍼유저가 이미 존재합니다.")