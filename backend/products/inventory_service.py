"""
실시간 재고 확인 및 구매 가능 여부 검증 서비스
"""

import requests
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import json
import logging
from typing import Dict, List, Optional, Tuple
import time

from .models import Product, Store
from .models import InventoryStatus, InventoryCheckLog, StoreApiConfig, PurchaseabilityScore

logger = logging.getLogger(__name__)


class InventoryChecker:
    """
    실시간 재고 확인 및 구매 가능 여부 검증 클래스
    """

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def check_product_availability(self, product: Product, check_type: str = 'manual') -> Dict:
        """
        단일 상품의 재고 및 구매 가능 여부 확인
        """
        start_time = time.time()
        result = {
            'product_id': product.id,
            'product_uuid': str(product.uuid),
            'success': False,
            'is_available': False,
            'stock_status': 'unknown',
            'stock_quantity': None,
            'size_stock': {},
            'current_price': None,
            'price_changed': False,
            'error_message': '',
            'response_time_ms': 0,
            'last_checked': timezone.now(),
        }

        try:
            # 재고 상태 객체 가져오기 또는 생성
            inventory_status, created = InventoryStatus.objects.get_or_create(
                product=product,
                defaults={
                    'stock_status': 'unknown',
                    'availability_status': 'checking'
                }
            )

            # 스토어 API 설정 확인
            store_config = getattr(product.store, 'api_config', None)
            if not store_config or not store_config.is_active:
                result['error_message'] = f'스토어 {product.store.name}의 API 설정이 없거나 비활성화됨'
                inventory_status.mark_check_failed(result['error_message'])
                self._log_check(product, check_type, 'failed', result, inventory_status)
                return result

            # 재고 확인 실행
            if store_config.api_type == 'rest_api':
                result = self._check_via_api(product, store_config, result)
            elif store_config.api_type == 'scraping':
                result = self._check_via_scraping(product, store_config, result)
            else:
                result['error_message'] = f'지원되지 않는 API 타입: {store_config.api_type}'

            # 응답 시간 계산
            result['response_time_ms'] = int((time.time() - start_time) * 1000)

            # 결과에 따라 재고 상태 업데이트
            if result['success']:
                if result['is_available']:
                    inventory_status.mark_as_available(
                        stock_quantity=result['stock_quantity'],
                        size_stock=result['size_stock']
                    )
                else:
                    inventory_status.mark_as_unavailable(result['error_message'])

                store_config.mark_success()
                result['stock_status'] = inventory_status.stock_status

            else:
                inventory_status.mark_check_failed(result['error_message'])
                store_config.mark_failure()

            # 가격 변동 확인
            if result['current_price'] and inventory_status.current_price:
                price_diff = abs(float(result['current_price']) - float(inventory_status.current_price))
                if price_diff > 0.01:  # 1원 이상 차이
                    result['price_changed'] = True
                    inventory_status.price_changed = True
                    inventory_status.price_change_percentage = (
                        (float(result['current_price']) - float(inventory_status.current_price)) /
                        float(inventory_status.current_price) * 100
                    )

            if result['current_price']:
                inventory_status.current_price = result['current_price']

            inventory_status.save()

            # 구매 가능성 점수 업데이트
            self._update_purchaseability_score(product)

            # 로그 기록
            self._log_check(product, check_type, 'success' if result['success'] else 'failed', result, inventory_status)

        except Exception as e:
            logger.error(f'재고 확인 중 오류 발생 - {product.name}: {str(e)}')
            result['error_message'] = str(e)
            result['response_time_ms'] = int((time.time() - start_time) * 1000)

            # 오류 로그 기록
            inventory_status = InventoryStatus.objects.filter(product=product).first()
            if inventory_status:
                inventory_status.mark_check_failed(str(e))

            self._log_check(product, check_type, 'failed', result, inventory_status)

        return result

    def _check_via_api(self, product: Product, store_config: StoreApiConfig, result: Dict) -> Dict:
        """
        REST API를 통한 재고 확인
        """
        try:
            # API URL 구성
            if store_config.inventory_check_url:
                url = store_config.inventory_check_url.format(
                    product_id=product.external_id,
                    product_uuid=product.uuid
                )
            else:
                url = product.product_url

            # 요청 헤더 설정
            headers = store_config.request_headers.copy() if store_config.request_headers else {}
            headers.update(self.session.headers)

            # API 요청
            response = self.session.get(
                url,
                headers=headers,
                timeout=store_config.timeout_seconds
            )

            response.raise_for_status()
            data = response.json()

            # 응답 데이터 파싱 (스토어별 커스터마이징 필요)
            result = self._parse_api_response(data, store_config, result)

        except requests.exceptions.RequestException as e:
            result['error_message'] = f'API 요청 실패: {str(e)}'
        except json.JSONDecodeError as e:
            result['error_message'] = f'JSON 파싱 실패: {str(e)}'
        except Exception as e:
            result['error_message'] = f'API 확인 중 오류: {str(e)}'

        return result

    def _check_via_scraping(self, product: Product, store_config: StoreApiConfig, result: Dict) -> Dict:
        """
        웹 스크래핑을 통한 재고 확인
        """
        try:
            # 상품 페이지 URL
            url = product.product_url

            # 요청 헤더 설정
            headers = store_config.request_headers.copy() if store_config.request_headers else {}
            headers.update(self.session.headers)

            # 페이지 요청
            time.sleep(store_config.request_delay_seconds)  # 요청 간격 준수
            response = self.session.get(url, headers=headers, timeout=store_config.timeout_seconds)
            response.raise_for_status()

            # HTML 파싱
            soup = BeautifulSoup(response.content, 'html.parser')

            # 재고 정보 추출
            result = self._extract_inventory_from_html(soup, store_config, result)

        except requests.exceptions.RequestException as e:
            result['error_message'] = f'스크래핑 요청 실패: {str(e)}'
        except Exception as e:
            result['error_message'] = f'스크래핑 중 오류: {str(e)}'

        return result

    def _parse_api_response(self, data: Dict, store_config: StoreApiConfig, result: Dict) -> Dict:
        """
        API 응답 데이터 파싱 (스토어별 커스터마이징)
        """
        result['success'] = True

        # 기본적인 파싱 로직 (실제로는 스토어별로 다르게 구현)
        if 'stock' in data:
            result['stock_quantity'] = data.get('stock', 0)
            result['is_available'] = result['stock_quantity'] > 0

        if 'price' in data:
            result['current_price'] = float(data['price'])

        if 'sizes' in data:
            result['size_stock'] = data['sizes']

        # 성공 지표 확인
        if store_config.success_indicators:
            for indicator in store_config.success_indicators:
                if indicator not in str(data):
                    result['success'] = False
                    result['error_message'] = f'성공 지표 {indicator} 없음'
                    break

        return result

    def _extract_inventory_from_html(self, soup, store_config: StoreApiConfig, result: Dict) -> Dict:
        """
        HTML에서 재고 정보 추출
        """
        try:
            # 구매 불가 키워드 확인
            page_text = soup.get_text().lower()
            for keyword in store_config.unavailable_keywords:
                if keyword.lower() in page_text:
                    result['success'] = True
                    result['is_available'] = False
                    result['stock_status'] = 'out_of_stock'
                    result['error_message'] = f'품절 키워드 발견: {keyword}'
                    return result

            # 재고 정보 셀렉터로 추출
            if store_config.inventory_selector:
                inventory_elements = soup.select(store_config.inventory_selector)
                if inventory_elements:
                    inventory_text = inventory_elements[0].get_text().strip()

                    # 재고 수량 추출 (숫자 패턴)
                    numbers = re.findall(r'\d+', inventory_text)
                    if numbers:
                        result['stock_quantity'] = int(numbers[0])
                        result['is_available'] = result['stock_quantity'] > 0

            # 가격 정보 추출
            if store_config.price_selector:
                price_elements = soup.select(store_config.price_selector)
                if price_elements:
                    price_text = price_elements[0].get_text().strip()
                    # 가격에서 숫자만 추출
                    price_numbers = re.findall(r'[\d,]+', price_text.replace(',', ''))
                    if price_numbers:
                        result['current_price'] = float(price_numbers[0])

            # 구매 가능 여부 확인
            if store_config.availability_selector:
                availability_elements = soup.select(store_config.availability_selector)
                if availability_elements:
                    # 구매 버튼이 존재하고 비활성화되지 않았으면 구매 가능
                    button = availability_elements[0]
                    is_disabled = button.get('disabled') or 'disabled' in button.get('class', [])
                    result['is_available'] = not is_disabled

            # 기본값: 페이지가 정상적으로 로드되면 일단 성공으로 간주
            result['success'] = True

            # 구매 가능 여부가 명시적으로 설정되지 않았으면 기본값 설정
            if 'is_available' not in result or result['is_available'] is None:
                result['is_available'] = True  # 기본적으로 구매 가능으로 가정

        except Exception as e:
            result['error_message'] = f'HTML 파싱 오류: {str(e)}'

        return result

    def _update_purchaseability_score(self, product: Product):
        """
        구매 가능성 점수 업데이트
        """
        try:
            score, created = PurchaseabilityScore.objects.get_or_create(
                product=product,
                defaults={'overall_score': 50}
            )
            score.update_scores()
        except Exception as e:
            logger.error(f'구매 가능성 점수 업데이트 실패 - {product.name}: {str(e)}')

    def _log_check(self, product: Product, check_type: str, status: str, result: Dict, inventory_status: InventoryStatus):
        """
        재고 확인 로그 기록
        """
        try:
            previous_status = None
            if inventory_status:
                previous_status = inventory_status.stock_status

            InventoryCheckLog.objects.create(
                product=product,
                check_type=check_type,
                status=status,
                previous_stock_status=previous_status,
                new_stock_status=result.get('stock_status', 'unknown'),
                response_time_ms=result.get('response_time_ms', 0),
                api_response_data=result,
                error_message=result.get('error_message', ''),
                price_before=inventory_status.current_price if inventory_status else None,
                price_after=result.get('current_price'),
                availability_changed=previous_status != result.get('stock_status') if previous_status else False
            )
        except Exception as e:
            logger.error(f'재고 확인 로그 기록 실패: {str(e)}')

    def check_multiple_products(self, products: List[Product], check_type: str = 'scheduled') -> List[Dict]:
        """
        여러 상품의 재고를 동시에 확인
        """
        results = []
        for product in products:
            try:
                result = self.check_product_availability(product, check_type)
                results.append(result)

                # 요청 간격 준수
                time.sleep(1)

            except Exception as e:
                logger.error(f'상품 {product.name} 재고 확인 실패: {str(e)}')
                results.append({
                    'product_id': product.id,
                    'success': False,
                    'error_message': str(e)
                })

        return results

    def get_products_needing_check(self, limit: int = 50) -> List[Product]:
        """
        재고 확인이 필요한 상품들 조회
        """
        # 24시간 이상 확인되지 않은 상품들
        cutoff_time = timezone.now() - timedelta(hours=24)

        products = Product.objects.filter(
            is_available=True,
            store__is_active=True
        ).select_related('store').exclude(
            inventory_status__last_checked_at__gte=cutoff_time
        )[:limit]

        return list(products)

    def get_high_priority_products(self, limit: int = 20) -> List[Product]:
        """
        높은 우선순위로 확인이 필요한 상품들
        """
        # 최근 스타일링에 사용되었거나 위시리스트에 많이 담긴 상품들
        products = Product.objects.filter(
            is_available=True,
            store__is_active=True
        ).select_related('store').annotate(
            wishlist_count=models.Count('wishlisted_by'),
            recent_recommendations=models.Count(
                'recommended_in',
                filter=models.Q(recommended_in__created_at__gte=timezone.now() - timedelta(days=7))
            )
        ).filter(
            models.Q(wishlist_count__gt=0) | models.Q(recent_recommendations__gt=0)
        ).order_by('-wishlist_count', '-recent_recommendations')[:limit]

        return list(products)


