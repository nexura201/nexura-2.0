/**
 * MonetizationService - Servicio de monetización
 * 
 * IMPORTANTE: Este servicio NO crea datos financieros ficticios.
 * Todos los datos deben venir de un backend real con proveedor de pagos.
 * 
 * En el frontend, este servicio solo:
 * - Consulta configuración de planes
 * - Valida montos
 * - Prepara datos para el checkout
 * - NO procesa pagos reales
 * - NO crea balances ficticios
 */

import type {
  SubscriptionPlan,
  MonetizationSettings,
  PlatformMonetizationSettings,
  MonetizationDashboardStats,
} from '../types';

const MONETIZATION_SETTINGS_KEY = 'nexura_monetization_settings';
const SUBSCRIPTION_PLANS_KEY = 'nexura_subscription_plans';
const PLATFORM_SETTINGS_KEY = 'nexura_platform_monetization_settings';

// Configuración por defecto de la plataforma
const DEFAULT_PLATFORM_SETTINGS: PlatformMonetizationSettings = {
  platformFeePercent: 10, // 10% de comisión (configurable por OWNER)
  enabledCurrencies: ['USD', 'UYU', 'EUR'],
  minimumDonation: 100, // $1.00 en centavos
  maximumDonation: 100000, // $1000.00 en centavos
  minimumPayout: 5000, // $50.00 en centavos
  subscriptionsEnabled: true,
  donationsEnabled: true,
  updatedAt: new Date().toISOString(),
};

export class MonetizationService {
  // ========== CONFIGURACIÓN DE PLATAFORMA (OWNER) ==========
  
  static getPlatformSettings(): PlatformMonetizationSettings {
    const settings = localStorage.getItem(PLATFORM_SETTINGS_KEY);
    if (settings) {
      return JSON.parse(settings);
    }
    return DEFAULT_PLATFORM_SETTINGS;
  }

  static updatePlatformSettings(
    updates: Partial<PlatformMonetizationSettings>,
    actorId: string
  ): PlatformMonetizationSettings {
    // En producción, esto requeriría:
    // 1. Verificar que actorId es OWNER
    // 2. Registrar en audit log
    // 3. Validar cambios
    
    const current = this.getPlatformSettings();
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(updated));
    
    // En producción, registrar en audit log:
    // AuditService.log({
    //   actorId,
    //   action: 'MONETIZATION_SETTINGS_UPDATED',
    //   targetType: 'platform',
    //   targetId: 'monetization_settings',
    //   metadata: { previous: current, updated }
    // });
    
