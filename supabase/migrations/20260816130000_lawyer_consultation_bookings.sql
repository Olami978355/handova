-- Allows booking a lawyer for a general consultation, not tied to any
-- specific deal (e.g. scouting advice before a deal exists). deal_id
-- becomes nullable, and booking_type distinguishes the two flows -
-- a consultation doesn't have an agreement to review, so it uses a
-- simpler "completed" outcome instead of fine/concerns verdict.

alter table public.lawyer_review_bookings
  alter column deal_id drop not null;

alter table public.lawyer_review_bookings
  add column if not exists booking_type text not null default 'deal_review'
    check (booking_type in ('deal_review', 'consultation'));

alter table public.lawyer_review_bookings
  add column if not exists consultation_notes text;
