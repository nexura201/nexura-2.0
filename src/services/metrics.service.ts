/**
 * MetricsService - Sistema de métricas y observabilidad
 */

export interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  description: string;
  points: MetricPoint[];
}

export class MetricsService {
  private static instance: MetricsService;
  private metrics: Map<string, Metric> = new Map();
  private maxPoints: number = 1000; // Keep last 1000 points per metric

  private constructor() {
    this.registerDefaultMetrics();
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Register default metrics
   */
  private registerDefaultMetrics(): void {
    // HTTP metrics
    this.register('http_requests_total', 'counter', 'Total HTTP requests');
    this.register('http_request_duration_seconds', 'histogram', 'HTTP request duration');
    this.register('http_errors_total', 'counter', 'Total HTTP errors');

    // Database metrics
    this.register('db_queries_total', 'counter', 'Total database queries');
    this.register('db_query_duration_seconds', 'histogram', 'Database query duration');

    // Cache metrics
    this.register('cache_hits_total', 'counter', 'Total cache hits');
    this.register('cache_misses_total', 'counter', 'Total cache misses');

    // Queue metrics
    this.register('queue_jobs_total', 'counter', 'Total queue jobs');
    this.register('queue_job_duration_seconds', 'histogram', 'Queue job duration');

    // WebSocket metrics
    this.register('websocket_connections_total', 'gauge', 'Active WebSocket connections');
    this.register('websocket_messages_total', 'counter', 'Total WebSocket messages');

    // Streaming metrics
    this.register('active_streams', 'gauge', 'Number of active streams');
    this.register('stream_viewers_total', 'gauge', 'Total stream viewers');

    // System metrics
    this.register('memory_usage_bytes', 'gauge', 'Memory usage in bytes');
    this.register('cpu_usage_percent', 'gauge', 'CPU usage percentage');
  }

  /**
   * Register a new metric
   */
  register(name: string, type: 'counter' | 'gauge' | 'histogram', description: string): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        type,
        description,
        points: [],
      });
    }
  }

  /**
   * Increment a counter
   */
  increment(name: string, value: number = 1, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') return;

    metric.points.push({
      timestamp: Date.now(),
      value,
      labels,
    });

    this.trimPoints(metric);
  }

  /**
   * Set a gauge value
   */
  set(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') return;

    metric.points.push({
      timestamp: Date.now(),
      value,
      labels,
    });

    this.trimPoints(metric);
  }

  /**
   * Observe a histogram value
   */
  observe(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') return;

    metric.points.push({
      timestamp: Date.now(),
      value,
      labels,
    });

    this.trimPoints(metric);
  }

  /**
   * Get metric value
   */
  get(name: string): number {
    const metric = this.metrics.get(name);
    if (!metric || metric.points.length === 0) return 0;

    if (metric.type === 'counter') {
      return metric.points.reduce((sum, p) => sum + p.value, 0);
    } else if (metric.type === 'gauge') {
      return metric.points[metric.points.length - 1].value;
    } else if (metric.type === 'histogram') {
      const values = metric.points.map(p => p.value);
      return values.reduce((sum, v) => sum + v, 0) / values.length;
    }

    return 0;
  }

  /**
   * Get metric with all points
   */
  getMetric(name: string): Metric | null {
    return this.metrics.get(name) || null;
  }

  /**
   * Get all metrics
   */
  getAll(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Calculate percentiles for histogram
   */
  getPercentiles(name: string): { p50: number; p95: number; p99: number } {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram' || metric.points.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const values = metric.points.map(p => p.value).sort((a, b) => a - b);
    const length = values.length;

    return {
      p50: values[Math.floor(length * 0.5)],
      p95: values[Math.floor(length * 0.95)],
      p99: values[Math.floor(length * 0.99)],
    };
  }

  /**
   * Get metrics summary
   */
  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    for (const [name, metric] of this.metrics.entries()) {
      if (metric.type === 'counter' || metric.type === 'gauge') {
        summary[name] = this.get(name);
      } else if (metric.type === 'histogram') {
        summary[name] = {
          avg: this.get(name),
          ...this.getPercentiles(name),
        };
      }
    }

    return summary;
  }

  /**
   * Reset a metric
   */
  reset(name: string): void {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.points = [];
    }
  }

  /**
   * Reset all metrics
   */
  resetAll(): void {
    for (const metric of this.metrics.values()) {
      metric.points = [];
    }
  }

  /**
   * Trim old points to keep only the most recent ones
   */
  private trimPoints(metric: Metric): void {
    if (metric.points.length > this.maxPoints) {
      metric.points = metric.points.slice(-this.maxPoints);
    }
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.description}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      if (metric.type === 'counter' || metric.type === 'gauge') {
        const value = this.get(metric.name);
        lines.push(`${metric.name} ${value}`);
      } else if (metric.type === 'histogram') {
        const percentiles = this.getPercentiles(metric.name);
        lines.push(`${metric.name}_p50 ${percentiles.p50}`);
        lines.push(`${metric.name}_p95 ${percentiles.p95}`);
        lines.push(`${metric.name}_p99 ${percentiles.p99}`);
      }
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const metricsService = MetricsService.getInstance();
