import * as jwt from 'jsonwebtoken';
import { getConfig } from '@moltbeat/config';
import { TokenExpiredError, InvalidCredentialsError } from '@moltbeat/errors';
import { UserRole } from '@moltbeat/database';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Token pair (access + refresh)
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Generate access token
 * @param payload - JWT payload
 * @returns Signed JWT token
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const config = getConfig();
  const jwtConfig = config.getJwtConfig();

  return jwt.sign(
    payload,
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn } as jwt.SignOptions
  );
}

/**
 * Generate refresh token
 * @param payload - JWT payload
 * @returns Signed JWT refresh token
 */
export function generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const config = getConfig();
  const jwtConfig = config.getJwtConfig();

  return jwt.sign(
    payload,
    jwtConfig.secret,
    { expiresIn: jwtConfig.refreshExpiresIn } as jwt.SignOptions
  );
}

/**
 * Generate token pair (access + refresh)
 * @param payload - JWT payload
 * @returns Token pair
 */
export function generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): TokenPair {
  const config = getConfig();
  const jwtConfig = config.getJwtConfig();

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Parse expiresIn (e.g., "7d" -> seconds)
  const expiresIn = parseExpiry(jwtConfig.expiresIn);

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Verify and decode JWT token
 * @param token - JWT token
 * @returns Decoded payload
 * @throws TokenExpiredError if token is expired
 * @throws InvalidCredentialsError if token is invalid
 */
export function verifyToken(token: string): JwtPayload {
  const config = getConfig();
  const jwtConfig = config.getJwtConfig();

  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new TokenExpiredError('JWT token has expired');
    }
    throw new InvalidCredentialsError('Invalid JWT token');
  }
}

/**
 * Decode JWT token without verification (for debugging)
 * @param token - JWT token
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Parse expiry string (e.g., "7d", "24h", "3600") to seconds
 */
function parseExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);

  if (!match) {
    // Assume it's already in seconds
    return parseInt(expiresIn, 10);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      return value;
  }
}
