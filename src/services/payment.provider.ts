/**
 * PaymentProvider - Abstracción de proveedor de pagos
 * 
 * IMPORTANTE: Esta es una interfaz de abstracción.
 * La implementación real requiere un backend con Node.js/Express
 * y un proveedor de pagos (Stripe, PayPal, MercadoPago, etc.)
 * 
 * NO usar en frontend directamente.
 * NO almacenar claves de API en el frontend.
 */

import type {
  Payment,
  Subscription,
  SubscriptionPlan,
  PaymentStatus,
  SubscriptionStatus,
} from '../types';

// Interfaz del proveedor de pagos
export interface PaymentProvider {
  // Checkout
  createCheckout(params: {
    amount: number;
    currency: string;
    metadata?: any;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ checkoutUrl: string; sessionId: string }>;

  // Clientes
  createCustomer(params: {
    email: string;
    name: string;
    metadata?: any;
  }): Promise<{ customerId: string }>;

  // Suscripciones
  createSubscription(params: {
    customerId: string;
    priceId: string;
    metadata?: any;
  }): Promise<{ subscriptionId: string; status: SubscriptionStatus }>;

  cancelSubscription(subscriptionId: string): Promise<void>;

  getSubscription(subscriptionId: string): Promise<Subscription | null>;

  // Pagos
  getPayment(paymentId: string): Promise<Payment | null>;

  refundPayment(paymentId: string, amount?: number): Promise<{ refundId: string }>;

  // Webhooks
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean;

  constructEvent(payload: string, signature: string): any;

  // Portal de cliente
  getCustomerPortalUrl(customerId: string): Promise<string>;
}

// Implementación mock para desarrollo (SOLO UI)
// NO usar en producción
export class MockPaymentProvider implements PaymentProvider {
  async createCheckout(params: {
    amount: number;
    currency: string;
    metadata?: any;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ checkoutUrl: string; sessionId: string }> {
    // En producción, esto crearía una sesión de checkout real
    throw new Error(
      'MockPaymentProvider: No se pueden procesar pagos en el frontend. ' +
      'Configure un backend con un proveedor de pagos real.'
    );
  }

  async createCustomer(params: {
    email: string;
    name: string;
    metadata?: any;
  }): Promise<{ customerId: string }> {
    throw new Error('MockPaymentProvider: Requiere backend real');
  }

  async createSubscription(params: {
    customerId: string;
    priceId: string;
    metadata?: any;
  }): Promise<{ subscriptionId: string; status: SubscriptionStatus }> {
    throw new Error('MockPaymentProvider: Requiere backend real');
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    throw new Error('MockPaymentProvider: Requiere backend real');
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    throw new Error('MockPaymentProvider: Requiere backend real');
  }

  async getPayment(paymentId: string): Promise<Payment | null> {
    throw new Error('MockPaymentProvider: Requiere backend real');
  }

  async refundPayment(paymentId: string, amount?: number): Promise<{ refundId: string }> {
    throw new Error('MockPaymentProvider: Requiere backend real');
  }

  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    throw new Error('MockPaymentProvider: Requiere backend real');
  }

  constructEvent(payload: string, signature: string): any {
    throw new Error('MockPaymentProvider: Requiere backend real');
  }

  async getCustomerPortalUrl(customerId: string): Promise<string> {
    throw new Error('MockPaymentProvider: Requiere backend real');
  }
}

// Factory para obtener el proveedor configurado
export function getPaymentProvider(): PaymentProvider {
  // En producción, esto leería la configuración y devolvería
  // el proveedor real (Stripe, PayPal, etc.)
  
  // Por ahora, devolvemos el mock que lanza errores
  // para evitar pagos accidentales en el frontend
  return new MockPaymentProvider();
}

// Configuración del proveedor (solo lectura desde backend)
export interface PaymentProviderConfig {
  provider: 'stripe' | 'paypal' | 'mercadopago' | 'mock';
  publicKey?: string; // Solo para frontend (no sensible)
  // secretKey NUNCA debe estar en el frontend
  webhookSecret?: string; // Solo en backend
}

// Helper para formatear montos
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  // amount está en centavos
  const value = amount / 100;
  
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    UYU: '$U',
    GBP: '£',
  };
  
  const symbol = symbols[currency] || currency;
  return `${symbol}${value.toFixed(2)}`;
}

// Helper para validar montos
export function validateDonationAmount(
  amount: number,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (amount < min) {
    return { valid: false, error: `El monto mínimo es ${formatCurrency(min)}` };
  }
  if (amount > max) {
    return { valid: false, error: `El monto máximo es ${formatCurrency(max)}` };
  }
  if (amount <= 0) {
    return { valid: false, error: 'El monto debe ser mayor a 0' };
  }
  return { valid: true };
}
