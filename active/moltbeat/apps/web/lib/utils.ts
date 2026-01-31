/**
 * Utility functions for MoltBeat Dashboard
 */

import { formatDistanceToNow, format } from 'date-fns';

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

/**
 * Format date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Format large numbers with abbreviations (1K, 1M, etc)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Get color class based on sentiment score
 */
export function getSentimentColor(sentiment: number): string {
  if (sentiment >= 0.5) return 'text-green-600 bg-green-50';
  if (sentiment >= 0) return 'text-blue-600 bg-blue-50';
  if (sentiment >= -0.5) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
}

/**
 * Get color class based on alert severity
 */
export function getSeverityColor(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
  switch (severity) {
    case 'CRITICAL':
      return 'border-red-500 bg-red-50';
    case 'HIGH':
      return 'border-orange-500 bg-orange-50';
    case 'MEDIUM':
      return 'border-yellow-500 bg-yellow-50';
    case 'LOW':
      return 'border-blue-500 bg-blue-50';
  }
}

/**
 * Get background color class based on agent status
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800';
    case 'PAUSED':
      return 'bg-yellow-100 text-yellow-800';
    case 'ERROR':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate mock data for development/testing
 */
export function generateMockAgents(count: number) {
  return Array.from({ length: count }).map((_, i) => ({
    id: `agent-${i}`,
    name: `Agent ${i + 1}`,
    status: ['ACTIVE', 'PAUSED', 'ERROR'][Math.floor(Math.random() * 3)] as any,
    postsCount: Math.floor(Math.random() * 1000),
    karma: Math.floor(Math.random() * 5000),
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