class InventoryScheduler:
    """
    재고 확인 스케줄링 및 자동화 관리
    """

    def __init__(self):
        self.checker = InventoryChecker()

    def run_scheduled_check(self):
        """
        정기 재고 확인 실행
        """
        logger.info('정기 재고 확인 시작')

        # 우선순위 상품 먼저 확인
        high_priority_products = self.checker.get_high_priority_products(20)
        if high_priority_products:
            logger.info(f'우선순위 상품 {len(high_priority_products)}개 확인 시작')
            self.checker.check_multiple_products(high_priority_products, 'scheduled')

        # 일반 상품 확인
        regular_products = self.checker.get_products_needing_check(30)
        if regular_products:
            logger.info(f'일반 상품 {len(regular_products)}개 확인 시작')
            self.checker.check_multiple_products(regular_products, 'scheduled')

        logger.info('정기 재고 확인 완료')

    def check_styling_products(self, product_ids: List[int]) -> Dict:
        """
        스타일링에 사용될 상품들의 재고 확인
        """
        products = Product.objects.filter(id__in=product_ids)
        results = self.checker.check_multiple_products(list(products), 'style_recommendation')

        # 구매 불가능한 상품들에 대한 대체 상품 제안
        unavailable_products = [r for r in results if not r.get('is_available', False)]
        alternatives = {}

        for unavailable in unavailable_products:
            product = Product.objects.get(id=unavailable['product_id'])
            alternative_products = self.find_alternative_products(product)
            alternatives[unavailable['product_id']] = alternative_products

        return {
            'results': results,
            'alternatives': alternatives,
            'total_checked': len(results),
            'available_count': len([r for r in results if r.get('is_available', False)]),
            'unavailable_count': len(unavailable_products)
        }

    def find_alternative_products(self, product: Product, limit: int = 5) -> List[Dict]:
        """
        대체 상품 찾기
        """
        # 같은 카테고리, 비슷한 가격대, 높은 구매 가능성 점수를 가진 상품들
        similar_products = Product.objects.filter(
            category=product.category,
            is_available=True
        ).exclude(
            id=product.id
        ).select_related('brand', 'store').filter(
            original_price__gte=product.original_price * 0.7,
            original_price__lte=product.original_price * 1.3,
        ).annotate(
            purchaseability_score=models.Subquery(
                PurchaseabilityScore.objects.filter(
                    product=models.OuterRef('pk')
                ).values('overall_score')[:1]
            )
        ).order_by('-purchaseability_score', '-created_at')[:limit]

        alternatives = []
        for alt_product in similar_products:
            alternatives.append({
                'uuid': str(alt_product.uuid),
                'name': alt_product.name,
                'brand_name': alt_product.brand.name,
                'current_price': float(alt_product.current_price),
                'main_image': alt_product.main_image,
                'purchaseability_score': getattr(alt_product, 'purchaseability_score', 50),
                'product_url': alt_product.product_url
            })

        return alternatives


# 전역 인스턴스
inventory_checker = InventoryChecker()
inventory_scheduler = InventoryScheduler()