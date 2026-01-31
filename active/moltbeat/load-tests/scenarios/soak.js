/**
 * Soak Test (Endurance Test)
 * Extended period of sustained load
 * Duration: 2 hours
 * VUs: 50 (sustained)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTrend = new Trend('response_time');
const memoryLeakIndicator = new Trend('memory_indicator');

export const options = {
  stages: [
    { duration: '5m', target: 50 },     // Ramp up
    { duration: '110m', target: 50 },   // Sustain for ~2 hours
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
    'memory_indicator': ['p(95)<2000'],  // Watch for degradation over time
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/api/analytics/overview`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time stable': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  responseTrend.add(res.timings.duration);
  memoryLeakIndicator.add(res.timings.duration); // Look for degradation

  sleep(2);
}

export function handleSummary(data) {
  return {
    'soak-summary.json': JSON.stringify(data, null, 2),
  };
}
