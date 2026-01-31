import { prisma } from '@moltbeat/database';

/**
 * Graceful shutdown configuration (P0-009)
 */
export interface GracefulShutdownConfig {
  /** Agent ID */
  agentId: string;
  /** Grace period in milliseconds (default: 30000 = 30 seconds) */
  gracePeriodMs?: number;
  /** Cleanup callback to run before shutdown */
  onShutdown?: () => Promise<void>;
  /** Called when shutdown starts */
  onShutdownStart?: () => void;
  /** Called when shutdown completes */
  onShutdownComplete?: () => void;
}

/**
 * Agent interface for graceful shutdown
 */
export interface ShutdownableAgent {
  /** Stop scheduled tasks */
  stopScheduledTasks?: () => Promise<void>;
  /** Complete in-flight operations */
  completeInFlightOperations?: () => Promise<void>;
  /** Close connections */
  closeConnections?: () => Promise<void>;
  /** Update agent status in database */
  updateStatus?: (status: string) => Promise<void>;
}

/**
 * Setup graceful shutdown for an agent (P0-009)
 *
 * Handles SIGTERM and SIGINT signals
 * Provides 30-second grace period for cleanup
 * Updates agent status in database before exit
 *
 * @param config - Shutdown configuration
 *
 * @example
 * ```typescript
 * import { setupGracefulShutdown } from '@moltbeat/agent-framework';
 *
 * const agent = new MyAgent('agent-id');
 * setupGracefulShutdown({
 *   agentId: 'agent-id',
 *   onShutdown: async () => {
 *     await agent.stopScheduledTasks();
 *     await agent.completeInFlightPosts();
 *   }
 * });
 * ```
 */
export function setupGracefulShutdown(config: GracefulShutdownConfig): void {
  const { agentId, gracePeriodMs = 30000, onShutdown, onShutdownStart, onShutdownComplete } = config;

  let isShuttingDown = false;

  async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) {
      console.log('Shutdown already in progress...');
      return;
    }

    isShuttingDown = true;

    console.log(`\n[${agentId}] ${signal} received. Starting graceful shutdown...`);

    if (onShutdownStart) {
      onShutdownStart();
    }

    // Set timeout for forced shutdown
    const forceShutdownTimer = setTimeout(() => {
      console.error(`⚠️  [${agentId}] Graceful shutdown timeout. Forcing exit...`);
      process.exit(1);
    }, gracePeriodMs);

    try {
      // 1. Update agent status to offline
      console.log(`[${agentId}] 1. Updating agent status to inactive...`);
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          status: 'INACTIVE',
          lastActive: new Date(),
        },
      }).catch((error) => {
        console.error(`[${agentId}] Failed to update status:`, error.message);
      });

      // 2. Run custom cleanup callback
      if (onShutdown) {
        console.log(`[${agentId}] 2. Running cleanup tasks...`);
        await onShutdown();
      }

      // 3. Close database connections
      console.log(`[${agentId}] 3. Closing database connections...`);
      await prisma.$disconnect();

      console.log(`✅ [${agentId}] Graceful shutdown complete`);

      if (onShutdownComplete) {
        onShutdownComplete();
      }

      clearTimeout(forceShutdownTimer);
      process.exit(0);
    } catch (error) {
      console.error(`❌ [${agentId}] Error during graceful shutdown:`, error);
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }
  }

  // Register signal handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error(`[${agentId}] Uncaught Exception:`, error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${agentId}] Unhandled Rejection at:`, promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });

  console.log(`[${agentId}] Graceful shutdown handlers registered`);
}

/**
 * Setup graceful shutdown for an agent object (P0-009)
 *
 * @param agent - Agent object with shutdown methods
 * @param config - Optional additional configuration
 *
 * @example
 * ```typescript
 * import { setupAgentShutdown } from '@moltbeat/agent-framework';
 *
 * class MyAgent {
 *   async stopScheduledTasks() { ... }
 *   async completeInFlightOperations() { ... }
 *   async closeConnections() { ... }
 * }
 *
 * const agent = new MyAgent();
 * setupAgentShutdown(agent, { agentId: 'my-agent' });
 * ```
 */
export function setupAgentShutdown(
  agent: ShutdownableAgent,
  config: Omit<GracefulShutdownConfig, 'onShutdown'>
): void {
  setupGracefulShutdown({
    ...config,
    onShutdown: async () => {
      // Stop scheduled tasks
      if (agent.stopScheduledTasks) {
        console.log('Stopping scheduled tasks...');
        await agent.stopScheduledTasks();
      }

      // Complete in-flight operations
      if (agent.completeInFlightOperations) {
        console.log('Completing in-flight operations...');
        await agent.completeInFlightOperations();
      }

      // Close connections
      if (agent.closeConnections) {
        console.log('Closing connections...');
        await agent.closeConnections();
      }
    },
  });
}
