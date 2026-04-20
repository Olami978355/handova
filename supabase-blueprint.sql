-- ==========================================
-- 1. ENUMS & TYPES
-- ==========================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('tenant', 'landlord', 'agent', 'moderator', 'admin', 'banned');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_booking_status') THEN
        CREATE TYPE inspection_booking_status AS ENUM (
            'pending_payment',
            'payment_confirmed',
            'inspection_scheduled',
            'inspection_done',
            'tenant_interested',
            'tenant_declined',
            'escrow_started',
            'refunded',
            'dispute_raised',
            'dispute_resolved'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('unverified', 'pending_verification', 'verified', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_type') THEN
        CREATE TYPE property_type AS ENUM ('house', 'land');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('sell', 'rent');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_period') THEN
        CREATE TYPE price_period AS ENUM ('yearly', 'monthly', 'nightly', 'outright');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'land_size_unit') THEN
        CREATE TYPE land_size_unit AS ENUM ('sqm', 'plots', 'acres');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'land_title') THEN
        CREATE TYPE land_title AS ENUM ('C of O', 'Deed of Assignment', 'Governor''s Consent', 'Gazette', 'Freehold');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_status') THEN
        CREATE TYPE property_status AS ENUM ('active', 'pending_review', 'inactive', 'sold', 'rented');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_status') THEN
        CREATE TYPE inspection_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_status') THEN
        CREATE TYPE deal_status AS ENUM ('pending_payment', 'payment_received', 'agreement_sent', 'agreement_signed', 'move_in_confirmed', 'funds_released', 'disputed');
    END IF;
END $$;

-- ==========================================
-- 2. TABLES
-- ==========================================

-- 1. PROFILES (Public Info)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'tenant' NOT NULL,
    verification_status verification_status DEFAULT 'unverified' NOT NULL,
    nin_verified BOOLEAN DEFAULT FALSE,
    lasrera_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. PROFILES_PRIVATE (Sensitive PII)
CREATE TABLE IF NOT EXISTS profiles_private (
    id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    nin TEXT,
    nin_doc_url TEXT,
    bank_account_name TEXT,
    bank_account_number TEXT,
    bank_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. VERIFICATION REQUESTS
CREATE TABLE IF NOT EXISTS verification_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    nin_doc_url TEXT, -- Reference to the doc in storage/private profile
    business_reg_url TEXT,
    lasrera_id TEXT,
    lasrera_doc_url TEXT,
    status request_status DEFAULT 'pending' NOT NULL,
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. PROPERTIES
CREATE TABLE IF NOT EXISTS properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    listing_type property_type NOT NULL,
    transaction_type transaction_type NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(15,2) NOT NULL,
    price_period price_period,
    state TEXT NOT NULL,
    lga TEXT NOT NULL,
    address TEXT NOT NULL,
    lat FLOAT8,
    lng FLOAT8,
    bedrooms INT,
    bathrooms INT,
    land_size_value FLOAT8,
    land_size_unit land_size_unit,
    land_title land_title,
    survey_plan_url TEXT,
    images TEXT[] DEFAULT '{}' NOT NULL,
    videos TEXT[] DEFAULT '{}' NOT NULL,
    amenities TEXT[] DEFAULT '{}' NOT NULL,
    min_rental_duration TEXT,
    house_rules TEXT,
    inspection_fee NUMERIC(15,2) DEFAULT 0,
    escrow_verified BOOLEAN DEFAULT FALSE,
    status property_status DEFAULT 'pending_review' NOT NULL,
    view_count INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. PROPERTY SAVES (Bookmarks)
CREATE TABLE IF NOT EXISTS property_saves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, property_id)
);

-- 6. INSPECTIONS
CREATE TABLE IF NOT EXISTS inspections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time TEXT NOT NULL,
    status inspection_status DEFAULT 'pending' NOT NULL,
    notes TEXT,
    landlord_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. DEALS (Escrow)
