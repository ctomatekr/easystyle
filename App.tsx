import React, { useState, useRef, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AppScreen, Product, ProductCategory } from './types';
import { generateStyle, getProductsForStyle, validatePrompt, cropImageForProduct } from './services/geminiService';
import { optimizeImage, validateImageFile } from './utils/imageOptimization';
import { productsAPI, authAPI, apiUtils } from './services/apiService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Header from './components/Header';
import Spinner from './components/Spinner';
import ProductCard from './components/ProductCard';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSkeleton from './components/SkeletonUI';
import LoginForm from './components/Auth/LoginForm';
import SignUpForm from './components/Auth/SignUpForm';
import CartPage from './pages/CartPage';
import { CameraIcon, GalleryIcon, SparklesIcon } from './components/icons';

type AIQuestion = {
  question: string;
  examples: string[];
};

const HomePage: React.FC = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const [screen, setScreen] = useState<AppScreen>(AppScreen.Home);
    const [originalImage, setOriginalImage] = useState<{ base64: string; mimeType: string; url: string } | null>(null);
    const [prompt, setPrompt] = useState('');
    const [userAnswer, setUserAnswer] = useState('');
    const [styledResult, setStyledResult] = useState<{ imageBase64: string; description: string } | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
    const [requestDetails, setRequestDetails] = useState<{ count: number; total: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [aiQuestion, setAiQuestion] = useState<AIQuestion | null>(null);

    // 인증 모달 상태
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [showSignUpForm, setShowSignUpForm] = useState(false);

    // 알림 및 MyPage 상태
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [showMyPageMenu, setShowMyPageMenu] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 초기 상품 데이터 로드
    useEffect(() => {
        const loadInitialProducts = async () => {
            try {
                const response = await productsAPI.getProducts({ sort_by: 'newest' });
                const initialProducts: Product[] = response.results.slice(0, 8).map((item: any) => ({
                    id: item.uuid,
                    brand: item.brand_name,
                    name: item.name,
                    price: item.current_price,
                    imageUrl: item.main_image,
                    recommendedSize: item.recommended_size || 'M',
                    productUrl: item.product_url,
                    storeName: item.store_name,
                    category: mapCategoryToEnum(item.category_name),
                    isSelected: false
                }));
                setProducts(initialProducts);
            } catch (error) {
                console.error('Failed to load initial products:', error);
            }
        };

        loadInitialProducts();
    }, []);

    // 카테고리 매핑 함수
    const mapCategoryToEnum = (categoryName: string): ProductCategory => {
        const categoryMap: Record<string, ProductCategory> = {
            'Tops': ProductCategory.Top,
            'Bottoms': ProductCategory.Bottom,
            'Shoes': ProductCategory.Shoes,
            'Accessories': ProductCategory.Accessory,
            'Outerwear': ProductCategory.Outerwear,
            'Underwear': ProductCategory.Underwear
        };
        return categoryMap[categoryName] || ProductCategory.Top;
    };

    const groupedProducts = useMemo(() => {
        if (products.length === 0) return {};
        const groups = products.reduce((acc, product) => {
            const category = product.category || '기타';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(product);
            return acc;
        }, {} as Record<string, Product[]>);

        const categoryOrder: (keyof typeof groups)[] = [ProductCategory.Top, ProductCategory.Bottom, ProductCategory.Shoes, ProductCategory.Accessory, '기타'];
        const orderedGroups: Record<string, Product[]> = {};
        categoryOrder.forEach(category => {
            if (groups[category]) {
                orderedGroups[category] = groups[category];
            }
        });
        return orderedGroups;
    }, [products]);
    
    const totalPrice = useMemo(() => {
        // 모든 제품이 KRW 국내 쇼핑몰 제품이므로 단순 합계로 계산
        return selectedProducts.reduce((sum, product) => sum + product.price, 0);
    }, [selectedProducts]);


    const handleImageSelect = async (file: File) => {
        if (!file) return;
        
        setIsLoading(true);
        setLoadingMessage('Optimizing image...');
        setError(null);

        try {
            // Validate image file
            const validation = validateImageFile(file);
            if (!validation.valid) {
                setError(validation.error || '잘못된 이미지 파일입니다.');
                return;
            }

            // Optimize image
            const optimized = await optimizeImage(file, {
                maxWidth: 1024,
                maxHeight: 1024,
                quality: 0.85,
                format: 'jpeg'
            });

            setOriginalImage({ 
                base64: optimized.base64, 
                mimeType: 'image/jpeg', 
                url: optimized.url 
            });
            setScreen(AppScreen.Styling);
        } catch (err: any) {
            console.error('Image optimization failed:', err);
            setError('An error occurred while processing the image. Please try a different image.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) handleImageSelect(file);
        event.target.value = '';
    };

    const handleStartStyling = () => {
        if (!isAuthenticated) {
            showNotification('스타일링을 시작하려면 로그인이 필요합니다. 로그인 후 이용해주세요! 😊', 'info');
            setShowLoginForm(true);
            return;
        }
        fileInputRef.current?.click();
    };

    const reset = () => {
        setScreen(AppScreen.Home);
        setOriginalImage(null);
        setPrompt('');
        setStyledResult(null);
        setProducts([]);
        setIsLoading(false);
        setError(null);
        setAiQuestion(null);
        setUserAnswer('');
        setSelectedProducts([]);
        setRequestDetails(null);
    };

    const handleBack = () => {
        if (screen === AppScreen.Result) {
            setScreen(AppScreen.Styling);
            setStyledResult(null);
            setProducts([]);
            setSelectedProducts([]);
            setRequestDetails(null);
        } else if (screen === AppScreen.Styling) {
            reset();
        }
    };

    const executeStyleGeneration = async (finalPrompt: string) => {
        if (!originalImage) return;
        setIsLoading(true);
        setError(null);

        try {
            setLoadingMessage('AI가 당신의 완벽한 스타일을 생성하고 있습니다...');
            const { styledImageBase64, description } = await generateStyle(originalImage.base64, originalImage.mimeType, finalPrompt);
            setStyledResult({ imageBase64: styledImageBase64, description });

            setLoadingMessage('당신의 스타일에 맞는 상품을 찾고 있습니다...');
            const productResults = await getProductsForStyle(description);

            setLoadingMessage('상품 이미지를 준비하고 있습니다...');
            const productsWithCroppedImages = await Promise.all(
                productResults.map(async (product) => {
                    const croppedBase64 = await cropImageForProduct(
                        styledImageBase64,
                        product.category,
                        product.name
                    );
                    return { ...product, croppedImageBase64: croppedBase64 || undefined };
                })
            );
            
            setProducts(productsWithCroppedImages);
            setSelectedProducts(productsWithCroppedImages);

            setScreen(AppScreen.Result);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred while generating your style.');
        } finally {
            setIsLoading(false);
            setAiQuestion(null);
            setUserAnswer('');
        }
    };

    // Fix: Restructured the conditional to ensure TypeScript correctly narrows the type of `validationResult`.
    const handleInitialStyleRequest = async () => {
        setAiQuestion(null);
        setError(null);
        setIsLoading(true);
        setLoadingMessage('스타일 요청을 검증하고 있습니다...');

        const validationResult = await validatePrompt(prompt);

        if (validationResult.valid === false) {
            setAiQuestion({ question: validationResult.question, examples: validationResult.examples });
            setIsLoading(false);
        } else {
            await executeStyleGeneration(prompt);
        }
    };
    
    const handleAnswerSubmit = async () => {
        const fullPrompt = `${prompt}\n\nAdditional information: ${userAnswer}`;
        await executeStyleGeneration(fullPrompt);
    };

    const handleProductSelect = (productToToggle: Product) => {
        setSelectedProducts(prevSelected =>
            prevSelected.some(p => p.productUrl === productToToggle.productUrl)
                ? prevSelected.filter(p => p.productUrl !== productToToggle.productUrl)
                : [...prevSelected, productToToggle]
        );
    };

    const handlePurchaseRequest = (items: Product[]) => {
        if (items.length === 0) {
            setError("구매할 상품을 선택해주세요.");
            return;
        }
        // 모든 제품이 KRW 국내 쇼핑몰 제품이므로 단순 합계로 계산
        const total = items.reduce((sum, p) => sum + p.price, 0);
        setRequestDetails({ count: items.length, total });
    };

    // 알림 표시 함수
    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000); // 5초 후 자동 숨김
    };

    // 인증 성공 핸들러
    const handleAuthSuccess = (isSignUp: boolean = false) => {
        setShowLoginForm(false);
        setShowSignUpForm(false);
        setError(null);

        // 성공 메시지 표시 (사용자 정보가 업데이트될 때까지 약간의 지연)
        setTimeout(() => {
            if (isSignUp) {
                showNotification('회원가입이 완료되었습니다! 자동으로 로그인되었습니다.', 'success');
            } else {
                showNotification('로그인되었습니다. 환영합니다!', 'success');
            }
        }, 100);
    };

    // 로그인/회원가입 모달 전환
    const switchToSignUp = () => {
        setShowLoginForm(false);
        setShowSignUpForm(true);
    };

    const switchToLogin = () => {
        setShowSignUpForm(false);
        setShowLoginForm(true);
    };

    const closeAuthModals = () => {
        setShowLoginForm(false);
        setShowSignUpForm(false);
    };

    // MyPage 메뉴 토글
    const toggleMyPageMenu = () => {
        setShowMyPageMenu(!showMyPageMenu);
    };

    // 로그아웃 핸들러
    const handleLogout = async () => {
        await logout();
        setShowMyPageMenu(false);
        showNotification('로그아웃되었습니다.', 'info');
    };

    const renderHome = () => (
        <div className="flex flex-col items-center justify-start pt-8 sm:pt-12 min-h-screen text-center p-4 sm:p-8">
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-[1px] rounded-3xl shadow-2xl w-full max-w-sm">
                <div className="bg-slate-900/95 backdrop-blur-sm p-6 sm:p-8 rounded-3xl">
                    {/* 개선된 환영 메시지 */}
                    <div className="mb-6 sm:mb-8">
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full blur-lg opacity-30 animate-pulse"></div>
                            <h1 className="relative text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent leading-tight mb-2">
                                안녕하세요! 👋
                            </h1>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-semibold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent mb-4">
                            당신만의 AI 스타일리스트
                        </h2>
                        <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                            패션에 고민이 있으신가요? 💭<br/>
                            <span className="text-amber-300 font-medium">단 한 장의 사진</span>으로<br/>
                            <span className="text-cyan-300 font-medium">완벽한 코디</span>를 제안해드릴게요!
                        </p>
                    </div>

                    {/* 서비스 특징 */}
                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur-sm rounded-2xl p-4 mb-6 text-left border border-slate-600/30">
                        <div className="space-y-3 text-xs sm:text-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">✓</span>
                                </div>
                                <span className="text-slate-200">AI가 분석하는 맞춤형 스타일 추천</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">✓</span>
                                </div>
                                <span className="text-slate-200">실제 구매 가능한 국내 쇼핑몰 상품</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">✓</span>
                                </div>
                                <span className="text-slate-200">상황별 맞춤 코디네이션</span>
                            </div>
                        </div>
                    </div>

                <div className="space-y-4">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                        <button
                            onClick={handleStartStyling}
                            className="relative w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 sm:py-5 px-6 rounded-2xl flex items-center justify-center gap-3 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 text-base sm:text-lg"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl"></div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="relative z-10 w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="relative z-10">✨ 나만의 스타일링 시작하기</span>
                        </button>
                    </div>

                    <div className="text-center">
                        <p className="text-slate-300 text-xs sm:text-sm">
                            📷 카메라 촬영 또는 📱 갤러리에서 선택
                        </p>
                    </div>
                </div>

                {/* 인증된 사용자를 위한 빠른 액세스 메뉴 */}
                {isAuthenticated && (
                    <div className="mt-6 pt-6 border-t border-gradient-to-r from-purple-500/30 to-pink-500/30">
                        <h3 className="text-sm font-medium bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent mb-4 text-center">빠른 액세스</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => showNotification('최근 스타일링 기능 준비 중입니다.', 'info')}
                                className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 p-3 rounded-xl transition-all duration-200 text-center border border-purple-400/20 hover:border-purple-400/40"
                            >
                                <div className="text-xl mb-1">🎨</div>
                                <div className="text-xs text-slate-200">최근 스타일링</div>
                            </button>
                            <button
                                onClick={() => showNotification('위시리스트 기능 준비 중입니다.', 'info')}
                                className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 hover:from-pink-500/30 hover:to-rose-500/30 p-3 rounded-xl transition-all duration-200 text-center border border-pink-400/20 hover:border-pink-400/40"
                            >
                                <div className="text-xl mb-1">❤️</div>
                                <div className="text-xs text-slate-200">위시리스트</div>
                            </button>
                            <button
                                onClick={() => showNotification('주문내역 기능 준비 중입니다.', 'info')}
                                className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 p-3 rounded-xl transition-all duration-200 text-center border border-indigo-400/20 hover:border-indigo-400/40"
                            >
                                <div className="text-xl mb-1">📦</div>
                                <div className="text-xs text-slate-200">주문내역</div>
                            </button>
                        </div>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>
            </div>

            {/* 로그인된 사용자 인사말 */}
            {isAuthenticated && (
                <div className="mt-6 sm:mt-8 text-center">
                    <p className="text-slate-300 text-sm">
                        안녕하세요, <span className="text-amber-400 font-medium">{user?.first_name || user?.username}</span>님!
                        오늘도 멋진 스타일을 찾아보세요 ✨
                    </p>
                </div>
            )}

            {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>
    );

    const renderStyling = () => {
        return (
            <div className="p-4 sm:p-6 flex flex-col min-h-screen">
            <div className="flex-grow space-y-4 sm:space-y-6">
                {originalImage && (
                    <div className="w-full max-w-sm mx-auto">
                        <img src={originalImage.url} alt="User upload" className="rounded-lg w-full shadow-lg" />
                    </div>
                )}
                <div>
                    <label htmlFor="prompt" className="block text-base sm:text-lg font-medium text-slate-200 mb-3">어떤 스타일이 필요하신가요?</label>
                    <textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="예시: 친구들과 저녁 식사를 위한 스마트 캐주얼 스타일"
                        className="w-full bg-white border-2 border-gray-300 rounded-lg p-3 sm:p-4 text-gray-900 text-sm sm:text-base focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition shadow-sm placeholder-gray-500"
                        rows={4}
                        style={{ minHeight: '100px' }}
                    />
                </div>
                {aiQuestion && (
                    <div className="p-4 bg-slate-800 rounded-lg space-y-3">
                        <p className="text-slate-300 text-sm sm:text-base">{aiQuestion.question}</p>
                        <div className="flex flex-wrap gap-2">
                            {aiQuestion.examples.map((ex, i) => (
                                <button key={i} onClick={() => setUserAnswer(ex)} className="text-xs sm:text-sm bg-slate-700 text-slate-300 px-2 py-1 rounded-md hover:bg-slate-600 transition-colors">{ex}</button>
                            ))}
                        </div>
                        <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="답변을 입력해주세요..." className="w-full bg-white border-2 border-gray-300 rounded-lg p-3 text-gray-900 text-sm sm:text-base" rows={3} />
                        <button onClick={handleAnswerSubmit} disabled={isLoading || !userAnswer} className="w-full bg-sky-400 text-white font-bold py-3 px-4 text-sm sm:text-base rounded-lg hover:bg-sky-300 disabled:bg-slate-600 transition-colors">답변 제출</button>
                    </div>
                )}
                {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
            {!aiQuestion && (
                <div className="sticky bottom-4 bg-slate-900 pt-4">
                    <button onClick={handleInitialStyleRequest} disabled={isLoading || !prompt} className="w-full bg-amber-400 text-slate-900 font-bold py-3 sm:py-4 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors duration-300 shadow-lg disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed text-sm sm:text-base">
                        <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        스타일 생성
                    </button>
                </div>
            )}
            </div>
        );
    };
    
    const renderResultScreen = () => {
        if (!styledResult) return null;

        // 모든 제품이 KRW 국내 쇼핑몰 제품이므로 KRW 형식으로 통일
        const formatCurrency = (value: number) => {
            return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
        };

        return (
            <div className="pb-32 sm:pb-40"> {/* Add padding to bottom to avoid overlap with fixed bar */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <div className="w-full max-w-md mx-auto">
                        <img src={`data:image/png;base64,${styledResult.imageBase64}`} alt="Styled result" className="rounded-lg w-full shadow-2xl" />
                    </div>
                    
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-3">스타일 추천</h2>
                        <p className="text-slate-300 leading-relaxed text-sm sm:text-base">{styledResult.description}</p>
                    </div>
                    
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-4">스타일링 아이템</h2>
                        {Object.keys(groupedProducts).length > 0 ? (
                            Object.entries(groupedProducts).map(([category, items]) => (
                                <div key={category} className="mb-6">
                                    <h3 className="text-base sm:text-lg font-bold text-amber-400 mb-3 pb-2 border-b-2 border-slate-700">{category}</h3>
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        {items.map((product) => (
                                            <ProductCard
                                                key={product.productUrl}
                                                product={product}
                                                isSelected={selectedProducts.some(p => p.productUrl === product.productUrl)}
                                                onSelect={() => handleProductSelect(product)}
                                                fallbackImageUrl={`data:image/png;base64,${styledResult.imageBase64}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 text-center py-8">추천 상품을 찾을 수 없습니다.</p>
                        )}
                    </div>
                    {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
                </div>

                <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-slate-800 border-t border-slate-700 shadow-lg">
                     {requestDetails ? (
                        <div className="p-3 sm:p-4 text-center">
                            <h3 className="font-bold text-base sm:text-lg text-sky-400">구매 요청이 완료되었습니다!</h3>
                            <p className="text-slate-300 text-xs sm:text-sm mt-1">검토 후 결제를 위해 연락드리겠습니다.</p>
                            <p className="text-slate-300 text-xs sm:text-sm mt-2">요청 상품: {requestDetails.count}개 / 예상 금액: {formatCurrency(requestDetails.total)}</p>
                        </div>
                     ) : (
                        <div className="p-3 sm:p-4">
                            <div className="flex justify-between items-center mb-3 sm:mb-4">
                                <span className="text-slate-300 text-sm sm:text-base">선택된 상품 ({selectedProducts.length}개)</span>
                                <span className="text-lg sm:text-xl font-bold text-amber-400">{formatCurrency(totalPrice)}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <button onClick={() => handlePurchaseRequest(selectedProducts)} className="w-full bg-sky-400 text-white font-bold py-2.5 sm:py-3 rounded-lg hover:bg-sky-300 transition-colors text-sm sm:text-base">선택한 상품 요청</button>
                                <button onClick={() => handlePurchaseRequest(products)} className="w-full bg-yellow-500 text-slate-900 font-bold py-2.5 sm:py-3 rounded-lg hover:bg-yellow-400 transition-colors text-sm sm:text-base">전체 스타일 요청</button>
                            </div>
                        </div>
                     )}
                </div>
            </div>
        );
    };

    // MyPage 메뉴 외부 클릭 감지를 위한 useEffect
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showMyPageMenu) {
                const target = event.target as Element;
                if (!target.closest('.mypage-menu')) {
                    setShowMyPageMenu(false);
                }
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showMyPageMenu]);

    return (
        <ErrorBoundary>
            <div className="bg-slate-900 min-h-screen text-slate-100">
                <div className="max-w-lg mx-auto bg-slate-900 min-h-screen flex flex-col">
                    <Header
                        onBack={handleBack}
                        showBackButton={screen !== AppScreen.Home}
                        onLogin={() => setShowLoginForm(true)}
                    />

                    {/* 알림 메시지 */}
                    {notification && (
                        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg ${
                            notification.type === 'success' ? 'bg-green-500 text-white' :
                            notification.type === 'error' ? 'bg-red-500 text-white' :
                            'bg-blue-500 text-white'
                        }`}>
                            {notification.message}
                        </div>
                    )}

                    <main className="flex-grow">
                        {isLoading && (
                            <div className="relative">
                                <Spinner message={loadingMessage} />
                                {screen === AppScreen.Result && <LoadingSkeleton type="style-result" />}
                            </div>
                        )}
                        <div className="h-full">
                            {screen === AppScreen.Home && renderHome()}
                            {screen === AppScreen.Styling && renderStyling()}
                            {screen === AppScreen.Result && renderResultScreen()}
                        </div>
                    </main>
                </div>
            </div>

            {/* 인증 모달들 */}
            {showLoginForm && (
                <LoginForm
                    onSuccess={() => handleAuthSuccess(false)}
                    onSwitchToSignUp={switchToSignUp}
                    onClose={closeAuthModals}
                />
            )}

            {showSignUpForm && (
                <SignUpForm
                    onSuccess={() => handleAuthSuccess(true)}
                    onSwitchToLogin={switchToLogin}
                    onClose={closeAuthModals}
                />
            )}
        </ErrorBoundary>
    );
};

// Router 컴포넌트
const AppRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/cart" element={<CartPage />} />
        </Routes>
    );
};

// 메인 App 컴포넌트 (AuthProvider와 CartProvider로 래핑)
const App: React.FC = () => {
    return (
        <Router>
            <AuthProvider>
                <CartProvider>
                    <AppRoutes />
                </CartProvider>
            </AuthProvider>
        </Router>
    );
};

export default App;