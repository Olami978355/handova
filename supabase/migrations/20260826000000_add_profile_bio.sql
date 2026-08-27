-- Adds a generic bio column for all roles (tenant, agent, landlord).
-- Previously only agent_bio existed; the onboarding flow captured a
-- generic bio in local component state but never persisted it anywhere,
-- so anything a user typed there was silently discarded on submit.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
COMMENT ON COLUMN profiles.bio IS 'General user bio, editable from the Profile page. Distinct from agent_bio.';
