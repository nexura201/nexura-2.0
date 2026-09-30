/**
 * MaintenanceModeService - Sistema de modo mantenimiento
 */

export interface MaintenanceConfig {
  enabled: boolean;
  message?: string;
  estimatedEnd?: number; // timestamp
  allowedUsers?: string[]; // User IDs that can bypass maintenance
  allowedRoles?: string[]; // Roles that can bypass maintenance
  startedAt?: number;
}

export class MaintenanceModeService {
  private static instance: MaintenanceModeService;
  private config: MaintenanceConfig = { enabled: false };

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): MaintenanceModeService {
    if (!MaintenanceModeService.instance) {
      MaintenanceModeService.instance = new MaintenanceModeService();
    }
    return MaintenanceModeService.instance;
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): void {
    const stored = localStorage.getItem('nexura_maintenance_config');
    if (stored) {
      try {
        this.config = JSON.parse(stored);
      } catch (error) {
        console.error('[MaintenanceModeService] Error loading config:', error);
      }
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    localStorage.setItem('nexura_maintenance_config', JSON.stringify(this.config));
  }

  /**
   * Enable maintenance mode
   */
  enable(message?: string, estimatedEnd?: number): void {
    this.config = {
      enabled: true,
      message: message || 'NEXURA is currently undergoing maintenance. We\'ll be back shortly!',
      estimatedEnd,
      allowedUsers: [],
      allowedRoles: ['OWNER', 'ADMIN'],
      startedAt: Date.now(),
    };
    this.saveConfig();
  }

  /**
   * Disable maintenance mode
   */
  disable(): void {
    this.config = { enabled: false };
    this.saveConfig();
  }

  /**
   * Check if maintenance mode is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if a user can bypass maintenance mode
   */
  canBypass(userId?: string, userRole?: string): boolean {
    if (!this.config.enabled) {
      return true; // No maintenance, everyone can access
    }

    // Check if user is in allowed list
    if (userId && this.config.allowedUsers?.includes(userId)) {
      return true;
    }

    // Check if user has allowed role
    if (userRole && this.config.allowedRoles?.includes(userRole)) {
      return true;
    }

    return false;
  }

  /**
   * Get maintenance configuration
   */
  getConfig(): MaintenanceConfig {
    return { ...this.config };
  }

  /**
   * Update allowed users
   */
  setAllowedUsers(userIds: string[]): void {
    this.config.allowedUsers = userIds;
    this.saveConfig();
  }

  /**
   * Update allowed roles
   */
  setAllowedRoles(roles: string[]): void {
    this.config.allowedRoles = roles;
    this.saveConfig();
  }

  /**
   * Update maintenance message
   */
  setMessage(message: string): void {
    this.config.message = message;
    this.saveConfig();
  }

  /**
   * Update estimated end time
   */
  setEstimatedEnd(timestamp: number): void {
    this.config.estimatedEnd = timestamp;
    this.saveConfig();
  }

  /**
   * Get time remaining until estimated end
   */
  getTimeRemaining(): number | null {
    if (!this.config.estimatedEnd) {
      return null;
    }

    const remaining = this.config.estimatedEnd - Date.now();
    return remaining > 0 ? remaining : null;
  }

  /**
   * Format time remaining as human-readable string
   */
  formatTimeRemaining(): string | null {
    const remaining = this.getTimeRemaining();
    if (!remaining) {
      return null;
    }

    const minutes = Math.floor(remaining / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return 'Less than a minute';
  }
}

// Export singleton instance
export const maintenanceModeService = MaintenanceModeService.getInstance();
