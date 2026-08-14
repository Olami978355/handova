-- Extends user_reports (previously write-only via report_user(), never
-- reviewed anywhere) with deal/conversation context and a constrained
-- reason, so it can support the off-platform-payment report flow and
-- finally gets an admin review screen.

alter table public.user_reports
  add column if not exists deal_id uuid references public.deals(id),
  add column if not exists conversation_id uuid references public.conversations(id),
  add column if not exists details text;

-- Existing rows have free-text reason values from the current textarea-based
-- flow, so they won't satisfy a new CHECK constraint. Bucket them into
-- 'other' before adding the constraint, preserving the original text in
-- details so nothing is lost.
update public.user_reports
  set details = coalesce(details, reason),
      reason = 'other'
  where reason not in ('requested_off_platform_payment', 'harassment', 'scam_or_fraud', 'other');

alter table public.user_reports
  add constraint user_reports_reason_check
  check (reason in ('requested_off_platform_payment', 'harassment', 'scam_or_fraud', 'other'));

grant select, update on public.user_reports to authenticated;

create or replace function public.report_user(
  p_reported_id uuid,
  p_reason text,
  p_details text default null,
  p_deal_id uuid default null,
  p_conversation_id uuid default null
)
returns void
language plpgsql
security definer
as $function$
begin
  if p_reported_id = auth.uid() then
    raise exception 'You cannot report yourself.';
  end if;
  insert into public.user_reports (reporter_id, reported_id, reason, details, deal_id, conversation_id, status)
  values (auth.uid(), p_reported_id, p_reason, p_details, p_deal_id, p_conversation_id, 'pending');
end;
$function$;
