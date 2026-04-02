import { NextResponse } from 'next/server';
import type { Middleware } from './middleware';

/**
 * In-memory sliding window rate limiter.
 *
 * Production upgrade path (Phase 5+): swap the Map store for Redis/Upstash
 * by implementing the same RateLimitStore interface. Zero route changes needed.
 */

interface RateLimitStore {
  get(key: string): number[];
  set(key: string, timestamps: number[]): void;
}

class MemoryStore implements RateLimitStore {
  private store = new Map<string, number[]>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    if (typeof this.cleanupInterval === 'object' && 'unref' in this.cleanupInterval) {
      this.cleanupInterval.unref();
    }
  }

  get(key: string): number[] {
    return this.store.get(key) ?? [];
  }

  set(key: string, timestamps: number[]): void {
    if (timestamps.length === 0) {
      this.store.delete(key);
    } else {
      this.store.set(key, timestamps);
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, ts] of this.store) {
      const fresh = ts.filter((t) => now - t < 120_000);
      if (fresh.length === 0) this.store.delete(key);
      else this.store.set(key, fresh);
    }
  }
}

const globalStore = new MemoryStore();

export type RateLimitConfig = {
  /** Max requests in the window. Default: 60 */
  limit?: number;
  /** Window size in milliseconds. Default: 60_000 (1 minute) */
  windowMs?: number;
  /** Key extractor. Default: x-user-id header or IP */
  keyFn?: (req: Request) => string;
};

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW = 60_000;

function extractKey(req: Request): string {
  const userId = req.headers.get('x-user-id');
  if (userId) return `user:${userId}`;

  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return `ip:${ip}`;
}

/**
 * Creates a rate limit middleware with the given config.
 * Slots into the middleware chain:
 *   withMiddleware(withErrorHandler, withAuth, withRateLimit())(handler)
 */
export function withRateLimit(config: RateLimitConfig = {}): Middleware {
  const limit = config.limit ?? DEFAULT_LIMIT;
  const windowMs = config.windowMs ?? DEFAULT_WINDOW;
  const keyFn = config.keyFn ?? extractKey;

  return (handler) => {
    return async (req, ctx) => {
      const key = keyFn(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      const timestamps = globalStore.get(key).filter((t) => t > windowStart);

      if (timestamps.length >= limit) {
        const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000);
        return NextResponse.json(
          { error: 'Rate limit exceeded', code: 'RATE_LIMITED', retry_after: retryAfter },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil((timestamps[0] + windowMs) / 1000)),
            },
          },
        );
      }

      timestamps.push(now);
      globalStore.set(key, timestamps);

      const response = await handler(req, ctx);

      if (response instanceof NextResponse || response.headers) {
        const headers = new Headers(response.headers);
        headers.set('X-RateLimit-Limit', String(limit));
        headers.set('X-RateLimit-Remaining', String(Math.max(0, limit - timestamps.length)));
        headers.set('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)));

        return new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      return response;
    };
  };
}

/** Tighter limit for write/mutation endpoints */
export const writeRateLimit = withRateLimit({ limit: 30, windowMs: 60_000 });

/** Standard limit for read endpoints */
export const readRateLimit = withRateLimit({ limit: 120, windowMs: 60_000 });

/** Strict limit for auth endpoints (prevent brute force) */
export const authRateLimit = withRateLimit({ limit: 10, windowMs: 60_000 });
