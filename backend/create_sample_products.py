#!/usr/bin/env python
"""
EasyStyle 상품 샘플 데이터 생성 스크립트
"""
import os
import sys
import django
from decimal import Decimal

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'easystyle_backend.settings')
django.setup()

from products.models import ProductCategory, Brand, Store, Product, ProductAnalytics
from authentication.models import User

def create_categories():
    """상품 카테고리 생성"""
    categories_data = [
        {'name': '상의', 'name_en': 'Tops', 'description': 'Shirts, Blouses, T-shirts', 'icon': 'fas fa-tshirt', 'sort_order': 1},
        {'name': '하의', 'name_en': 'Bottoms', 'description': 'Pants, Jeans, Skirts', 'icon': 'fas fa-user-tie', 'sort_order': 2},
        {'name': '신발', 'name_en': 'Shoes', 'description': 'Sneakers, Boots, Heels', 'icon': 'fas fa-shoe-prints', 'sort_order': 3},
        {'name': '액세서리', 'name_en': 'Accessories', 'description': 'Bags, Jewelry, Watches', 'icon': 'fas fa-gem', 'sort_order': 4},
        {'name': '아우터', 'name_en': 'Outerwear', 'description': 'Jackets, Coats, Blazers', 'icon': 'fas fa-vest', 'sort_order': 5},
        {'name': '속옷', 'name_en': 'Underwear', 'description': 'Underwear, Lingerie', 'icon': 'fas fa-tshirt', 'sort_order': 6},
    ]
    
    for cat_data in categories_data:
        category, created = ProductCategory.objects.get_or_create(
            name_en=cat_data['name_en'],
            defaults=cat_data
        )
        if created:
            print(f"Created category: {category.name_en}")
        else:
            print(f"Category already exists: {category.name_en}")

def create_brands():
    """브랜드 생성"""
    brands_data = [
        {'name': 'Zara', 'description': 'Spanish fast fashion brand', 'country': 'Spain', 'is_premium': False},
        {'name': 'H&M', 'description': 'Swedish multinational clothing retailer', 'country': 'Sweden', 'is_premium': False},
        {'name': 'Uniqlo', 'description': 'Japanese casual wear designer', 'country': 'Japan', 'is_premium': False},
        {'name': 'COS', 'description': 'Contemporary fashion brand', 'country': 'Sweden', 'is_premium': True},
        {'name': 'Everlane', 'description': 'American clothing retailer', 'country': 'USA', 'is_premium': True},
        {'name': 'Nike', 'description': 'American sportswear brand', 'country': 'USA', 'is_premium': False},
        {'name': 'Adidas', 'description': 'German sportswear brand', 'country': 'Germany', 'is_premium': False},
        {'name': 'Levi\'s', 'description': 'American denim brand', 'country': 'USA', 'is_premium': False},
        {'name': 'Calvin Klein', 'description': 'American fashion brand', 'country': 'USA', 'is_premium': True},
        {'name': 'Tommy Hilfiger', 'description': 'American lifestyle brand', 'country': 'USA', 'is_premium': True},
    ]
    
    for brand_data in brands_data:
        brand, created = Brand.objects.get_or_create(
            name=brand_data['name'],
            defaults=brand_data
        )
        if created:
            print(f"Created brand: {brand.name}")
        else:
            print(f"Brand already exists: {brand.name}")

def create_stores():
    """쇼핑몰 생성"""
    stores_data = [
        {'name': 'Zara Online', 'website': 'https://www.zara.com', 'is_partner': True, 'commission_rate': 5.0},
        {'name': 'H&M Online', 'website': 'https://www.hm.com', 'is_partner': True, 'commission_rate': 4.5},
        {'name': 'Uniqlo Online', 'website': 'https://www.uniqlo.com', 'is_partner': True, 'commission_rate': 3.0},
        {'name': 'COS Online', 'website': 'https://www.cosstores.com', 'is_partner': True, 'commission_rate': 6.0},
        {'name': 'Everlane', 'website': 'https://www.everlane.com', 'is_partner': True, 'commission_rate': 4.0},
        {'name': 'Nike Store', 'website': 'https://www.nike.com', 'is_partner': True, 'commission_rate': 3.5},
        {'name': 'Adidas Store', 'website': 'https://www.adidas.com', 'is_partner': True, 'commission_rate': 3.5},
        {'name': 'Levi\'s Store', 'website': 'https://www.levi.com', 'is_partner': True, 'commission_rate': 4.0},
        {'name': 'Calvin Klein Store', 'website': 'https://www.calvinklein.com', 'is_partner': True, 'commission_rate': 5.5},
        {'name': 'Tommy Hilfiger Store', 'website': 'https://www.tommy.com', 'is_partner': True, 'commission_rate': 5.0},
    ]
    
    for store_data in stores_data:
        store, created = Store.objects.get_or_create(
            name=store_data['name'],
            defaults=store_data
        )
        if created:
            print(f"Created store: {store.name}")
        else:
            print(f"Store already exists: {store.name}")

