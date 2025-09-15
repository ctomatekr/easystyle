import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, User, apiUtils } from '../services/apiService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && apiUtils.isAuthenticated();

  useEffect(() => {
    // 앱 시작 시 저장된 사용자 정보 확인
    const initializeAuth = async () => {
      try {
        if (apiUtils.isAuthenticated()) {
          const storedUser = apiUtils.getCurrentUser();
          if (storedUser) {
            setUser(storedUser);
          } else {
            // 토큰은 있지만 사용자 정보가 없는 경우, 프로필 가져오기
            const profile = await authAPI.getProfile();
            setUser(profile);
            apiUtils.setCurrentUser(profile);
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // 토큰이 유효하지 않은 경우 정리
        apiUtils.clearCurrentUser();
        localStorage.removeItem('authToken');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login({ username, password });
      setUser(response.user);
      apiUtils.setCurrentUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      setUser(response.user);
      apiUtils.setCurrentUser(response.user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      apiUtils.clearCurrentUser();
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      const updatedUser = await authAPI.updateProfile(profileData);
      setUser(updatedUser);
      apiUtils.setCurrentUser(updatedUser);
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};