from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.conf import settings
import requests
import json
import base64
import time
from .models import AIStyleRequest, AIStyleResponse
from .serializers import AIStyleRequestSerializer, AIStyleResponseSerializer


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_style(request):
    """
    AI 스타일 생성 API
    사용자 이미지와 스타일 요청을 받아 AI가 스타일을 생성합니다.
    """
    try:
        # 요청 데이터 검증
        serializer = AIStyleRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # AI 스타일 요청 기록
        ai_request = AIStyleRequest.objects.create(
            user=request.user,
            style_prompt=data['style_prompt'],
            user_image=data.get('user_image'),
            processing_status='processing'
        )
        
        try:
            # Gemini API를 사용한 스타일 생성
            styled_image, description = generate_style_with_gemini(
                data['user_image'],
                data['style_prompt']
            )
            
            # AI 응답 저장
            ai_response = AIStyleResponse.objects.create(
                request=ai_request,
                generated_image=styled_image,
                ai_description=description,
                confidence_score=0.85,  # 임시 값
                processing_time=time.time() - ai_request.created_at.timestamp()
            )
            
            # 요청 상태 업데이트
            ai_request.processing_status = 'completed'
            ai_request.save()
            
            return Response({
                'success': True,
                'request_id': ai_request.id,
                'response_id': ai_response.id,
                'styled_image': ai_response.generated_image.url,
                'description': description,
                'confidence_score': ai_response.confidence_score,
                'processing_time': ai_response.processing_time
            })
            
        except Exception as e:
            # AI 처리 실패
            ai_request.processing_status = 'failed'
            ai_request.error_message = str(e)
            ai_request.save()
            
            return Response({
                'success': False,
                'error': 'AI 스타일 생성에 실패했습니다.',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        return Response({
            'success': False,
            'error': '서버 오류가 발생했습니다.',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_style_with_gemini(user_image, style_prompt):
    """
    Gemini API를 사용하여 스타일을 생성합니다.
    """
    try:
        # Gemini API 설정
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            raise ValueError("Gemini API key not configured")
        
        # 이미지를 base64로 인코딩
        if hasattr(user_image, 'read'):
            image_data = user_image.read()
        else:
            image_data = user_image
        
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Gemini API 요청
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        
        headers = {
            'Content-Type': 'application/json',
        }
        
        payload = {
            "contents": [{
                "parts": [
                    {
                        "text": f"다음 스타일 요청에 따라 사용자 이미지를 변환해주세요: {style_prompt}. 자연스럽고 현실적인 패션 스타일로 변환하고, 변환된 이미지와 함께 스타일에 대한 설명을 제공해주세요."
                    },
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_base64
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 1024,
            }
        }
        
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        response.raise_for_status()
        
        result = response.json()
        
        # 응답에서 이미지와 설명 추출
        if 'candidates' in result and len(result['candidates']) > 0:
            candidate = result['candidates'][0]
            if 'content' in candidate and 'parts' in candidate['content']:
                parts = candidate['content']['parts']
                
                # 텍스트 설명 추출
                description = ""
                for part in parts:
                    if 'text' in part:
                        description += part['text']
                
                # 이미지 생성은 Gemini의 한계로 인해 텍스트 기반 설명만 제공
                # 실제 구현에서는 다른 AI 서비스나 이미지 생성 모델을 사용해야 함
                styled_image_data = None  # 실제 이미지 생성 로직 필요
                
                return styled_image_data, description
        
        raise Exception("Gemini API에서 유효한 응답을 받지 못했습니다.")
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"Gemini API 요청 실패: {str(e)}")
    except Exception as e:
        raise Exception(f"스타일 생성 중 오류 발생: {str(e)}")


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_style_history(request):
    """
    사용자의 스타일 생성 히스토리를 조회합니다.
    """
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        
        start = (page - 1) * page_size
        end = start + page_size
        
        requests = AIStyleRequest.objects.filter(user=request.user).order_by('-created_at')
        total_count = requests.count()
        
        paginated_requests = requests[start:end]
        
        serializer = AIStyleRequestSerializer(paginated_requests, many=True)
        
        return Response({
            'results': serializer.data,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'has_next': end < total_count,
            'has_previous': page > 1
        })
        
    except Exception as e:
        return Response({
            'error': '히스토리 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_style_response(request, response_id):
    """
    특정 스타일 응답의 상세 정보를 조회합니다.
    """
    try:
        response = AIStyleResponse.objects.get(
            id=response_id,
            request__user=request.user
        )
        
        serializer = AIStyleResponseSerializer(response)
        return Response(serializer.data)
        
    except AIStyleResponse.DoesNotExist:
        return Response({
            'error': '스타일 응답을 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': '응답 조회 중 오류가 발생했습니다.',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def rate_style_response(request, response_id):
    """
    스타일 응답에 대한 사용자 평점을 저장합니다.
    """
    try:
        response = AIStyleResponse.objects.get(
            id=response_id,
            request__user=request.user
        )
        
        rating = request.data.get('rating')
        feedback = request.data.get('feedback', '')
        
        if not rating or not (1 <= rating <= 5):
            return Response({
                'error': '평점은 1-5 사이의 숫자여야 합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        response.user_rating = rating
        response.user_feedback = feedback
        response.save()
        
        return Response({
            'message': '평점이 저장되었습니다.',
            'rating': rating,
            'feedback': feedback
        })
        
    except AIStyleResponse.DoesNotExist:
        return Response({
            'error': '스타일 응답을 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': '평점 저장 중 오류가 발생했습니다.',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def ai_service_status(request):
    """
    AI 서비스 상태를 확인합니다.
    """
    try:
        # Gemini API 키 확인
        gemini_configured = bool(getattr(settings, 'GEMINI_API_KEY', None))
        
        # Nano Banana API 키 확인 (향후 구현)
        nano_banana_configured = bool(getattr(settings, 'NANO_BANANA_API_KEY', None))
        
        return Response({
            'service_status': 'operational',
            'gemini_configured': gemini_configured,
            'nano_banana_configured': nano_banana_configured,
            'available_models': ['gemini-2.5-flash'],
            'timestamp': time.time()
        })
        
    except Exception as e:
        return Response({
            'service_status': 'error',
            'error': str(e),
            'timestamp': time.time()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)