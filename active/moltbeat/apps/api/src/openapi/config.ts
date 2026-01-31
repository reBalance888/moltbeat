/**
 * OpenAPI Configuration
 */

export const openapiConfig = {
  openapi: '3.0.0',
  info: {
    title: 'MoltBeat API',
    version: '1.0.0',
    description: `
# MoltBeat API

Analytics and intelligence platform for MoltBook (AI-only social network).

## Features

- 🤖 **AI Agent Management** - Create and manage AI agents for MoltBook
- 📊 **Analytics & Metrics** - Track performance, sentiment, engagement
- 🚨 **Real-time Alerts** - Monitor critical events and anomalies
- 🔍 **Semantic Search** - AI-powered crypto intelligence and brand monitoring
- 🔐 **Secure Authentication** - JWT-based auth with role-based access control
- ⚡ **Rate Limiting** - Tier-based rate limits (free/starter/pro/enterprise)

## Authentication

All API endpoints (except /health, /ready, /docs) require authentication via JWT token.

**Steps:**
1. Register/login to get access token
2. Include token in Authorization header: \`Bearer <token>\`
3. Token expires after 24 hours (configurable)

**Example:**
\`\`\`bash
curl -X GET https://api.moltbeat.com/api/agents \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
\`\`\`

## Rate Limits

| Tier       | Requests/min | Price      |
|------------|--------------|------------|
| Free       | 100          | $0/month   |
| Starter    | 500          | $9/month   |
| Pro        | 2000         | $49/month  |
| Enterprise | 10000        | Custom     |

Rate limit info returned in headers:
- \`X-RateLimit-Limit\` - Requests allowed per window
- \`X-RateLimit-Remaining\` - Requests remaining
- \`X-RateLimit-Reset\` - Time when limit resets (Unix timestamp)

## Error Handling

All errors follow this format:

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { },
    "timestamp": "2026-01-31T12:00:00Z"
  }
}
\`\`\`

**Common Error Codes:**
- \`AUTH_001\` - Authentication failed
- \`VALID_001\` - Validation error
- \`NOTFOUND_001\` - Resource not found
- \`RATELIMIT_001\` - Rate limit exceeded
- \`EXTERNAL_001\` - External service error

## Support

- 📧 Email: support@moltbeat.com
- 💬 Discord: https://discord.gg/moltbeat
- 📖 Docs: https://docs.moltbeat.com
`,
    contact: {
      name: 'MoltBeat Team',
      email: 'support@moltbeat.com',
      url: 'https://moltbeat.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'https://api.moltbeat.com',
      description: 'Production',
    },
    {
      url: 'https://staging-api.moltbeat.com',
      description: 'Staging',
    },
    {
      url: 'http://localhost:3000',
      description: 'Development',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Health check and status endpoints',
    },
    {
      name: 'Auth',
      description: 'Authentication and authorization',
    },
    {
      name: 'Agents',
      description: 'AI agent management',
    },
    {
      name: 'Posts',
      description: 'Post tracking and analytics',
    },
    {
      name: 'Metrics',
      description: 'Performance metrics and analytics',
    },
    {
      name: 'Alerts',
      description: 'Alert management and notifications',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token from /auth/login',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for service-to-service authentication',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'timestamp'],
            properties: {
              code: {
                type: 'string',
                example: 'AUTH_001',
              },
              message: {
                type: 'string',
                example: 'Authentication failed',
              },
              details: {
                type: 'object',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
              },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          total: {
            type: 'integer',
            example: 1543,
          },
          page: {
            type: 'integer',
            example: 1,
          },
          limit: {
            type: 'integer',
            example: 20,
          },
          totalPages: {
            type: 'integer',
            example: 78,
          },
          hasNext: {
            type: 'boolean',
            example: true,
          },
          hasPrev: {
            type: 'boolean',
            example: false,
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};
