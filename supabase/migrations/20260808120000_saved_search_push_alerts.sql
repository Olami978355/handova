CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_saved_search_matches()
RETURNS TRIGGER AS $$
DECLARE
  was_visible boolean := false;
  is_visible boolean;
  search_row RECORD;
  matches boolean;
BEGIN
  is_visible := (NEW.status = 'active' AND NEW.is_delisted = false AND NEW.deleted_at IS NULL);

  IF TG_OP = 'UPDATE' THEN
    was_visible := (OLD.status = 'active' AND OLD.is_delisted = false AND OLD.deleted_at IS NULL);
  END IF;

  IF NOT is_visible OR was_visible THEN
    RETURN NEW;
  END IF;

  FOR search_row IN SELECT * FROM saved_searches LOOP
    matches := true;

    IF matches AND COALESCE(search_row.filters->>'state', '') != '' THEN
      IF NEW.state IS DISTINCT FROM (search_row.filters->>'state') THEN matches := false; END IF;
    END IF;

    IF matches AND COALESCE(search_row.filters->>'type', 'all') NOT IN ('', 'all') THEN
      IF NEW.listing_type IS DISTINCT FROM (search_row.filters->>'type') THEN matches := false; END IF;
    END IF;

    IF matches AND COALESCE(search_row.filters->>'transaction', 'all') NOT IN ('', 'all') THEN
      IF NEW.transaction_type IS DISTINCT FROM (search_row.filters->>'transaction') THEN matches := false; END IF;
    END IF;

    IF matches AND COALESCE(search_row.filters->>'minPrice', '') != '' THEN
      IF NEW.price < (search_row.filters->>'minPrice')::numeric THEN matches := false; END IF;
    END IF;

    IF matches AND COALESCE(search_row.filters->>'maxPrice', '') != '' THEN
      IF NEW.price > (search_row.filters->>'maxPrice')::numeric THEN matches := false; END IF;
    END IF;

    IF matches AND (search_row.filters->>'verifiedOnly')::boolean IS TRUE THEN
      IF NEW.escrow_verified IS NOT TRUE THEN matches := false; END IF;
    END IF;

    IF matches AND COALESCE(search_row.filters->>'bedrooms', '') != '' THEN
      IF NEW.bedrooms IS NULL OR NEW.bedrooms < (search_row.filters->>'bedrooms')::int THEN matches := false; END IF;
    END IF;

    IF matches AND COALESCE(search_row.filters->>'search', '') != '' THEN
      IF NOT (
        NEW.title ILIKE '%' || (search_row.filters->>'search') || '%'
        OR NEW.address ILIKE '%' || (search_row.filters->>'search') || '%'
        OR NEW.lga ILIKE '%' || (search_row.filters->>'search') || '%'
        OR NEW.description ILIKE '%' || (search_row.filters->>'search') || '%'
      ) THEN matches := false; END IF;
    END IF;

    IF matches THEN
      PERFORM net.http_post(
        url := 'https://huvczugwcphcptblwbym.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer sb_publishable_pBxS-YJLb_qD13Gi8UhleA_L-4Bns6Y'
        ),
        body := jsonb_build_object(
          'user_id', search_row.user_id,
          'title', 'New match for "' || search_row.name || '"',
          'body', NEW.title || ' in ' || NEW.lga || ', ' || NEW.state,
          'url', '/property/' || NEW.id
        )
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_saved_search_matches_insert ON properties;
CREATE TRIGGER trg_notify_saved_search_matches_insert
AFTER INSERT ON properties
FOR EACH ROW
EXECUTE FUNCTION notify_saved_search_matches();

DROP TRIGGER IF EXISTS trg_notify_saved_search_matches_update ON properties;
CREATE TRIGGER trg_notify_saved_search_matches_update
AFTER UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION notify_saved_search_matches();