def create_sample_products():
    """샘플 상품 생성"""
    # 카테고리, 브랜드, 스토어 가져오기
    tops_category = ProductCategory.objects.get(name_en='Tops')
    bottoms_category = ProductCategory.objects.get(name_en='Bottoms')
    shoes_category = ProductCategory.objects.get(name_en='Shoes')
    accessories_category = ProductCategory.objects.get(name_en='Accessories')
    outerwear_category = ProductCategory.objects.get(name_en='Outerwear')
    
    zara = Brand.objects.get(name='Zara')
    hm = Brand.objects.get(name='H&M')
    uniqlo = Brand.objects.get(name='Uniqlo')
    cos = Brand.objects.get(name='COS')
    everlane = Brand.objects.get(name='Everlane')
    nike = Brand.objects.get(name='Nike')
    adidas = Brand.objects.get(name='Adidas')
    levis = Brand.objects.get(name='Levi\'s')
    ck = Brand.objects.get(name='Calvin Klein')
    tommy = Brand.objects.get(name='Tommy Hilfiger')
    
    zara_store = Store.objects.get(name='Zara Online')
    hm_store = Store.objects.get(name='H&M Online')
    uniqlo_store = Store.objects.get(name='Uniqlo Online')
    cos_store = Store.objects.get(name='COS Online')
    everlane_store = Store.objects.get(name='Everlane')
    nike_store = Store.objects.get(name='Nike Store')
    adidas_store = Store.objects.get(name='Adidas Store')
    levis_store = Store.objects.get(name='Levi\'s Store')
    ck_store = Store.objects.get(name='Calvin Klein Store')
    tommy_store = Store.objects.get(name='Tommy Hilfiger Store')
    
    products_data = [
        # 상의
        {
            'name': 'Classic White Shirt',
            'description': 'Crisp white cotton shirt perfect for office or casual wear',
            'brand': zara, 'category': tops_category, 'store': zara_store,
            'original_price': Decimal('39.90'), 'currency': 'USD',
            'color': 'White', 'material': '100% Cotton',
            'sizes_available': ['XS', 'S', 'M', 'L', 'XL'],
            'main_image': 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
            'style_tags': ['classic', 'formal', 'office'],
            'season': 'all', 'occasion': ['work', 'casual'],
            'product_url': 'https://www.zara.com/us/en/woman/shirts/c/00000201.html',
            'rating': Decimal('4.2'), 'review_count': 156
        },
        {
            'name': 'Oversized T-Shirt',
            'description': 'Comfortable oversized t-shirt in soft cotton',
            'brand': hm, 'category': tops_category, 'store': hm_store,
            'original_price': Decimal('12.99'), 'sale_price': Decimal('9.99'), 'currency': 'USD',
            'color': 'Black', 'material': '100% Cotton',
            'sizes_available': ['XS', 'S', 'M', 'L', 'XL'],
            'main_image': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
            'style_tags': ['casual', 'oversized', 'basic'],
            'season': 'summer', 'occasion': ['casual', 'weekend'],
            'product_url': 'https://www.hm.com/us/en/productpage.0984202001.html',
            'rating': Decimal('4.0'), 'review_count': 89
        },
        {
            'name': 'Cashmere Sweater',
            'description': 'Luxurious cashmere sweater for elegant comfort',
            'brand': cos, 'category': tops_category, 'store': cos_store,
            'original_price': Decimal('89.00'), 'currency': 'USD',
            'color': 'Beige', 'material': '100% Cashmere',
            'sizes_available': ['XS', 'S', 'M', 'L'],
            'main_image': 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
            'style_tags': ['luxury', 'elegant', 'warm'],
            'season': 'winter', 'occasion': ['work', 'formal'],
            'product_url': 'https://www.cosstores.com/us/en/women/sweaters',
            'rating': Decimal('4.5'), 'review_count': 67
        },
        
        # 하의
        {
            'name': 'High-Waist Jeans',
            'description': 'Classic high-waist jeans with perfect fit',
            'brand': levis, 'category': bottoms_category, 'store': levis_store,
            'original_price': Decimal('79.50'), 'currency': 'USD',
            'color': 'Blue', 'material': '98% Cotton, 2% Elastane',
            'sizes_available': ['24', '25', '26', '27', '28', '29', '30'],
            'main_image': 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
            'style_tags': ['classic', 'denim', 'high-waist'],
            'season': 'all', 'occasion': ['casual', 'weekend'],
            'product_url': 'https://www.levi.com/us/en/women/jeans',
            'rating': Decimal('4.3'), 'review_count': 234
        },
        {
            'name': 'Wide-Leg Trousers',
            'description': 'Elegant wide-leg trousers for modern style',
            'brand': everlane, 'category': bottoms_category, 'store': everlane_store,
            'original_price': Decimal('68.00'), 'currency': 'USD',
            'color': 'Navy', 'material': '100% Wool',
            'sizes_available': ['00', '0', '2', '4', '6', '8', '10', '12'],
            'main_image': 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
            'style_tags': ['elegant', 'wide-leg', 'formal'],
            'season': 'all', 'occasion': ['work', 'formal'],
            'product_url': 'https://www.everlane.com/products/womens-wide-leg-trouser',
            'rating': Decimal('4.4'), 'review_count': 123
        },
        
        # 신발
        {
            'name': 'Air Max 270',
            'description': 'Comfortable running shoes with modern design',
            'brand': nike, 'category': shoes_category, 'store': nike_store,
            'original_price': Decimal('150.00'), 'currency': 'USD',
            'color': 'White/Black', 'material': 'Mesh, Synthetic',
            'sizes_available': ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'],
            'main_image': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
            'style_tags': ['sporty', 'casual', 'running'],
            'season': 'all', 'occasion': ['sport', 'casual'],
            'product_url': 'https://www.nike.com/t/air-max-270-womens-shoes-Pgb94T',
            'rating': Decimal('4.1'), 'review_count': 456
        },
        {
            'name': 'Stan Smith',
            'description': 'Classic white sneakers with green accents',
            'brand': adidas, 'category': shoes_category, 'store': adidas_store,
            'original_price': Decimal('80.00'), 'currency': 'USD',
            'color': 'White/Green', 'material': 'Leather',
            'sizes_available': ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'],
            'main_image': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
            'style_tags': ['classic', 'casual', 'minimalist'],
            'season': 'all', 'occasion': ['casual', 'weekend'],
            'product_url': 'https://www.adidas.com/us/stan-smith-shoes',
            'rating': Decimal('4.2'), 'review_count': 789
        },
        
        # 액세서리
        {
            'name': 'Leather Handbag',
            'description': 'Elegant leather handbag for everyday use',
            'brand': ck, 'category': accessories_category, 'store': ck_store,
            'original_price': Decimal('120.00'), 'currency': 'USD',
            'color': 'Black', 'material': 'Genuine Leather',
            'sizes_available': ['One Size'],
            'main_image': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
            'style_tags': ['elegant', 'leather', 'classic'],
            'season': 'all', 'occasion': ['work', 'formal', 'casual'],
            'product_url': 'https://www.calvinklein.com/us/en/women/handbags',
            'rating': Decimal('4.0'), 'review_count': 98
        },
        
        # 아우터
        {
            'name': 'Wool Blazer',
            'description': 'Professional wool blazer for business attire',
            'brand': tommy, 'category': outerwear_category, 'store': tommy_store,
            'original_price': Decimal('199.00'), 'currency': 'USD',
            'color': 'Navy', 'material': '100% Wool',
            'sizes_available': ['XS', 'S', 'M', 'L', 'XL'],
            'main_image': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            'style_tags': ['professional', 'formal', 'classic'],
            'season': 'all', 'occasion': ['work', 'formal'],
            'product_url': 'https://www.tommy.com/us/en/women/blazers',
            'rating': Decimal('4.3'), 'review_count': 156
        },
        {
            'name': 'Denim Jacket',
            'description': 'Classic denim jacket for casual style',
            'brand': uniqlo, 'category': outerwear_category, 'store': uniqlo_store,
            'original_price': Decimal('39.90'), 'currency': 'USD',
            'color': 'Blue', 'material': '100% Cotton',
            'sizes_available': ['XS', 'S', 'M', 'L', 'XL'],
            'main_image': 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400',
            'style_tags': ['casual', 'denim', 'classic'],
            'season': 'spring', 'occasion': ['casual', 'weekend'],
            'product_url': 'https://www.uniqlo.com/us/en/women/outerwear',
            'rating': Decimal('4.1'), 'review_count': 203
        },
    ]
    
    for product_data in products_data:
        product, created = Product.objects.get_or_create(
            name=product_data['name'],
            brand=product_data['brand'],
            defaults=product_data
        )
        if created:
            print(f"Created product: {product.name}")
            # 상품 분석 데이터 생성
            ProductAnalytics.objects.create(product=product)
        else:
            print(f"Product already exists: {product.name}")

def main():
    """메인 실행 함수"""
    print("Creating sample data for EasyStyle...")
    
    print("\n1. Creating categories...")
    create_categories()
    
    print("\n2. Creating brands...")
    create_brands()
    
    print("\n3. Creating stores...")
    create_stores()
    
    print("\n4. Creating sample products...")
    create_sample_products()
    
    print("\n✅ Sample data creation completed!")
    print(f"Total categories: {ProductCategory.objects.count()}")
    print(f"Total brands: {Brand.objects.count()}")
    print(f"Total stores: {Store.objects.count()}")
    print(f"Total products: {Product.objects.count()}")

if __name__ == '__main__':
    main()
