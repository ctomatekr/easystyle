#!/usr/bin/env python
"""
Supabase 설정 테스트 도구
대시보드에서 확인한 정보를 입력하여 연결을 테스트합니다.
"""
import psycopg2
import sys

def test_connection(host, database, user, password, port):
    """주어진 설정으로 Supabase 연결을 테스트합니다."""
    print(f"🔍 Supabase 연결 테스트")
    print(f"   Host: {host}")
    print(f"   Database: {database}")
    print(f"   User: {user}")
    print(f"   Port: {port}")
    print(f"   Password: {'*' * len(password) if password else 'None'}")
    print()
    
    try:
        print("🔌 연결 시도 중...")
        conn = psycopg2.connect(
            host=host,
            database=database,
            user=user,
            password=password,
            port=port,
            sslmode='require',
            connect_timeout=10  # 10초 타임아웃
        )
        
        print("✅ 연결 성공!")
        
        cursor = conn.cursor()
        
        # 기본 정보 확인
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"📋 PostgreSQL: {version}")
        
        cursor.execute("SELECT current_database();")
        db_name = cursor.fetchone()[0]
        print(f"🗄️  데이터베이스: {db_name}")
        
        cursor.execute("SELECT current_user;")
        user = cursor.fetchone()[0]
        print(f"👤 사용자: {user}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ 연결 실패: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ 오류: {str(e)}")
        return False

def main():
    print("🚀 Supabase 설정 테스트 도구")
    print("=" * 50)
    print("Supabase 대시보드에서 확인한 정보를 입력하세요.")
    print()
    
    # 현재 .env 파일의 설정 표시
    print("📄 현재 .env 파일의 설정:")
    try:
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('SUPABASE_'):
                    print(f"   {line.strip()}")
    except FileNotFoundError:
        print("   .env 파일을 찾을 수 없습니다.")
    
    print()
    print("🔧 새로운 설정을 입력하거나 Enter를 눌러 현재 설정을 사용하세요:")
    print()
    
    # 사용자 입력 받기
    host = input("Host (예: xxx.supabase.co): ").strip()
    if not host:
        host = "lplcrduzfszaxmhsuigx.supabase.co"
    
    database = input("Database (기본값: postgres): ").strip()
    if not database:
        database = "postgres"
    
    user = input("Username (기본값: postgres): ").strip()
    if not user:
        user = "postgres"
    
    password = input("Password: ").strip()
    if not password:
        password = "@!Chaos123"
    
    port = input("Port (기본값: 5432): ").strip()
    if not port:
        port = "5432"
    else:
        port = int(port)
    
    print()
    print("=" * 50)
    
    # 연결 테스트
    success = test_connection(host, database, user, password, port)
    
    if success:
        print()
        print("🎉 연결 성공!")
        print("✅ 이제 .env 파일을 업데이트하고 Django 마이그레이션을 실행할 수 있습니다.")
        
        # .env 파일 업데이트 제안
        update = input("\n.env 파일을 업데이트하시겠습니까? (y/n): ").strip().lower()
        if update == 'y':
            update_env_file(host, database, user, password, port)
    else:
        print()
        print("❌ 연결 실패")
        print("🔧 다음을 확인해주세요:")
        print("   1. Supabase 프로젝트가 활성화되어 있는지")
        print("   2. 데이터베이스 비밀번호가 올바른지")
        print("   3. 네트워크 연결 상태")
        print("   4. Supabase 대시보드의 정확한 연결 정보")

def update_env_file(host, database, user, password, port):
    """성공한 설정으로 .env 파일을 업데이트합니다."""
    try:
        # .env 파일 읽기
        with open('.env', 'r') as f:
            lines = f.readlines()
        
        # Supabase 설정 업데이트
        updated_lines = []
        for line in lines:
            if line.startswith('SUPABASE_DB_HOST='):
                updated_lines.append(f'SUPABASE_DB_HOST={host}\n')
            elif line.startswith('SUPABASE_DB_NAME='):
                updated_lines.append(f'SUPABASE_DB_NAME={database}\n')
            elif line.startswith('SUPABASE_DB_USER='):
                updated_lines.append(f'SUPABASE_DB_USER={user}\n')
            elif line.startswith('SUPABASE_DB_PASSWORD='):
                updated_lines.append(f'SUPABASE_DB_PASSWORD={password}\n')
            elif line.startswith('SUPABASE_DB_PORT='):
                updated_lines.append(f'SUPABASE_DB_PORT={port}\n')
            else:
                updated_lines.append(line)
        
        # .env 파일 쓰기
        with open('.env', 'w') as f:
            f.writelines(updated_lines)
        
        print("✅ .env 파일이 업데이트되었습니다.")
        
    except Exception as e:
        print(f"❌ .env 파일 업데이트 실패: {e}")

if __name__ == "__main__":
    main()
