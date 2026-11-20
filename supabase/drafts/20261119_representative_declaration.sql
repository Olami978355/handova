-- Applied to production: records when a company representative made the declaration.
alter table public.verification_requests
  add column if not exists representative_declared_at timestamptz;
-- Rollback:
-- alter table public.verification_requests drop column if exists representative_declared_at;
