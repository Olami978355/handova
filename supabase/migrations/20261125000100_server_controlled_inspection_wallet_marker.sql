CREATE OR REPLACE FUNCTION public.guard_inspection_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Booking must be made by the signed-in tenant';
  END IF;

  SELECT owner_id, agent_id, company_id, inspection_fee
  INTO p
  FROM public.properties
  WHERE id = NEW.property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  IF NEW.status::text NOT IN ('pending_payment', 'payment_confirmed') THEN
    RAISE EXCEPTION 'Invalid starting status for a booking';
  END IF;

  NEW.landlord_id := p.owner_id;
  NEW.agent_id := p.agent_id;

  IF p.company_id IS NOT NULL THEN
    NEW.inspection_fee := COALESCE(p.inspection_fee, 0);
  ELSIF COALESCE(NEW.inspection_fee, 0) <= 0 THEN
    RAISE EXCEPTION 'Payment is required for this inspection';
  END IF;

  IF NEW.inspection_fee > 0 AND NEW.paystack_reference IS NULL THEN
    RAISE EXCEPTION 'Payment is required for this inspection';
  END IF;

  -- Database controls wallet eligibility.
  NEW.wallet_credit_version :=
    CASE
      WHEN NEW.inspection_fee > 0
       AND NEW.paystack_reference IS NOT NULL
      THEN 'instant_wallet_v1'
      ELSE NULL
    END;

  NEW.release_at := NULL;
  NEW.confirmed_date := NULL;
  NEW.confirmed_time := NULL;

  NEW.transfer_status := CASE
    WHEN NEW.status::text = 'payment_confirmed'
      AND NEW.inspection_fee > 0
    THEN 'awaiting_release'
    ELSE NULL
  END;

  RETURN NEW;
END;
$function$;
