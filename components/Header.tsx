
import React, { useState, useRef, useEffect } from 'react';
import { EasyStyleLogo } from './icons';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
    onBack?: () => void;
    showBackButton?: boolean;
    onLogin?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBack, showBackButton, onLogin }) => {
    const { getCartItemCount } = useCart();
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const cartItemCount = getCartItemCount();

    const handleCartClick = () => {
        navigate('/cart');
    };

    const handleLogout = async () => {
        try {
            await logout();
            setShowUserMenu(false);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // 외부 클릭 감지
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    return (
        <header className="bg-slate-800/50 backdrop-blur-sm p-4 sticky top-0 z-10 w-full max-w-lg mx-auto flex items-center justify-between">
            {showBackButton ? (
                <button onClick={onBack} className="text-slate-200 p-2 -ml-2 rounded-full hover:bg-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            ) : (
                <div className="w-10"></div>
            )}

            <div className="flex-1 flex justify-center">
                <EasyStyleLogo />
            </div>

            <div className="flex items-center space-x-2">
                {/* 장바구니 버튼 */}
                <button
                    onClick={handleCartClick}
                    className="relative text-slate-200 p-2 rounded-full hover:bg-slate-700 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                    </svg>
                    {cartItemCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {cartItemCount > 99 ? '99+' : cartItemCount}
                        </span>
                    )}
                </button>

                {/* 사용자 메뉴 */}
                {isAuthenticated ? (
                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="text-slate-200 p-2 rounded-full hover:bg-slate-700 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </button>

                        {/* 사용자 드롭다운 메뉴 */}
                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-lg border border-slate-700 py-2 z-50">
                                <div className="px-4 py-2 text-sm text-slate-300 border-b border-slate-700">
                                    <p className="font-medium text-slate-100">{user?.first_name} {user?.last_name}</p>
                                    <p className="text-xs">{user?.email}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors"
                                >
                                    로그아웃
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={onLogin}
                        className="text-slate-200 p-2 rounded-full hover:bg-slate-700 transition-colors text-sm"
                    >
                        로그인
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
