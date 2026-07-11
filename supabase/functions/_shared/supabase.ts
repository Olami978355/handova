import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// The new sb_secret_ key format does NOT bypass RLS when passed to createClient().
// It must be sent as the apikey header in direct REST calls instead.
// We use a custom fetch wrapper that injects the secret key correctly.

export function getServiceRoleKey(): string {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      const key = parsed['default'] ?? Object.values(parsed)[0];
      if (key) return key as string;
    } catch { /* fall through */ }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

export const createSupabaseClient = (req: Request) => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    getServiceRoleKey(),
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
};

export const createAdminClient = () => {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = getServiceRoleKey();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  });
};