CREATE TABLE IF NOT EXISTS deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) NOT NULL,
    tenant_id UUID REFERENCES profiles(id) NOT NULL,
    landlord_id UUID REFERENCES profiles(id) NOT NULL,
    agent_id UUID REFERENCES profiles(id),
    amount NUMERIC(15,2) NOT NULL,
    inspection_fee_credit NUMERIC(15,2) DEFAULT 0,
    platform_fee NUMERIC(15,2) NOT NULL,
    agent_fee NUMERIC(15,2) NOT NULL,
    landlord_payout NUMERIC(15,2) NOT NULL,
    status deal_status DEFAULT 'pending_payment' NOT NULL,
    agreement_url TEXT,
    tenant_signed_at TIMESTAMPTZ,
    landlord_signed_at TIMESTAMPTZ,
    move_in_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. DEAL LOGS (Immutable)
CREATE TABLE IF NOT EXISTS deal_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES profiles(id) NOT NULL,
    details JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    participant_ids UUID[] NOT NULL, -- Exactly 2
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT participants_count CHECK (array_length(participant_ids, 1) = 2)
);

-- 10. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) NOT NULL,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger to update conversation last message on new message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET last_message = NEW.content,
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_inserted ON messages;
CREATE TRIGGER on_message_inserted
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    type TEXT,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 12. ADMIN LOGS
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES profiles(id) NOT NULL,
    action TEXT NOT NULL,
    target_id UUID,
    target_type TEXT,
    details JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 13. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(deal_id, reviewer_id)
);

-- 14. DISPUTES
CREATE TABLE IF NOT EXISTS disputes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 15. INSPECTION BOOKINGS
CREATE TABLE IF NOT EXISTS inspection_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES profiles(id),
    inspection_fee NUMERIC(15,2) NOT NULL,
    paystack_reference TEXT,
    paystack_refund_reference TEXT,
    status inspection_booking_status DEFAULT 'pending_payment' NOT NULL,
    preferred_date DATE,
    preferred_time TEXT,
    confirmed_date DATE,
    confirmed_time TEXT,
    tenant_decision_deadline TIMESTAMPTZ,
    dispute_reason TEXT,
    dispute_evidence_urls TEXT[] DEFAULT '{}',
    dispute_resolution TEXT,
    resolved_by UUID REFERENCES profiles(id),
    refund_percentage INT,
    refund_amount NUMERIC(15,2),
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 16. LANDLORD STRIKES
CREATE TABLE IF NOT EXISTS landlord_strikes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    landlord_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES inspection_bookings(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    issued_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 3. INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_verification ON profiles(verification_status);

CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_geo ON properties(lat, lng);
CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);

CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_tenant ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_landlord ON deals(landlord_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_reviews_deal ON reviews(deal_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_deal ON disputes(deal_id);

CREATE INDEX IF NOT EXISTS idx_inspection_bookings_property ON inspection_bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_inspection_bookings_tenant ON inspection_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inspection_bookings_landlord ON inspection_bookings(landlord_id);
CREATE INDEX IF NOT EXISTS idx_inspection_bookings_status ON inspection_bookings(status);
CREATE INDEX IF NOT EXISTS idx_inspection_bookings_paystack_ref ON inspection_bookings(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_landlord_strikes_landlord ON landlord_strikes(landlord_id);

-- ==========================================
-- 4. HELPER FUNCTIONS FOR RLS
-- ==========================================

CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_moderator_or_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid()) IN ('moderator', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to check if user is a participant in a conversation
CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conv_id
    AND (auth.uid() = ANY(participant_ids) OR is_moderator_or_admin())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to check if moderator can view private profile (during active review)
CREATE OR REPLACE FUNCTION can_moderator_view_private(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'moderator' AND
    EXISTS (
      SELECT 1 FROM verification_requests 
      WHERE user_id = profile_id AND status = 'pending'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to add strike and ban landlord if needed
CREATE OR REPLACE FUNCTION add_strike_and_check(p_landlord_id UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
    strike_count INT;
    result JSONB;
BEGIN
    INSERT INTO landlord_strikes (landlord_id, reason, issued_by)
    VALUES (p_landlord_id, p_reason, auth.uid());

    SELECT COUNT(*) INTO strike_count
    FROM landlord_strikes
    WHERE landlord_id = p_landlord_id;

    IF strike_count >= 3 THEN
        UPDATE profiles
        SET role = 'banned'
        WHERE id = p_landlord_id;
        
        result := jsonb_build_object('banned', true, 'strike_count', strike_count);
    ELSE
        result := jsonb_build_object('banned', false, 'strike_count', strike_count);
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to execute raw SQL (used for advisory locks in edge functions)
CREATE OR REPLACE FUNCTION execute_sql(sql TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles are readable by owner or staff" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Profiles are readable by owner or staff" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        is_admin() OR 
        (is_moderator_or_admin() AND role != 'admin') OR
        EXISTS (
            SELECT 1 FROM conversations
            WHERE auth.uid() = ANY(participant_ids)
            AND profiles.id = ANY(participant_ids)
        )
    );

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- PROFILES_PRIVATE POLICIES
DROP POLICY IF EXISTS "Private profiles readable by owner, admin, or active reviewer" ON profiles_private;
DROP POLICY IF EXISTS "Users can insert own private profile" ON profiles_private;
DROP POLICY IF EXISTS "Users can update own private profile" ON profiles_private;

CREATE POLICY "profiles_private_insert" ON profiles_private
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_private_select" ON profiles_private
FOR SELECT USING (
  auth.uid() = id OR is_admin()
);

CREATE POLICY "profiles_private_update" ON profiles_private
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- VERIFICATION REQUESTS POLICIES
DROP POLICY IF EXISTS "Users can view own verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Users can insert own verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Staff can update verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Users can submit verification" ON verification_requests;
DROP POLICY IF EXISTS "Users can view own verification" ON verification_requests;
DROP POLICY IF EXISTS "Staff can view all verifications" ON verification_requests;

-- Allow authenticated users to insert their own request
CREATE POLICY "verification_insert" ON verification_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own requests
CREATE POLICY "verification_select_own" ON verification_requests
FOR SELECT USING (auth.uid() = user_id);

-- Allow staff to read all
CREATE POLICY "verification_select_staff" ON verification_requests
FOR SELECT USING (is_moderator_or_admin());

-- Allow staff to update (approve/reject)
CREATE POLICY "verification_update_staff" ON verification_requests
FOR UPDATE USING (is_moderator_or_admin());

-- PROPERTIES POLICIES
DROP POLICY IF EXISTS "Active properties are publicly readable" ON properties;
DROP POLICY IF EXISTS "properties_select" ON properties;
DROP POLICY IF EXISTS "Owners can insert own properties" ON properties;
DROP POLICY IF EXISTS "Owners can update own properties" ON properties;
DROP POLICY IF EXISTS "properties_update_admin" ON properties;
DROP POLICY IF EXISTS "Owners can delete own properties" ON properties;

CREATE POLICY "properties_select" ON properties
    FOR SELECT USING (
        status = 'active' OR 
        auth.uid() = owner_id OR 
        is_moderator_or_admin()
    );

CREATE POLICY "Owners can insert own properties" ON properties
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id AND 
        status = 'pending_review'
    );

CREATE POLICY "properties_update_admin" ON properties
    FOR UPDATE USING (
        auth.uid() = owner_id OR 
        is_moderator_or_admin()
    );

CREATE POLICY "Owners can delete own properties" ON properties
    FOR DELETE USING (auth.uid() = owner_id);

-- PROPERTY SAVES POLICIES
DROP POLICY IF EXISTS "Users can view own saves" ON property_saves;
DROP POLICY IF EXISTS "Users can insert own saves" ON property_saves;
DROP POLICY IF EXISTS "Users can delete own saves" ON property_saves;

CREATE POLICY "Users can view own saves" ON property_saves
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saves" ON property_saves
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saves" ON property_saves
    FOR DELETE USING (auth.uid() = user_id);

-- INSPECTIONS POLICIES
DROP POLICY IF EXISTS "Inspections readable by participants or staff" ON inspections;
DROP POLICY IF EXISTS "Tenants can insert inspections" ON inspections;
DROP POLICY IF EXISTS "Participants can update inspections" ON inspections;

CREATE POLICY "Inspections readable by participants or staff" ON inspections
    FOR SELECT USING (
        auth.uid() = tenant_id OR 
        auth.uid() = (SELECT owner_id FROM properties WHERE id = property_id) OR
        is_moderator_or_admin()
    );

CREATE POLICY "Tenants can insert inspections" ON inspections
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Participants can update inspections" ON inspections
    FOR UPDATE USING (
        auth.uid() = tenant_id OR 
        auth.uid() = (SELECT owner_id FROM properties WHERE id = property_id)
    );

-- DEALS POLICIES
DROP POLICY IF EXISTS "Deals readable by participants or staff" ON deals;
DROP POLICY IF EXISTS "Participants can update deals" ON deals;

CREATE POLICY "Deals readable by participants or staff" ON deals
    FOR SELECT USING (
        auth.uid() IN (tenant_id, landlord_id, agent_id) OR 
        is_moderator_or_admin()
    );

CREATE POLICY "Participants can update deals" ON deals
    FOR UPDATE USING (
        auth.uid() IN (tenant_id, landlord_id, agent_id) OR 
        is_moderator_or_admin()
    );

-- DEAL LOGS POLICIES
DROP POLICY IF EXISTS "Deal logs readable by participants or staff" ON deal_logs;
DROP POLICY IF EXISTS "Deal logs are insert only by participants" ON deal_logs;

CREATE POLICY "Deal logs readable by participants or staff" ON deal_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM deals 
            WHERE deals.id = deal_logs.deal_id 
            AND (auth.uid() IN (tenant_id, landlord_id, agent_id) OR is_moderator_or_admin())
        )
    );

CREATE POLICY "Deal logs are insert only by participants" ON deal_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM deals 
            WHERE deals.id = deal_logs.deal_id 
            AND (auth.uid() IN (tenant_id, landlord_id, agent_id) OR is_moderator_or_admin())
        )
    );

-- REVIEWS POLICIES
DROP POLICY IF EXISTS "Reviews are publicly readable" ON reviews;
DROP POLICY IF EXISTS "Users can insert reviews for their deals" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;

CREATE POLICY "Reviews are publicly readable" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can insert reviews for their deals" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() = reviewer_id AND
        EXISTS (
            SELECT 1 FROM deals 
            WHERE deals.id = reviews.deal_id 
            AND (auth.uid() = tenant_id OR auth.uid() = landlord_id)
            AND deals.status = 'funds_released'
        )
    );

