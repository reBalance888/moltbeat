/**
 * WebSocket Server
 * Real-time event broadcasting and room management
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { EventEmitter } from 'events';
import type { Server } from 'http';

/**
 * WebSocket client connection
 */
export interface WSClient {
  id: string;
  userId?: string;
  rooms: Set<string>;
  socket: WebSocket;
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket message types
 */
export enum WSMessageType {
  // Client -> Server
  Subscribe = 'subscribe',
  Unsubscribe = 'unsubscribe',
  Ping = 'ping',
  Authenticate = 'authenticate',

  // Server -> Client
  Pong = 'pong',
  Event = 'event',
  Error = 'error',
  Connected = 'connected',
  Subscribed = 'subscribed',
  Unsubscribed = 'unsubscribed',
}

/**
 * WebSocket message
 */
export interface WSMessage {
  type: WSMessageType;
  payload?: unknown;
  room?: string;
  timestamp?: number;
}

/**
 * WebSocket server configuration
 */
export interface WSServerConfig {
  port?: number;
  server?: Server;
  path?: string;
  heartbeatInterval?: number;
  authenticateClient?: (token: string) => Promise<{ userId: string } | null>;
}

/**
 * WebSocket Server
 */
export class MoltBeatWSServer extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Map<string, WSClient> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private config: WSServerConfig) {
    super();

    this.wss = new WebSocketServer({
      port: config.port,
      server: config.server,
      path: config.path || '/ws',
    });

    this.setupEventHandlers();
    this.startHeartbeat();

    console.log(`✅ WebSocket server initialized on ${config.path || '/ws'}`);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      const clientId = this.generateClientId();
      const client: WSClient = {
        id: clientId,
        rooms: new Set(),
        socket,
      };

      this.clients.set(clientId, client);
      console.log(`🔌 Client connected: ${clientId} (${this.clients.size} total)`);

      // Send welcome message
      this.sendToClient(client, {
        type: WSMessageType.Connected,
        payload: { clientId },
      });

      // Handle messages
      socket.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          await this.handleMessage(client, message);
        } catch (error) {
          console.error('Failed to parse message:', error);
          this.sendError(client, 'Invalid message format');
        }
      });

      // Handle disconnection
      socket.on('close', () => {
        this.handleDisconnect(client);
      });

      socket.on('error', (error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
      });
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  /**
   * Handle client messages
   */
  private async handleMessage(client: WSClient, message: WSMessage): Promise<void> {
    switch (message.type) {
      case WSMessageType.Ping:
        this.sendToClient(client, { type: WSMessageType.Pong });
        break;

      case WSMessageType.Authenticate:
        await this.handleAuthenticate(client, message);
        break;

      case WSMessageType.Subscribe:
        if (message.room) {
          this.subscribeToRoom(client, message.room);
        }
        break;

      case WSMessageType.Unsubscribe:
        if (message.room) {
          this.unsubscribeFromRoom(client, message.room);
        }
        break;

      default:
        this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle authentication
   */
  private async handleAuthenticate(client: WSClient, message: WSMessage): Promise<void> {
    if (!this.config.authenticateClient) {
      this.sendError(client, 'Authentication not configured');
      return;
    }

    const token = message.payload as string;
    if (!token) {
      this.sendError(client, 'Missing authentication token');
      return;
    }

    try {
      const user = await this.config.authenticateClient(token);
      if (user) {
        client.userId = user.userId;
        console.log(`✅ Client ${client.id} authenticated as user ${user.userId}`);
      } else {
        this.sendError(client, 'Invalid authentication token');
        client.socket.close();
      }
    } catch (error) {
      this.sendError(client, 'Authentication failed');
      client.socket.close();
    }
  }

  /**
   * Subscribe client to room
   */
  private subscribeToRoom(client: WSClient, room: string): void {
    client.rooms.add(room);

    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(client.id);

    this.sendToClient(client, {
      type: WSMessageType.Subscribed,
      room,
    });

    console.log(`📢 Client ${client.id} subscribed to room: ${room}`);
  }

  /**
   * Unsubscribe client from room
   */
  private unsubscribeFromRoom(client: WSClient, room: string): void {
    client.rooms.delete(room);
    this.rooms.get(room)?.delete(client.id);

    if (this.rooms.get(room)?.size === 0) {
      this.rooms.delete(room);
    }

    this.sendToClient(client, {
      type: WSMessageType.Unsubscribed,
      room,
    });

    console.log(`📢 Client ${client.id} unsubscribed from room: ${room}`);
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(client: WSClient): void {
    // Remove from all rooms
    for (const room of client.rooms) {
      this.rooms.get(room)?.delete(client.id);
      if (this.rooms.get(room)?.size === 0) {
        this.rooms.delete(room);
      }
    }

    this.clients.delete(client.id);
    console.log(`🔌 Client disconnected: ${client.id} (${this.clients.size} remaining)`);

    this.emit('disconnect', client);
  }

  /**
   * Broadcast event to room
   */
  public broadcast(room: string, event: string, payload: unknown): void {
    const clientIds = this.rooms.get(room);
    if (!clientIds) return;

    const message: WSMessage = {
      type: WSMessageType.Event,
      room,
      payload: { event, data: payload },
      timestamp: Date.now(),
    };

    let sent = 0;
    for (const clientId of clientIds) {
      const client = this.clients.get(clientId);
      if (client && client.socket.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message);
        sent++;
      }
    }

    console.log(`📡 Broadcast to room ${room}: ${event} (${sent} clients)`);
  }

  /**
   * Broadcast to all clients
   */
  public broadcastAll(event: string, payload: unknown): void {
    const message: WSMessage = {
      type: WSMessageType.Event,
      payload: { event, data: payload },
      timestamp: Date.now(),
    };

    let sent = 0;
    for (const client of this.clients.values()) {
      if (client.socket.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message);
        sent++;
      }
    }

    console.log(`📡 Broadcast to all: ${event} (${sent} clients)`);
  }

  /**
   * Send message to specific client
   */
  private sendToClient(client: WSClient, message: WSMessage): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Send error to client
   */
  private sendError(client: WSClient, error: string): void {
    this.sendToClient(client, {
      type: WSMessageType.Error,
      payload: { error },
    });
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval || 30000; // 30 seconds

    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients.values()) {
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.ping();
        } else {
          this.handleDisconnect(client);
        }
      }
    }, interval);
  }

  /**
   * Get statistics
   */
  public getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      rooms: Array.from(this.rooms.entries()).map(([room, clients]) => ({
        room,
        subscribers: clients.size,
      })),
    };
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Close server
   */
  public async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.socket.close();
    }

    // Close server
    return new Promise((resolve) => {
      this.wss.close(() => {
        console.log('✅ WebSocket server closed');
        resolve();
      });
    });
  }
}
