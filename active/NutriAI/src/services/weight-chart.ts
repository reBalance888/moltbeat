/**
 * Weight Chart Service - Generate ASCII charts for weight tracking
 */
import { WeightLog } from '../types';

export class WeightChartService {
  /**
   * Generate ASCII line chart for weight progress
   */
  static generateWeightChart(weightLogs: WeightLog[], targetWeight: number): string {
    if (weightLogs.length === 0) {
      return 'Нет данных для отображения. Добавь первое взвешивание!';
    }

    // Sort by date (oldest first)
    const sorted = [...weightLogs].reverse();

    // Get min and max weights for scaling
    const weights = sorted.map(log => log.weight);
    const maxWeight = Math.max(...weights, targetWeight);
    const minWeight = Math.min(...weights, targetWeight);
    const range = maxWeight - minWeight;

    // Chart configuration
    const chartHeight = 8;
    const chartWidth = Math.min(sorted.length, 15);

    // Build chart
    let chart = '';

    // Y-axis labels and chart lines
    for (let row = 0; row < chartHeight; row++) {
      const currentWeight = maxWeight - (range / (chartHeight - 1)) * row;
      const label = `${Math.round(currentWeight)} кг`;

      // Add Y-axis label
      chart += label.padStart(7, ' ') + ' ┤';

      // Plot points
      for (let col = 0; col < chartWidth; col++) {
        const dataIndex = Math.floor((col / chartWidth) * sorted.length);
        const weight = sorted[dataIndex].weight;

        // Check if this point should be plotted on this row
        const weightPosition = (maxWeight - weight) / range * (chartHeight - 1);
        const isOnThisRow = Math.abs(weightPosition - row) < 0.5;

        // Check if this is target weight line
        const targetPosition = (maxWeight - targetWeight) / range * (chartHeight - 1);
        const isTargetLine = Math.abs(targetPosition - row) < 0.3;

        if (isOnThisRow) {
          chart += '●';
          if (col < chartWidth - 1) chart += '─';
        } else if (isTargetLine) {
          chart += '┄';
          if (col < chartWidth - 1) chart += '┄';
        } else {
          chart += ' ';
          if (col < chartWidth - 1) chart += ' ';
        }
      }

      chart += '\n';
    }

    // X-axis
    chart += '        └' + '─'.repeat(chartWidth * 2 - 1) + '\n';

    // Date labels (show first, middle, last)
    const dates: string[] = [];
    if (sorted.length > 0) {
      dates.push(this.formatShortDate(sorted[0].logged_at!));
    }
    if (sorted.length > 2) {
      const midIndex = Math.floor(sorted.length / 2);
      dates.push(this.formatShortDate(sorted[midIndex].logged_at!));
    }
    if (sorted.length > 1) {
      dates.push(this.formatShortDate(sorted[sorted.length - 1].logged_at!));
    }

    chart += '        ' + dates.join('   ');

    return chart;
  }

  /**
   * Format date as short string (DD.MM)
   */
  private static formatShortDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  }

  /**
   * Calculate weight loss trend
   */
  static calculateTrend(weightLogs: WeightLog[]): {
    direction: 'up' | 'down' | 'stable';
    change: number;
    emoji: string;
  } {
    if (weightLogs.length < 2) {
      return { direction: 'stable', change: 0, emoji: '➡️' };
    }

    const sorted = [...weightLogs].reverse();
    const firstWeight = sorted[0].weight;
    const lastWeight = sorted[sorted.length - 1].weight;
    const change = lastWeight - firstWeight;

    if (Math.abs(change) < 0.5) {
      return { direction: 'stable', change, emoji: '➡️' };
    }

    if (change > 0) {
      return { direction: 'up', change, emoji: '📈' };
    }

    return { direction: 'down', change, emoji: '📉' };
  }

  /**
   * Calculate ETA to target weight
   */
  static calculateETA(
    weightLogs: WeightLog[],
    targetWeight: number
  ): { weeks: number; date: Date } | null {
    if (weightLogs.length < 2) return null;

    const sorted = [...weightLogs].reverse();

    // Calculate average weekly change
    const firstLog = sorted[0];
    const lastLog = sorted[sorted.length - 1];

    const daysDiff =
      (new Date(lastLog.logged_at!).getTime() - new Date(firstLog.logged_at!).getTime()) /
      (1000 * 60 * 60 * 24);

    const weightChange = lastLog.weight - firstLog.weight;
    const weeklyChange = (weightChange / daysDiff) * 7;

    // If not losing weight, can't calculate ETA
    if (weeklyChange >= 0) return null;

    const remainingWeight = lastLog.weight - targetWeight;
    const weeksToTarget = Math.ceil(remainingWeight / Math.abs(weeklyChange));

    const etaDate = new Date();
    etaDate.setDate(etaDate.getDate() + weeksToTarget * 7);

    return { weeks: weeksToTarget, date: etaDate };
  }

  /**
   * Generate progress bar
   */
  static generateProgressBar(current: number, target: number, start: number): string {
    const total = start - target;
    const progress = start - current;
    const percentage = Math.max(0, Math.min(100, Math.round((progress / total) * 100)));

    const barLength = 20;
    const filledLength = Math.round((barLength * percentage) / 100);
    const emptyLength = barLength - filledLength;

    const filled = '▓'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);

    return `${filled}${empty} ${percentage}%`;
  }
}
