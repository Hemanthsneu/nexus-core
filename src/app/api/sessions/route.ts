import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { listSessions, createSession } from '@/lib/server/services/sessions.service';

export const GET = withMiddleware(withErrorHandler)(async () => {
  const sessions = await listSessions();
  return NextResponse.json(sessions);
});

export const POST = withMiddleware(withErrorHandler)(async (request: Request) => {
  const body = await request.json();
  const session = await createSession(body);
  return NextResponse.json(session, { status: 201 });
});
