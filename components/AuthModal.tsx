import React, { useState } from 'react';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from './icons';
import { authAPI, User } from '../services/apiService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, token: string) => void;
}

type AuthMode = 'login' | 'register';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.username.trim()) return '사용자명이 필요합니다';
    if (!formData.password.trim()) return '비밀번호가 필요합니다';
    if (formData.password.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다';

    if (mode === 'register') {
      if (!formData.email.trim()) return '이메일이 필요합니다';
      if (!formData.email.includes('@')) return '올바른 이메일을 입력해주세요';
      if (!formData.first_name.trim()) return '이름이 필요합니다';
      if (!formData.last_name.trim()) return '성을 입력해주세요';
      if (formData.password !== formData.password_confirm) return '비밀번호가 일치하지 않습니다';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response;
      if (mode === 'login') {
        response = await authAPI.login({
          username: formData.username,
          password: formData.password
        });
      } else {
        response = await authAPI.register({
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password,
          password_confirm: formData.password_confirm
        });
      }
      onLoginSuccess(response.user, response.token);
      onClose();
      resetForm();
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || '인증에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      password_confirm: ''
    });
    setError(null);
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-100">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
이름
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                    placeholder="이름을 입력하세요"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
성
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                    placeholder="성을 입력하세요"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
이메일
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                  placeholder="이메일을 입력하세요"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
사용자명
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
              placeholder="사용자명을 입력하세요"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
비밀번호
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 pr-12 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                placeholder="비밀번호를 입력하세요"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
비밀번호 확인
              </label>
              <input
                type="password"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                placeholder="비밀번호를 다시 입력하세요"
                disabled={isLoading}
              />
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm bg-red-900 bg-opacity-20 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-amber-300 transition-colors disabled:bg-slate-600 disabled:text-slate-400"
          >
            {isLoading ? '처리 중...' : (mode === 'login' ? '로그인' : '회원가입')}
          </button>
        </form>

        {/* Switch Mode */}
        <div className="mt-6 text-center">
          <p className="text-slate-400">
            {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          </p>
          <button
            onClick={switchMode}
            className="text-amber-400 hover:text-amber-300 font-medium mt-1"
            disabled={isLoading}
          >
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </div>

        {/* Social Login Placeholder */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="text-center text-slate-400 text-sm mb-4">
또는 소셜 로그인으로 계속하기
          </div>
          <div className="space-y-2">
            <button className="w-full bg-white text-black font-medium py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors">
Google로 계속하기
            </button>
            <button className="w-full bg-yellow-400 text-black font-medium py-3 px-4 rounded-lg hover:bg-yellow-300 transition-colors">
카카오로 계속하기
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">
소셜 로그인 기능은 곧 제공될 예정입니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;