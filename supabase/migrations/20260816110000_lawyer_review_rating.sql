-- Lets the requester rate the lawyer's review after a verdict is
-- submitted, closing the gap flagged when LawyerDirectory shipped
-- with no rating data at all (deal_reviews has no lawyer equivalent).
alter table public.lawyer_review_bookings
  add column if not exists requester_rating integer
    check (requester_rating between 1 and 5);
