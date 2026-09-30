/**
 * CacheService - Abstracción para sistema de cache distribuido
 * 
 * En desarrollo: usa localStorage
 * En producción: usa Redis
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, { data: any; expires: number; tags: string[] }> = new Map();

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memEntry = this.cache.get(key);
    if (memEntry) {
      if (Date.now() < memEntry.expires) {
        return memEntry.data as T;
      }
      this.cache.delete(key);
    }

    // Try localStorage
    try {
      const stored = localStorage.getItem(`cache:${key}`);
      if (stored) {
        const entry = JSON.parse(stored);
        if (Date.now() < entry.expires) {
          // Restore to memory cache
          this.cache.set(key, entry);
          return entry.data as T;
        }
        localStorage.removeItem(`cache:${key}`);
      }
    } catch (error) {
      console.error('[CacheService] Error reading from localStorage:', error);
    }

    return null;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 3600; // Default 1 hour
    const expires = Date.now() + (ttl * 1000);
    const tags = options.tags || [];

    const entry = { data: value, expires, tags };

    // Set in memory cache
    this.cache.set(key, entry);

    // Set in localStorage
    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('[CacheService] Error writing to localStorage:', error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    try {
      localStorage.removeItem(`cache:${key}`);
    } catch (error) {
      console.error('[CacheService] Error deleting from localStorage:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTag(tag: string): Promise<void> {
    // Invalidate from memory cache
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
      }
    }

    // Invalidate from localStorage
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('cache:'));
      for (const key of keys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry = JSON.parse(stored);
          if (entry.tags && entry.tags.includes(tag)) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('[CacheService] Error invalidating by tag:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('cache:'));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('[CacheService] Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memorySize: number;
    storageSize: number;
    totalKeys: number;
  }> {
    const storageKeys = Object.keys(localStorage).filter(k => k.startsWith('cache:'));
    
    return {
      memorySize: this.cache.size,
      storageSize: storageKeys.length,
      totalKeys: this.cache.size + storageKeys.length,
    };
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<void> {
    const now = Date.now();

    // Cleanup memory cache
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expires) {
        this.cache.delete(key);
      }
    }

    // Cleanup localStorage
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('cache:'));
      for (const key of keys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry = JSON.parse(stored);
          if (now >= entry.expires) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('[CacheService] Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
