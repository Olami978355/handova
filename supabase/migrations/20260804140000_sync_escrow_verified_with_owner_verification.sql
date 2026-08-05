-- Keep properties.escrow_verified in sync with the owner's profile verification_status.
-- Rationale: verification_status is the single source of truth (CAC/NIN verification);
-- escrow_verified was previously never written anywhere, leaving all "Verified" badges
-- and the Verified-only filter reading a dead field.

-- Backfill existing rows to reflect current reality
UPDATE properties p
SET escrow_verified = (pr.verification_status = 'verified')
FROM profiles pr
WHERE p.owner_id = pr.id
  AND p.escrow_verified IS DISTINCT FROM (pr.verification_status = 'verified');

-- Keep existing properties in sync when the owner's verification changes
CREATE OR REPLACE FUNCTION sync_escrow_verified_on_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    UPDATE properties
    SET escrow_verified = (NEW.verification_status = 'verified')
    WHERE owner_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_escrow_verified ON profiles;
CREATE TRIGGER trg_sync_escrow_verified
AFTER UPDATE OF verification_status ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_escrow_verified_on_profile_change();

-- Set it correctly at creation time for new properties too
CREATE OR REPLACE FUNCTION set_escrow_verified_on_property_insert()
RETURNS TRIGGER AS $$
BEGIN
  SELECT (verification_status = 'verified') INTO NEW.escrow_verified
  FROM profiles WHERE id = NEW.owner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_escrow_verified_on_insert ON properties;
CREATE TRIGGER trg_set_escrow_verified_on_insert
BEFORE INSERT ON properties
FOR EACH ROW
EXECUTE FUNCTION set_escrow_verified_on_property_insert();
