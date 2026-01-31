/**
 * Input sanitization utilities
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes all HTML tags except safe ones
 *
 * @param input - Input string that may contain HTML
 * @returns Sanitized string
 */
export function sanitizeHtml(input: string): string {
  // Remove all HTML tags
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize SQL-like patterns (though Prisma prevents SQL injection)
 * This is an extra layer of defense
 *
 * @param input - Input string that may contain SQL patterns
 * @returns Sanitized string
 */
export function sanitizeSql(input: string): string {
  // Remove SQL comment patterns
  return input
    .replace(/--.*$/gm, '') // Remove SQL comments
    .replace(/\/\*.*?\*\//g, '') // Remove multi-line comments
    .trim();
}

/**
 * Sanitize file paths to prevent directory traversal
 *
 * @param input - Input file path
 * @returns Sanitized path (removes ../ and ..\)
 */
export function sanitizePath(input: string): string {
  return input.replace(/\.\.[/\\]/g, '');
}

/**
 * Escape special characters for safe display
 *
 * @param input - Input string
 * @returns Escaped string
 */
export function escapeSpecialChars(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Normalize whitespace (collapse multiple spaces, trim)
 *
 * @param input - Input string
 * @returns Normalized string
 */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/**
 * Remove null bytes (can cause issues in some systems)
 *
 * @param input - Input string
 * @returns String without null bytes
 */
export function removeNullBytes(input: string): string {
  return input.replace(/\0/g, '');
}

/**
 * Comprehensive sanitization for user-generated content
 * Applies multiple sanitization layers
 *
 * @param input - User input string
 * @returns Fully sanitized string
 */
export function sanitizeUserInput(input: string): string {
  let sanitized = input;

  // Remove null bytes
  sanitized = removeNullBytes(sanitized);

  // Remove HTML tags
  sanitized = sanitizeHtml(sanitized);

  // Normalize whitespace
  sanitized = normalizeWhitespace(sanitized);

  // Limit length (prevent DoS)
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}

/**
 * Sanitize email address
 *
 * @param email - Email address
 * @returns Lowercase, trimmed email
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize URL to prevent open redirects
 *
 * @param url - URL string
 * @param allowedDomains - List of allowed domains
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string, allowedDomains?: string[]): string | null {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    // Check against allowed domains if provided
    if (allowedDomains && allowedDomains.length > 0) {
      const hostname = parsed.hostname.toLowerCase();
      const allowed = allowedDomains.some((domain) => {
        const normalizedDomain = domain.toLowerCase();
        return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
      });

      if (!allowed) {
        return null;
      }
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
