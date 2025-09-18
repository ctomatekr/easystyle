"""
소셜 로그인 관련 뷰
Google과 Kakao OAuth2 인증 처리
"""

import requests
import json
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """
    Google OAuth2 로그인 처리
    프론트엔드에서 받은 Google access_token으로 사용자 정보 조회 후 로그인/회원가입
    """
    try:
        access_token = request.data.get('access_token')
        if not access_token:
            return Response({
                'error': 'access_token is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Google API로 사용자 정보 요청
        google_user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
        response = requests.get(
            google_user_info_url,
            params={'access_token': access_token}
        )

        if response.status_code != 200:
            logger.error(f"Google API error: {response.status_code} - {response.text}")
            return Response({
                'error': 'Invalid Google access token'
            }, status=status.HTTP_400_BAD_REQUEST)

        google_user_data = response.json()
        email = google_user_data.get('email')
        name = google_user_data.get('name', '')
        google_id = google_user_data.get('id')

        if not email:
            return Response({
                'error': 'Email not provided by Google'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 기존 사용자 찾기 또는 새로 생성
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'full_name': name,
                'is_active': True,
                'provider': 'google',
                'provider_id': google_id,
            }
        )

        # 기존 사용자인 경우 provider 정보 업데이트
        if not created and not user.provider:
            user.provider = 'google'
            user.provider_id = google_id
            user.save()

        # 토큰 생성 또는 가져오기
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'provider': user.provider,
                'created': created
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Google login error: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def kakao_login(request):
    """
    Kakao OAuth2 로그인 처리
    프론트엔드에서 받은 Kakao access_token으로 사용자 정보 조회 후 로그인/회원가입
    """
    try:
        access_token = request.data.get('access_token')
        if not access_token:
            return Response({
                'error': 'access_token is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Kakao API로 사용자 정보 요청
        kakao_user_info_url = 'https://kapi.kakao.com/v2/user/me'
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        }

        response = requests.get(kakao_user_info_url, headers=headers)

        if response.status_code != 200:
            logger.error(f"Kakao API error: {response.status_code} - {response.text}")
            return Response({
                'error': 'Invalid Kakao access token'
            }, status=status.HTTP_400_BAD_REQUEST)

        kakao_user_data = response.json()
        kakao_id = kakao_user_data.get('id')
        kakao_account = kakao_user_data.get('kakao_account', {})
        profile = kakao_account.get('profile', {})

        email = kakao_account.get('email')
        name = profile.get('nickname', '')

        if not email:
            return Response({
                'error': 'Email not provided by Kakao'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 기존 사용자 찾기 또는 새로 생성
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'full_name': name,
                'is_active': True,
                'provider': 'kakao',
                'provider_id': str(kakao_id),
            }
        )

        # 기존 사용자인 경우 provider 정보 업데이트
        if not created and not user.provider:
            user.provider = 'kakao'
            user.provider_id = str(kakao_id)
            user.save()

        # 토큰 생성 또는 가져오기
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'provider': user.provider,
                'created': created
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Kakao login error: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def social_disconnect(request):
    """
    소셜 로그인 연결 해제
    사용자의 provider 정보를 제거
    """
    try:
        user = request.user
        if not user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)

        user.provider = None
        user.provider_id = None
        user.save()

        return Response({
            'message': 'Social login disconnected successfully'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Social disconnect error: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)