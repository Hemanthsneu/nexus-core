import { getServerSupabase } from '@/lib/supabase/server';
import { NotFoundError, ValidationError } from '../errors';

export type WebhookEvent =
  | 'transaction.approved'
  | 'transaction.held'
  | 'approval.resolved'
  | 'session.created'
  | 'session.updated'
  | 'session.revoked'
  | '*';

const VALID_EVENTS: WebhookEvent[] = [
  'transaction.approved',
  'transaction.held',
  'approval.resolved',
  'session.created',
  'session.updated',
  'session.revoked',
  '*',
];

export type CreateWebhookInput = {
  url: string;
  events?: string[];
  description?: string;
};

export async function createWebhook(input: CreateWebhookInput, userId: string) {
  if (!input.url || !input.url.startsWith('https://')) {
    throw new ValidationError('Webhook URL must start with https://');
  }

  const events = input.events ?? ['*'];
  for (const e of events) {
    if (!VALID_EVENTS.includes(e as WebhookEvent)) {
      throw new ValidationError(`Invalid event: ${e}. Valid: ${VALID_EVENTS.join(', ')}`);
    }
  }

  const secret = generateSecret();
  const db = getServerSupabase();
  const { data, error } = await db
    .from('webhooks')
    .insert({
      user_id: userId,
      url: input.url,
      secret,
      events,
      description: input.description ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { ...data, secret };
}

export async function listWebhooks(userId: string) {
  const db = getServerSupabase();
  const { data, error } = await db
    .from('webhooks')
    .select('id, url, events, enabled, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteWebhook(id: string, userId: string) {
  const db = getServerSupabase();
  const { data, error } = await db
    .from('webhooks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single();

  if (error || !data) throw new NotFoundError('Webhook', id);
  return data;
}

export async function toggleWebhook(id: string, enabled: boolean, userId: string) {
  const db = getServerSupabase();
  const { data, error } = await db
    .from('webhooks')
    .update({ enabled })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) throw new NotFoundError('Webhook', id);
  return data;
}

/**
 * Deliver a webhook event to all matching user webhooks.
 * HMAC-SHA256 signed with the webhook secret.
 * Retries up to 3 times with exponential backoff.
 */
export async function deliverEvent(
  userId: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const db = getServerSupabase();
  const { data: hooks } = await db
    .from('webhooks')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true);

  if (!hooks || hooks.length === 0) return;

  const matching = hooks.filter(
    (h) => h.events.includes('*') || h.events.includes(eventType),
  );

  for (const hook of matching) {
    void deliverToHook(db, hook, eventType, payload);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deliverToHook(db: any, hook: any, eventType: string, payload: Record<string, unknown>) {
  const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() });
  const signature = await hmacSign(hook.secret, body);
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nexus-Signature': signature,
          'X-Nexus-Event': eventType,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      const responseBody = await res.text().catch(() => '');

      await db.from('webhook_deliveries').insert({
        webhook_id: hook.id,
        event_type: eventType,
        payload,
        status_code: res.status,
        response_body: responseBody.slice(0, 1000),
        attempt,
        delivered: res.ok,
      });

      if (res.ok) return;
    } catch (err) {
      await db.from('webhook_deliveries').insert({
        webhook_id: hook.id,
        event_type: eventType,
        payload,
        attempt,
        delivered: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

async function hmacSign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'whsec_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
