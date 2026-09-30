/**
 * RateLimitService - Sistema centralizado de rate limiting
 * 
 * Protege endpoints críticos contra abuso y spam.
 */

const RATE_LIMITS_KEY = 'nexura_rate_limits';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

// Configuraciones predefinidas para diferentes endpoints
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  // Autenticación
  'login': { windowMs: 15 * 60 * 1000, maxRequests: 5, message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  'register': { windowMs: 60 * 60 * 1000, maxRequests: 3, message: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.' },
  'password_reset': { windowMs: 60 * 60 * 1000, maxRequests: 3, message: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en 1 hora.' },
  
  // Chat
  'chat_message': { windowMs: 10 * 1000, maxRequests: 10, message: 'Estás enviando mensajes demasiado rápido.' },
  'chat_message_new_user': { windowMs: 60 * 1000, maxRequests: 5, message: 'Las cuentas nuevas tienen un límite de mensajes. Espera un momento.' },
  
  // Follows
  'follow': { windowMs: 60 * 1000, maxRequests: 20, message: 'Estás siguiendo canales demasiado rápido.' },
  
  // Reportes
  'report': { windowMs: 60 * 60 * 1000, maxRequests: 10, message: 'Has enviado demasiados reportes. Intenta de nuevo en 1 hora.' },
  
  // Donaciones
  'donation': { windowMs: 60 * 1000, maxRequests: 5, message: 'Estás realizando donaciones demasiado rápido.' },
  
  // API general
  'api_general': { windowMs: 60 * 1000, maxRequests: 100, message: 'Demasiadas solicitudes. Intenta de nuevo en 1 minuto.' },
  
  // Uploads
  'upload': { windowMs: 60 * 1000, maxRequests: 10, message: 'Demasiadas subidas de archivos. Intenta de nuevo en 1 minuto.' },
  
  // Clips/Videos
  'create_clip': { windowMs: 60 * 1000, maxRequests: 5, message: 'Estás creando clips demasiado rápido.' },
  'create_video': { windowMs: 60 * 60 * 1000, maxRequests: 3, message: 'Demasiadas subidas de videos. Intenta de nuevo en 1 hora.' },
  
  // Checkout/Pagos
  'checkout': { windowMs: 60 * 1000, maxRequests: 10, message: 'Demasiados intentos de pago.' },
};

export class RateLimitService {
  /**
   * Verifica si una acción está dentro del límite
   */
  static checkLimit(
    identifier: string,
    endpoint: string,
    customConfig?: RateLimitConfig
  ): RateLimitResult {
    const config = customConfig || DEFAULT_LIMITS[endpoint] || DEFAULT_LIMITS['api_general'];
    const now = Date.now();
    
    const limits = this.getRateLimits();
    const key = `${identifier}:${endpoint}`;
    
    if (!limits[key]) {
      limits[key] = [];
    }
    
    // Limpiar solicitudes antiguas fuera de la ventana
    limits[key] = limits[key].filter((timestamp: number) => now - timestamp < config.windowMs);
    
    const requestCount = limits[key].length;
    const remaining = Math.max(0, config.maxRequests - requestCount);
    const resetAt = limits[key].length > 0 
      ? limits[key][0] + config.windowMs 
      : now + config.windowMs;
    
    if (requestCount >= config.maxRequests) {
      const retryAfterMs = resetAt - now;
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterMs,
      };
    }
    
    return {
      allowed: true,
      remaining,
      resetAt,
    };
  }

  /**
   * Registra una solicitud exitosa
   */
  static recordRequest(identifier: string, endpoint: string): void {
    const now = Date.now();
    const limits = this.getRateLimits();
    const key = `${identifier}:${endpoint}`;
    
    if (!limits[key]) {
      limits[key] = [];
    }
    
    limits[key].push(now);
    localStorage.setItem(RATE_LIMITS_KEY, JSON.stringify(limits));
  }

  /**
   * Verifica y registra en un solo paso
   */
  static tryAcquire(
    identifier: string,
    endpoint: string,
    customConfig?: RateLimitConfig
  ): { allowed: boolean; error?: string; remaining?: number; retryAfterMs?: number } {
    const result = this.checkLimit(identifier, endpoint, customConfig);
    
    if (!result.allowed) {
      const config = customConfig || DEFAULT_LIMITS[endpoint] || DEFAULT_LIMITS['api_general'];
      return {
        allowed: false,
        error: config.message || 'Límite de solicitudes excedido',
        retryAfterMs: result.retryAfterMs,
      };
    }
    
    this.recordRequest(identifier, endpoint);
    
    return {
      allowed: true,
      remaining: result.remaining,
    };
  }

  /**
   * Limpia los límites de un identificador específico
   */
  static clearLimits(identifier: string): void {
    const limits = this.getRateLimits();
    
    // Eliminar todas las entradas que comiencen con este identificador
    Object.keys(limits).forEach(key => {
      if (key.startsWith(`${identifier}:`)) {
        delete limits[key];
      }
    });
    
    localStorage.setItem(RATE_LIMITS_KEY, JSON.stringify(limits));
  }

  /**
   * Obtiene estadísticas de rate limiting
   */
  static getStats(): {
    totalEntries: number;
    activeLimits: number;
    endpoints: Record<string, number>;
  } {
    const limits = this.getRateLimits();
    const now = Date.now();
    
    let activeLimits = 0;
    const endpoints: Record<string, number> = {};
    
    Object.entries(limits).forEach(([key, timestamps]) => {
      const [identifier, endpoint] = key.split(':');
      const config = DEFAULT_LIMITS[endpoint] || DEFAULT_LIMITS['api_general'];
      
      // Contar solo solicitudes dentro de la ventana
      const active = (timestamps as number[]).filter(t => now - t < config.windowMs).length;
      
      if (active > 0) {
        activeLimits++;
        endpoints[endpoint] = (endpoints[endpoint] || 0) + 1;
      }
    });
    
    return {
      totalEntries: Object.keys(limits).length,
      activeLimits,
      endpoints,
    };
  }

  /**
   * Limpia solicitudes antiguas de todos los límites
   */
  static cleanup(): void {
    const limits = this.getRateLimits();
    const now = Date.now();
    
    Object.keys(limits).forEach(key => {
      const [identifier, endpoint] = key.split(':');
      const config = DEFAULT_LIMITS[endpoint] || DEFAULT_LIMITS['api_general'];
      
      limits[key] = (limits[key] as number[]).filter(t => now - t < config.windowMs);
      
      // Eliminar entradas vacías
      if (limits[key].length === 0) {
        delete limits[key];
      }
    });
    
    localStorage.setItem(RATE_LIMITS_KEY, JSON.stringify(limits));
  }

  private static getRateLimits(): Record<string, number[]> {
    const limits = localStorage.getItem(RATE_LIMITS_KEY);
    return limits ? JSON.parse(limits) : {};
  }
}
