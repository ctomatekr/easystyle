import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AppScreen, Product, ProductCategory } from './types';
import { generateStyle, getProductsForStyle, validatePrompt, cropImageForProduct } from './services/geminiService';
import { optimizeImage, validateImageFile } from './utils/imageOptimization';
import { productsAPI, authAPI, apiUtils } from './services/apiService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Spinner from './components/Spinner';
import ProductCard from './components/ProductCard';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSkeleton from './components/SkeletonUI';
import LoginForm from './components/Auth/LoginForm';
import SignUpForm from './components/Auth/SignUpForm';
import { CameraIcon, GalleryIcon, SparklesIcon } from './components/icons';

type AIQuestion = {
  question: string;
  examples: string[];
};

const AppContent: React.FC = () => {
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
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full">
                <h1 className="text-3xl font-bold text-slate-100">당신의 개인 스타일리스트</h1>
                <p className="text-slate-400 mt-2 mb-8">한 장의 사진으로 완벽한 스타일을 찾아보세요.</p>
                <div className="space-y-4">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-600 transition-colors duration-300">
                        <CameraIcon className="w-6 h-6" />
                        사진 촬영
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors duration-300 shadow-lg">
                        <GalleryIcon className="w-6 h-6" />
                        갤러리에서 선택
                    </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>

            <div className="mt-8 flex items-center justify-center">
                {isAuthenticated ? (
                    <div className="relative">
                        <div className="flex items-center gap-4">
                            <span className="text-slate-300 text-sm">
                                안녕하세요, {user?.first_name || user?.username}님!
                            </span>
                            <button
                                onClick={toggleMyPageMenu}
                                className="bg-amber-400 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-300 transition-colors"
                            >
                                MyPage
                            </button>
                        </div>

                        {/* MyPage 드롭다운 메뉴 */}
                        {showMyPageMenu && (
                            <div className="mypage-menu absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 min-w-48">
                                <div className="p-4 border-b border-slate-700">
                                    <div className="text-slate-300 text-sm">
                                        <p className="font-medium">{user?.first_name} {user?.last_name}</p>
                                        <p className="text-slate-400">{user?.email}</p>
                                        <p className="text-slate-400">{user?.username}</p>
                                    </div>
                                </div>
                                <div className="p-2">
                                    <button
                                        onClick={() => {
                                            setShowMyPageMenu(false);
                                            showNotification('프로필 페이지 준비 중입니다.', 'info');
                                        }}
                                        className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700 rounded text-sm"
                                    >
                                        프로필 수정
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMyPageMenu(false);
                                            showNotification('주문 내역 페이지 준비 중입니다.', 'info');
                                        }}
                                        className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700 rounded text-sm"
                                    >
                                        주문 내역
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMyPageMenu(false);
                                            showNotification('설정 페이지 준비 중입니다.', 'info');
                                        }}
                                        className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700 rounded text-sm"
                                    >
                                        설정
                                    </button>
                                    <hr className="border-slate-700 my-2" />
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-3 py-2 text-red-400 hover:bg-slate-700 rounded text-sm"
                                    >
                                        로그아웃
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowLoginForm(true)}
                            className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium"
                        >
                            Login
                        </button>
                        <div className="w-px h-4 bg-slate-600"></div>
                        <button
                            onClick={() => setShowSignUpForm(true)}
                            className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium"
                        >
                            Sign Up
                        </button>
                    </div>
                )}
            </div>

            {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>
    );

    const renderStyling = () => (
        <div className="p-4 md:p-6 flex flex-col h-full">
            <div className="flex-grow overflow-y-auto">
                {originalImage && <img src={originalImage.url} alt="User upload" className="rounded-lg w-full max-w-md mx-auto shadow-lg" />}
                <div className="mt-6">
                    <label htmlFor="prompt" className="block text-lg font-medium text-slate-200 mb-2">어떤 스타일이 필요하신가요?</label>
                    <textarea 
                        id="prompt" 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        placeholder="예시: 친구들과 저녁 식사를 위한 스마트 캐주얼 스타일" 
                        className="w-full bg-white border-2 border-gray-300 rounded-lg p-4 text-gray-900 text-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition shadow-sm placeholder-gray-500" 
                        rows={4} 
                        style={{ minHeight: '120px' }}
                    />
                </div>
                {aiQuestion && (
                    <div className="mt-4 p-4 bg-slate-800 rounded-lg">
                        <p className="text-slate-300">{aiQuestion.question}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {aiQuestion.examples.map((ex, i) => (
                                <button key={i} onClick={() => setUserAnswer(ex)} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-md hover:bg-slate-600">{ex}</button>
                            ))}
                        </div>
                        <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="답변을 입력해주세요..." className="w-full mt-3 bg-white border-2 border-gray-300 rounded-lg p-3 text-gray-900 text-base" rows={3} />
                        <button onClick={handleAnswerSubmit} disabled={isLoading || !userAnswer} className="w-full mt-3 bg-sky-400 text-white font-bold py-3 px-4 text-base rounded-lg hover:bg-sky-300 disabled:bg-slate-600">답변 제출</button>
                    </div>
                )}
                 {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
            </div>
            {!aiQuestion && (
                <button onClick={handleInitialStyleRequest} disabled={isLoading || !prompt} className="w-full mt-6 bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors duration-300 shadow-lg disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed">
                    <SparklesIcon className="w-6 h-6" />
                    스타일 생성
                </button>
            )}
        </div>
    );
    
    const renderResultScreen = () => {
        if (!styledResult) return null;
        
        const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 1300); // Approximate USD conversion

        return (
            <div className="pb-40"> {/* Add padding to bottom to avoid overlap with fixed bar */}
                <div className="p-4 md:p-6">
                    <img src={`data:image/png;base64,${styledResult.imageBase64}`} alt="Styled result" className="rounded-lg w-full shadow-2xl" />
                    
                    <div className="my-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-2">스타일 추천</h2>
                        <p className="text-slate-300 leading-relaxed">{styledResult.description}</p>
                    </div>
                    
                    <div className="my-6">
                        <h2 className="text-2xl font-bold text-slate-100 mb-4">스타일링 아이템</h2>
                        {Object.keys(groupedProducts).length > 0 ? (
                            Object.entries(groupedProducts).map(([category, items]) => (
                                <div key={category} className="mb-6">
                                    <h3 className="text-lg font-bold text-amber-400 mb-3 pb-2 border-b-2 border-slate-700">{category}</h3>
                                    <div className="grid grid-cols-2 gap-4">
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
                        <div className="p-4 text-center">
                            <h3 className="font-bold text-lg text-sky-400">구매 요청이 완료되었습니다!</h3>
                            <p className="text-slate-300 text-sm mt-1">검토 후 결제를 위해 연락드리겠습니다.</p>
                            <p className="text-slate-300 text-sm mt-2">요청 상품: {requestDetails.count}개 / 예상 금액: {formatCurrency(requestDetails.total)}</p>
                        </div>
                     ) : (
                        <div className="p-4">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-slate-300">선택된 상품 ({selectedProducts.length}개)</span>
                                <span className="text-xl font-bold text-amber-400">{formatCurrency(totalPrice)}</span>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => handlePurchaseRequest(selectedProducts)} className="w-full bg-sky-400 text-white font-bold py-3 rounded-lg hover:bg-sky-300 transition-colors">선택한 상품 요청</button>
                                <button onClick={() => handlePurchaseRequest(products)} className="w-full bg-yellow-500 text-slate-900 font-bold py-3 rounded-lg hover:bg-yellow-400 transition-colors">전체 스타일 요청</button>
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
                    <Header onBack={handleBack} showBackButton={screen !== AppScreen.Home} />

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

// 메인 App 컴포넌트 (AuthProvider로 래핑)
const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;