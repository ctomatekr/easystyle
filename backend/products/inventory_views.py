"""
실시간 재고 확인 및 구매 가능 여부 API 뷰
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q, Avg
from datetime import timedelta
import logging

from .models import Product, Store
from .models import InventoryStatus, InventoryCheckLog, PurchaseabilityScore
from .inventory_service import inventory_checker, inventory_scheduler

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_product_inventory(request, product_uuid):
    """
    특정 상품의 실시간 재고 확인
    """
    try:
        product = get_object_or_404(Product, uuid=product_uuid)

        # 재고 확인 실행
        result = inventory_checker.check_product_availability(product, 'user_request')

        return Response({
            'success': True,
            'data': {
                'product_uuid': str(product.uuid),
                'product_name': product.name,
                'brand_name': product.brand.name,
                'store_name': product.store.name,
                'is_available': result['is_available'],
                'stock_status': result['stock_status'],
                'stock_quantity': result['stock_quantity'],
                'size_stock': result['size_stock'],
                'current_price': result['current_price'],
                'price_changed': result['price_changed'],
                'last_checked': result['last_checked'].isoformat(),
                'response_time_ms': result['response_time_ms'],
                'product_url': product.product_url
            }
        }, status=status.HTTP_200_OK)

    except Product.DoesNotExist:
        return Response({
            'success': False,
            'error': '상품을 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.error(f'재고 확인 API 오류: {str(e)}')
        return Response({
            'success': False,
            'error': '재고 확인 중 오류가 발생했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_multiple_products_inventory(request):
    """
    여러 상품의 재고를 한번에 확인
    """
    try:
        product_uuids = request.data.get('product_uuids', [])

        if not product_uuids:
            return Response({
                'success': False,
                'error': 'product_uuids가 필요합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(product_uuids) > 20:
            return Response({
                'success': False,
                'error': '한번에 최대 20개의 상품만 확인할 수 있습니다.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 상품 조회
        products = Product.objects.filter(uuid__in=product_uuids).select_related('brand', 'store')

        if not products.exists():
            return Response({
                'success': False,
                'error': '확인할 상품이 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)

        # 재고 확인 실행
        results = inventory_checker.check_multiple_products(list(products), 'user_request')

        # 결과 포맷팅
        formatted_results = []
        for result in results:
            try:
                product = products.get(id=result['product_id'])
                formatted_results.append({
                    'product_uuid': str(product.uuid),
                    'product_name': product.name,
                    'brand_name': product.brand.name,
                    'store_name': product.store.name,
                    'is_available': result.get('is_available', False),
                    'stock_status': result.get('stock_status', 'unknown'),
                    'stock_quantity': result.get('stock_quantity'),
                    'current_price': result.get('current_price'),
                    'price_changed': result.get('price_changed', False),
                    'response_time_ms': result.get('response_time_ms', 0),
                    'error_message': result.get('error_message', ''),
                    'success': result.get('success', False)
                })
            except Product.DoesNotExist:
                continue

        # 통계 계산
        available_count = len([r for r in formatted_results if r['is_available']])
        unavailable_count = len(formatted_results) - available_count

        return Response({
            'success': True,
            'data': {
                'results': formatted_results,
                'summary': {
                    'total_checked': len(formatted_results),
                    'available_count': available_count,
                    'unavailable_count': unavailable_count,
                    'availability_rate': round(available_count / len(formatted_results) * 100, 1) if formatted_results else 0
                }
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f'다중 재고 확인 API 오류: {str(e)}')
        return Response({
            'success': False,
            'error': '재고 확인 중 오류가 발생했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_styling_products_inventory(request):
    """
    스타일링에 사용될 상품들의 재고 확인 + 대체 상품 제안
    """
    try:
        product_uuids = request.data.get('product_uuids', [])

        if not product_uuids:
            return Response({
                'success': False,
                'error': 'product_uuids가 필요합니다.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # 상품 ID 변환
        products = Product.objects.filter(uuid__in=product_uuids)
        product_ids = list(products.values_list('id', flat=True))

        if not product_ids:
            return Response({
                'success': False,
                'error': '확인할 상품이 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)

        # 스타일링 상품들의 재고 확인 실행
        result = inventory_scheduler.check_styling_products(product_ids)

        return Response({
            'success': True,
            'data': result
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f'스타일링 재고 확인 API 오류: {str(e)}')
        return Response({
            'success': False,
            'error': '스타일링 재고 확인 중 오류가 발생했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_product_inventory_status(request, product_uuid):
    """
    상품의 현재 재고 상태 조회 (실시간 확인 없이)
    """
    try:
        product = get_object_or_404(Product, uuid=product_uuid)
        inventory_status = getattr(product, 'inventory_status', None)

        if not inventory_status:
            return Response({
                'success': True,
                'data': {
                    'product_uuid': str(product.uuid),
                    'stock_status': 'unknown',
                    'is_available': product.is_available,
                    'is_purchasable': False,
                    'last_checked': None,
                    'needs_check': True
                }
            }, status=status.HTTP_200_OK)

        return Response({
            'success': True,
            'data': {
                'product_uuid': str(product.uuid),
                'product_name': product.name,
                'brand_name': product.brand.name,
                'store_name': product.store.name,
                'stock_status': inventory_status.stock_status,
                'availability_status': inventory_status.availability_status,
                'is_available': inventory_status.is_purchasable,
                'is_purchasable': inventory_status.is_purchasable,
                'stock_quantity': inventory_status.stock_quantity,
                'size_stock': inventory_status.size_stock,
                'current_price': float(inventory_status.current_price) if inventory_status.current_price else None,
                'price_changed': inventory_status.price_changed,
                'last_checked': inventory_status.last_checked_at.isoformat(),
                'last_available': inventory_status.last_available_at.isoformat() if inventory_status.last_available_at else None,
                'is_recently_checked': inventory_status.is_recently_checked,
                'needs_urgent_check': inventory_status.needs_urgent_check,
                'consecutive_unavailable_count': inventory_status.consecutive_unavailable_count
            }
        }, status=status.HTTP_200_OK)

    except Product.DoesNotExist:
        return Response({
            'success': False,
            'error': '상품을 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.error(f'재고 상태 조회 API 오류: {str(e)}')
        return Response({
            'success': False,
            'error': '재고 상태 조회 중 오류가 발생했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_purchaseability_score(request, product_uuid):
    """
    상품의 구매 가능성 점수 조회
    """
    try:
        product = get_object_or_404(Product, uuid=product_uuid)
        score = getattr(product, 'purchaseability_score', None)

        if not score:
            return Response({
                'success': True,
                'data': {
                    'product_uuid': str(product.uuid),
                    'overall_score': 50,
                    'availability_score': 50,
                    'reliability_score': 50,
                    'price_stability_score': 50,
                    'delivery_score': 50,
                    'is_recommended_for_styling': False,
                    'recommendation_priority': 50
                }
            }, status=status.HTTP_200_OK)

        return Response({
            'success': True,
            'data': {
                'product_uuid': str(product.uuid),
                'overall_score': score.overall_score,
                'availability_score': score.availability_score,
                'reliability_score': score.reliability_score,
                'price_stability_score': score.price_stability_score,
                'delivery_score': score.delivery_score,
                'historical_availability_rate': score.historical_availability_rate,
                'average_stock_duration_days': score.average_stock_duration_days,
                'price_change_frequency': score.price_change_frequency,
                'predicted_stock_out_date': score.predicted_stock_out_date.isoformat() if score.predicted_stock_out_date else None,
                'predicted_restock_date': score.predicted_restock_date.isoformat() if score.predicted_restock_date else None,
                'confidence_level': score.confidence_level,
                'is_highly_purchasable': score.is_highly_purchasable,
                'is_recommended_for_styling': score.is_recommended_for_styling,
                'recommendation_priority': score.recommendation_priority,
                'last_calculated': score.last_calculated_at.isoformat()
            }
        }, status=status.HTTP_200_OK)

    except Product.DoesNotExist:
        return Response({
            'success': False,
            'error': '상품을 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.error(f'구매 가능성 점수 조회 API 오류: {str(e)}')
        return Response({
            'success': False,
            'error': '구매 가능성 점수 조회 중 오류가 발생했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_inventory_statistics(request):
    """
    전체 재고 상태 통계 조회
    """
    try:
        # 전체 상품 수
        total_products = Product.objects.filter(is_available=True).count()

        # 재고 상태별 통계
        inventory_stats = InventoryStatus.objects.aggregate(
            in_stock_count=Count('id', filter=Q(stock_status='in_stock')),
            low_stock_count=Count('id', filter=Q(stock_status='low_stock')),
            out_of_stock_count=Count('id', filter=Q(stock_status='out_of_stock')),
            unknown_count=Count('id', filter=Q(stock_status='unknown')),
            purchasable_count=Count('id', filter=Q(is_purchasable=True)),
            recently_checked_count=Count('id', filter=Q(
                last_checked_at__gte=timezone.now() - timedelta(hours=24)
            ))
        )

        # 구매 가능성 점수 평균
        avg_scores = PurchaseabilityScore.objects.aggregate(
            avg_overall_score=Avg('overall_score'),
            avg_availability_score=Avg('availability_score'),
            avg_reliability_score=Avg('reliability_score'),
            high_score_count=Count('id', filter=Q(overall_score__gte=80))
        )

        # 스토어별 통계
        store_stats = Store.objects.filter(is_active=True).annotate(
            product_count=Count('products', filter=Q(products__is_available=True)),
            available_count=Count(
                'products__inventory_status',
                filter=Q(products__inventory_status__is_purchasable=True)
            )
        ).values('name', 'product_count', 'available_count')

        # 최근 24시간 재고 확인 로그
        recent_checks = InventoryCheckLog.objects.filter(
            checked_at__gte=timezone.now() - timedelta(hours=24)
        ).aggregate(
            total_checks=Count('id'),
            successful_checks=Count('id', filter=Q(status='success')),
            failed_checks=Count('id', filter=Q(status='failed')),
            avg_response_time=Avg('response_time_ms')
        )

        return Response({
            'success': True,
            'data': {
                'overview': {
                    'total_products': total_products,
                    'in_stock': inventory_stats['in_stock_count'] or 0,
                    'low_stock': inventory_stats['low_stock_count'] or 0,
                    'out_of_stock': inventory_stats['out_of_stock_count'] or 0,
                    'unknown': inventory_stats['unknown_count'] or 0,
                    'purchasable': inventory_stats['purchasable_count'] or 0,
                    'recently_checked': inventory_stats['recently_checked_count'] or 0
                },
                'scores': {
                    'average_overall_score': round(avg_scores['avg_overall_score'] or 0, 1),
                    'average_availability_score': round(avg_scores['avg_availability_score'] or 0, 1),
                    'average_reliability_score': round(avg_scores['avg_reliability_score'] or 0, 1),
                    'high_score_products': avg_scores['high_score_count'] or 0
                },
                'stores': list(store_stats),
                'recent_activity': {
                    'total_checks_24h': recent_checks['total_checks'] or 0,
                    'successful_checks_24h': recent_checks['successful_checks'] or 0,
                    'failed_checks_24h': recent_checks['failed_checks'] or 0,
                    'success_rate_24h': round(
                        (recent_checks['successful_checks'] or 0) / max(recent_checks['total_checks'] or 1, 1) * 100, 1
                    ),
                    'average_response_time_ms': round(recent_checks['avg_response_time'] or 0, 1)
                }
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f'재고 통계 조회 API 오류: {str(e)}')
        return Response({
            'success': False,
            'error': '재고 통계 조회 중 오류가 발생했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_alternative_products(request, product_uuid):
    """
    대체 상품 추천
    """
    try:
        product = get_object_or_404(Product, uuid=product_uuid)

        limit = int(request.GET.get('limit', 5))
        limit = min(max(limit, 1), 20)  # 1-20 사이로 제한

        # 대체 상품 찾기
        alternatives = inventory_scheduler.find_alternative_products(product, limit)

        return Response({
            'success': True,
            'data': {
                'original_product': {
                    'uuid': str(product.uuid),
                    'name': product.name,
                    'brand_name': product.brand.name,
                    'current_price': float(product.current_price)
                },
                'alternatives': alternatives,
                'total_found': len(alternatives)
            }
        }, status=status.HTTP_200_OK)

    except Product.DoesNotExist:
        return Response({
            'success': False,
            'error': '상품을 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.error(f'대체 상품 추천 API 오류: {str(e)}')
        return Response({
            'success': False,
            'error': '대체 상품 추천 중 오류가 발생했습니다.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)