function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}

/**
 * Typed, validated environment config. Lazily evaluated so build-time
 * imports don't crash when env vars aren't yet set.
 */
export const env = {
  get supabase() {
    return {
      url: required('NEXT_PUBLIC_SUPABASE_URL'),
      anonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      serviceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),
    };
  },
  get teams() {
    return { webhookUrl: optional('TEAMS_WEBHOOK_URL') };
  },
  get cron() {
    return { secret: optional('CRON_SECRET') };
  },
  get app() {
    return { url: optional('NEXT_PUBLIC_APP_URL', 'http://localhost:3001') };
  },
};
