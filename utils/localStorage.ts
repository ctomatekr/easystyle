// Local storage utilities with error handling and type safety

export interface StyleHistory {
  id: string;
  timestamp: number;
  originalImage: string;
  styledImage: string;
  description: string;
  prompt: string;
  products: Array<{
    name: string;
    brand: string;
    price: number;
    category: string;
    imageUrl: string;
  }>;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: 'ko' | 'en';
  notifications: boolean;
  autoOptimizeImages: boolean;
  preferredCategories: string[];
}

export interface WishlistItem {
  id: string;
  productUrl: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  category: string;
  addedAt: number;
}

// Generic storage functions with error handling
class SafeLocalStorage {
  private isSupported(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  get<T>(key: string, defaultValue: T): T {
    if (!this.isSupported()) {
      console.warn('LocalStorage is not supported');
      return defaultValue;
    }

    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return defaultValue;
    }
  }

  set<T>(key: string, value: T): boolean {
    if (!this.isSupported()) {
      console.warn('LocalStorage is not supported');
      return false;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
      return false;
    }
  }

  remove(key: string): boolean {
    if (!this.isSupported()) return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
      return false;
    }
  }

  clear(): boolean {
    if (!this.isSupported()) return false;

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  getSize(): number {
    if (!this.isSupported()) return 0;
    
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }
}

const storage = new SafeLocalStorage();

// Style History Management
export const styleHistoryManager = {
  getAll(): StyleHistory[] {
    return storage.get('easystyle_history', []);
  },

  add(style: Omit<StyleHistory, 'id' | 'timestamp'>): string {
    const history = this.getAll();
    const newStyle: StyleHistory = {
      ...style,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    
    // Keep only last 50 entries
    history.unshift(newStyle);
    const trimmed = history.slice(0, 50);
    
    storage.set('easystyle_history', trimmed);
    return newStyle.id;
  },

  remove(id: string): boolean {
    const history = this.getAll();
    const filtered = history.filter(item => item.id !== id);
    return storage.set('easystyle_history', filtered);
  },

  clear(): boolean {
    return storage.set('easystyle_history', []);
  },

  getById(id: string): StyleHistory | null {
    const history = this.getAll();
    return history.find(item => item.id === id) || null;
  }
};

// User Preferences Management
export const userPreferencesManager = {
  get(): UserPreferences {
    return storage.get('easystyle_preferences', {
      theme: 'dark',
      language: 'ko',
      notifications: true,
      autoOptimizeImages: true,
      preferredCategories: []
    });
  },

  update(preferences: Partial<UserPreferences>): boolean {
    const current = this.get();
    const updated = { ...current, ...preferences };
    return storage.set('easystyle_preferences', updated);
  },

  reset(): boolean {
    return storage.remove('easystyle_preferences');
  }
};

// Wishlist Management
export const wishlistManager = {
  getAll(): WishlistItem[] {
    return storage.get('easystyle_wishlist', []);
  },

  add(item: Omit<WishlistItem, 'id' | 'addedAt'>): string {
    const wishlist = this.getAll();
    
    // Check if item already exists
    if (wishlist.some(existing => existing.productUrl === item.productUrl)) {
      throw new Error('이미 위시리스트에 추가된 상품입니다.');
    }
    
    const newItem: WishlistItem = {
      ...item,
      id: Date.now().toString(),
      addedAt: Date.now()
    };
    
    wishlist.unshift(newItem);
    storage.set('easystyle_wishlist', wishlist);
    return newItem.id;
  },

  remove(id: string): boolean {
    const wishlist = this.getAll();
    const filtered = wishlist.filter(item => item.id !== id);
    return storage.set('easystyle_wishlist', filtered);
  },

  toggle(item: Omit<WishlistItem, 'id' | 'addedAt'>): 'added' | 'removed' {
    const wishlist = this.getAll();
    const existing = wishlist.find(w => w.productUrl === item.productUrl);
    
    if (existing) {
      this.remove(existing.id);
      return 'removed';
    } else {
      this.add(item);
      return 'added';
    }
  },

  clear(): boolean {
    return storage.set('easystyle_wishlist', []);
  },

  isInWishlist(productUrl: string): boolean {
    const wishlist = this.getAll();
    return wishlist.some(item => item.productUrl === productUrl);
  }
};

// Cache Management for offline support
export const cacheManager = {
  get(key: string): any {
    const cached = storage.get(`cache_${key}`, null);
    if (!cached) return null;
    
    // Check if expired (24 hours)
    if (Date.now() - cached.timestamp > 24 * 60 * 60 * 1000) {
      this.remove(key);
      return null;
    }
    
    return cached.data;
  },

  set(key: string, data: any, ttl?: number): boolean {
    const cached = {
      data,
      timestamp: Date.now(),
      ttl: ttl || 24 * 60 * 60 * 1000 // 24 hours default
    };
    return storage.set(`cache_${key}`, cached);
  },

  remove(key: string): boolean {
    return storage.remove(`cache_${key}`);
  },

  clear(): boolean {
    if (!storage.isSupported()) return false;
    
    const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
    keys.forEach(key => localStorage.removeItem(key));
    return true;
  }
};

// Storage quota management
export const storageManager = {
  getQuotaInfo(): { used: number; available?: number } {
    const used = storage.getSize();
    
    // Estimate available space (5MB typical limit)
    const estimated = 5 * 1024 * 1024;
    return {
      used,
      available: Math.max(0, estimated - used)
    };
  },

  cleanup(): boolean {
    try {
      // Clear expired cache
      cacheManager.clear();
      
      // Trim history to 25 items
      const history = styleHistoryManager.getAll();
      if (history.length > 25) {
        storage.set('easystyle_history', history.slice(0, 25));
      }
      
      return true;
    } catch (error) {
      console.error('Storage cleanup failed:', error);
      return false;
    }
  }
};

export default storage;