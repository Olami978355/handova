-- Silent server-side log of when the client-side off-platform warning
-- banner fires in chat. No UI change — purely for pattern data admins
-- can review later. Not a report; the person typing never sees this
-- recorded.
create table if not exists public.offplatform_warning_triggers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  warning_type text not null
    check (warning_type in ('bank_details', 'off_platform_phrase', 'messaging_app')),
  created_at timestamptz not null default now()
);

create index if not exists offplatform_warning_triggers_user_id_idx
  on public.offplatform_warning_triggers(user_id);
create index if not exists offplatform_warning_triggers_conversation_id_idx
  on public.offplatform_warning_triggers(conversation_id);

alter table public.offplatform_warning_triggers enable row level security;

-- Insert-only from the client, self-scoped. No select policy for regular
-- users — this is a write-only signal from their perspective.
create policy "offplatform_warning_triggers_insert_own"
  on public.offplatform_warning_triggers for insert
  with check (auth.uid() = user_id);

-- Admins/moderators can review the data later if needed.
create policy "offplatform_warning_triggers_admin_select"
  on public.offplatform_warning_triggers for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

grant select, insert on public.offplatform_warning_triggers to authenticated;
