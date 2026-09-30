/**
 * FeatureFlagService - Sistema de feature flags
 * 
 * Permite activar/desactivar funcionalidades dinámicamente
 */

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number; // 0-100
  conditions?: {
    userIds?: string[];
    userRoles?: string[];
    channels?: string[];
  };
  createdAt: number;
  updatedAt: number;
}

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: Map<string, FeatureFlag> = new Map();

  private constructor() {
    this.loadFlags();
    this.registerDefaultFlags();
  }

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * Register default feature flags
   */
  private registerDefaultFlags(): void {
    const defaults: FeatureFlag[] = [
      {
        key: 'monetization',
        enabled: true,
        description: 'Enable monetization features (subscriptions, donations)',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        key: 'clips',
        enabled: true,
        description: 'Enable clip creation and sharing',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        key: 'vod',
        enabled: true,
        description: 'Enable video on demand',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        key: 'chat',
        enabled: true,
        description: 'Enable live chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        key: 'analytics',
        enabled: true,
        description: 'Enable analytics dashboard',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        key: 'recommendations',
        enabled: true,
        description: 'Enable content recommendations',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        key: 'notifications',
        enabled: true,
        description: 'Enable push notifications',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        key: 'search',
        enabled: true,
        description: 'Enable search functionality',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    defaults.forEach(flag => {
      if (!this.flags.has(flag.key)) {
        this.flags.set(flag.key, flag);
      }
    });
  }

  /**
   * Load flags from localStorage
   */
  private loadFlags(): void {
    const stored = localStorage.getItem('nexura_feature_flags');
    if (stored) {
      try {
        const flags = JSON.parse(stored);
        Object.entries(flags).forEach(([key, flag]) => {
          this.flags.set(key, flag as FeatureFlag);
        });
      } catch (error) {
        console.error('[FeatureFlagService] Error loading flags:', error);
      }
    }
  }

  /**
   * Save flags to localStorage
   */
  private saveFlags(): void {
    const flagsObj: Record<string, FeatureFlag> = {};
    this.flags.forEach((flag, key) => {
      flagsObj[key] = flag;
    });
    localStorage.setItem('nexura_feature_flags', JSON.stringify(flagsObj));
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(key: string, context?: { userId?: string; userRole?: string; channelId?: string }): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      if (context?.userId) {
        // Use user ID to deterministically check if they're in the rollout
        const hash = this.hashString(context.userId);
        const percentage = hash % 100;
        if (percentage >= flag.rolloutPercentage) {
          return false;
        }
      } else {
        // Random check for anonymous users
        if (Math.random() * 100 >= flag.rolloutPercentage) {
          return false;
        }
      }
    }

    // Check conditions
    if (flag.conditions) {
      if (flag.conditions.userIds && context?.userId) {
        if (!flag.conditions.userIds.includes(context.userId)) {
          return false;
        }
      }

      if (flag.conditions.userRoles && context?.userRole) {
        if (!flag.conditions.userRoles.includes(context.userRole)) {
          return false;
        }
      }

      if (flag.conditions.channels && context?.channelId) {
        if (!flag.conditions.channels.includes(context.channelId)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Enable a feature flag
   */
  enable(key: string): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.enabled = true;
      flag.updatedAt = Date.now();
      this.saveFlags();
    }
  }

  /**
   * Disable a feature flag
   */
  disable(key: string): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.enabled = false;
      flag.updatedAt = Date.now();
      this.saveFlags();
    }
  }

  /**
   * Create or update a feature flag
   */
  setFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): void {
    const existing = this.flags.get(flag.key);
    this.flags.set(flag.key, {
      ...flag,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    this.saveFlags();
  }

  /**
   * Delete a feature flag
   */
  deleteFlag(key: string): void {
    this.flags.delete(key);
    this.saveFlags();
  }

  /**
   * Get all feature flags
   */
  getAll(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get a specific feature flag
   */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /**
   * Set rollout percentage for a feature
   */
  setRolloutPercentage(key: string, percentage: number): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.rolloutPercentage = Math.max(0, Math.min(100, percentage));
      flag.updatedAt = Date.now();
      this.saveFlags();
    }
  }

  /**
   * Set conditions for a feature
   */
  setConditions(key: string, conditions: FeatureFlag['conditions']): void {
    const flag = this.flags.get(key);
    if (flag) {
      flag.conditions = conditions;
      flag.updatedAt = Date.now();
      this.saveFlags();
    }
  }

  /**
   * Hash a string to a number (for deterministic rollout)
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Reset all flags to defaults
   */
  reset(): void {
    this.flags.clear();
    localStorage.removeItem('nexura_feature_flags');
    this.registerDefaultFlags();
    this.saveFlags();
  }
}

// Export singleton instance
export const featureFlagService = FeatureFlagService.getInstance();
