/**
 * Authentication Routes
 * User registration, login, and token management
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { getConfig } from '@moltbeat/config';
import { prisma } from '@moltbeat/database';
import { LoginSchema, RegisterSchema, TokenResponseSchema } from '../openapi/schemas';
import { hashPassword, verifyPassword, generateTokenPair } from '@moltbeat/auth';

const auth = new Hono();

/**
 * POST /auth/register
 * Register a new user
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const validation = RegisterSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: {
            code: 'VALID_001',
            message: 'Invalid request body',
            details: validation.error.flatten(),
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validation.data.email },
    });

    if (existingUser) {
      return c.json(
        {
          error: {
            code: 'AUTH_001',
            message: 'User with this email already exists',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validation.data.password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: validation.data.email,
        name: validation.data.name,
        password: hashedPassword,
      },
    });

    // Generate tokens
    const tokenPair = generateTokenPair({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    const response: z.infer<typeof TokenResponseSchema> = {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
    };

    return c.json(response, 201);
  } catch (error: any) {
    return c.json(
      {
        error: {
          code: 'INTERNAL_001',
          message: error.message || 'Internal server error',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

/**
 * POST /auth/login
 * Authenticate user and get tokens
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const validation = LoginSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: {
            code: 'VALID_001',
            message: 'Invalid request body',
            details: validation.error.flatten(),
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validation.data.email },
    });

    if (!user) {
      return c.json(
        {
          error: {
            code: 'AUTH_001',
            message: 'Invalid credentials',
            timestamp: new Date().toISOString(),
          },
        },
        401
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(validation.data.password, user.password);
    if (!isPasswordValid) {
      return c.json(
        {
          error: {
            code: 'AUTH_001',
            message: 'Invalid credentials',
            timestamp: new Date().toISOString(),
          },
        },
        401
      );
    }

    // Generate tokens
    const tokenPair = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response: z.infer<typeof TokenResponseSchema> = {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
    };

    return c.json(response, 200);
  } catch (error: any) {
    return c.json(
      {
        error: {
          code: 'INTERNAL_001',
          message: error.message || 'Internal server error',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
auth.post('/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const validation = z
      .object({
        refreshToken: z.string(),
      })
      .safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: {
            code: 'VALID_001',
            message: 'Invalid request body',
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    // TODO: Verify refresh token and generate new access token
    // For now, return error
    return c.json(
      {
        error: {
          code: 'AUTH_001',
          message: 'Refresh token expired or invalid',
          timestamp: new Date().toISOString(),
        },
      },
      401
    );
  } catch (error: any) {
    return c.json(
      {
        error: {
          code: 'INTERNAL_001',
          message: error.message || 'Internal server error',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

/**
 * GET /auth/me
 * Get current user info (requires authentication)
 */
auth.get('/me', async (c) => {
  try {
    // Get user info from request (set by auth middleware)
    const user = (c.env as any)?.user;

    if (!user) {
      return c.json(
        {
          error: {
            code: 'AUTH_001',
            message: 'Unauthorized',
            timestamp: new Date().toISOString(),
          },
        },
        401
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!dbUser) {
      return c.json(
        {
          error: {
            code: 'NOTFOUND_001',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    // Return user info without password
    const { password, ...userInfo } = dbUser;

    return c.json(userInfo, 200);
  } catch (error: any) {
    return c.json(
      {
        error: {
          code: 'INTERNAL_001',
          message: error.message || 'Internal server error',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

export default auth;
