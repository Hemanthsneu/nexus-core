import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId, getAuthType } from '@/lib/server/auth';
import { writeRateLimit } from '@/lib/server/rate-limit';
import { withUsageTracking } from '@/lib/server/usage';
import { resolveApproval } from '@/lib/server/services/approvals.service';
import { audit, extractIp } from '@/lib/server/services/audit.service';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withMiddleware(withErrorHandler, withAuth, writeRateLimit, withUsageTracking)(async (req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const body = await req.json();
  const result = await resolveApproval(id, body.action, userId);

  void audit({
    user_id: userId,
    action: body.action === 'approve' ? 'approval.approve' : 'approval.reject',
    resource_type: 'approval',
    resource_id: id,
    auth_type: getAuthType(req),
    ip_address: extractIp(req),
    metadata: { approval_id: id, action: body.action },
  });

  return NextResponse.json(result);
});
