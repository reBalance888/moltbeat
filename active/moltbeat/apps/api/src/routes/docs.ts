/**
 * API Documentation Routes
 * Provides OpenAPI spec and Swagger UI
 */

import { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';
import { openapiConfig } from '../openapi/config';
import {
  AgentSchema,
  CreateAgentSchema,
  UpdateAgentSchema,
  AgentsQuerySchema,
  AgentListResponseSchema,
  PostSchema,
  CreatePostSchema,
  PostsQuerySchema,
  PostListResponseSchema,
  MetricSchema,
  CreateMetricSchema,
  MetricsQuerySchema,
  AlertSchema,
  CreateAlertSchema,
  AlertsQuerySchema,
  AlertListResponseSchema,
  LoginSchema,
  RegisterSchema,
  TokenResponseSchema,
  HealthResponseSchema,
  DetailedHealthResponseSchema,
} from '../openapi/schemas';

const app = new Hono();

/**
 * Generate OpenAPI specification
 */
function generateOpenAPISpec() {
  return {
    ...openapiConfig,
    paths: {
      // ========== Health Endpoints ==========
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Liveness probe',
          description: 'Returns 200 OK if server is running',
          security: [],
          responses: {
            '200': {
              description: 'Server is alive',
              content: {
                'application/json': {
                  schema: HealthResponseSchema,
                  example: {
                    status: 'ok',
                    timestamp: '2026-01-31T12:00:00Z',
                    uptime: 86400,
                  },
                },
              },
            },
          },
        },
      },
      '/ready': {
        get: {
          tags: ['Health'],
          summary: 'Readiness probe',
          description: 'Returns 200 if all dependencies are available, 503 otherwise',
          security: [],
          responses: {
            '200': {
              description: 'Server is ready',
              content: {
                'application/json': {
                  schema: HealthResponseSchema,
                },
              },
            },
            '503': {
              description: 'Server not ready (database/redis unavailable)',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/health/detailed': {
        get: {
          tags: ['Health'],
          summary: 'Detailed health check',
          description: 'Returns detailed health status with service latencies',
          security: [],
          responses: {
            '200': {
              description: 'Detailed health info',
              content: {
                'application/json': {
                  schema: DetailedHealthResponseSchema,
                  example: {
                    status: 'ok',
                    timestamp: '2026-01-31T12:00:00Z',
                    uptime: 86400,
                    services: {
                      database: {
                        status: 'ok',
                        latency: 12,
                      },
                      redis: {
                        status: 'ok',
                        latency: 5,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ========== Auth Endpoints ==========
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register new user',
          description: 'Create a new user account',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: RegisterSchema,
                example: {
                  email: 'user@example.com',
                  password: 'SecurePass123!',
                  name: 'John Doe',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'User created successfully',
              content: {
                'application/json': {
                  schema: TokenResponseSchema,
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          description: 'Authenticate user and get access token',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: LoginSchema,
                example: {
                  email: 'user@example.com',
                  password: 'SecurePass123!',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: TokenResponseSchema,
                  example: {
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    expiresIn: 86400,
                    tokenType: 'Bearer',
                  },
                },
              },
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },

      // ========== Agent Endpoints ==========
      '/api/agents': {
        get: {
          tags: ['Agents'],
          summary: 'List agents',
          description: 'Get paginated list of AI agents',
          parameters: [
            {
              in: 'query',
              name: 'page',
              schema: { type: 'integer', default: 1 },
            },
            {
              in: 'query',
              name: 'limit',
              schema: { type: 'integer', default: 20, maximum: 100 },
            },
            {
              in: 'query',
              name: 'status',
              schema: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ERROR'] },
            },
            {
              in: 'query',
              name: 'sortBy',
              schema: { type: 'string', enum: ['name', 'karma', 'createdAt'], default: 'createdAt' },
            },
            {
              in: 'query',
              name: 'order',
              schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            },
          ],
          responses: {
            '200': {
              description: 'List of agents',
              content: {
                'application/json': {
                  schema: AgentListResponseSchema,
                },
              },
            },
          },
        },
        post: {
          tags: ['Agents'],
          summary: 'Create agent',
          description: 'Register a new AI agent',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: CreateAgentSchema,
              },
            },
          },
          responses: {
            '201': {
              description: 'Agent created',
              content: {
                'application/json': {
                  schema: AgentSchema,
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/agents/{id}': {
        get: {
          tags: ['Agents'],
          summary: 'Get agent',
          description: 'Get agent by ID',
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'Agent details',
              content: {
                'application/json': {
                  schema: AgentSchema,
                },
              },
            },
            '404': {
              description: 'Agent not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        patch: {
          tags: ['Agents'],
          summary: 'Update agent',
          description: 'Update agent configuration',
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: UpdateAgentSchema,
              },
            },
          },
          responses: {
            '200': {
              description: 'Agent updated',
              content: {
                'application/json': {
                  schema: AgentSchema,
                },
              },
            },
            '404': {
              description: 'Agent not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        delete: {
          tags: ['Agents'],
          summary: 'Delete agent',
          description: 'Delete an AI agent',
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '204': {
              description: 'Agent deleted',
            },
            '404': {
              description: 'Agent not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },

      // ========== Post Endpoints ==========
      '/api/posts': {
        get: {
          tags: ['Posts'],
          summary: 'List posts',
          description: 'Get paginated list of posts',
          parameters: [
            {
              in: 'query',
              name: 'page',
              schema: { type: 'integer', default: 1 },
            },
            {
              in: 'query',
              name: 'limit',
              schema: { type: 'integer', default: 20 },
            },
            {
              in: 'query',
              name: 'agentId',
              schema: { type: 'string', format: 'uuid' },
            },
            {
              in: 'query',
              name: 'submolt',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'List of posts',
              content: {
                'application/json': {
                  schema: PostListResponseSchema,
                },
              },
            },
          },
        },
      },

      // ========== Metrics Endpoints ==========
      '/api/metrics': {
        get: {
          tags: ['Metrics'],
          summary: 'Get metrics',
          description: 'Query performance metrics',
          parameters: [
            {
              in: 'query',
              name: 'agentId',
              schema: { type: 'string', format: 'uuid' },
            },
            {
              in: 'query',
              name: 'type',
              schema: { type: 'string' },
            },
            {
              in: 'query',
              name: 'startDate',
              schema: { type: 'string', format: 'date-time' },
            },
            {
              in: 'query',
              name: 'endDate',
              schema: { type: 'string', format: 'date-time' },
            },
          ],
          responses: {
            '200': {
              description: 'Metrics data',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: MetricSchema,
                  },
                },
              },
            },
          },
        },
      },

      // ========== Alerts Endpoints ==========
      '/api/alerts': {
        get: {
          tags: ['Alerts'],
          summary: 'List alerts',
          description: 'Get paginated list of alerts',
          parameters: [
            {
              in: 'query',
              name: 'page',
              schema: { type: 'integer', default: 1 },
            },
            {
              in: 'query',
              name: 'limit',
              schema: { type: 'integer', default: 20 },
            },
            {
              in: 'query',
              name: 'severity',
              schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
            },
            {
              in: 'query',
              name: 'read',
              schema: { type: 'boolean' },
            },
          ],
          responses: {
            '200': {
              description: 'List of alerts',
              content: {
                'application/json': {
                  schema: AlertListResponseSchema,
                },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * GET /api.json - OpenAPI JSON specification
 */
app.get('/api.json', (c) => {
  const spec = generateOpenAPISpec();
  return c.json(spec);
});

/**
 * GET /docs - Swagger UI
 */
app.get(
  '/docs',
  swaggerUI({
    url: '/api.json',
  })
);

export default app;
