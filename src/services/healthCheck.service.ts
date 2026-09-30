/**
 * HealthCheckService - Sistema de health checks para todos los servicios
 */

export type ServiceStatus = 'UP' | 'DEGRADED' | 'DOWN';

export interface HealthCheck {
  service: string;
  status: ServiceStatus;
  latency?: number;
  message?: string;
  lastCheck: number;
  details?: any;
}

export interface SystemHealth {
  status: ServiceStatus;
  checks: HealthCheck[];
  timestamp: number;
  uptime: number;
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();
  private startTime: number = Date.now();

  private constructor() {
    // Register default health checks
    this.registerDefaultChecks();
  }

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    // Application health check
    this.register('application', async () => ({
      service: 'application',
      status: 'UP',
      latency: 0,
      message: 'Application is running',
      lastCheck: Date.now(),
    }));

    // Database health check (localStorage as mock)
    this.register('database', async () => {
      const start = Date.now();
      try {
        // Test localStorage read/write
        const testKey = '__health_check__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        
        return {
          service: 'database',
          status: 'UP',
          latency: Date.now() - start,
          message: 'Database is accessible',
          lastCheck: Date.now(),
        };
      } catch (error) {
        return {
          service: 'database',
          status: 'DOWN',
          latency: Date.now() - start,
          message: 'Database is not accessible',
          lastCheck: Date.now(),
        };
      }
    });

    // Cache health check
    this.register('cache', async () => {
      const start = Date.now();
      try {
        const { cacheService } = await import('./cache.service');
        await cacheService.set('__health_check__', 'test', { ttl: 10 });
        const value = await cacheService.get('__health_check__');
        await cacheService.delete('__health_check__');
        
        return {
          service: 'cache',
          status: value === 'test' ? 'UP' : 'DEGRADED',
          latency: Date.now() - start,
          message: value === 'test' ? 'Cache is working' : 'Cache read/write mismatch',
          lastCheck: Date.now(),
        };
      } catch (error) {
        return {
          service: 'cache',
          status: 'DEGRADED',
          latency: Date.now() - start,
          message: 'Cache is not available',
          lastCheck: Date.now(),
        };
      }
    });

    // Queue health check
    this.register('queue', async () => {
      const start = Date.now();
      try {
        const { queueService } = await import('./queue.service');
        const stats = await queueService.getStats();
        
        return {
          service: 'queue',
          status: 'UP',
          latency: Date.now() - start,
          message: `Queue system is running (${stats.totalJobs} jobs)`,
          lastCheck: Date.now(),
          details: stats,
        };
      } catch (error) {
        return {
          service: 'queue',
          status: 'DEGRADED',
          latency: Date.now() - start,
          message: 'Queue system is not available',
          lastCheck: Date.now(),
        };
      }
    });

    // Storage health check
    this.register('storage', async () => {
      const start = Date.now();
      try {
        const { storageService } = await import('./storage');
        
        return {
          service: 'storage',
          status: 'UP',
          latency: Date.now() - start,
          message: 'Storage service is available',
          lastCheck: Date.now(),
        };
      } catch (error) {
        return {
          service: 'storage',
          status: 'DEGRADED',
          latency: Date.now() - start,
          message: 'Storage service is not available',
          lastCheck: Date.now(),
        };
      }
    });
  }

  /**
   * Register a custom health check
   */
  register(service: string, check: () => Promise<HealthCheck>): void {
    this.checks.set(service, check);
  }

  /**
   * Run a specific health check
   */
  async check(service: string): Promise<HealthCheck> {
    const check = this.checks.get(service);
    if (!check) {
      return {
        service,
        status: 'DOWN',
        message: 'Health check not registered',
        lastCheck: Date.now(),
      };
    }

    try {
      return await check();
    } catch (error) {
      return {
        service,
        status: 'DOWN',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: Date.now(),
      };
    }
  }

  /**
   * Run all health checks
   */
  async checkAll(): Promise<SystemHealth> {
    const checks: HealthCheck[] = [];

    for (const [service, check] of this.checks.entries()) {
      try {
        const result = await check();
        checks.push(result);
      } catch (error) {
        checks.push({
          service,
          status: 'DOWN',
          message: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: Date.now(),
        });
      }
    }

    // Determine overall system status
    const hasDown = checks.some(c => c.status === 'DOWN');
    const hasDegraded = checks.some(c => c.status === 'DEGRADED');
    
    let overallStatus: ServiceStatus = 'UP';
    if (hasDown) overallStatus = 'DOWN';
    else if (hasDegraded) overallStatus = 'DEGRADED';

    return {
      status: overallStatus,
      checks,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Check if system is ready to serve requests
   */
  async isReady(): Promise<boolean> {
    const health = await this.checkAll();
    return health.status === 'UP' || health.status === 'DEGRADED';
  }

  /**
   * Check if system is alive (basic check)
   */
  isAlive(): boolean {
    return true;
  }

  /**
   * Get system uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Format uptime as human-readable string
   */
  formatUptime(): string {
    const uptime = this.getUptime();
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

// Export singleton instance
export const healthCheckService = HealthCheckService.getInstance();
