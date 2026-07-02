import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

function getServiceRoleKey(): string {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      const key = parsed['default'] ?? Object.values(parsed)[0];
      if (key) return key as string;
    } catch {
      // not valid JSON, fall through to legacy
    }
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
    }
  );
};

export const createAdminClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    getServiceRoleKey()
  );
};
