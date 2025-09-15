#!/usr/bin/env python
"""
환경 변수 디버깅 스크립트
"""
import os
from decouple import config

print("🔍 환경 변수 디버깅")
print("=" * 30)

# .env 파일 존재 확인
env_file = os.path.join(os.path.dirname(__file__), '.env')
print(f"📁 .env 파일 경로: {env_file}")
print(f"📁 .env 파일 존재: {os.path.exists(env_file)}")

if os.path.exists(env_file):
    with open(env_file, 'r') as f:
        content = f.read()
        print(f"📄 .env 파일 내용:")
        print(content)

print("\n🔍 환경 변수 값:")
print(f"SUPABASE_DB_HOST: '{config('SUPABASE_DB_HOST', default='NOT_FOUND')}'")
print(f"SUPABASE_DB_NAME: '{config('SUPABASE_DB_NAME', default='NOT_FOUND')}'")
print(f"SUPABASE_DB_USER: '{config('SUPABASE_DB_USER', default='NOT_FOUND')}'")
print(f"SUPABASE_DB_PASSWORD: '{config('SUPABASE_DB_PASSWORD', default='NOT_FOUND')}'")
print(f"SUPABASE_DB_PORT: '{config('SUPABASE_DB_PORT', default='NOT_FOUND')}'")

print("\n🔍 시스템 환경 변수:")
print(f"SUPABASE_DB_HOST: '{os.environ.get('SUPABASE_DB_HOST', 'NOT_FOUND')}'")
print(f"SUPABASE_DB_NAME: '{os.environ.get('SUPABASE_DB_NAME', 'NOT_FOUND')}'")
print(f"SUPABASE_DB_USER: '{os.environ.get('SUPABASE_DB_USER', 'NOT_FOUND')}'")
print(f"SUPABASE_DB_PASSWORD: '{os.environ.get('SUPABASE_DB_PASSWORD', 'NOT_FOUND')}'")
print(f"SUPABASE_DB_PORT: '{os.environ.get('SUPABASE_DB_PORT', 'NOT_FOUND')}'")
