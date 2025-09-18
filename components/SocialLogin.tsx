import React, { useState } from 'react';
import { GoogleIcon, KakaoIcon } from './icons';

interface SocialLoginProps {
  onSocialLogin: (token: string, provider: string) => void;
  isLoading?: boolean;
}

const SocialLogin: React.FC<SocialLoginProps> = ({ onSocialLogin, isLoading = false }) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (isLoading || googleLoading) return;

    setGoogleLoading(true);
    try {
      // Google OAuth2 URL 생성
      const googleAuthUrl = new URL('https://accounts.google.com/oauth/authorize');
      googleAuthUrl.searchParams.set('client_id', import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
      googleAuthUrl.searchParams.set('redirect_uri', `${window.location.origin}/auth/callback/google`);
      googleAuthUrl.searchParams.set('response_type', 'token');
      googleAuthUrl.searchParams.set('scope', 'profile email');

      // 새 창에서 Google 로그인 페이지 열기
      const popup = window.open(
        googleAuthUrl.toString(),
        'google-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // 팝업에서 토큰 받기를 대기
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setGoogleLoading(false);
        }
      }, 1000);

      // 메시지 리스너로 토큰 받기
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.token) {
          onSocialLogin(event.data.token, 'google');
          popup?.close();
          window.removeEventListener('message', messageListener);
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          console.error('Google 로그인 오류:', event.data.error);
          popup?.close();
          window.removeEventListener('message', messageListener);
        }
      };

      window.addEventListener('message', messageListener);

    } catch (error) {
      console.error('Google 로그인 오류:', error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    if (isLoading || kakaoLoading) return;

    setKakaoLoading(true);
    try {
      // Kakao OAuth2 URL 생성
      const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize');
      kakaoAuthUrl.searchParams.set('client_id', import.meta.env.VITE_KAKAO_CLIENT_ID || '');
      kakaoAuthUrl.searchParams.set('redirect_uri', `${window.location.origin}/auth/callback/kakao`);
      kakaoAuthUrl.searchParams.set('response_type', 'code');

      // 새 창에서 Kakao 로그인 페이지 열기
      const popup = window.open(
        kakaoAuthUrl.toString(),
        'kakao-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // 팝업에서 토큰 받기를 대기
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setKakaoLoading(false);
        }
      }, 1000);

      // 메시지 리스너로 토큰 받기
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'KAKAO_AUTH_SUCCESS' && event.data.token) {
          onSocialLogin(event.data.token, 'kakao');
          popup?.close();
          window.removeEventListener('message', messageListener);
        } else if (event.data.type === 'KAKAO_AUTH_ERROR') {
          console.error('Kakao 로그인 오류:', event.data.error);
          popup?.close();
          window.removeEventListener('message', messageListener);
        }
      };

      window.addEventListener('message', messageListener);

    } catch (error) {
      console.error('Kakao 로그인 오류:', error);
    } finally {
      setKakaoLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">또는</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || googleLoading}
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          ) : (
            <>
              <GoogleIcon className="w-5 h-5 mr-2" />
              <span>Google</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleKakaoLogin}
          disabled={isLoading || kakaoLoading}
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-yellow-400 text-sm font-medium text-gray-900 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {kakaoLoading ? (
            <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-900 rounded-full animate-spin"></div>
          ) : (
            <>
              <KakaoIcon className="w-5 h-5 mr-2" />
              <span>Kakao</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SocialLogin;