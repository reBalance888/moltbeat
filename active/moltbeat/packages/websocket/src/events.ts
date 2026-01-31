/**
 * WebSocket Event Types
 * Real-time events for MoltBeat analytics
 */

/**
 * Analytics events
 */
export enum AnalyticsEvent {
  // Agent events
  AgentCreated = 'agent:created',
  AgentUpdated = 'agent:updated',
  AgentDeleted = 'agent:deleted',
  AgentStatusChanged = 'agent:status_changed',

  // Post events
  PostCreated = 'post:created',
  PostUpdated = 'post:updated',
  PostDeleted = 'post:deleted',
  PostLiked = 'post:liked',
  PostCommented = 'post:commented',

  // Metrics events
  MetricsUpdated = 'metrics:updated',
  TrendingTopicAdded = 'trending:added',
  TrendingTopicUpdated = 'trending:updated',

  // Alert events
  AlertCreated = 'alert:created',
  AlertResolved = 'alert:resolved',
  AlertEscalated = 'alert:escalated',

  // System events
  SystemHealthUpdate = 'system:health',
  SystemMaintenanceStart = 'system:maintenance_start',
  SystemMaintenanceEnd = 'system:maintenance_end',
}

/**
 * Room types for subscriptions
 */
export enum WSRoom {
  // Global rooms
  AllEvents = 'events:all',
  System = 'system',

  // Analytics rooms
  Analytics = 'analytics',
  AgentsOverview = 'analytics:agents',
  PostsOverview = 'analytics:posts',
  MetricsOverview = 'analytics:metrics',

  // Specific entity rooms
  Agent = 'agent:{id}',
  Post = 'post:{id}',
  User = 'user:{id}',

  // Alert rooms
  Alerts = 'alerts',
  CriticalAlerts = 'alerts:critical',
}

/**
 * Helper to create room name for specific entity
 */
export function createEntityRoom(type: 'agent' | 'post' | 'user', id: string): string {
  return `${type}:${id}`;
}

/**
 * Event payload types
 */
export interface AgentEventPayload {
  id: string;
  name: string;
  status?: string;
  timestamp: number;
}

export interface PostEventPayload {
  id: string;
  agentId: string;
  content?: string;
  likeCount?: number;
  commentCount?: number;
  timestamp: number;
}

export interface MetricsEventPayload {
  type: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AlertEventPayload {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: number;
}

export interface SystemHealthPayload {
  status: 'healthy' | 'degraded' | 'down';
  services: Array<{
    name: string;
    status: 'up' | 'down';
  }>;
  timestamp: number;
}

/**
 * Event helpers
 */
export class EventBroadcaster {
  constructor(private broadcast: (room: string, event: string, payload: unknown) => void) {}

  /**
   * Broadcast agent event
   */
  agentCreated(agent: AgentEventPayload): void {
    this.broadcast(WSRoom.AgentsOverview, AnalyticsEvent.AgentCreated, agent);
    this.broadcast(createEntityRoom('agent', agent.id), AnalyticsEvent.AgentCreated, agent);
  }

  agentUpdated(agent: AgentEventPayload): void {
    this.broadcast(WSRoom.AgentsOverview, AnalyticsEvent.AgentUpdated, agent);
    this.broadcast(createEntityRoom('agent', agent.id), AnalyticsEvent.AgentUpdated, agent);
  }

  agentStatusChanged(agent: AgentEventPayload): void {
    this.broadcast(WSRoom.AgentsOverview, AnalyticsEvent.AgentStatusChanged, agent);
    this.broadcast(createEntityRoom('agent', agent.id), AnalyticsEvent.AgentStatusChanged, agent);
  }

  /**
   * Broadcast post event
   */
  postCreated(post: PostEventPayload): void {
    this.broadcast(WSRoom.PostsOverview, AnalyticsEvent.PostCreated, post);
    this.broadcast(createEntityRoom('agent', post.agentId), AnalyticsEvent.PostCreated, post);
  }

  postLiked(post: PostEventPayload): void {
    this.broadcast(createEntityRoom('post', post.id), AnalyticsEvent.PostLiked, post);
  }

  /**
   * Broadcast metrics update
   */
  metricsUpdated(metrics: MetricsEventPayload): void {
    this.broadcast(WSRoom.MetricsOverview, AnalyticsEvent.MetricsUpdated, metrics);
    this.broadcast(WSRoom.Analytics, AnalyticsEvent.MetricsUpdated, metrics);
  }

  /**
   * Broadcast alert
   */
  alertCreated(alert: AlertEventPayload): void {
    this.broadcast(WSRoom.Alerts, AnalyticsEvent.AlertCreated, alert);

    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      this.broadcast(WSRoom.CriticalAlerts, AnalyticsEvent.AlertCreated, alert);
    }
  }

  /**
   * Broadcast system health
   */
  systemHealth(health: SystemHealthPayload): void {
    this.broadcast(WSRoom.System, AnalyticsEvent.SystemHealthUpdate, health);
  }
}
