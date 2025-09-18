from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import os
import uuid
from PIL import Image
import json


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@parser_classes([MultiPartParser, FormParser])
def upload_style_image(request):
    """
    스타일 분석을 위한 이미지 업로드 API
    """
    if 'image' not in request.FILES:
        return Response(
            {'error': 'No image file provided'},
            status=status.HTTP_400_BAD_REQUEST
        )

    image_file = request.FILES['image']

    # 파일 크기 검증 (최대 10MB)
    if image_file.size > 10 * 1024 * 1024:
        return Response(
            {'error': 'File size too large. Maximum 10MB allowed.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 파일 형식 검증
    allowed_formats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if image_file.content_type not in allowed_formats:
        return Response(
            {'error': 'Invalid file format. Only JPEG, PNG, and WebP are allowed.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # 고유한 파일명 생성
        file_extension = os.path.splitext(image_file.name)[1]
        unique_filename = f"style_uploads/{uuid.uuid4()}{file_extension}"

        # 이미지 최적화 및 저장
        optimized_image = optimize_image(image_file)

        # 파일 저장
        file_path = default_storage.save(unique_filename, optimized_image)
        file_url = default_storage.url(file_path)

        # 절대 URL 생성
        if not file_url.startswith('http'):
            file_url = request.build_absolute_uri(file_url)

        return Response({
            'message': 'Image uploaded successfully',
            'file_path': file_path,
            'file_url': file_url,
            'original_name': image_file.name
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': f'Failed to upload image: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_profile_picture(request):
    """
    사용자 프로필 사진 업로드 API
    """
    if 'profile_picture' not in request.FILES:
        return Response(
            {'error': 'No profile picture provided'},
            status=status.HTTP_400_BAD_REQUEST
        )

    image_file = request.FILES['profile_picture']

    # 파일 크기 검증 (최대 5MB)
    if image_file.size > 5 * 1024 * 1024:
        return Response(
            {'error': 'File size too large. Maximum 5MB allowed.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 파일 형식 검증
    allowed_formats = ['image/jpeg', 'image/jpg', 'image/png']
    if image_file.content_type not in allowed_formats:
        return Response(
            {'error': 'Invalid file format. Only JPEG and PNG are allowed.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # 기존 프로필 사진 삭제
        user = request.user
        if user.profile_picture:
            try:
                default_storage.delete(user.profile_picture.name)
            except:
                pass

        # 고유한 파일명 생성
        file_extension = os.path.splitext(image_file.name)[1]
        unique_filename = f"profile_pictures/{user.id}_{uuid.uuid4()}{file_extension}"

        # 이미지 최적화 (프로필 사진용)
        optimized_image = optimize_profile_image(image_file)

        # 파일 저장
        file_path = default_storage.save(unique_filename, optimized_image)

        # 사용자 모델 업데이트
        user.profile_picture = file_path
        user.save()

        file_url = default_storage.url(file_path)
        if not file_url.startswith('http'):
            file_url = request.build_absolute_uri(file_url)

        return Response({
            'message': 'Profile picture uploaded successfully',
            'file_path': file_path,
            'file_url': file_url
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to upload profile picture: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_profile_picture(request):
    """
    사용자 프로필 사진 삭제 API
    """
    user = request.user

    if not user.profile_picture:
        return Response(
            {'error': 'No profile picture to delete'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # 파일 삭제
        default_storage.delete(user.profile_picture.name)

        # 사용자 모델 업데이트
        user.profile_picture = None
        user.save()

        return Response({
            'message': 'Profile picture deleted successfully'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': f'Failed to delete profile picture: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def optimize_image(image_file):
    """
    스타일 분석용 이미지 최적화
    - 최대 크기: 1024x1024
    - 품질: 85%
    - WebP 포맷으로 변환
    """
    try:
        # PIL로 이미지 열기
        image = Image.open(image_file)

        # EXIF 방향 정보 적용
        if hasattr(image, '_getexif'):
            exif = image._getexif()
            if exif is not None:
                orientation = exif.get(274)  # 274는 방향 태그
                if orientation == 3:
                    image = image.rotate(180, expand=True)
                elif orientation == 6:
                    image = image.rotate(270, expand=True)
                elif orientation == 8:
                    image = image.rotate(90, expand=True)

        # RGB 모드로 변환 (RGBA나 P 모드에서 WebP 저장 시 문제 방지)
        if image.mode in ('RGBA', 'LA', 'P'):
            # 투명도가 있는 이미지의 경우 흰색 배경과 합성
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')

        # 크기 조정 (최대 1024x1024, 비율 유지)
        max_size = (1024, 1024)
        image.thumbnail(max_size, Image.Resampling.LANCZOS)

        # 메모리에 WebP 형식으로 저장
        from io import BytesIO
        output = BytesIO()
        image.save(output, format='WEBP', quality=85, optimize=True)
        output.seek(0)

        return ContentFile(output.read())

    except Exception as e:
        # 최적화 실패 시 원본 반환
        return image_file


def optimize_profile_image(image_file):
    """
    프로필 사진용 이미지 최적화
    - 최대 크기: 400x400
    - 품질: 90%
    - 정사각형으로 크롭
    """
    try:
        # PIL로 이미지 열기
        image = Image.open(image_file)

        # EXIF 방향 정보 적용
        if hasattr(image, '_getexif'):
            exif = image._getexif()
            if exif is not None:
                orientation = exif.get(274)
                if orientation == 3:
                    image = image.rotate(180, expand=True)
                elif orientation == 6:
                    image = image.rotate(270, expand=True)
                elif orientation == 8:
                    image = image.rotate(90, expand=True)

        # RGB 모드로 변환
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')

        # 정사각형으로 크롭 (중앙 기준)
        width, height = image.size
        min_dimension = min(width, height)
        left = (width - min_dimension) // 2
        top = (height - min_dimension) // 2
        right = left + min_dimension
        bottom = top + min_dimension

        image = image.crop((left, top, right, bottom))

        # 크기 조정 (400x400)
        image = image.resize((400, 400), Image.Resampling.LANCZOS)

        # 메모리에 JPEG 형식으로 저장
        from io import BytesIO
        output = BytesIO()
        image.save(output, format='JPEG', quality=90, optimize=True)
        output.seek(0)

        return ContentFile(output.read())

    except Exception as e:
        # 최적화 실패 시 원본 반환
        return image_file


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_upload_info(request):
    """
    업로드 제한 정보 API
    """
    upload_info = {
        'style_image': {
            'max_size_mb': 10,
            'allowed_formats': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
            'max_resolution': '1024x1024',
            'description': 'Style analysis images'
        },
        'profile_picture': {
            'max_size_mb': 5,
            'allowed_formats': ['image/jpeg', 'image/jpg', 'image/png'],
            'max_resolution': '400x400',
            'description': 'Profile pictures (cropped to square)'
        }
    }

    return Response(upload_info, status=status.HTTP_200_OK)