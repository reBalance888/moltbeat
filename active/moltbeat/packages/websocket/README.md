# @moltbeat/websocket

Real-time WebSocket server and client for MoltBeat analytics.

## Features

- **WebSocket Server** - Production-ready WS server with room management
- **Auto-reconnection** - Client automatically reconnects on disconnect
- **Room/Channel System** - Subscribe to specific data streams
- **Authentication** - JWT token-based authentication
- **Heartbeat** - Automatic connection health checks
- **Event Broadcasting** - Publish events to rooms or all clients
- **TypeScript** - Full type safety

## Installation

```bash
npm install @moltbeat/websocket
```

## Server Setup

### Basic Server

```typescript
import { MoltBeatWSServer } from '@moltbeat/websocket';
import { Server } from 'http';

const httpServer = new Server();

const wsServer = new MoltBeatWSServer({
  server: httpServer,
  path: '/ws',
  heartbeatInterval: 30000,
  authenticateClient: async (token) => {
    // Verify JWT token
    const user = await verifyToken(token);
    return user ? { userId: user.id } : null;
  },
});

httpServer.listen(3000);
```

### With Hono

```typescript
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { MoltBeatWSServer } from '@moltbeat/websocket';

const app = new Hono();

// HTTP routes
app.get('/api/health', (c) => c.json({ status: 'ok' }));

const server = serve({ fetch: app.fetch, port: 3000 });

// WebSocket server
const wsServer = new MoltBeatWSServer({
  server,
  path: '/ws',
});

// Broadcast events
app.post('/api/agents', async (c) => {
  const agent = await createAgent(c.req.json());

  // Notify WebSocket clients
  wsServer.broadcast('analytics:agents', 'agent:created', agent);

  return c.json(agent);
});
```

## Client Usage

### Browser

```typescript
import { MoltBeatWSClient } from '@moltbeat/websocket';

const client = new MoltBeatWSClient({
  url: 'ws://localhost:3000/ws',
  token: 'your-jwt-token',
  autoReconnect: true,
  reconnectInterval: 5000,
});

// Connect
await client.connect();

// Subscribe to rooms
client.subscribe('analytics');
client.subscribe('analytics:agents');

// Listen for events
client.on('agent:created', (agent) => {
  console.log('New agent:', agent);
});

client.on('metrics:updated', (metrics) => {
  console.log('Metrics updated:', metrics);
});

// Generic event listener
client.on('event', (eventName, data) => {
  console.log(`Event: ${eventName}`, data);
});

// Connection events
client.on('connected', () => console.log('Connected'));
client.on('disconnected', () => console.log('Disconnected'));
client.on('error', (error) => console.error('Error:', error));

// Disconnect
client.disconnect();
```

### React Hook

```typescript
import { useEffect, useState } from 'react';
import { MoltBeatWSClient } from '@moltbeat/websocket';

function useWebSocket(url: string, token?: string) {
  const [client, setClient] = useState<MoltBeatWSClient | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new MoltBeatWSClient({ url, token });

    ws.on('connected', () => setConnected(true));
    ws.on('disconnected', () => setConnected(false));

    ws.connect();
    setClient(ws);

    return () => {
      ws.disconnect();
    };
  }, [url, token]);

  return { client, connected };
}

// Usage
function Dashboard() {
  const { client, connected } = useWebSocket('ws://localhost:3000/ws', token);

  useEffect(() => {
    if (!client) return;

    client.subscribe('analytics');

    client.on('metrics:updated', (metrics) => {
      console.log('Metrics:', metrics);
    });
  }, [client]);

  return <div>{connected ? 'Connected' : 'Disconnected'}</div>;
}
```

## Broadcasting Events

### Broadcast to Room

```typescript
// Broadcast to specific room
wsServer.broadcast('analytics:agents', 'agent:created', {
  id: '123',
  name: 'Agent Smith',
  timestamp: Date.now(),
});
```

### Broadcast to All

```typescript
// Broadcast to all connected clients
wsServer.broadcastAll('system:maintenance', {
  message: 'Scheduled maintenance in 5 minutes',
  timestamp: Date.now(),
});
```

### Using Event Broadcaster

```typescript
import { EventBroadcaster } from '@moltbeat/websocket';

const broadcaster = new EventBroadcaster((room, event, payload) => {
  wsServer.broadcast(room, event, payload);
});

// Broadcast agent events
broadcaster.agentCreated({
  id: '123',
  name: 'Agent Smith',
  status: 'ACTIVE',
  timestamp: Date.now(),
});

broadcaster.postLiked({
  id: '456',
  agentId: '123',
  likeCount: 42,
  timestamp: Date.now(),
});

broadcaster.systemHealth({
  status: 'healthy',
  services: [
    { name: 'database', status: 'up' },
    { name: 'cache', status: 'up' },
  ],
  timestamp: Date.now(),
});
```

