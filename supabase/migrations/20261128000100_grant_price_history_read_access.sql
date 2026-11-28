-- Allow the public property price-history UI to read history rows.
-- RLS remains enabled and the existing public SELECT policy still applies.
GRANT SELECT ON TABLE public.property_price_history
TO anon, authenticated;
