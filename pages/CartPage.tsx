import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';

const CartPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        cart,
        loading,
        error,
        fetchCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        getCartTotal,
        getCartItemCount
    } = useCart();
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    const handleBack = () => {
        navigate(-1);
    };

    const handleQuantityChange = async (itemId: number, newQuantity: number) => {
        if (newQuantity < 1) return;

        setIsUpdating(true);
        const success = await updateCartItem(itemId, newQuantity);
        if (!success) {
            // 에러 처리는 이미 context에서 처리됨
        }
        setIsUpdating(false);
    };

    const handleRemoveItem = async (itemId: number) => {
        if (!confirm('이 상품을 장바구니에서 제거하시겠습니까?')) return;

        setIsUpdating(true);
        await removeFromCart(itemId);
        setIsUpdating(false);
    };

    const handleClearCart = async () => {
        if (!confirm('장바구니를 비우시겠습니까?')) return;

        setIsUpdating(true);
        await clearCart();
        setIsUpdating(false);
    };

    const handleCheckout = () => {
        // 결제 페이지로 이동 (Phase 4에서 구현)
        navigate('/checkout');
    };

    const handlePurchaseRequest = async () => {
        if (!cart || cart.items.length === 0) return;

        if (!confirm('선택한 상품들에 대한 구매요청을 하시겠습니까?')) return;

        setIsUpdating(true);
        try {
            // 구매요청 로직 (백엔드 API 호출)
            // TODO: 구매요청 API 연동
            alert('구매요청이 완료되었습니다. 관리자가 확인 후 연락드리겠습니다.');
        } catch (error) {
            alert('구매요청 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen">
                <Header onBack={handleBack} showBackButton />
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen">
            <Header onBack={handleBack} showBackButton />

            <div className="px-4 py-6 max-w-lg mx-auto">
                <h1 className="text-2xl font-bold text-white mb-6">장바구니</h1>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                {!cart || cart.items.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-slate-400 mb-4">
                            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                            </svg>
                        </div>
                        <p className="text-slate-300 text-lg mb-4">장바구니가 비어있습니다</p>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                        >
                            쇼핑하러 가기
                        </button>
                    </div>
                ) : (
                    <>
                        {/* 장바구니 아이템 목록 */}
                        <div className="space-y-4 mb-6">
                            {cart.items.map((item) => (
                                <div key={item.id} className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm">
                                    <div className="flex items-start gap-4">
                                        {/* 상품 이미지 */}
                                        <div className="w-20 h-20 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                                            {item.product.main_image ? (
                                                <img
                                                    src={item.product.main_image}
                                                    alt={item.product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        {/* 상품 정보 */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium truncate mb-1">{item.product.name}</h3>
                                            <p className="text-slate-400 text-sm mb-1">{item.product.brand_name}</p>
                                            {item.size && (
                                                <p className="text-slate-400 text-sm mb-1">사이즈: {item.size}</p>
                                            )}
                                            {/* 상품 URL */}
                                            {item.product.product_url && (
                                                <div className="mb-2">
                                                    <a
                                                        href={item.product.product_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-400 hover:text-blue-300 text-xs underline"
                                                    >
                                                        상품 페이지 보기
                                                    </a>
                                                </div>
                                            )}

                                            {/* 가격 */}
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-white font-semibold">
                                                    ₩{item.product.current_price.toLocaleString()}
                                                </span>
                                                {item.product.is_on_sale && item.product.original_price > item.product.current_price && (
                                                    <span className="text-slate-400 text-sm line-through">
                                                        ₩{item.product.original_price.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>

                                            {/* 수량 조절 */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                                        disabled={item.quantity <= 1 || isUpdating}
                                                        className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-white min-w-[2rem] text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                                        disabled={isUpdating}
                                                        className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {/* 소계 */}
                                                <div className="text-right">
                                                    <p className="text-white font-semibold">
                                                        ₩{item.subtotal.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 삭제 버튼 */}
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            disabled={isUpdating}
                                            className="text-slate-400 hover:text-red-400 p-1 disabled:text-slate-600 transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 장바구니 요약 */}
                        <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-slate-300">상품 개수</span>
                                <span className="text-white">{getCartItemCount()}개</span>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-slate-300">총 금액</span>
                                <span className="text-xl font-bold text-white">
                                    ₩{getCartTotal().toLocaleString()}
                                </span>
                            </div>

                            {/* 액션 버튼들 */}
                            <div className="space-y-3">
                                {/* 구매요청하기 버튼 */}
                                <button
                                    onClick={handlePurchaseRequest}
                                    disabled={isUpdating}
                                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-700 disabled:text-amber-300 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    구매요청하기
                                </button>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleClearCart}
                                        disabled={isUpdating}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white py-3 rounded-lg transition-colors"
                                    >
                                        전체 삭제
                                    </button>
                                    <button
                                        onClick={handleCheckout}
                                        disabled={isUpdating}
                                        className="flex-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:text-purple-300 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                                    >
                                        주문하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CartPage;