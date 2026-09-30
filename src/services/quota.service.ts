/**
 * QuotaService - Sistema de cuotas de recursos
 */

export interface Quota {
  storageBytes: number;
  maxVideos: number;
  maxClips: number;
  maxStreamsPerDay: number;
  maxStreamDurationHours: number;
  maxUploadSizeBytes: number;
  maxBitrateKbps: number;
  maxResolution: '720p' | '1080p' | '1440p' | '4k';
}

export interface QuotaUsage {
  storageBytes: number;
  videoCount: number;
  clipCount: number;
  streamsToday: number;
  streamDurationTodayHours: number;
}

export interface QuotaStatus {
  quota: Quota;
  usage: QuotaUsage;
  storagePercent: number;
  videoPercent: number;
  clipPercent: number;
  streamPercent: number;
  durationPercent: number;
}

export class QuotaService {
  private static instance: QuotaService;
  private defaultQuota: Quota = {
    storageBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    maxVideos: 1000,
    maxClips: 5000,
    maxStreamsPerDay: 24,
    maxStreamDurationHours: 24,
    maxUploadSizeBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    maxBitrateKbps: 6000,
    maxResolution: '1080p',
  };

  private customQuotas: Map<string, Quota> = new Map();
  private usageData: Map<string, QuotaUsage> = new Map();

  private constructor() {
    this.loadData();
  }

  static getInstance(): QuotaService {
    if (!QuotaService.instance) {
      QuotaService.instance = new QuotaService();
    }
    return QuotaService.instance;
  }

  /**
   * Load data from localStorage
   */
  private loadData(): void {
    const customQuotas = localStorage.getItem('nexura_custom_quotas');
    if (customQuotas) {
      try {
        const data = JSON.parse(customQuotas);
        Object.entries(data).forEach(([key, quota]) => {
          this.customQuotas.set(key, quota as Quota);
        });
      } catch (error) {
        console.error('[QuotaService] Error loading custom quotas:', error);
      }
    }

    const usageData = localStorage.getItem('nexura_quota_usage');
    if (usageData) {
      try {
        const data = JSON.parse(usageData);
        Object.entries(data).forEach(([key, usage]) => {
          this.usageData.set(key, usage as QuotaUsage);
        });
      } catch (error) {
        console.error('[QuotaService] Error loading usage data:', error);
      }
    }
  }

  /**
   * Save data to localStorage
   */
  private saveData(): void {
    const customQuotasObj: Record<string, Quota> = {};
    this.customQuotas.forEach((quota, key) => {
      customQuotasObj[key] = quota;
    });
    localStorage.setItem('nexura_custom_quotas', JSON.stringify(customQuotasObj));

    const usageObj: Record<string, QuotaUsage> = {};
    this.usageData.forEach((usage, key) => {
      usageObj[key] = usage;
    });
    localStorage.setItem('nexura_quota_usage', JSON.stringify(usageObj));
  }

  /**
   * Get quota for a channel
   */
  getQuota(channelId: string): Quota {
    return this.customQuotas.get(channelId) || this.defaultQuota;
  }

  /**
   * Set custom quota for a channel
   */
  setQuota(channelId: string, quota: Partial<Quota>): void {
    const current = this.getQuota(channelId);
    this.customQuotas.set(channelId, { ...current, ...quota });
    this.saveData();
  }

  /**
   * Reset quota to default
   */
  resetQuota(channelId: string): void {
    this.customQuotas.delete(channelId);
    this.saveData();
  }

  /**
   * Get usage for a channel
   */
  getUsage(channelId: string): QuotaUsage {
    return this.usageData.get(channelId) || {
      storageBytes: 0,
      videoCount: 0,
      clipCount: 0,
      streamsToday: 0,
      streamDurationTodayHours: 0,
    };
  }

  /**
   * Update usage
   */
  updateUsage(channelId: string, updates: Partial<QuotaUsage>): void {
    const current = this.getUsage(channelId);
    this.usageData.set(channelId, { ...current, ...updates });
    this.saveData();
  }

  /**
   * Increment usage
   */
  incrementUsage(channelId: string, field: keyof QuotaUsage, amount: number): void {
    const usage = this.getUsage(channelId);
    usage[field] = (usage[field] as number) + amount;
    this.usageData.set(channelId, usage);
    this.saveData();
  }

  /**
   * Get quota status for a channel
   */
  getStatus(channelId: string): QuotaStatus {
    const quota = this.getQuota(channelId);
    const usage = this.getUsage(channelId);

    return {
      quota,
      usage,
      storagePercent: (usage.storageBytes / quota.storageBytes) * 100,
      videoPercent: (usage.videoCount / quota.maxVideos) * 100,
      clipPercent: (usage.clipCount / quota.maxClips) * 100,
      streamPercent: (usage.streamsToday / quota.maxStreamsPerDay) * 100,
      durationPercent: (usage.streamDurationTodayHours / quota.maxStreamDurationHours) * 100,
    };
  }

  /**
   * Check if channel can upload a video
   */
  canUploadVideo(channelId: string, fileSizeBytes: number): { allowed: boolean; reason?: string } {
    const status = this.getStatus(channelId);

    if (status.storagePercent >= 100) {
      return { allowed: false, reason: 'Storage quota exceeded' };
    }

    if (status.videoPercent >= 100) {
      return { allowed: false, reason: 'Video count quota exceeded' };
    }

    if (fileSizeBytes > status.quota.maxUploadSizeBytes) {
      return { allowed: false, reason: 'File size exceeds maximum upload size' };
    }

    return { allowed: true };
  }

  /**
   * Check if channel can create a clip
   */
  canCreateClip(channelId: string): { allowed: boolean; reason?: string } {
    const status = this.getStatus(channelId);

    if (status.clipPercent >= 100) {
      return { allowed: false, reason: 'Clip count quota exceeded' };
    }

    return { allowed: true };
  }

  /**
   * Check if channel can start a stream
   */
  canStartStream(channelId: string): { allowed: boolean; reason?: string } {
    const status = this.getStatus(channelId);

    if (status.streamPercent >= 100) {
      return { allowed: false, reason: 'Daily stream limit reached' };
    }

    if (status.durationPercent >= 100) {
      return { allowed: false, reason: 'Daily stream duration limit reached' };
    }

    return { allowed: true };
  }

  /**
   * Get default quota
   */
  getDefaultQuota(): Quota {
    return { ...this.defaultQuota };
  }

  /**
   * Set default quota
   */
  setDefaultQuota(quota: Partial<Quota>): void {
    this.defaultQuota = { ...this.defaultQuota, ...quota };
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}

// Export singleton instance
export const quotaService = QuotaService.getInstance();
