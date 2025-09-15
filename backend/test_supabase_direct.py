#!/usr/bin/env python
"""
Supabase 직접 연결 테스트 (Django 없이)
"""
import psycopg2
from decouple import config
import os

def test_supabase_connection():
    """psycopg2를 사용하여 Supabase에 직접 연결합니다."""
    print("🔍 Supabase 직접 연결 테스트")
    print("=" * 40)
    
    # 환경 변수에서 설정 읽기
    host = config('SUPABASE_DB_HOST', default='')
    database = config('SUPABASE_DB_NAME', default='postgres')
    user = config('SUPABASE_DB_USER', default='postgres')
    password = config('SUPABASE_DB_PASSWORD', default='')
    port = config('SUPABASE_DB_PORT', default='5432')
    
    print(f"📊 연결 정보:")
    print(f"   - Host: {host}")
    print(f"   - Database: {database}")
    print(f"   - User: {user}")
    print(f"   - Port: {port}")
    print(f"   - Password: {'*' * len(password) if password else 'None'}")
    print()
    
    if not host:
        print("❌ SUPABASE_DB_HOST가 설정되지 않았습니다.")
        return False
    
    try:
        # PostgreSQL 연결 시도
        print("🔌 Supabase PostgreSQL 연결 시도 중...")
        
        conn = psycopg2.connect(
            host=host,
            database=database,
            user=user,
            password=password,
            port=port,
            sslmode='require'
        )
        
        print("✅ Supabase 연결 성공!")
        
        # 커서 생성
        cursor = conn.cursor()
        
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
        
        # 연결 종료
        cursor.close()
        conn.close()
        
        print("\n🎉 Supabase 연결 테스트 성공!")
        print("✅ 이제 Django 마이그레이션을 실행할 수 있습니다.")
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Supabase 연결 실패 (OperationalError):")
        print(f"   오류: {str(e)}")
        print()
        print("🔧 가능한 원인:")
        print("   1. Supabase 프로젝트가 일시 중지되었을 수 있음")
        print("   2. 데이터베이스 비밀번호가 잘못됨")
        print("   3. 네트워크 연결 문제")
        print("   4. Supabase 프로젝트 설정 문제")
        return False
        
    except psycopg2.Error as e:
        print(f"❌ PostgreSQL 오류:")
        print(f"   오류: {str(e)}")
        return False
        
    except Exception as e:
        print(f"❌ 예상치 못한 오류:")
        print(f"   오류: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_supabase_connection()
    
    if success:
        print("\n✅ 다음 단계:")
        print("   1. Django 마이그레이션 실행: python manage.py migrate")
        print("   2. 슈퍼유저 생성: python manage.py createsuperuser")
        print("   3. 샘플 데이터 생성: python create_sample_products.py")
    else:
        print("\n❌ Supabase 설정을 확인해주세요.")
        print("   SUPABASE_SETUP.md 파일을 참고하세요.")
