ALTER TABLE custom_deal_offers ADD COLUMN IF NOT EXISTS caution_fee numeric;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS caution_fee numeric;
