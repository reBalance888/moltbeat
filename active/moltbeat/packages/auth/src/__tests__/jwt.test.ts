import { generateAccessToken, generateRefreshToken, verifyToken } from '../jwt';
import { mockJwtPayload } from '@moltbeat/testing';

describe('JWT', () => {
  describe('generateAccessToken', () => {
    it('should generate valid access token', () => {
      const token = generateAccessToken(mockJwtPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token', () => {
      const token = generateRefreshToken(mockJwtPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = generateAccessToken(mockJwtPayload);
      const payload = verifyToken(token);

      expect(payload.userId).toBe(mockJwtPayload.userId);
      expect(payload.email).toBe(mockJwtPayload.email);
      expect(payload.role).toBe(mockJwtPayload.role);
    });

    it('should throw on invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });
  });
});
