import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface SignUpFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  onClose: () => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSuccess, onSwitchToLogin, onClose }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    phone_number: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setErrors(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string[]> = {};

    if (!formData.username.trim()) {
      newErrors.username = ['사용자명은 필수입니다'];
    }

    if (!formData.email.trim()) {
      newErrors.email = ['이메일은 필수입니다'];
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = ['올바른 이메일 형식이 아닙니다'];
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = ['이름은 필수입니다'];
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = ['성은 필수입니다'];
    }

    if (!formData.password) {
      newErrors.password = ['비밀번호는 필수입니다'];
    } else if (formData.password.length < 8) {
      newErrors.password = ['비밀번호는 8자 이상이어야 합니다'];
    }

    if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = ['비밀번호가 일치하지 않습니다'];
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);
    setErrors(null);

    try {
      await register({
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        password_confirm: formData.password_confirm
      });

      onSuccess();
    } catch (err: any) {
      console.error('Registration error:', err);

      // 백엔드에서 온 필드별 에러 처리
      if (typeof err === 'object' && err !== null) {
        // 필드별 에러 메시지를 한국어로 변환
        const fieldErrors: Record<string, string[]> = {};

        if (err.username) {
          fieldErrors.username = err.username.map((msg: string) => {
            if (msg.includes('already exists') || msg.includes('중복')) {
              return '이미 사용 중인 사용자명입니다.';
            }
            return msg;
          });
        }

        if (err.email) {
          fieldErrors.email = err.email.map((msg: string) => {
            if (msg.includes('already exists') || msg.includes('중복')) {
              return '이미 사용 중인 이메일입니다.';
            }
            return msg;
          });
        }

        // 다른 필드 에러들도 그대로 추가
        Object.keys(err).forEach(key => {
          if (!fieldErrors[key] && Array.isArray(err[key])) {
            fieldErrors[key] = err[key];
          }
        });

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else {
          setErrors({ general: ['회원가입에 실패했습니다. 다시 시도해주세요.'] });
        }
      } else {
        setErrors({ general: ['회원가입에 실패했습니다. 다시 시도해주세요.'] });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldError = (fieldName: string): string | null => {
    return errors && errors[fieldName] ? errors[fieldName][0] : null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-100">회원가입</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">
              사용자명 *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className={`w-full px-4 py-3 bg-slate-700 border ${getFieldError('username') ? 'border-red-500' : 'border-slate-600'} rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400`}
              placeholder="사용자명"
            />
            {getFieldError('username') && (
              <p className="text-red-400 text-xs mt-1">{getFieldError('username')}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
              이메일 *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={`w-full px-4 py-3 bg-slate-700 border ${getFieldError('email') ? 'border-red-500' : 'border-slate-600'} rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400`}
              placeholder="이메일 주소"
            />
            {getFieldError('email') && (
              <p className="text-red-400 text-xs mt-1">{getFieldError('email')}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-slate-300 mb-1">
                이름 *
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 bg-slate-700 border ${getFieldError('first_name') ? 'border-red-500' : 'border-slate-600'} rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400`}
                placeholder="이름"
              />
              {getFieldError('first_name') && (
                <p className="text-red-400 text-xs mt-1">{getFieldError('first_name')}</p>
              )}
            </div>

            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-slate-300 mb-1">
                성 *
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 bg-slate-700 border ${getFieldError('last_name') ? 'border-red-500' : 'border-slate-600'} rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400`}
                placeholder="성"
              />
              {getFieldError('last_name') && (
                <p className="text-red-400 text-xs mt-1">{getFieldError('last_name')}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-slate-300 mb-1">
              전화번호 (선택사항)
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              placeholder="전화번호"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
              비밀번호 *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 pr-12 bg-slate-700 border ${getFieldError('password') ? 'border-red-500' : 'border-slate-600'} rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400`}
                placeholder="비밀번호 (8자 이상)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L9.878 9.878m4.242 4.242L9.878 9.878m4.242 4.242l3.905 3.905m-2.472-2.472L19.5 4.5m0 0l-14.5 14.5M19.5 4.5L5 19" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {getFieldError('password') && (
              <p className="text-red-400 text-xs mt-1">{getFieldError('password')}</p>
            )}
          </div>

          <div>
            <label htmlFor="password_confirm" className="block text-sm font-medium text-slate-300 mb-1">
              비밀번호 확인 *
            </label>
            <div className="relative">
              <input
                type={showPasswordConfirm ? "text" : "password"}
                id="password_confirm"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 pr-12 bg-slate-700 border ${getFieldError('password_confirm') ? 'border-red-500' : 'border-slate-600'} rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400`}
                placeholder="비밀번호 확인"
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
              >
                {showPasswordConfirm ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L9.878 9.878m4.242 4.242L9.878 9.878m4.242 4.242l3.905 3.905m-2.472-2.472L19.5 4.5m0 0l-14.5 14.5M19.5 4.5L5 19" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {getFieldError('password_confirm') && (
              <p className="text-red-400 text-xs mt-1">{getFieldError('password_confirm')}</p>
            )}
          </div>

          {errors && errors.general && (
            <div className="p-3 bg-red-900 border border-red-600 rounded-lg">
              <p className="text-red-200 text-sm">{errors.general[0]}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-amber-300 transition-colors duration-300 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>

          <div className="text-center">
            <p className="text-slate-400 text-sm">
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-amber-400 hover:text-amber-300 font-medium"
              >
                로그인
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpForm;