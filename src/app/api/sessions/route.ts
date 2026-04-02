import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId } from '@/lib/server/auth';
import { listSessions, createSession } from '@/lib/server/services/sessions.service';

export const GET = withMiddleware(withErrorHandler, withAuth)(async (req: Request) => {
  const userId = getUserId(req);
  const sessions = await listSessions(userId);
  return NextResponse.json(sessions);
});

export const POST = withMiddleware(withErrorHandler, withAuth)(async (req: Request) => {
  const userId = getUserId(req);
  const body = await req.json();
  const session = await createSession(body, userId);
  return NextResponse.json(session, { status: 201 });
});
