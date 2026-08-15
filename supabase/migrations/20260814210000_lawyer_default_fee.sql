-- Lawyers set their own review fee (minimum enforced, per product
-- decision - platform sets a flat 500 service fee, lawyers set their
-- own fee on top of that). Deliberately NOT exposed via a broad RLS
-- update policy, since that would also let a lawyer silently edit
-- nba_number/specialty/status post-approval with no re-verification.
-- Instead, a narrow function that touches only default_fee.

alter table public.lawyer_verifications
  add column if not exists default_fee numeric not null default 1500
    check (default_fee >= 1000);

create or replace function public.update_own_lawyer_fee(p_fee numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_fee < 1000 then
    raise exception 'Fee must be at least 1000';
  end if;

  update public.lawyer_verifications
  set default_fee = p_fee
  where user_id = auth.uid()
    and status = 'approved';

  if not found then
    raise exception 'No approved lawyer verification found for this user';
  end if;
end;
$$;

grant execute on function public.update_own_lawyer_fee(numeric) to authenticated;
