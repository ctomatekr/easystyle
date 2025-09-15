#!/usr/bin/env python
"""
EasyStyle 샘플 데이터 생성 스크립트
"""

import os
import sys
import django
from decimal import Decimal

# Django 설정
sys.path.append('/Volumes/DATA/AI/Claude/easystyle/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'easystyle_backend.settings')
django.setup()

from products.models import ProductCategory, Brand, Store, Product


def create_sample_data():
    """샘플 데이터 생성"""
    
    print("🏗️ EasyStyle 샘플 데이터 생성 중...")
    
    # 1. 제품 카테고리 생성
    categories_data = [
        {"name": "상의", "name_en": "Tops", "icon": "shirt", "sort_order": 1},
        {"name": "하의", "name_en": "Bottoms", "icon": "pants", "sort_order": 2},
        {"name": "신발", "name_en": "Shoes", "icon": "shoes", "sort_order": 3},
        {"name": "액세서리", "name_en": "Accessories", "icon": "accessory", "sort_order": 4},
    ]
    
    categories = {}
    for cat_data in categories_data:
        category, created = ProductCategory.objects.get_or_create(
            name_en=cat_data["name_en"],
            defaults=cat_data
        )
        categories[cat_data["name_en"]] = category
        print(f"📁 카테고리: {category.name_en} {'생성됨' if created else '이미 존재'}")
    
    # 2. 브랜드 생성
    brands_data = [
        {"name": "Uniqlo", "country": "Japan", "is_premium": False},
        {"name": "Zara", "country": "Spain", "is_premium": False},
        {"name": "H&M", "country": "Sweden", "is_premium": False},
        {"name": "Nike", "country": "USA", "is_premium": True},
        {"name": "Adidas", "country": "Germany", "is_premium": True},
        {"name": "Gucci", "country": "Italy", "is_premium": True},
    ]
    
    brands = {}
    for brand_data in brands_data:
        brand, created = Brand.objects.get_or_create(
            name=brand_data["name"],
            defaults=brand_data
        )
        brands[brand_data["name"]] = brand
        print(f"🏷️ 브랜드: {brand.name} {'생성됨' if created else '이미 존재'}")
    
    # 3. 온라인 스토어 생성
    stores_data = [
        {"name": "Coupang", "website": "https://www.coupang.com", "is_partner": True},
        {"name": "11st", "website": "https://www.11st.co.kr", "is_partner": True},
        {"name": "Gmarket", "website": "https://www.gmarket.co.kr", "is_partner": False},
        {"name": "SSG.COM", "website": "https://www.ssg.com", "is_partner": True},
    ]
    
    stores = {}
    for store_data in stores_data:
        store, created = Store.objects.get_or_create(
            name=store_data["name"],
            defaults=store_data
        )
        stores[store_data["name"]] = store
        print(f"🏪 스토어: {store.name} {'생성됨' if created else '이미 존재'}")
    
    # 4. 샘플 제품 생성
    products_data = [
        # 상의
        {
            "name": "Basic Cotton T-Shirt",
            "brand": "Uniqlo",
            "category": "Tops",
            "store": "Coupang",
            "original_price": Decimal("29000"),
            "sale_price": Decimal("19900"),
            "color": "White",
            "material": "100% Cotton",
            "sizes_available": ["S", "M", "L", "XL"],
            "style_tags": ["casual", "basic", "comfortable"],
            "season": "spring",
            "main_image": "https://image.uniqlo.com/UQ/ST3/kr/imagesother/goods/422990/item/09_422990.jpg",
            "product_url": "https://www.uniqlo.com/kr/ko/products/E422990-000"
        },
        {
            "name": "Oversized Hoodie",
            "brand": "H&M",
            "category": "Tops",
            "store": "11st",
            "original_price": Decimal("59000"),
            "color": "Gray",
            "material": "Cotton Blend",
            "sizes_available": ["M", "L", "XL"],
            "style_tags": ["casual", "street", "comfortable"],
            "season": "fall",
            "main_image": "https://lp2.hm.com/hmgoepprod?set=quality%5B79%5D%2Csource%5B%2F5a%2F0a%2F5a0a7b0c8b9c1e2f3a4b5c6d7e8f9a0b1c2d3e4f.jpg%5D",
            "product_url": "https://www2.hm.com/ko_kr/productpage.0714790001.html"
        },
        # 하의
        {
            "name": "Slim Fit Jeans",
            "brand": "Zara",
            "category": "Bottoms", 
            "store": "SSG.COM",
            "original_price": Decimal("89000"),
            "sale_price": Decimal("69000"),
            "color": "Dark Blue",
            "material": "98% Cotton, 2% Elastane",
            "sizes_available": ["30", "32", "34", "36"],
            "style_tags": ["casual", "slim", "denim"],
            "season": "all",
            "main_image": "https://static.zara.net/photos///2023/V/02/1/p/4365/402/800/2/w/560/4365402800_6_1_1.jpg",
            "product_url": "https://www.zara.com/kr/ko/slim-fit-jeans-p04365402.html"
        },
        # 신발
        {
            "name": "Air Force 1 '07",
            "brand": "Nike",
            "category": "Shoes",
            "store": "Coupang",
            "original_price": Decimal("139000"),
            "color": "White",
            "material": "Leather",
            "sizes_available": ["250", "260", "270", "280"],
            "style_tags": ["casual", "sneakers", "classic"],
            "season": "all",
            "main_image": "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/b7d9211c-26e7-431a-ac24-b0540fb3c00f/air-force-1-07-shoes-WrLlWX.png",
            "product_url": "https://www.nike.com/kr/t/air-force-1-07-shoes-WrLlWX"
        },
        # 액세서리
        {
            "name": "Classic Baseball Cap",
            "brand": "Adidas",
            "category": "Accessories",
            "store": "Gmarket",
            "original_price": Decimal("39000"),
            "color": "Black",
            "material": "Cotton Twill",
            "sizes_available": ["Free"],
            "style_tags": ["casual", "sport", "cap"],
            "season": "all",
            "main_image": "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/cf6fa305ec6d4a31a2e4ad7b01373d2d_9366/Classic_Six-Panel_Cap_Black_BK0794_01_standard.jpg",
            "product_url": "https://www.adidas.co.kr/classic-six-panel-cap/BK0794.html"
        }
    ]
    
    for product_data in products_data:
        # 브랜드, 카테고리, 스토어 객체 연결
        product_data["brand"] = brands[product_data["brand"]]
        product_data["category"] = categories[product_data["category"]]
        product_data["store"] = stores[product_data["store"]]
        
        product, created = Product.objects.get_or_create(
            name=product_data["name"],
            brand=product_data["brand"],
            defaults=product_data
        )
        print(f"👕 제품: {product.name} ({'생성됨' if created else '이미 존재'})")
    
    print("\n✅ 샘플 데이터 생성 완료!")
    print(f"📊 총 통계:")
    print(f"   - 카테고리: {ProductCategory.objects.count()}개")
    print(f"   - 브랜드: {Brand.objects.count()}개")
    print(f"   - 스토어: {Store.objects.count()}개")
    print(f"   - 제품: {Product.objects.count()}개")


if __name__ == "__main__":
    create_sample_data()