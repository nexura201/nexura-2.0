/**
 * EventBusService - Sistema de eventos distribuidos
 * 
 * En desarrollo: usa eventos locales
 * En producción: usa Redis Pub/Sub, Kafka, RabbitMQ, etc.
 */

export type EventHandler<T = any> = (event: T) => void | Promise<void>;

export interface Event<T = any> {
  type: string;
  data: T;
  timestamp: number;
  source?: string;
  correlationId?: string;
}

export class EventBusService {
  private static instance: EventBusService;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private eventLog: Event[] = [];
  private maxLogSize: number = 1000;

  private constructor() {}

  static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService();
    }
    return EventBusService.instance;
  }

  /**
   * Subscribe to an event type
   */
  subscribe<T>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as EventHandler);
    };
  }

  /**
   * Publish an event
   */
  async publish<T>(eventType: string, data: T, options: { source?: string; correlationId?: string } = {}): Promise<void> {
    const event: Event<T> = {
      type: eventType,
      data,
      timestamp: Date.now(),
      source: options.source,
      correlationId: options.correlationId,
    };

    // Log event
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    // Notify handlers
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const promises: Promise<void>[] = [];
      
      for (const handler of handlers) {
        try {
          const result = handler(event);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`[EventBus] Error in handler for ${eventType}:`, error);
        }
      }

      // Wait for all async handlers
      await Promise.all(promises);
    }

    // In production, this would also publish to Redis Pub/Sub or message broker
    // await this.publishToBroker(event);
  }

  /**
   * Publish event and wait for all handlers to complete
   */
  async publishAndWait<T>(eventType: string, data: T, options: { source?: string; correlationId?: string } = {}): Promise<void> {
    await this.publish(eventType, data, options);
  }

  /**
   * Get event log
   */
  getEventLog(limit: number = 100): Event[] {
    return this.eventLog.slice(-limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: string, limit: number = 100): Event[] {
    return this.eventLog
      .filter(e => e.type === eventType)
      .slice(-limit);
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Get number of subscribers for an event type
   */
  getSubscriberCount(eventType: string): number {
    const handlers = this.handlers.get(eventType);
    return handlers ? handlers.size : 0;
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Unsubscribe all handlers for an event type
   */
  unsubscribeAll(eventType: string): void {
    this.handlers.delete(eventType);
  }

  /**
   * Unsubscribe all handlers
   */
  unsubscribeAllAll(): void {
    this.handlers.clear();
  }

  /**
   * Publish to message broker (for production)
   */
  private async publishToBroker(event: Event): Promise<void> {
    // In production, this would publish to Redis Pub/Sub, Kafka, etc.
    // Example with Redis:
    // await redis.publish('events', JSON.stringify(event));
  }

  /**
   * Subscribe to events from message broker (for production)
   */
  private async subscribeToBroker(): Promise<void> {
    // In production, this would subscribe to Redis Pub/Sub, Kafka, etc.
    // Example with Redis:
    // await redis.subscribe('events', (message) => {
    //   const event = JSON.parse(message);
    //   this.notifyHandlers(event);
    // });
  }
}

// Export singleton instance
export const eventBusService = EventBusService.getInstance();

// Common event types
export const EventTypes = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Channel events
  CHANNEL_CREATED: 'channel.created',
  CHANNEL_UPDATED: 'channel.updated',
  CHANNEL_DELETED: 'channel.deleted',

  // Stream events
  STREAM_STARTED: 'stream.started',
  STREAM_ENDED: 'stream.ended',
  STREAM_UPDATED: 'stream.updated',

  // Video events
  VIDEO_CREATED: 'video.created',
  VIDEO_PROCESSED: 'video.processed',
  VIDEO_PUBLISHED: 'video.published',
  VIDEO_DELETED: 'video.deleted',

  // Clip events
  CLIP_CREATED: 'clip.created',
  CLIP_PROCESSED: 'clip.processed',
  CLIP_DELETED: 'clip.deleted',

  // Chat events
  CHAT_MESSAGE_SENT: 'chat.message.sent',
  CHAT_MESSAGE_DELETED: 'chat.message.deleted',

  // Follow events
  FOLLOW_CREATED: 'follow.created',
  FOLLOW_DELETED: 'follow.deleted',

  // Notification events
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ: 'notification.read',

  // Payment events
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Subscription events
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_CANCELED: 'subscription.canceled',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',

  // Donation events
  DONATION_CREATED: 'donation.created',
  DONATION_COMPLETED: 'donation.completed',

  // Moderation events
  REPORT_CREATED: 'report.created',
  REPORT_RESOLVED: 'report.resolved',
  MODERATION_ACTION: 'moderation.action',

  // Security events
  SECURITY_EVENT: 'security.event',
  LOGIN_ATTEMPT: 'security.login.attempt',
  ACCOUNT_LOCKED: 'security.account.locked',

  // System events
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_ALERT: 'system.alert',
} as const;
