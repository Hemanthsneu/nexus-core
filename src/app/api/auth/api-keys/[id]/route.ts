import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId } from '@/lib/server/auth';
import { NotFoundError } from '@/lib/server/errors';
import { getServerSupabase } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export const DELETE = withMiddleware(withErrorHandler, withAuth)(async (req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const userId = getUserId(req);

  const db = getServerSupabase();
  const { data, error } = await db
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single();

  if (error || !data) throw new NotFoundError('API Key', id);

  return NextResponse.json({ id, revoked: true });
});
