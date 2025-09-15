# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

### 1.1 Supabase 웹사이트 접속
- https://supabase.com 접속
- GitHub 계정으로 로그인

### 1.2 새 프로젝트 생성
1. "New Project" 버튼 클릭
2. 프로젝트 정보 입력:
   - **Name**: `easystyle`
   - **Database Password**: 강력한 비밀번호 설정 (기록해두세요!)
   - **Region**: Asia Pacific (Seoul) 선택
3. "Create new project" 클릭

### 1.3 데이터베이스 정보 확인
프로젝트 생성 후 다음 정보를 확인하세요:

1. **프로젝트 대시보드** → **Settings** → **Database**
2. **Connection string** 섹션에서 다음 정보 복사:
   - Host
   - Database name
   - Username
   - Password
   - Port

## 2. 환경 변수 설정

### 2.1 .env 파일 생성
`backend/.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
# Supabase Database Configuration
SUPABASE_DB_HOST=your-supabase-host.supabase.co
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-supabase-password
SUPABASE_DB_PORT=5432

# Django Settings
SECRET_KEY=your-django-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://easystyle-3p8ygjgdw-ctomates-projects.vercel.app

# Gemini API
GEMINI_API_KEY=your-gemini-api-key-here
```

### 2.2 실제 값으로 교체
위의 `your-*` 부분을 실제 값으로 교체하세요:

- `your-supabase-host`: Supabase 프로젝트의 Host 값
- `your-supabase-password`: 프로젝트 생성 시 설정한 비밀번호
- `your-django-secret-key`: Django SECRET_KEY (새로 생성하거나 기존 값 사용)
- `your-gemini-api-key`: Google Gemini API 키

## 3. Django 마이그레이션 실행

### 3.1 가상환경 활성화
```bash
cd backend
source easystyle_env/bin/activate
```

### 3.2 마이그레이션 실행
```bash
python manage.py makemigrations
python manage.py migrate
```

### 3.3 슈퍼유저 생성
```bash
python manage.py createsuperuser
```

### 3.4 샘플 데이터 생성
```bash
python create_sample_products.py
```

## 4. 서버 실행 및 테스트

### 4.1 개발 서버 실행
```bash
python manage.py runserver 8000
```

### 4.2 API 테스트
- http://localhost:8000/api/products/categories/ 접속하여 데이터 확인
- http://localhost:8000/admin/ 접속하여 관리자 페이지 확인

## 5. Supabase 대시보드 확인

### 5.1 테이블 확인
- Supabase 대시보드 → Table Editor
- 생성된 테이블들 확인:
  - authentication_user
  - products_productcategory
  - products_brand
  - products_store
  - products_product
  - ai_services_aiservicerequest
  - 기타 관련 테이블들

### 5.2 데이터 확인
- 각 테이블의 데이터가 정상적으로 생성되었는지 확인
- 샘플 상품 데이터가 올바르게 저장되었는지 확인

## 6. 문제 해결

### 6.1 연결 오류
- 환경 변수가 올바르게 설정되었는지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- 방화벽 설정 확인

### 6.2 마이그레이션 오류
- 데이터베이스 권한 확인
- 기존 테이블과의 충돌 확인
- 마이그레이션 파일 상태 확인

### 6.3 CORS 오류
- CORS_ALLOWED_ORIGINS에 프론트엔드 URL이 포함되어 있는지 확인
- 프론트엔드에서 올바른 API URL을 사용하는지 확인

## 7. 프로덕션 배포 시 주의사항

### 7.1 환경 변수 보안
- `.env` 파일을 `.gitignore`에 추가
- 프로덕션 환경에서는 환경 변수를 안전하게 관리

### 7.2 데이터베이스 백업
- 정기적인 데이터베이스 백업 설정
- Supabase의 자동 백업 기능 활용

### 7.3 모니터링
- Supabase 대시보드에서 데이터베이스 성능 모니터링
- API 응답 시간 및 오류율 확인
