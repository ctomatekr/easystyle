/**
 * EasyStyle Backend API Service
 * 백엔드 API와의 모든 통신을 관리하는 서비스
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// API 응답 타입 정의
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  provider?: string;
  provider_id?: string;
  profile?: UserProfile;
  created_at: string;
}

export interface UserProfile {
  height?: number;
  weight?: number;
  favorite_colors: string[];
  style_categories: string[];
  budget_range: string;
}

export interface Product {
  uuid: string;
  name: string;
  brand_name: string;
  category_name: string;
  store_name: string;
  current_price: number;
  original_price: string;
  sale_price?: string;
  currency: string;
  is_on_sale: boolean;
  discount_percentage: number;
  color: string;
  main_image: string;
  rating?: number;
  review_count: number;
  is_available: boolean;
  is_wishlisted: boolean;
  product_url: string;
  recommended_size: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  product_count: number;
}

// HTTP 클라이언트 유틸리티
class ApiClient {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.authToken = localStorage.getItem('authToken');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Token ${this.authToken}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      console.error('API 오류:', response.status, response.statusText);
      const errorData = await response.json().catch(() => ({}));
      console.error('오류 데이터:', errorData);

      // 백엔드에서 온 유효성 검증 에러를 그대로 전달
      if (response.status === 400 && errorData) {
        throw errorData;
      }

      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }

    return await response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    console.log('API GET 요청:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    console.log('API 응답 상태:', response.status, response.statusText);
    
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem('authToken', token);
  }

  clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem('authToken');
  }
}

// API 클라이언트 인스턴스
const apiClient = new ApiClient(API_BASE_URL);

// 인증 관련 API
export const authAPI = {
  async register(userData: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    password: string;
    password_confirm: string;
    phone_number?: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register/', userData);
    apiClient.setAuthToken(response.token);
    return response;
  },

  async login(credentials: {
    username: string;
    password: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login/', credentials);
    apiClient.setAuthToken(response.token);
    return response;
  },

  async logout(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/logout/', {});
    apiClient.clearAuthToken();
    return response;
  },

  async getProfile(): Promise<User> {
    return apiClient.get<User>('/auth/profile/');
  },

  async updateProfile(profileData: Partial<User>): Promise<User> {
    return apiClient.put<User>('/auth/profile/', profileData);
  },

  async getDashboard(): Promise<{
    user: User;
    stats: {
      total_styles: number;
      last_style_date?: string;
      profile_completion: number;
    };
    recent_styles: any[];
  }> {
    return apiClient.get('/auth/dashboard/');
  },

  // 소셜 로그인
  async socialLogin(provider: 'google' | 'kakao', accessToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(`/auth/social/${provider}/`, {
      access_token: accessToken
    });
    apiClient.setAuthToken(response.token);
    return response;
  },

  async socialDisconnect(): Promise<{ message: string }> {
    return apiClient.post('/auth/social/disconnect/', {});
  }
};

// 제품 관련 API
export const productsAPI = {
  async getCategories(): Promise<{ results: ProductCategory[] }> {
    return apiClient.get('/products/categories/');
  },

  async getProducts(params?: {
    category?: number;
    brand?: number;
    store?: number;
    min_price?: number;
    max_price?: number;
    color?: string;
    is_on_sale?: boolean;
    sort_by?: string;
    search?: string;
  }): Promise<{ 
    count: number;
    results: Product[] 
  }> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/products/?${queryString}` : '/products/';
    
    return apiClient.get(endpoint);
  },

  async getProduct(uuid: string): Promise<Product> {
    return apiClient.get(`/products/${uuid}/`);
  },

  async searchProducts(searchData: {
    query?: string;
    category?: string;
    brand?: string;
    min_price?: number;
    max_price?: number;
    style_tags?: string[];
    sort_by?: string;
    page?: number;
  }): Promise<{
    results: Product[];
    total_count: number;
    page: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
  }> {
    return apiClient.post('/products/search/', searchData);
  },

  async getStatistics(): Promise<{
    total_products: number;
    total_brands: number;
    total_stores: number;
    categories: Array<{
      id: number;
      name: string;
      product_count: number;
    }>;
  }> {
    return apiClient.get('/products/statistics/');
  }
};

// 위시리스트 관련 API
export const wishlistAPI = {
  async getWishlist(): Promise<{ results: any[] }> {
    return apiClient.get('/products/wishlist/');
  },

  async toggleWishlist(productUuid: string): Promise<{
    message: string;
    wishlisted: boolean;
  }> {
    return apiClient.post('/products/wishlist/toggle/', {
      product_uuid: productUuid
    });
  }
};

// 스타일 추천 관련 API
export const styleAPI = {
  async getRecommendations(): Promise<{ results: any[] }> {
    return apiClient.get('/products/recommendations/');
  },

  async createRecommendation(data: {
    style_prompt: string;
    generated_image: string;
    ai_description: string;
    confidence_score: number;
    processing_time?: number;
  }): Promise<any> {
    return apiClient.post('/products/recommendations/', data);
  }
};

// 파일 업로드 관련 API
export const uploadAPI = {
  async uploadStyleImage(file: File): Promise<{
    message: string;
    file_path: string;
    file_url: string;
    original_name: string;
  }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/products/upload/style-image/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Upload failed');
    }

    return response.json();
  },

  async uploadProfilePicture(file: File): Promise<{
    message: string;
    file_path: string;
    file_url: string;
  }> {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('profile_picture', file);

    const response = await fetch(`${API_BASE_URL}/products/upload/profile-picture/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Upload failed');
    }

    return response.json();
  },

  async deleteProfilePicture(): Promise<{ message: string }> {
    return apiClient.delete('/products/upload/profile-picture/delete/');
  },

  async getUploadInfo(): Promise<{
    style_image: {
      max_size_mb: number;
      allowed_formats: string[];
      max_resolution: string;
      description: string;
    };
    profile_picture: {
      max_size_mb: number;
      allowed_formats: string[];
      max_resolution: string;
      description: string;
    };
  }> {
    return apiClient.get('/products/upload/info/');
  }
};

// 장바구니 관련 API
export const cartAPI = {
  async getCart(): Promise<any> {
    return apiClient.get('/products/cart/');
  },

  async addToCart(data: {
    product_uuid: string;
    size?: string;
    quantity?: number;
    style_set_id?: string;
  }): Promise<{ message: string; cart_item: any }> {
    return apiClient.post('/products/cart/add_item/', data);
  },

  async updateCartItem(itemId: number, quantity: number): Promise<any> {
    return apiClient.post('/products/cart/update_item/', {
      item_id: itemId,
      quantity
    });
  },

  async removeFromCart(itemId: number): Promise<{ message: string }> {
    return apiClient.post('/products/cart/remove_item/', {
      item_id: itemId
    });
  },

  async clearCart(): Promise<{ message: string }> {
    return apiClient.post('/products/cart/clear_cart/', {});
  },

};

// 유틸리티 함수
export const apiUtils = {
  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  },

  setCurrentUser(user: User) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  },

  clearCurrentUser() {
    localStorage.removeItem('currentUser');
  },

  formatPrice(price: number, currency = 'KRW'): string {
    if (currency === 'KRW') {
      return `₩${price.toLocaleString()}`;
    }
    return `$${(price / 1300).toFixed(2)}`;
  },

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
};

export default apiClient;