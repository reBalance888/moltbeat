/**
 * WebSocket Client
 * Browser/Node.js client for connecting to MoltBeat WebSocket server
 */

import { EventEmitter } from 'events';

export interface WSClientConfig {
  url: string;
  token?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

/**
 * WebSocket Client
 */
export class MoltBeatWSClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscribedRooms: Set<string> = new Set();

  constructor(private config: WSClientConfig) {
    super();
    this.config = {
      autoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.reconnectAttempts = 0;

          // Authenticate if token provided
          if (this.config.token) {
            this.send('authenticate', this.config.token);
          }

          // Re-subscribe to rooms
          for (const room of this.subscribedRooms) {
            this.send('subscribe', undefined, room);
          }

          this.startHeartbeat();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          this.stopHeartbeat();
          this.emit('disconnected');

          if (this.config.autoReconnect) {
            this.reconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'pong':
        // Heartbeat response
        break;

      case 'event':
        if (message.payload) {
          this.emit('event', message.payload.event, message.payload.data);
          this.emit(message.payload.event, message.payload.data);
        }
        break;

      case 'error':
        this.emit('error', new Error(message.payload?.error || 'Unknown error'));
        break;

      case 'connected':
        this.emit('connected', message.payload);
        break;

      case 'subscribed':
        this.emit('subscribed', message.room);
        break;

      case 'unsubscribed':
        this.emit('unsubscribed', message.room);
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Subscribe to room
   */
  public subscribe(room: string): void {
    this.subscribedRooms.add(room);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send('subscribe', undefined, room);
    }
  }

  /**
   * Unsubscribe from room
   */
  public unsubscribe(room: string): void {
    this.subscribedRooms.delete(room);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send('unsubscribe', undefined, room);
    }
  }

  /**
   * Send message to server
   */
  private send(type: string, payload?: unknown, room?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type,
          payload,
          room,
        })
      );
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    if (!this.config.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping');
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Reconnect to server
   */
  private reconnect(): void {
    if (this.reconnectTimeout) return;

    if (
      this.config.maxReconnectAttempts &&
      this.reconnectAttempts >= this.config.maxReconnectAttempts
    ) {
      console.error('Max reconnect attempts reached');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch(() => {
        // Will retry automatically
      });
    }, this.config.reconnectInterval);
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    this.config.autoReconnect = false;
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
