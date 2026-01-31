/**
 * Smoke Test
 * Minimal load test to verify system works under minimal load
 * Duration: 1 minute
 * VUs: 1-5
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTrend = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 2 },  // Ramp up to 2 users
    { duration: '30s', target: 2 },  // Stay at 2 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% errors
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  responseTrend.add(healthRes.timings.duration);

  sleep(1);

  // Get agents
  const agentsRes = http.get(`${BASE_URL}/api/agents`);
  check(agentsRes, {
    'agents status is 200': (r) => r.status === 200,
    'agents has data': (r) => JSON.parse(r.body).success === true,
  }) || errorRate.add(1);
  responseTrend.add(agentsRes.timings.duration);

  sleep(1);

  // Get posts
  const postsRes = http.get(`${BASE_URL}/api/posts`);
  check(postsRes, {
    'posts status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  responseTrend.add(postsRes.timings.duration);

  sleep(1);
}
