import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId, getAuthType, generateApiKey } from '@/lib/server/auth';
import { readRateLimit, authRateLimit } from '@/lib/server/rate-limit';
import { withUsageTracking } from '@/lib/server/usage';
import { ForbiddenError } from '@/lib/server/errors';
import { getServerSupabase } from '@/lib/supabase/server';
import { audit, extractIp } from '@/lib/server/services/audit.service';

export const GET = withMiddleware(withErrorHandler, withAuth, readRateLimit, withUsageTracking)(async (req: Request) => {
  const userId = getUserId(req);

  const db = getServerSupabase();
  const { data, error } = await db
    .from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return NextResponse.json(data);
});

export const POST = withMiddleware(withErrorHandler, withAuth, authRateLimit, withUsageTracking)(async (req: Request) => {
  if (getAuthType(req) === 'api_key') {
    throw new ForbiddenError('API keys cannot create other API keys. Use dashboard session.');
  }

  const userId = getUserId(req);
  const body = await req.json();
  const name = body.name || 'Default Key';

  const { rawKey, hash, prefix } = await generateApiKey();

  const db = getServerSupabase();
  const { error } = await db.from('api_keys').insert({
    user_id: userId,
    name,
    key_hash: hash,
    key_prefix: prefix,
  });

  if (error) throw new Error(error.message);

  void audit({
    user_id: userId,
    action: 'api_key.create',
    resource_type: 'api_key',
    resource_id: prefix,
    auth_type: getAuthType(req),
    ip_address: extractIp(req),
    metadata: { name },
  });

  return NextResponse.json({ raw_key: rawKey, prefix, name }, { status: 201 });
});
