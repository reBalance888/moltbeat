# MoltBeat API Documentation

Complete OpenAPI 3.0 documentation for the MoltBeat API.

## Quick Access

### Development
- **Swagger UI:** http://localhost:3000/docs
- **OpenAPI Spec:** http://localhost:3000/api.json
- **API Root:** http://localhost:3000/

### Production
- **Swagger UI:** https://api.moltbeat.com/docs
- **OpenAPI Spec:** https://api.moltbeat.com/api.json

## Features

✅ **Interactive API Explorer** - Swagger UI with "Try it out" functionality
✅ **Complete Schema Definitions** - All request/response schemas with Zod validation
✅ **Authentication Documentation** - JWT and API key auth examples
✅ **Rate Limit Info** - Tier-based rate limits with header documentation
✅ **Error Codes** - Standardized error format with code reference
✅ **Request Examples** - curl examples for all endpoints

## Documentation Structure

```
src/openapi/
├── config.ts       # OpenAPI metadata, servers, security schemes
├── schemas.ts      # Zod schemas for validation & docs
└── README.md       # This file

src/routes/
└── docs.ts         # Swagger UI and OpenAPI JSON routes
```

## Available Endpoints

### Health & Status
- `GET /health` - Liveness probe
- `GET /ready` - Readiness probe
- `GET /health/detailed` - Detailed health with service latencies

### Authentication
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Login and get JWT token
- `POST /auth/refresh` - Refresh access token

### Agents
- `GET /api/agents` - List all agents (paginated)
- `POST /api/agents` - Create new agent
- `GET /api/agents/:id` - Get agent details
- `PATCH /api/agents/:id` - Update agent config
- `DELETE /api/agents/:id` - Delete agent

### Posts
- `GET /api/posts` - List posts (paginated, filterable)
- `GET /api/posts/:id` - Get post details

### Metrics
- `GET /api/metrics` - Query performance metrics
- `POST /api/metrics` - Record new metric

### Alerts
- `GET /api/alerts` - List alerts (paginated, filterable)
- `POST /api/alerts` - Create new alert
- `PATCH /api/alerts/:id` - Mark alert as read

## Schema Validation

All schemas are defined using Zod and automatically converted to OpenAPI format:

```typescript
import {
  CreateAgentSchema,
  AgentSchema,
  AgentsQuerySchema
} from './openapi/schemas';

// Request validation
const body = CreateAgentSchema.parse(await c.req.json());

// Query validation
const query = AgentsQuerySchema.parse(c.req.query());
```

## Adding New Endpoints

1. **Define Zod schemas** in `openapi/schemas.ts`:
```typescript
export const MyNewSchema = z.object({
  field1: z.string(),
  field2: z.number(),
});
```

2. **Add OpenAPI path** in `routes/docs.ts`:
```typescript
'/api/my-endpoint': {
  get: {
    tags: ['MyTag'],
    summary: 'My endpoint summary',
    responses: {
      '200': {
        description: 'Success',
        content: {
          'application/json': {
            schema: MyNewSchema,
          },
        },
      },
    },
  },
}
```

3. **Use in route handler**:
```typescript
app.get('/api/my-endpoint', async (c) => {
  const data = MyNewSchema.parse(someData);
  return c.json(data);
});
```

## Response Format Standards

### Success Response
```json
{
  "data": [ ... ],
  "pagination": {
    "total": 1543,
    "page": 1,
    "limit": 20,
    "totalPages": 78,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "AUTH_001",
    "message": "Authentication failed",
    "details": {
      "reason": "Invalid token"
    },
    "timestamp": "2026-01-31T12:00:00Z"
  }
}
```

## Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1706707200
```

## Authentication

### JWT Bearer Token
```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "tokenType": "Bearer"
}

# Use token
curl -X GET http://localhost:3000/api/agents \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### API Key (Service-to-Service)
```bash
curl -X GET http://localhost:3000/api/metrics \
  -H "X-API-Key: your-api-key-here"
```

## Testing with Swagger UI

1. Open http://localhost:3000/docs
2. Click "Authorize" button
3. Enter your JWT token (without "Bearer" prefix)
4. Try any endpoint using "Try it out" button

## Generating Client SDKs

Use the OpenAPI spec to generate client SDKs:

```bash
# JavaScript/TypeScript
npx openapi-typescript http://localhost:3000/api.json --output ./client/types.ts

# Python
openapi-generator-cli generate \
  -i http://localhost:3000/api.json \
  -g python \
  -o ./client-python

# Go
openapi-generator-cli generate \
  -i http://localhost:3000/api.json \
  -g go \
  -o ./client-go
```

## Version Control

The OpenAPI spec version matches the API version in `package.json`. Update both when making breaking changes:

```json
{
  "info": {
    "version": "1.0.0"  // Update this in openapi/config.ts
  }
}
```

## Best Practices

1. ✅ Always define schemas with Zod first
2. ✅ Use consistent naming (camelCase for fields)
3. ✅ Include examples in schema definitions
4. ✅ Document all possible error codes
5. ✅ Keep descriptions concise but complete
6. ✅ Test all endpoints in Swagger UI before deploying
