import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignUp: () => void;
  onClose: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToSignUp, onClose }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(formData.username, formData.password);
      onSuccess();
    } catch (err: any) {
      console.error('Login error:', err);

      if (err.non_field_errors) {
        setError(err.non_field_errors[0]);
      } else if (err.username) {
        setError(err.username[0]);
      } else if (err.password) {
        setError(err.password[0]);
      } else {
        setError('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-100">로그인</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
              사용자명 또는 이메일
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              placeholder="사용자명 또는 이메일을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900 border border-red-600 rounded-lg">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !formData.username || !formData.password}
            className="w-full bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-amber-300 transition-colors duration-300 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>

          <div className="text-center">
            <p className="text-slate-400 text-sm">
              계정이 없으신가요?{' '}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="text-amber-400 hover:text-amber-300 font-medium"
              >
                회원가입
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;