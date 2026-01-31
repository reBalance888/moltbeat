/**
 * WebSocket Load Test
 * Test WebSocket server capacity
 * Duration: 5 minutes
 * Connections: 100-500
 */

import ws from 'k6/ws';
import { check } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('ws_errors');
const messagesReceived = new Counter('messages_received');
const connectionSuccesses = new Counter('connection_successes');

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // 100 concurrent connections
    { duration: '2m', target: 300 },  // 300 concurrent connections
    { duration: '1m', target: 500 },  // 500 concurrent connections
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    ws_errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.WS_URL || 'ws://localhost:3000/ws';

export default function () {
  const res = ws.connect(BASE_URL, {}, function (socket) {
    connectionSuccesses.add(1);

    socket.on('open', () => {
      // Subscribe to analytics room
      socket.send(
        JSON.stringify({
          type: 'subscribe',
          room: 'analytics',
        })
      );

      // Send ping every 5 seconds
      socket.setInterval(() => {
        socket.send(JSON.stringify({ type: 'ping' }));
      }, 5000);
    });

    socket.on('message', (data) => {
      messagesReceived.add(1);

      const message = JSON.parse(data);
      check(message, {
        'message has type': (m) => m.type !== undefined,
      }) || errorRate.add(1);
    });

    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
      errorRate.add(1);
    });

    socket.on('close', () => {
      console.log('WebSocket closed');
    });

    // Keep connection open for 30-60 seconds
    socket.setTimeout(() => {
      socket.close();
    }, Math.random() * 30000 + 30000);
  });

  check(res, {
    'connection successful': (r) => r && r.status === 101,
  }) || errorRate.add(1);
}

export function handleSummary(data) {
  return {
    'websocket-summary.json': JSON.stringify(data, null, 2),
  };
}
