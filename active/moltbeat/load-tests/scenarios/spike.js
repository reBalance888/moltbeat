/**
 * Spike Test
 * Sudden surge of traffic
 * Duration: 5 minutes
 * VUs: 0-1000-0
 */

import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTrend = new Trend('response_time');

export const options = {
  stages: [
    { duration: '10s', target: 0 },     // Start at 0
    { duration: '10s', target: 1000 },  // SPIKE to 1000 users
    { duration: '3m', target: 1000 },   // Stay at 1000 for 3 minutes
    { duration: '10s', target: 0 },     // Drop back to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // More lenient during spike
    http_req_failed: ['rate<0.20'],     // Accept up to 20% errors during spike
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/api/agents`);

  check(res, {
    'status is 200, 429, or 503': (r) =>
      r.status === 200 || r.status === 429 || r.status === 503,
  }) || errorRate.add(1);

  responseTrend.add(res.timings.duration);

  // No sleep - maximum pressure
}

export function handleSummary(data) {
  return {
    'spike-summary.json': JSON.stringify(data, null, 2),
  };
}
