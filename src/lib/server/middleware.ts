import { NextResponse } from 'next/server';
import { AppError } from './errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteHandler = (req: Request, ctx?: any) => Promise<NextResponse | Response>;
export type Middleware = (handler: RouteHandler) => RouteHandler;

/**
 * Composes middleware right-to-left around a handler.
 * Usage:
 *   export const POST = withMiddleware(withErrorHandler)(myHandler);
 *
 * Future phases slot in new middleware without touching the handler:
 *   export const POST = withMiddleware(withErrorHandler, withAuth, withRateLimit)(myHandler);
 */
export function withMiddleware(...middlewares: Middleware[]) {
  return (handler: RouteHandler): RouteHandler => {
    return middlewares.reduceRight((h, mw) => mw(h), handler);
  };
}

/**
 * Catches thrown errors and maps them to structured JSON responses.
 * AppError subclasses get their statusCode; unknown errors become 500.
 */
export const withErrorHandler: Middleware = (handler) => {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: err.statusCode },
        );
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      console.error('[unhandled]', err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
};