CREATE POLICY "Users can update own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id)
    WITH CHECK (auth.uid() = reviewer_id);

-- DISPUTES POLICIES
DROP POLICY IF EXISTS "Disputes readable by participants or staff" ON disputes;
DROP POLICY IF EXISTS "Staff can insert disputes" ON disputes;

CREATE POLICY "Disputes readable by participants or staff" ON disputes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM deals 
            WHERE deals.id = disputes.deal_id 
            AND (auth.uid() IN (tenant_id, landlord_id, agent_id) OR is_moderator_or_admin())
        )
    );

CREATE POLICY "Staff can insert disputes" ON disputes
    FOR INSERT WITH CHECK (is_moderator_or_admin());

-- ADMIN LOGS POLICIES
DROP POLICY IF EXISTS "Admin logs readable by admins only" ON admin_logs;
DROP POLICY IF EXISTS "Staff can insert admin logs" ON admin_logs;
DROP POLICY IF EXISTS "admin_logs_select" ON admin_logs;
DROP POLICY IF EXISTS "admin_logs_insert" ON admin_logs;

CREATE POLICY "admin_logs_select" ON admin_logs
    FOR SELECT USING (is_moderator_or_admin());

CREATE POLICY "admin_logs_insert" ON admin_logs
    FOR INSERT WITH CHECK (is_moderator_or_admin());

-- CONVERSATIONS POLICIES
DROP POLICY IF EXISTS "Conversations readable by participants" ON conversations;

CREATE POLICY "Conversations readable by participants" ON conversations
    FOR SELECT USING (auth.uid() = ANY(participant_ids) OR is_moderator_or_admin());

CREATE POLICY "Participants can insert conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "Participants can update conversations" ON conversations
    FOR UPDATE USING (auth.uid() = ANY(participant_ids))
    WITH CHECK (auth.uid() = ANY(participant_ids));

-- MESSAGES POLICIES
DROP POLICY IF EXISTS "Messages readable by conversation participants" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Participants can update messages" ON messages;

CREATE POLICY "Messages readable by conversation participants" ON messages
    FOR SELECT USING (is_conversation_participant(conversation_id));

CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        is_conversation_participant(conversation_id)
    );

CREATE POLICY "Participants can update messages" ON messages
    FOR UPDATE USING (is_conversation_participant(conversation_id))
    WITH CHECK (is_conversation_participant(conversation_id));

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- INSPECTION BOOKINGS POLICIES
CREATE POLICY "inspection_bookings_select" ON inspection_bookings
    FOR SELECT USING (
        auth.uid() = tenant_id OR 
        auth.uid() = landlord_id OR 
        auth.uid() = agent_id OR 
        is_moderator_or_admin()
    );

CREATE POLICY "inspection_bookings_insert" ON inspection_bookings
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "inspection_bookings_update" ON inspection_bookings
    FOR UPDATE USING (
        auth.uid() = tenant_id OR 
        auth.uid() = landlord_id OR 
        auth.uid() = agent_id OR 
        is_moderator_or_admin()
    );

-- LANDLORD STRIKES POLICIES
CREATE POLICY "landlord_strikes_select" ON landlord_strikes
    FOR SELECT USING (auth.uid() = landlord_id OR is_moderator_or_admin());

CREATE POLICY "landlord_strikes_insert" ON landlord_strikes
    FOR INSERT WITH CHECK (is_moderator_or_admin());

-- ==========================================
-- 6. TRIGGERS
-- ==========================================

-- NIN Immutability Trigger
DROP TRIGGER IF EXISTS on_nin_update ON profiles_private;
CREATE OR REPLACE FUNCTION check_nin_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.nin IS NOT NULL AND NEW.nin != OLD.nin) THEN
        RAISE EXCEPTION 'NIN cannot be modified after submission';
    END IF;
    IF (OLD.nin_doc_url IS NOT NULL AND NEW.nin_doc_url != OLD.nin_doc_url) THEN
        RAISE EXCEPTION 'NIN document cannot be modified after submission';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_nin_update
    BEFORE UPDATE ON profiles_private
    FOR EACH ROW
    EXECUTE FUNCTION check_nin_immutability();

-- Auto-update verification status on approval
DROP TRIGGER IF EXISTS on_verification_approved ON verification_requests;
CREATE OR REPLACE FUNCTION handle_verification_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        UPDATE profiles 
        SET verification_status = 'verified'
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_verification_approved
    AFTER UPDATE ON verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_verification_approval();

-- Update timestamps
DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
DROP TRIGGER IF EXISTS set_updated_at_profiles_private ON profiles_private;
DROP TRIGGER IF EXISTS set_updated_at_properties ON properties;
DROP TRIGGER IF EXISTS set_updated_at_deals ON deals;
DROP TRIGGER IF EXISTS set_updated_at_inspections ON inspections;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_profiles_private BEFORE UPDATE ON profiles_private FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_properties BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_deals BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_inspections BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_inspection_bookings BEFORE UPDATE ON inspection_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 7. STORAGE POLICIES
-- ==========================================

-- Note: These assume buckets 'property-assets' and 'verification-docs' exist
-- You must create these in the Supabase Dashboard first.

-- Fix verification-docs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Property assets are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload property assets" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Agreement docs readable by participants or staff" ON storage.objects;
DROP POLICY IF EXISTS "Landlords/Agents can upload agreement docs" ON storage.objects;

CREATE POLICY "Property assets are publicly readable" ON storage.objects
    FOR SELECT USING (bucket_id = 'property-assets');

CREATE POLICY "Users can upload property assets" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'property-assets' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Avatars are publicly readable" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "verification_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "verification_docs_select" ON storage.objects;

CREATE POLICY "verification_docs_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'verification-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "verification_docs_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'verification-docs' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR is_moderator_or_admin()
  )
);

CREATE POLICY "Agreement docs readable by participants or staff" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'agreement-docs' AND (
            EXISTS (
                SELECT 1 FROM deals 
                WHERE (auth.uid() IN (tenant_id, landlord_id, agent_id) OR is_moderator_or_admin())
            )
        )
    );

CREATE POLICY "Landlords/Agents can upload agreement docs" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'agreement-docs' AND (
            EXISTS (
                SELECT 1 FROM deals 
                WHERE (auth.uid() = landlord_id OR auth.uid() = agent_id)
            )
        )
    );
