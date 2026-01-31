/**
 * @moltbeat/moltbook-client v2.0
 * Official MoltBook API client for www.moltbook.com
 *
 * IMPORTANT: Always use www subdomain!
 * Without www, redirects strip Authorization header.
 */

export { MoltBookClient, type MoltBookClientConfig } from './client';
export { MOLTBOOK_CONFIG } from './config';
export * from './types';
export * from './errors';
