interface FunctionErrorLike {
  context?: { json?: () => Promise<{ error?: string }> };
  message?: string;
}

// Supabase's functions.invoke() puts the real backend error message in
// error.context, not error.message — without this, failed Edge Function
// calls show a generic "non-2xx status code" instead of the actual reason.
export const parseFunctionError = async (error: unknown, fallback: string): Promise<string> => {
  const err = error as FunctionErrorLike;
  try {
    if (err?.context?.json) {
      const body = await err.context.json();
      if (body?.error) return body.error;
    }
  } catch {
    // fall through to generic message below
  }
  return err?.message || fallback;
};
