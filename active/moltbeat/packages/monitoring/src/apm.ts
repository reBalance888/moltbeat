/**
 * Application Performance Monitoring (APM)
 * Custom metrics, slow query detection, performance budgets
 */

import * as Sentry from '@sentry/node';
import { startTransaction } from './sentry';

/**
 * Performance metric types
 */
export type MetricType =
  | 'database_query'
  | 'api_call'
  | 'cache_operation'
  | 'file_io'
  | 'computation'
  | 'custom';

/**
 * Performance metric
 */
export interface PerformanceMetric {
  name: string;
  type: MetricType;
  duration: number;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/**
 * Performance budget
 */
export interface PerformanceBudget {
  name: string;
  threshold: number; // milliseconds
  type: MetricType;
  alertOnExceed?: boolean;
}

/**
 * APM Configuration
 */
export interface APMConfig {
  enableMetrics?: boolean;
  enableProfiling?: boolean;
  slowQueryThreshold?: number; // milliseconds
  performanceBudgets?: PerformanceBudget[];
  metricsFlushInterval?: number; // milliseconds
}

/**
 * Performance metrics collector
 */
class MetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private budgets: Map<string, PerformanceBudget> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(private config: APMConfig = {}) {
    if (config.performanceBudgets) {
      config.performanceBudgets.forEach((budget) => {
        this.budgets.set(budget.name, budget);
      });
    }

    // Auto-flush metrics periodically
    if (config.metricsFlushInterval) {
      this.flushInterval = setInterval(() => {
        this.flush();
      }, config.metricsFlushInterval);
    }
  }

  /**
   * Record performance metric
   */
  record(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Check performance budget
    const budget = this.budgets.get(metric.name);
    if (budget && metric.duration > budget.threshold) {
      this.handleBudgetExceeded(metric, budget);
    }

    // Check slow query threshold
    if (
      metric.type === 'database_query' &&
      this.config.slowQueryThreshold &&
      metric.duration > this.config.slowQueryThreshold
    ) {
      this.handleSlowQuery(metric);
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: MetricType): PerformanceMetric[] {
    return this.metrics.filter((m) => m.type === type);
  }

  /**
   * Get aggregated stats
   */
  getStats(type?: MetricType): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const filtered = type ? this.metrics.filter((m) => m.type === type) : this.metrics;
    const durations = filtered.map((m) => m.duration).sort((a, b) => a - b);

    if (durations.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: durations.length,
      avgDuration: sum / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
    };
  }

  /**
   * Flush metrics to Sentry
   */
  flush(): void {
    if (this.metrics.length === 0) return;

    const stats = this.getStats();

    // Send to Sentry
    Sentry.captureMessage('Performance Metrics Flush', {
      level: 'info',
      extra: {
        count: stats.count,
        avgDuration: stats.avgDuration,
        p95: stats.p95,
        p99: stats.p99,
        metrics: this.metrics.slice(-100), // Last 100 metrics
      },
    });

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Stop metrics collection
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  private handleBudgetExceeded(metric: PerformanceMetric, budget: PerformanceBudget): void {
    console.warn(
      `⚠️  Performance budget exceeded: ${metric.name} took ${metric.duration}ms (budget: ${budget.threshold}ms)`
    );

    if (budget.alertOnExceed) {
      Sentry.captureMessage('Performance Budget Exceeded', {
        level: 'warning',
        extra: {
          metric: metric.name,
          duration: metric.duration,
          budget: budget.threshold,
          metadata: metric.metadata,
        },
      });
    }
  }

  private handleSlowQuery(metric: PerformanceMetric): void {
    console.warn(`🐌 Slow query detected: ${metric.name} took ${metric.duration}ms`);

    Sentry.captureMessage('Slow Query Detected', {
      level: 'warning',
      extra: {
        query: metric.name,
        duration: metric.duration,
        threshold: this.config.slowQueryThreshold,
        metadata: metric.metadata,
      },
    });
  }
}

/**
 * Global metrics collector
 */
export const metricsCollector = new MetricsCollector({
  enableMetrics: true,
  slowQueryThreshold: 1000, // 1 second
  metricsFlushInterval: 60000, // 1 minute
  performanceBudgets: [
    { name: 'api_request', threshold: 500, type: 'api_call', alertOnExceed: true },
    { name: 'database_query', threshold: 100, type: 'database_query', alertOnExceed: true },
    { name: 'cache_get', threshold: 50, type: 'cache_operation', alertOnExceed: false },
  ],
});

/**
 * Measure function execution time
 */
export async function measure<T>(
  name: string,
  type: MetricType,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = Date.now();
  const transaction = startTransaction(name, type);

  try {
    const result = await fn();
    const duration = Date.now() - start;

    metricsCollector.record({
      name,
      type,
      duration,
      timestamp: Date.now(),
      metadata,
    });

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    transaction.finish();
    throw error;
  }
}

/**
 * Decorator for measuring method performance
 */
export function Measure(type: MetricType = 'custom', metadata?: Record<string, unknown>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return measure(
        `${target.constructor.name}.${propertyKey}`,
        type,
        () => originalMethod.apply(this, args),
        metadata
      );
    };

    return descriptor;
  };
}

/**
 * Resource monitoring
 */
export class ResourceMonitor {
  private snapshots: Array<{
    timestamp: number;
    memory: NodeJS.MemoryUsage;
    cpu: number;
  }> = [];

  private interval: NodeJS.Timeout | null = null;

  start(intervalMs = 30000): void {
    this.interval = setInterval(() => {
      this.snapshot();
    }, intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  snapshot(): void {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();

    this.snapshots.push({
      timestamp: Date.now(),
      memory,
      cpu: cpu.user + cpu.system,
    });

    // Keep only last 100 snapshots
    if (this.snapshots.length > 100) {
      this.snapshots = this.snapshots.slice(-100);
    }

    // Check for memory leak
    const heapUsedMB = memory.heapUsed / 1024 / 1024;
    if (heapUsedMB > 500) {
      // 500MB threshold
      Sentry.captureMessage('High Memory Usage', {
        level: 'warning',
        extra: {
          heapUsedMB,
          heapTotalMB: memory.heapTotal / 1024 / 1024,
          rss: memory.rss / 1024 / 1024,
        },
      });
    }
  }

  getSnapshots() {
    return this.snapshots;
  }

  getAverageMemory(): number {
    if (this.snapshots.length === 0) return 0;
    const sum = this.snapshots.reduce((a, b) => a + b.memory.heapUsed, 0);
    return sum / this.snapshots.length / 1024 / 1024; // MB
  }
}

/**
 * Global resource monitor
 */
export const resourceMonitor = new ResourceMonitor();

/**
 * Initialize APM
 */
export function initAPM(config: APMConfig = {}): void {
  if (config.enableMetrics) {
    console.log('✅ Performance metrics enabled');
  }

  if (config.enableProfiling) {
    resourceMonitor.start();
    console.log('✅ Resource monitoring enabled');
  }
}

/**
 * Shutdown APM
 */
export async function shutdownAPM(): Promise<void> {
  metricsCollector.stop();
  resourceMonitor.stop();
  console.log('✅ APM shutdown complete');
}

/**
 * Get performance summary
 */
export function getPerformanceSummary() {
  return {
    metrics: metricsCollector.getStats(),
    databaseQueries: metricsCollector.getStats('database_query'),
    apiCalls: metricsCollector.getStats('api_call'),
    cacheOperations: metricsCollector.getStats('cache_operation'),
    memory: {
      average: resourceMonitor.getAverageMemory(),
      current: process.memoryUsage().heapUsed / 1024 / 1024,
    },
  };
}
