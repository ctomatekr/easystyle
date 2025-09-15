#!/usr/bin/env python
"""
Supabase 데이터베이스 연결 테스트 스크립트
"""
import os
import sys
import django
from django.conf import settings

# Django 설정 로드
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'easystyle_backend.settings')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line

def test_database_connection():
    """데이터베이스 연결을 테스트합니다."""
    print("🔍 Supabase 데이터베이스 연결 테스트 시작...")
    print(f"📊 데이터베이스 설정:")
    print(f"   - Host: {settings.DATABASES['default']['HOST']}")
    print(f"   - Database: {settings.DATABASES['default']['NAME']}")
    print(f"   - User: {settings.DATABASES['default']['USER']}")
    print(f"   - Port: {settings.DATABASES['default']['PORT']}")
    print(f"   - SSL Mode: {settings.DATABASES['default']['OPTIONS'].get('sslmode', 'N/A')}")
    print()
    
    try:
        # 데이터베이스 연결 테스트
        with connection.cursor() as cursor:
            print("✅ 데이터베이스 연결 성공!")
            
            # PostgreSQL 버전 확인
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            print(f"📋 PostgreSQL 버전: {version}")
            
            # 현재 데이터베이스 이름 확인
            cursor.execute("SELECT current_database();")
            db_name = cursor.fetchone()[0]
            print(f"🗄️  현재 데이터베이스: {db_name}")
            
            # 연결된 사용자 확인
            cursor.execute("SELECT current_user;")
            user = cursor.fetchone()[0]
            print(f"👤 연결된 사용자: {user}")
            
            # 테이블 목록 확인
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = cursor.fetchall()
            
            if tables:
                print(f"📋 기존 테이블 목록 ({len(tables)}개):")
                for table in tables:
                    print(f"   - {table[0]}")
            else:
                print("📋 기존 테이블: 없음 (새 데이터베이스)")
                
    except Exception as e:
        print(f"❌ 데이터베이스 연결 실패:")
        print(f"   오류: {str(e)}")
        print()
        print("🔧 해결 방법:")
        print("   1. Supabase 프로젝트가 활성화되어 있는지 확인")
        print("   2. 데이터베이스 비밀번호가 올바른지 확인")
        print("   3. 네트워크 연결 상태 확인")
        print("   4. Supabase 프로젝트의 데이터베이스 설정 확인")
        return False
    
    return True

def test_django_commands():
    """Django 명령어들이 정상 작동하는지 테스트합니다."""
    print("\n🔍 Django 명령어 테스트...")
    
    try:
        # check 명령어로 설정 검증
        print("📋 Django 설정 검증 중...")
        execute_from_command_line(['manage.py', 'check'])
        print("✅ Django 설정 검증 통과!")
        
        # showmigrations 명령어로 마이그레이션 상태 확인
        print("📋 마이그레이션 상태 확인 중...")
        execute_from_command_line(['manage.py', 'showmigrations'])
        print("✅ 마이그레이션 상태 확인 완료!")
        
    except Exception as e:
        print(f"❌ Django 명령어 실행 실패: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 EasyStyle Supabase 연결 테스트")
    print("=" * 50)
    
    # 데이터베이스 연결 테스트
    db_success = test_database_connection()
    
    if db_success:
        # Django 명령어 테스트
        django_success = test_django_commands()
        
        if django_success:
            print("\n🎉 모든 테스트 통과! Supabase 연결이 정상입니다.")
            print("✅ 이제 마이그레이션을 실행할 수 있습니다:")
            print("   python manage.py migrate")
        else:
            print("\n⚠️  데이터베이스 연결은 성공했지만 Django 명령어에 문제가 있습니다.")
    else:
        print("\n❌ 데이터베이스 연결에 실패했습니다.")
        print("   Supabase 설정을 확인해주세요.")
    
    print("\n" + "=" * 50)