    return updated;
  }

  // ========== CONFIGURACIÓN DE CANAL ==========
  
  static getChannelMonetizationSettings(channelId: string): MonetizationSettings {
    const settings = localStorage.getItem(MONETIZATION_SETTINGS_KEY);
    if (settings) {
      const allSettings: MonetizationSettings[] = JSON.parse(settings);
      const channelSettings = allSettings.find(s => s.channelId === channelId);
      if (channelSettings) return channelSettings;
    }
    
    // Configuración por defecto para canales nuevos
    return {
      channelId,
      status: 'SETUP_REQUIRED',
      acceptSubscriptions: false,
      acceptDonations: false,
      minimumDonation: this.getPlatformSettings().minimumDonation,
      maximumDonation: this.getPlatformSettings().maximumDonation,
      currency: 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  static updateChannelMonetizationSettings(
    channelId: string,
    updates: Partial<MonetizationSettings>,
    actorId: string
  ): MonetizationSettings {
    // En producción, verificar permisos del actorId
    
    const settings = localStorage.getItem(MONETIZATION_SETTINGS_KEY);
    let allSettings: MonetizationSettings[] = settings ? JSON.parse(settings) : [];
    
    const index = allSettings.findIndex(s => s.channelId === channelId);
    const current = index !== -1 
      ? allSettings[index] 
      : this.getChannelMonetizationSettings(channelId);
    
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    if (index !== -1) {
      allSettings[index] = updated;
    } else {
      allSettings.push(updated);
    }
    
    localStorage.setItem(MONETIZATION_SETTINGS_KEY, JSON.stringify(allSettings));
    return updated;
  }

  // ========== PLANES DE SUSCRIPCIÓN ==========
  
  static getChannelPlans(channelId: string): SubscriptionPlan[] {
    const plans = localStorage.getItem(SUBSCRIPTION_PLANS_KEY);
    if (plans) {
      const allPlans: SubscriptionPlan[] = JSON.parse(plans);
      return allPlans
        .filter(p => p.channelId === channelId && p.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return [];
  }

  static createPlan(
    channelId: string,
    plan: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>,
    actorId: string
  ): SubscriptionPlan {
    // En producción, verificar permisos y crear en proveedor de pagos
    
    const plans = localStorage.getItem(SUBSCRIPTION_PLANS_KEY);
    const allPlans: SubscriptionPlan[] = plans ? JSON.parse(plans) : [];
    
    const newPlan: SubscriptionPlan = {
      ...plan,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    allPlans.push(newPlan);
    localStorage.setItem(SUBSCRIPTION_PLANS_KEY, JSON.stringify(allPlans));
    
    return newPlan;
  }

  static updatePlan(
    planId: string,
    updates: Partial<SubscriptionPlan>,
    actorId: string
  ): SubscriptionPlan | null {
    const plans = localStorage.getItem(SUBSCRIPTION_PLANS_KEY);
    if (!plans) return null;
    
    const allPlans: SubscriptionPlan[] = JSON.parse(plans);
    const index = allPlans.findIndex(p => p.id === planId);
    
    if (index === -1) return null;
    
    allPlans[index] = {
      ...allPlans[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(SUBSCRIPTION_PLANS_KEY, JSON.stringify(allPlans));
    return allPlans[index];
  }

  static deletePlan(planId: string, actorId: string): boolean {
    const plans = localStorage.getItem(SUBSCRIPTION_PLANS_KEY);
    if (!plans) return false;
    
    const allPlans: SubscriptionPlan[] = JSON.parse(plans);
    const filtered = allPlans.filter(p => p.id !== planId);
    
    if (filtered.length === allPlans.length) return false;
    
    localStorage.setItem(SUBSCRIPTION_PLANS_KEY, JSON.stringify(filtered));
    return true;
  }

  // ========== DASHBOARD DE MONETIZACIÓN ==========
  
  /**
   * IMPORTANTE: Este método NO devuelve datos ficticios.
   * En producción, debe consultar el backend real.
   */
  static getDashboardStats(channelId: string): MonetizationDashboardStats {
    // En producción, esto consultaría el backend:
    // const response = await fetch(`/api/dashboard/monetization?channelId=${channelId}`);
    // return response.json();
    
    // Por ahora, devolvemos estructura vacía (sin datos ficticios)
    return {
      totalRevenue: 0,
      pendingRevenue: 0,
      availableBalance: 0,
      totalPaidOut: 0,
      activeSubscribers: 0,
      totalDonations: 0,
      revenueByPeriod: {
        today: 0,
        last7Days: 0,
        last30Days: 0,
        last90Days: 0,
      },
    };
  }

  // ========== VALIDACIONES ==========
  
  static validateDonationAmount(amount: number, currency: string): {
    valid: boolean;
    error?: string;
  } {
    const platformSettings = this.getPlatformSettings();
    
    if (!platformSettings.enabledCurrencies.includes(currency)) {
      return { valid: false, error: `Moneda no soportada: ${currency}` };
    }
    
    if (amount < platformSettings.minimumDonation) {
      return { 
        valid: false, 
        error: `El monto mínimo es $${(platformSettings.minimumDonation / 100).toFixed(2)}` 
      };
    }
    
    if (amount > platformSettings.maximumDonation) {
      return { 
        valid: false, 
        error: `El monto máximo es $${(platformSettings.maximumDonation / 100).toFixed(2)}` 
      };
    }
    
    if (amount <= 0) {
      return { valid: false, error: 'El monto debe ser mayor a 0' };
    }
    
    return { valid: true };
  }

  static validatePlanPrice(price: number, currency: string): {
    valid: boolean;
    error?: string;
  } {
    const platformSettings = this.getPlatformSettings();
    
    if (!platformSettings.enabledCurrencies.includes(currency)) {
      return { valid: false, error: `Moneda no soportada: ${currency}` };
    }
    
    if (price < 100) { // Mínimo $1.00
      return { valid: false, error: 'El precio mínimo es $1.00' };
    }
    
    if (price > 100000) { // Máximo $1000.00
      return { valid: false, error: 'El precio máximo es $1000.00' };
    }
    
    return { valid: true };
  }

  // ========== CÁLCULOS ==========
  
  /**
   * Calcula la comisión de plataforma
   * En producción, esto debe hacerse en el backend
   */
  static calculatePlatformFee(grossAmount: number): number {
    const platformSettings = this.getPlatformSettings();
    return Math.round(grossAmount * (platformSettings.platformFeePercent / 100));
  }

  /**
   * Calcula el monto neto para el creador
   * En producción, esto debe hacerse en el backend
   */
  static calculateNetAmount(grossAmount: number, providerFee: number = 0): number {
    const platformFee = this.calculatePlatformFee(grossAmount);
    return grossAmount - platformFee - providerFee;
  }
}
