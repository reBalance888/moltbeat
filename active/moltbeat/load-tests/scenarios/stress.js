/**
 * Stress Test
 * Push system beyond normal capacity
 * Duration: 15 minutes
 * VUs: 100-500
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTrend = new Trend('response_time');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100
    { duration: '3m', target: 200 },  // Ramp up to 200
    { duration: '3m', target: 300 },  // Ramp up to 300
    { duration: '2m', target: 400 },  // Ramp up to 400
    { duration: '2m', target: 500 },  // Max load: 500
    { duration: '3m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.10'],  // Accept up to 10% errors under stress
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  const res = http.batch([
    ['GET', `${BASE_URL}/api/agents`],
    ['GET', `${BASE_URL}/api/posts`],
    ['GET', `${BASE_URL}/api/analytics/overview`],
  ]);

  res.forEach((r) => {
    check(r, {
      'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    }) || errorRate.add(1);

    responseTrend.add(r.timings.duration);
  });

  sleep(0.5); // Less sleep = more stress
}

export function handleSummary(data) {
  return {
    'stress-summary.json': JSON.stringify(data, null, 2),
  };
}
