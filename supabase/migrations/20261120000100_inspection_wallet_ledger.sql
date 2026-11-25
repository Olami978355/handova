-- ============================================================
-- HANDOVA: INSPECTION FEE WALLET FOUNDATION
-- ============================================================

-- Wallet accounts belong to agents, companies or landlords.
-- Balances are stored in kobo to avoid floating-point errors.

CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL
    CHECK (owner_type IN ('agent', 'company', 'landlord')),
  owner_id uuid NOT NULL,
  currency text NOT NULL DEFAULT 'NGN'
    CHECK (currency = 'NGN'),
  available_balance_kobo bigint NOT NULL DEFAULT 0
    CHECK (available_balance_kobo >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_type, owner_id)
);

-- Immutable record of wallet movements.
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL
    REFERENCES public.wallet_accounts(id),
  transaction_type text NOT NULL
    CHECK (transaction_type IN (
      'inspection_fee_credit',
      'withdrawal',
      'adjustment_credit',
      'adjustment_debit'
    )),
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  reference text NOT NULL UNIQUE,
  booking_id uuid REFERENCES public.inspection_bookings(id),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_created_idx
  ON public.wallet_transactions(wallet_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_one_inspection_credit_per_booking
  ON public.wallet_transactions(booking_id)
  WHERE transaction_type = 'inspection_fee_credit'
    AND booking_id IS NOT NULL;

-- Wallet tables are not directly writable by ordinary clients.
ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Only trusted server-side functions may credit inspection wallets.
CREATE OR REPLACE FUNCTION public.credit_inspection_fee_wallet(
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_owner_type text;
  v_owner_id uuid;
  v_wallet_id uuid;
  v_amount_kobo bigint;
  v_reference text;
  v_transaction_id uuid;
BEGIN
  -- Derive the wallet recipient from the actual booking and listing.
  SELECT
    ib.id,
    ib.inspection_fee,
    ib.paystack_reference,
    ib.agent_id,
    ib.landlord_id,
    p.company_id
  INTO v_booking
  FROM public.inspection_bookings ib
  JOIN public.properties p ON p.id = ib.property_id
  WHERE ib.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inspection booking not found';
  END IF;

  IF v_booking.paystack_reference IS NULL
     OR v_booking.paystack_reference = '' THEN
    RAISE EXCEPTION 'Booking has no successful payment reference';
  END IF;

  v_amount_kobo := round(v_booking.inspection_fee * 100)::bigint;

  IF v_amount_kobo <= 0 THEN
    RAISE EXCEPTION 'Inspection fee must be greater than zero';
  END IF;

  -- Company listings credit the company.
  -- Independent agent listings credit the assigned agent.
  -- If no agent is assigned, credit the landlord.
  IF v_booking.company_id IS NOT NULL THEN
    v_owner_type := 'company';
    v_owner_id := v_booking.company_id;
  ELSIF v_booking.agent_id IS NOT NULL THEN
    v_owner_type := 'agent';
    v_owner_id := v_booking.agent_id;
  ELSE
    v_owner_type := 'landlord';
    v_owner_id := v_booking.landlord_id;
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'No eligible wallet recipient found';
  END IF;

  v_reference := 'INSPECTION_FEE_' || p_booking_id::text;

  INSERT INTO public.wallet_accounts (owner_type, owner_id)
  VALUES (v_owner_type, v_owner_id)
  ON CONFLICT (owner_type, owner_id) DO NOTHING;

  SELECT id INTO v_wallet_id
  FROM public.wallet_accounts
  WHERE owner_type = v_owner_type
    AND owner_id = v_owner_id
  FOR UPDATE;

  -- A booking can only credit a wallet once.
  INSERT INTO public.wallet_transactions (
    wallet_id,
    transaction_type,
    amount_kobo,
    reference,
    booking_id,
    description
  )
  VALUES (
    v_wallet_id,
    'inspection_fee_credit',
    v_amount_kobo,
    v_reference,
    p_booking_id,
    'Inspection fee received'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_transaction_id;

  IF v_transaction_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_credited', true,
      'booking_id', p_booking_id
    );
  END IF;

  UPDATE public.wallet_accounts
  SET
    available_balance_kobo = available_balance_kobo + v_amount_kobo,
    updated_at = now()
  WHERE id = v_wallet_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_credited', false,
    'wallet_id', v_wallet_id,
    'transaction_id', v_transaction_id,
    'amount_kobo', v_amount_kobo,
    'owner_type', v_owner_type,
    'owner_id', v_owner_id
  );
END;
$$;

-- Prevent browser/client roles from calling the credit function.
REVOKE ALL ON FUNCTION public.credit_inspection_fee_wallet(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.credit_inspection_fee_wallet(uuid)
  TO service_role;

REVOKE ALL ON public.wallet_accounts FROM anon, authenticated;
REVOKE ALL ON public.wallet_transactions FROM anon, authenticated;
