/**
 * Alert Configuration for Sentry
 */

import * as Sentry from '@sentry/node';

export interface AlertRule {
  name: string;
  condition: (event: Sentry.Event) => boolean;
  severity: Sentry.SeverityLevel;
  notify?: boolean;
}

/**
 * Pre-configured alert rules
 */
export const ALERT_RULES: AlertRule[] = [
  {
    name: 'High Error Rate',
    condition: (event) => {
      return event.level === 'error' && event.exception !== undefined;
    },
    severity: 'error',
    notify: true,
  },
  {
    name: 'Database Connection Failed',
    condition: (event) => {
      const message = event.exception?.values?.[0]?.value || '';
      return message.includes('database') || message.includes('ECONNREFUSED');
    },
    severity: 'fatal',
    notify: true,
  },
  {
    name: 'API Rate Limit',
    condition: (event) => {
      const message = event.exception?.values?.[0]?.value || '';
      return message.includes('429') || message.includes('rate limit');
    },
    severity: 'warning',
    notify: true,
  },
  {
    name: 'Slow Query',
    condition: (event) => {
      const duration = event.extra?.duration;
      return typeof duration === 'number' && duration > 5000; // 5 seconds
    },
    severity: 'warning',
    notify: false,
  },
  {
    name: 'Memory Leak',
    condition: (event) => {
      const message = event.message || '';
      return message.includes('heap') || message.includes('memory');
    },
    severity: 'error',
    notify: true,
  },
];

/**
 * Configure Sentry alerts
 */
export function configureAlerts(rules: AlertRule[] = ALERT_RULES): void {
  Sentry.addGlobalEventProcessor((event) => {
    for (const rule of rules) {
      if (rule.condition(event)) {
        // Add alert metadata
        event.tags = {
          ...event.tags,
          alert: rule.name,
          alert_severity: rule.severity,
        };

        // Set level to severity
        event.level = rule.severity;

        // Add fingerprint for grouping
        event.fingerprint = [rule.name, event.exception?.values?.[0]?.value || 'unknown'];

        break; // Apply only first matching rule
      }
    }

    return event;
  });

  console.log(`✅ Configured ${rules.length} Sentry alert rules`);
}

/**
 * Error budget tracking
 */
export class ErrorBudget {
  private errorCount = 0;
  private totalRequests = 0;
  private windowStart = Date.now();

  constructor(
    private readonly budget: number = 0.01, // 1% error rate
    private readonly windowMs: number = 3600000 // 1 hour
  ) {}

  recordRequest(isError: boolean): void {
    this.totalRequests++;
    if (isError) {
      this.errorCount++;
    }

    this.checkWindow();
  }

  getErrorRate(): number {
    return this.totalRequests > 0 ? this.errorCount / this.totalRequests : 0;
  }

  isBudgetExceeded(): boolean {
    return this.getErrorRate() > this.budget;
  }

  private checkWindow(): void {
    const now = Date.now();
    if (now - this.windowStart > this.windowMs) {
      // Reset window
      this.errorCount = 0;
      this.totalRequests = 0;
      this.windowStart = now;
    }
  }

  getMetrics() {
    return {
      errorCount: this.errorCount,
      totalRequests: this.totalRequests,
      errorRate: this.getErrorRate(),
      budget: this.budget,
      budgetExceeded: this.isBudgetExceeded(),
    };
  }
}

/**
 * Global error budget
 */
export const globalErrorBudget = new ErrorBudget();
