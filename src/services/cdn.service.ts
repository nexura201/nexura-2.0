/**
 * CDNService - Abstracción para Content Delivery Network
 * 
 * En desarrollo: usa URLs directas
 * En producción: usa CloudFront, Cloudflare, Fastly, etc.
 */

export interface CDNConfig {
  enabled: boolean;
  baseUrl?: string;
  provider?: 'cloudfront' | 'cloudflare' | 'fastly' | 'custom';
}

export interface CacheRule {
  path: string;
  ttl: number; // seconds
  staleWhileRevalidate?: number;
  staleIfError?: number;
}

export class CDNService {
  private static instance: CDNService;
  private config: CDNConfig = { enabled: false };
  private cacheRules: CacheRule[] = [];

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): CDNService {
    if (!CDNService.instance) {
      CDNService.instance = new CDNService();
    }
    return CDNService.instance;
  }

  /**
   * Load CDN configuration
   */
  private loadConfig(): void {
    const stored = localStorage.getItem('nexura_cdn_config');
    if (stored) {
      try {
        this.config = JSON.parse(stored);
      } catch (error) {
        console.error('[CDNService] Error loading config:', error);
      }
    }
  }

  /**
   * Configure CDN
   */
  configure(config: CDNConfig): void {
    this.config = config;
    localStorage.setItem('nexura_cdn_config', JSON.stringify(config));
  }

  /**
   * Get CDN URL for a resource
   */
  getUrl(path: string): string {
    if (!this.config.enabled || !this.config.baseUrl) {
      // Return direct URL
      return path;
    }

    // Construct CDN URL
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${baseUrl}/${cleanPath}`;
  }

  /**
   * Get signed URL for private content
   */
  getSignedUrl(path: string, expiresInSeconds: number = 3600): string {
    // In production, this would generate a signed URL using the CDN provider's API
    // For now, return the regular URL with an expiration parameter
    const url = this.getUrl(path);
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return `${url}?expires=${expires}`;
  }

  /**
   * Purge cache for a specific path
   */
  async purge(path: string): Promise<boolean> {
    if (!this.config.enabled) {
      return true;
    }

    // In production, this would call the CDN provider's purge API
    console.log(`[CDNService] Purging cache for: ${path}`);
    return true;
  }

  /**
   * Purge cache by tag
   */
  async purgeByTag(tag: string): Promise<boolean> {
    if (!this.config.enabled) {
      return true;
    }

    // In production, this would call the CDN provider's tag purge API
    console.log(`[CDNService] Purging cache by tag: ${tag}`);
    return true;
  }

  /**
   * Purge all cache
   */
  async purgeAll(): Promise<boolean> {
    if (!this.config.enabled) {
      return true;
    }

    // In production, this would call the CDN provider's purge all API
    console.log('[CDNService] Purging all cache');
    return true;
  }

  /**
   * Add cache rule
   */
  addCacheRule(rule: CacheRule): void {
    this.cacheRules.push(rule);
  }

  /**
   * Get cache rule for a path
   */
  getCacheRule(path: string): CacheRule | null {
    for (const rule of this.cacheRules) {
      if (path.match(rule.path)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * Get cache headers for a path
   */
  getCacheHeaders(path: string): Record<string, string> {
    const rule = this.getCacheRule(path);
    if (!rule) {
      return {};
    }

    const headers: Record<string, string> = {
      'Cache-Control': `public, max-age=${rule.ttl}`,
    };

    if (rule.staleWhileRevalidate) {
      headers['Cache-Control'] += `, stale-while-revalidate=${rule.staleWhileRevalidate}`;
    }

    if (rule.staleIfError) {
      headers['Cache-Control'] += `, stale-if-error=${rule.staleIfError}`;
    }

    return headers;
  }

  /**
   * Check if CDN is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get CDN configuration
   */
  getConfig(): CDNConfig {
    return { ...this.config };
  }

  /**
   * Get CDN stats (in production, would fetch from CDN provider)
   */
  async getStats(): Promise<{
    requests: number;
    bandwidth: number;
    cacheHitRate: number;
    errors: number;
  }> {
    if (!this.config.enabled) {
      return {
        requests: 0,
        bandwidth: 0,
        cacheHitRate: 0,
        errors: 0,
      };
    }

    // In production, this would fetch stats from the CDN provider's API
    return {
      requests: 0,
      bandwidth: 0,
      cacheHitRate: 0,
      errors: 0,
    };
  }
}

// Export singleton instance
export const cdnService = CDNService.getInstance();
