/**
 * DistributedLockService - Sistema de locks distribuidos
 * 
 * Previene condiciones de carrera en operaciones críticas
 * En desarrollo: usa localStorage
 * En producción: usa Redis
 */

export interface Lock {
  key: string;
  ownerId: string;
  acquiredAt: number;
  expiresAt: number;
  metadata?: any;
}

export class DistributedLockService {
  private static instance: DistributedLockService;
  private locks: Map<string, Lock> = new Map();
  private ownerId: string;

  private constructor() {
    // Generate unique owner ID for this instance
    this.ownerId = `owner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.loadLocks();
  }

  static getInstance(): DistributedLockService {
    if (!DistributedLockService.instance) {
      DistributedLockService.instance = new DistributedLockService();
    }
    return DistributedLockService.instance;
  }

  /**
   * Load locks from localStorage
   */
  private loadLocks(): void {
    const stored = localStorage.getItem('nexura_distributed_locks');
    if (stored) {
      try {
        const locks = JSON.parse(stored);
        Object.entries(locks).forEach(([key, lock]) => {
          this.locks.set(key, lock as Lock);
        });
      } catch (error) {
        console.error('[DistributedLockService] Error loading locks:', error);
      }
    }
  }

  /**
   * Save locks to localStorage
   */
  private saveLocks(): void {
    const locksObj: Record<string, Lock> = {};
    this.locks.forEach((lock, key) => {
      locksObj[key] = lock;
    });
    localStorage.setItem('nexura_distributed_locks', JSON.stringify(locksObj));
  }

  /**
   * Acquire a lock
   */
  async acquire(key: string, ttlSeconds: number = 30, metadata?: any): Promise<boolean> {
    // Clean up expired locks
    this.cleanup();

    const existingLock = this.locks.get(key);
    
    // Check if lock exists and is not expired
    if (existingLock && existingLock.expiresAt > Date.now()) {
      // Lock is held by someone else
      if (existingLock.ownerId !== this.ownerId) {
        return false;
      }
      // We already own this lock, extend it
      existingLock.expiresAt = Date.now() + (ttlSeconds * 1000);
      existingLock.metadata = metadata;
      this.saveLocks();
      return true;
    }

    // Acquire the lock
    const lock: Lock = {
      key,
      ownerId: this.ownerId,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + (ttlSeconds * 1000),
      metadata,
    };

    this.locks.set(key, lock);
    this.saveLocks();
    return true;
  }

  /**
   * Try to acquire a lock with timeout
   */
  async acquireWithTimeout(
    key: string,
    ttlSeconds: number = 30,
    timeoutMs: number = 5000,
    metadata?: any
  ): Promise<boolean> {
    const startTime = Date.now();
    const retryInterval = 100; // 100ms

    while (Date.now() - startTime < timeoutMs) {
      if (await this.acquire(key, ttlSeconds, metadata)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }

    return false;
  }

  /**
   * Release a lock
   */
  async release(key: string): Promise<boolean> {
    const lock = this.locks.get(key);
    
    if (!lock) {
      return false;
    }

    // Only the owner can release the lock
    if (lock.ownerId !== this.ownerId) {
      return false;
    }

    this.locks.delete(key);
    this.saveLocks();
    return true;
  }

  /**
   * Extend a lock's TTL
   */
  async extend(key: string, ttlSeconds: number): Promise<boolean> {
    const lock = this.locks.get(key);
    
    if (!lock || lock.ownerId !== this.ownerId) {
      return false;
    }

    lock.expiresAt = Date.now() + (ttlSeconds * 1000);
    this.saveLocks();
    return true;
  }

  /**
   * Check if a lock is held
   */
  async isLocked(key: string): Promise<boolean> {
    this.cleanup();
    const lock = this.locks.get(key);
    return !!lock && lock.expiresAt > Date.now();
  }

  /**
   * Get lock information
   */
  async getLock(key: string): Promise<Lock | null> {
    this.cleanup();
    return this.locks.get(key) || null;
  }

  /**
   * Force release a lock (admin operation)
   */
  async forceRelease(key: string): Promise<boolean> {
    const existed = this.locks.has(key);
    this.locks.delete(key);
    this.saveLocks();
    return existed;
  }

  /**
   * Clean up expired locks
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(key);
      }
    }
    this.saveLocks();
  }

  /**
   * Get all active locks
   */
  async getAllLocks(): Promise<Lock[]> {
    this.cleanup();
    return Array.from(this.locks.values());
  }

  /**
   * Get owner ID
   */
  getOwnerId(): string {
    return this.ownerId;
  }

  /**
   * Execute a function with a lock
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 30,
    timeoutMs: number = 5000
  ): Promise<T> {
    const acquired = await this.acquireWithTimeout(key, ttlSeconds, timeoutMs);
    
    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.release(key);
    }
  }
}

// Export singleton instance
export const distributedLockService = DistributedLockService.getInstance();
