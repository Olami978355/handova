-- Preserve both price and pricing-period changes in the same transaction
-- as the property update.

ALTER TABLE public.property_price_history
  ADD COLUMN IF NOT EXISTS old_period text,
  ADD COLUMN IF NOT EXISTS new_period text;

CREATE OR REPLACE FUNCTION public.record_property_price_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price
     OR NEW.price_period IS DISTINCT FROM OLD.price_period THEN

    -- Never trust a caller-supplied actor for ordinary authenticated requests.
    -- The service-role RPC sets this transaction-local value after authenticating
    -- the user in the Edge Function.
    IF COALESCE(auth.role(), '') = 'service_role' THEN
      v_actor := NULLIF(
        current_setting('app.price_change_actor', true),
        ''
      )::uuid;
    ELSE
      v_actor := auth.uid();
    END IF;

    INSERT INTO public.property_price_history (
      property_id,
      old_price,
      new_price,
      old_period,
      new_period,
      changed_by
    )
    VALUES (
      NEW.id,
      OLD.price,
      NEW.price,
      OLD.price_period::text,
      NEW.price_period::text,
      v_actor
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_property_price_history
ON public.properties;

CREATE TRIGGER trg_record_property_price_history
AFTER UPDATE OF price, price_period
ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.record_property_price_history();


-- Only the service role may execute this atomic update function.
CREATE OR REPLACE FUNCTION public.update_property_with_price_history(
  p_property_id uuid,
  p_data jsonb,
  p_changed_by uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_price numeric;
  v_old_period text;
  v_new_price numeric;
  v_new_period text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required'
      USING errcode = '42501';
  END IF;

  IF p_property_id IS NULL OR p_changed_by IS NULL OR p_data IS NULL THEN
    RAISE EXCEPTION 'Property ID, update data and actor are required';
  END IF;

  SELECT price, price_period::text
  INTO v_old_price, v_old_period
  FROM public.properties
  WHERE id = p_property_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  PERFORM set_config('app.price_change_actor', p_changed_by::text, true);

  UPDATE public.properties AS p
  SET (
    listing_type,
    transaction_type,
    category,
    title,
    description,
    min_rental_duration,
    house_rules,
    bedrooms,
    bathrooms,
    amenities,
    land_size_value,
    land_size_unit,
    land_title,
    state,
    lga,
    address,
    lat,
    lng,
    images,
    videos,
    survey_plan_url,
    price,
    price_period,
    caution_fee
  ) = (
    SELECT
      x.listing_type,
      x.transaction_type,
      x.category,
      x.title,
      x.description,
      x.min_rental_duration,
      x.house_rules,
      x.bedrooms,
      x.bathrooms,
      x.amenities,
      x.land_size_value,
      x.land_size_unit,
      x.land_title,
      x.state,
      x.lga,
      x.address,
      x.lat,
      x.lng,
      x.images,
      x.videos,
      x.survey_plan_url,
      x.price,
      x.price_period,
      x.caution_fee
    FROM jsonb_populate_record(p, p_data) AS x
  ),
  updated_at = now()
  WHERE p.id = p_property_id
  RETURNING price, price_period::text
  INTO v_new_price, v_new_period;

  RETURN v_old_price IS DISTINCT FROM v_new_price
      OR v_old_period IS DISTINCT FROM v_new_period;
END;
$$;

REVOKE ALL ON FUNCTION public.update_property_with_price_history(uuid, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_property_with_price_history(uuid, jsonb, uuid)
  TO service_role;
