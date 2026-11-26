-- Server-controlled inspection booking creation and payment transitions.

CREATE OR REPLACE FUNCTION public.guard_inspection_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p record;
  v_fee numeric;
  v_annual numeric;
  v_jwt_role text := COALESCE(auth.jwt() ->> 'role', '');
BEGIN
  IF v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create an inspection booking';
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Booking must be made by the signed-in tenant';
  END IF;

  SELECT owner_id, agent_id, company_id, inspection_fee,
         price, price_period, listing_type, transaction_type
  INTO p
  FROM public.properties
  WHERE id = NEW.property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  NEW.landlord_id := p.owner_id;
  NEW.agent_id := p.agent_id;

  IF p.company_id IS NOT NULL THEN
    v_fee := GREATEST(COALESCE(p.inspection_fee, 0), 0);
  ELSE
    IF p.transaction_type = 'sell' OR p.listing_type = 'land' THEN
      v_fee := LEAST(GREATEST(COALESCE(p.price, 0) * 0.001, 2000), 15000);
    ELSE
      v_annual := COALESCE(p.price, 0);

      IF p.price_period = 'monthly' THEN
        v_annual := v_annual * 12;
      ELSIF p.price_period = 'nightly' THEN
        v_annual := v_annual * 365;
      END IF;

      v_fee := LEAST(GREATEST(v_annual * 0.01, 2000), 15000);
    END IF;

    v_fee := ROUND(v_fee / 100) * 100;
  END IF;

  NEW.inspection_fee := v_fee;

  IF v_fee > 0 THEN
    IF NEW.status::text <> 'pending_payment' THEN
      RAISE EXCEPTION 'Paid inspection bookings must start as pending_payment';
    END IF;

    IF NULLIF(NEW.paystack_reference, '') IS NULL THEN
      RAISE EXCEPTION 'A payment reference is required';
    END IF;

    NEW.wallet_credit_version := 'instant_wallet_v1';
    NEW.transfer_status := NULL;
  ELSE
    IF p.company_id IS NULL THEN
      RAISE EXCEPTION 'Invalid free inspection booking';
    END IF;

    IF NEW.status::text <> 'payment_confirmed' THEN
      RAISE EXCEPTION 'Free company bookings must be confirmed';
    END IF;

    NEW.paystack_reference := NULL;
    NEW.wallet_credit_version := NULL;
    NEW.transfer_status := NULL;
  END IF;

  NEW.release_at := NULL;
  NEW.confirmed_date := NULL;
  NEW.confirmed_time := NULL;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_inspection_booking_insert
ON public.inspection_bookings;

CREATE TRIGGER trg_guard_inspection_booking_insert
BEFORE INSERT ON public.inspection_bookings
FOR EACH ROW
EXECUTE FUNCTION public.guard_inspection_booking_insert();


-- Prevent clients from changing payment references or confirming paid bookings.
CREATE OR REPLACE FUNCTION public.guard_booking_client_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_jwt_role text := COALESCE(auth.jwt() ->> 'role', '');
  v_key text;
BEGIN
  IF v_jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to update an inspection booking'
      USING errcode = '42501';
  END IF;

  IF public.is_moderator_or_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.paystack_reference IS DISTINCT FROM OLD.paystack_reference THEN
    RAISE EXCEPTION 'Payment references can only be changed by the server'
      USING errcode = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status::text <> 'dispute_raised'
       OR OLD.status::text NOT IN ('payment_confirmed', 'inspection_scheduled') THEN
      RAISE EXCEPTION 'Clients can only raise a dispute on a confirmed or scheduled booking'
        USING errcode = '42501';
    END IF;
  END IF;

  FOR v_key IN
    SELECT n.key
    FROM jsonb_each(to_jsonb(NEW)) n
    FULL JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
    WHERE n.value IS DISTINCT FROM o.value
  LOOP
    IF v_key NOT IN (
      'status', 'updated_at', 'dispute_reason', 'dispute_evidence_urls',
      'notes',
      'preferred_date', 'preferred_time'
    ) THEN
      RAISE EXCEPTION 'Not allowed to modify booking field: %', v_key
        USING errcode = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_booking_client_writes
ON public.inspection_bookings;

CREATE TRIGGER trg_guard_booking_client_writes
BEFORE UPDATE ON public.inspection_bookings
FOR EACH ROW
EXECUTE FUNCTION public.guard_booking_client_writes();

REVOKE EXECUTE ON FUNCTION public.guard_booking_client_writes()
FROM PUBLIC, anon, authenticated;