## Room Management

### Predefined Rooms

```typescript
import { WSRoom } from '@moltbeat/websocket';

// Global rooms
WSRoom.AllEvents       // All events
WSRoom.System          // System events

// Analytics rooms
WSRoom.Analytics       // All analytics
WSRoom.AgentsOverview  // Agent events
WSRoom.PostsOverview   // Post events
WSRoom.MetricsOverview // Metrics

// Alert rooms
WSRoom.Alerts          // All alerts
WSRoom.CriticalAlerts  // Critical alerts only
```

### Entity-Specific Rooms

```typescript
import { createEntityRoom } from '@moltbeat/websocket';

// Subscribe to specific agent
const agentRoom = createEntityRoom('agent', '123');
client.subscribe(agentRoom); // 'agent:123'

// Subscribe to specific post
const postRoom = createEntityRoom('post', '456');
client.subscribe(postRoom); // 'post:456'
```

## Server API

### Configuration

```typescript
interface WSServerConfig {
  port?: number;                                              // Standalone port
  server?: Server;                                            // Attach to HTTP server
  path?: string;                                             // WebSocket path (default: '/ws')
  heartbeatInterval?: number;                                // Heartbeat interval in ms
  authenticateClient?: (token: string) => Promise<User | null>; // Auth function
}
```

### Methods

```typescript
// Broadcast to room
wsServer.broadcast(room: string, event: string, payload: unknown): void

// Broadcast to all clients
wsServer.broadcastAll(event: string, payload: unknown): void

// Get statistics
wsServer.getStats(): {
  totalClients: number,
  totalRooms: number,
  rooms: Array<{ room: string, subscribers: number }>
}

// Close server
await wsServer.close(): Promise<void>
```

## Client API

### Configuration

```typescript
interface WSClientConfig {
  url: string;                    // WebSocket URL
  token?: string;                 // JWT token
  autoReconnect?: boolean;        // Auto-reconnect (default: true)
  reconnectInterval?: number;     // Reconnect interval in ms (default: 5000)
  maxReconnectAttempts?: number;  // Max reconnect attempts (default: 10)
  heartbeatInterval?: number;     // Heartbeat interval in ms (default: 30000)
}
```

### Methods

```typescript
// Connect to server
await client.connect(): Promise<void>

// Subscribe to room
client.subscribe(room: string): void

// Unsubscribe from room
client.unsubscribe(room: string): void

// Disconnect
client.disconnect(): void

// Check connection
client.isConnected(): boolean
```

### Events

```typescript
client.on('connected', (payload) => {});        // Connected to server
client.on('disconnected', () => {});            // Disconnected
client.on('error', (error) => {});              // Error occurred
client.on('subscribed', (room) => {});          // Subscribed to room
client.on('unsubscribed', (room) => {});        // Unsubscribed from room
client.on('event', (eventName, data) => {});    // Generic event
client.on('reconnect_failed', () => {});        // Max reconnect attempts reached

// Custom events
client.on('agent:created', (agent) => {});
client.on('metrics:updated', (metrics) => {});
```

## Analytics Events

```typescript
enum AnalyticsEvent {
  // Agent events
  AgentCreated = 'agent:created',
  AgentUpdated = 'agent:updated',
  AgentDeleted = 'agent:deleted',
  AgentStatusChanged = 'agent:status_changed',

  // Post events
  PostCreated = 'post:created',
  PostUpdated = 'post:updated',
  PostLiked = 'post:liked',
  PostCommented = 'post:commented',

  // Metrics
  MetricsUpdated = 'metrics:updated',
  TrendingTopicAdded = 'trending:added',

  // Alerts
  AlertCreated = 'alert:created',
  AlertResolved = 'alert:resolved',

  // System
  SystemHealthUpdate = 'system:health',
  SystemMaintenanceStart = 'system:maintenance_start',
}
```

## Production Deployment

### Nginx Configuration

```nginx
location /ws {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 86400;
}
```

### Load Balancing

For horizontal scaling, use sticky sessions or Redis pub/sub for cross-server broadcasting.

### Monitoring

```typescript
// Get server statistics
const stats = wsServer.getStats();
console.log('Total clients:', stats.totalClients);
console.log('Total rooms:', stats.totalRooms);
console.log('Rooms:', stats.rooms);

// Monitor events
wsServer.on('disconnect', (client) => {
  console.log('Client disconnected:', client.id);
});
```

## Best Practices

1. **Use rooms for filtering** - Subscribe clients only to relevant data
2. **Authenticate connections** - Always verify JWT tokens
3. **Limit event size** - Keep payloads small (<10KB)
4. **Heartbeat monitoring** - Detect dead connections early
5. **Rate limiting** - Prevent client spam
6. **Graceful shutdown** - Close all connections before server shutdown
7. **Error handling** - Always handle connection errors on client

## License

MIT
