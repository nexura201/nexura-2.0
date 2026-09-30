/**
 * ConfigService - Centralized configuration management
 */

export interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    baseUrl: string;
  };
  database: {
    url: string;
    poolSize: number;
  };
  redis: {
    url: string;
    enabled: boolean;
  };
  storage: {
    provider: 'local' | 's3' | 'r2';
    endpoint?: string;
    bucket?: string;
    accessKey?: string;
    secretKey?: string;
    region?: string;
  };
  cdn: {
    enabled: boolean;
    url?: string;
  };
  email: {
    provider: 'smtp' | 'resend' | 'sendgrid';
    from: string;
    apiKey?: string;
  };
  streaming: {
    rtmpUrl: string;
    hlsUrl: string;
    mediaServerApiUrl: string;
  };
  payments: {
    provider: 'stripe' | 'paypal' | 'mercadopago';
    publicKey?: string;
    webhookSecret?: string;
  };
  security: {
    jwtSecret: string;
    bcryptRounds: number;
    sessionTtl: number;
  };
  features: {
    monetization: boolean;
    clips: boolean;
    vod: boolean;
    chat: boolean;
  };
}

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig | null = null;

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): void {
    // In a real application, this would read from process.env
    // For now, we'll use defaults and localStorage for development
    const stored = localStorage.getItem('nexura_config');
    
    if (stored) {
      try {
        this.config = JSON.parse(stored);
        return;
      } catch (error) {
        console.error('[ConfigService] Error loading config:', error);
      }
    }

    // Default configuration
    this.config = {
      app: {
        name: 'NEXURA',
        version: '1.0.0',
        environment: 'development',
        baseUrl: window.location.origin,
      },
      database: {
        url: 'postgresql://localhost:5432/nexura',
        poolSize: 10,
      },
      redis: {
        url: 'redis://localhost:6379',
        enabled: false,
      },
      storage: {
        provider: 'local',
      },
      cdn: {
        enabled: false,
      },
      email: {
        provider: 'smtp',
        from: 'noreply@nexura.com',
      },
      streaming: {
        rtmpUrl: 'rtmp://localhost:1935/live',
        hlsUrl: 'http://localhost:8888/live',
        mediaServerApiUrl: 'http://localhost:8080/api',
      },
      payments: {
        provider: 'stripe',
      },
      security: {
        jwtSecret: 'development-secret-change-in-production',
        bcryptRounds: 10,
        sessionTtl: 7 * 24 * 60 * 60, // 7 days
      },
      features: {
        monetization: true,
        clips: true,
        vod: true,
        chat: true,
      },
    };

    this.saveConfig();
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    if (this.config) {
      localStorage.setItem('nexura_config', JSON.stringify(this.config));
    }
  }

  /**
   * Get configuration
   */
  get(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config;
  }

  /**
   * Get specific config section
   */
  getSection<K extends keyof AppConfig>(section: K): AppConfig[K] {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config[section];
  }

  /**
   * Update configuration
   */
  update(updates: Partial<AppConfig>): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * Update specific section
   */
  updateSection<K extends keyof AppConfig>(section: K, updates: Partial<AppConfig[K]>): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    this.config[section] = { ...this.config[section], ...updates } as AppConfig[K];
    this.saveConfig();
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.get().app.environment === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.get().app.environment === 'development';
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.get().features[feature];
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config) {
      errors.push('Configuration not loaded');
      return { valid: false, errors };
    }

    // Validate required fields
    if (!this.config.app.name) errors.push('App name is required');
    if (!this.config.app.baseUrl) errors.push('Base URL is required');
    if (!this.config.database.url) errors.push('Database URL is required');
    if (!this.config.security.jwtSecret) errors.push('JWT secret is required');

    // Validate production-specific requirements
    if (this.isProduction()) {
      if (this.config.security.jwtSecret === 'development-secret-change-in-production') {
        errors.push('JWT secret must be changed in production');
      }
      if (!this.config.redis.enabled) {
        errors.push('Redis should be enabled in production');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    localStorage.removeItem('nexura_config');
    this.config = null;
    this.loadConfig();
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();
