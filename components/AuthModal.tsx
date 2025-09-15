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
    if (!formData.username.trim()) return 'Username is required';
    if (!formData.password.trim()) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';

    if (mode === 'register') {
      if (!formData.email.trim()) return 'Email is required';
      if (!formData.email.includes('@')) return 'Please enter a valid email';
      if (!formData.first_name.trim()) return 'First name is required';
      if (!formData.last_name.trim()) return 'Last name is required';
      if (formData.password !== formData.password_confirm) return 'Passwords do not match';
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
      setError(err.message || 'Authentication failed. Please try again.');
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
            {mode === 'login' ? 'Login' : 'Sign Up'}
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
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                    placeholder="First name"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                    placeholder="Last name"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 pr-12 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                placeholder="Enter your password"
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
                Confirm Password
              </label>
              <input
                type="password"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                placeholder="Confirm your password"
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
            {isLoading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Sign Up')}
          </button>
        </form>

        {/* Switch Mode */}
        <div className="mt-6 text-center">
          <p className="text-slate-400">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          </p>
          <button
            onClick={switchMode}
            className="text-amber-400 hover:text-amber-300 font-medium mt-1"
            disabled={isLoading}
          >
            {mode === 'login' ? 'Sign Up' : 'Login'}
          </button>
        </div>

        {/* Social Login Placeholder */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="text-center text-slate-400 text-sm mb-4">
            Or continue with social login
          </div>
          <div className="space-y-2">
            <button className="w-full bg-white text-black font-medium py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors">
              Continue with Google
            </button>
            <button className="w-full bg-yellow-400 text-black font-medium py-3 px-4 rounded-lg hover:bg-yellow-300 transition-colors">
              Continue with Kakao
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">
            Social login features will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;