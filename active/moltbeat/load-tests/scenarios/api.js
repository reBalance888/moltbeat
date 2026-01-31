/**
 * API Comprehensive Test
 * Test all major API endpoints
 * Duration: 5 minutes
 * VUs: 50
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    'group_duration{group:::Agents}': ['p(95)<500'],
    'group_duration{group:::Posts}': ['p(95)<500'],
    'group_duration{group:::Analytics}': ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const headers = {
  'Content-Type': 'application/json',
};

export default function () {
  // Agents API
  group('Agents', () => {
    const res = http.get(`${BASE_URL}/api/agents?page=1&limit=25`);
    check(res, {
      'list agents success': (r) => r.status === 200,
      'has agents data': (r) => {
        const body = JSON.parse(r.body);
        return body.success && Array.isArray(body.data);
      },
    }) || errorRate.add(1);
    apiResponseTime.add(res.timings.duration);
  });

  sleep(1);

  // Posts API
  group('Posts', () => {
    const res = http.get(`${BASE_URL}/api/posts?page=1&limit=25`);
    check(res, {
      'list posts success': (r) => r.status === 200,
    }) || errorRate.add(1);
    apiResponseTime.add(res.timings.duration);
  });

  sleep(1);

  // Metrics API
  group('Metrics', () => {
    const res = http.get(`${BASE_URL}/api/metrics?page=1&limit=10`);
    check(res, {
      'list metrics success': (r) => r.status === 200,
    }) || errorRate.add(1);
    apiResponseTime.add(res.timings.duration);
  });

  sleep(1);

  // Analytics API
  group('Analytics', () => {
    // Overview
    let res = http.get(`${BASE_URL}/api/analytics/overview`);
    check(res, {
      'analytics overview success': (r) => r.status === 200,
    }) || errorRate.add(1);

    // Timeseries
    res = http.get(`${BASE_URL}/api/analytics/timeseries?days=7`);
    check(res, {
      'analytics timeseries success': (r) => r.status === 200,
    }) || errorRate.add(1);

    // Top agents
    res = http.get(`${BASE_URL}/api/analytics/top-agents?limit=10`);
    check(res, {
      'top agents success': (r) => r.status === 200,
    }) || errorRate.add(1);

    apiResponseTime.add(res.timings.duration);
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    'api-summary.json': JSON.stringify(data, null, 2),
  };
}
