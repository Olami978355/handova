// ─── User & Auth ────────────────────────────────────────────────
export type UserRole = 'tenant' | 'landlord' | 'agent' | 'moderator' | 'admin' | 'banned';
export type VerificationStatus = 'unverified' | 'pending_verification' | 'verified' | 'rejected';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  account_status?: 'active' | 'suspended';
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  phone_public?: boolean;
  avatar_url?: string;
  role: UserRole;
  verification_status: VerificationStatus;
  nin_verified: boolean;
  agent_id?: string;      // RE-AGT-2026-XXXXX
  landlord_id?: string;   // RE-LLD-2026-XXXXX
  lasrera_id?: string;
  agent_bio?: string;
  agent_specialty?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_code?: string;
  username?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfilePrivate {
  id: string;
  nin?: string;
  nin_doc_url?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_code?: string;
  created_at: string;
  updated_at: string;
}

// ─── Property ───────────────────────────────────────────────────
export type PropertyType = 'house' | 'land';
export type TransactionType = 'sell' | 'rent';
export type PricePeriod = 'yearly' | 'monthly' | 'nightly' | 'outright';
export type LandSizeUnit = 'sqm' | 'plots' | 'acres';
export type LandTitle =
  | 'C of O'
  | 'Deed of Assignment'
  | "Governor's Consent"
  | 'Gazette'
  | 'Freehold';
export type PropertyStatus =
  | 'active'
  | 'pending_review'
  | 'inactive'
  | 'sold'
  | 'rented'
  | 'flagged';

export interface Property {
  id: string;
  owner_id: string;
  agent_id?: string;
  landlord_id_ref?: string;
  listing_type: PropertyType;
  transaction_type: TransactionType;
  category: string;
  title: string;
  description?: string;
  price: number;
  price_period?: PricePeriod;
  state: string;
  lga: string;
  address: string;
  lat?: number;
  lng?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities: string[];
  is_rented: boolean;
  deleted_at?: string | null;
  min_rental_duration?: string;
  house_rules?: string;
  land_size_value?: number;
  land_size_unit?: LandSizeUnit;
  land_title?: LandTitle;
  survey_plan_url?: string;
  images: string[];
  videos?: string[];
  inspection_fee?: number;
  has_active_deal: boolean;
  escrow_verified: boolean;
  status: PropertyStatus;
  view_count: number;
  report_count: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  agent?: Profile;
}

// ─── Price History ───────────────────────────────────────────────
export interface PriceHistory {
  id: string;
  property_id: string;
  old_price: number;
  new_price: number;
  old_period?: PricePeriod;
  new_period?: PricePeriod;
  changed_by: string;
  changed_at: string;
}

// ─── Property Report ─────────────────────────────────────────────
export type ReportReason =
  | 'fake_listing'
  | 'already_rented'
  | 'wrong_price'
  | 'wrong_location'
  | 'stolen_photos'
  | 'scam_suspected'
  | 'other';

export interface PropertyReport {
  id: string;
  property_id: string;
  reporter_id: string;
  reason: ReportReason;
  description: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
}

// ─── Inspection ──────────────────────────────────────────────────
export type InspectionStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Inspection {
  id: string;
  property_id: string;
  tenant_id: string;
  preferred_date: string;
  preferred_time: string;
  status: InspectionStatus;
  notes?: string;
  landlord_response?: string;
  created_at: string;
  updated_at: string;
  properties?: Property;
  profiles?: Profile;
}

// ─── Inspection Booking ──────────────────────────────────────────
export type InspectionBookingStatus =
  | 'pending_payment'
  | 'payment_confirmed'
  | 'inspection_scheduled'
  | 'inspection_done'
  | 'tenant_interested'
  | 'tenant_declined'
  | 'escrow_started'
  | 'refunded'
  | 'dispute_raised'
  | 'dispute_resolved';

export interface InspectionBooking {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  agent_id?: string;
  inspection_fee: number;
  paystack_reference?: string;
  paystack_refund_reference?: string;
  status: InspectionBookingStatus;
  preferred_date?: string;
  preferred_time?: string;
  confirmed_date?: string;
  confirmed_time?: string;
  tenant_decision_deadline?: string;
  dispute_reason?: string;
  dispute_evidence_urls?: string[];
  dispute_resolution?: string;
  resolved_by?: string;
  refund_percentage?: number;
  refund_amount?: number;
  processed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  properties?: Property;
  profiles?: Profile;
}

// ─── Deals ───────────────────────────────────────────────────────
export type DealStatus =
  | 'agreement_draft'
  | 'pending_payment'
  | 'payment_received'
  | 'agreement_sent'
  | 'agreement_signed'
  | 'move_in_confirmed'
  | 'documents_uploaded'
  | 'documents_under_review'
  | 'documents_accepted'
  | 'handover_scheduled'
  | 'handover_confirmed'
  | 'funds_released'
  | 'disputed'
  | 'cancelled'
  | 'refunded';

export type DealType = 'house_rent' | 'house_sale' | 'land_sale' | 'land_rent';

export interface Deal {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  agent_id?: string;
  deal_type: DealType;
  amount: number;
  listed_amount: number;
  inspection_fee_credit?: number;
  platform_fee: number;
  agent_fee: number;
  agent_commission_rate: number;
  landlord_payout: number;
  status: DealStatus;
  agreement_url?: string;
  agreement_path?: string;
  agreement_skipped?: boolean;
  duration?: string;
  dispute_reason?: string;
  cancellation_reason?: string;
  tenant_signed_at?: string;
  landlord_signed_at?: string;
  move_in_date?: string;
  move_in_confirmed_at?: string;
  handover_date?: string;
  handover_confirmed_at?: string;
  documents_uploaded_at?: string;
  documents_accepted_at?: string;
  is_custom_deal: boolean;
  custom_deal_note?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  properties?: Property;
  profiles?: Profile;
  tenant?: Profile;
  landlord?: Profile;
  agent?: Profile;
}

// ─── Custom Deal Offer ───────────────────────────────────────────
export type CustomDealStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface CustomDealOffer {
  id: string;
  conversation_id: string;
  property_id: string;
  offered_by: string;
  offered_to: string;
  agreed_price: number;
  duration?: string;
  move_in_date?: string;
  note?: string;
  status: CustomDealStatus;
  expires_at: string;
  created_at: string;
}

// ─── Deal Logs ───────────────────────────────────────────────────
export interface DealLog {
  id: string;
  deal_id: string;
  action: string;
  performed_by: string;
  details: Record<string, unknown>;
  created_at: string;
  actor?: Profile;
}

// ─── Agent Assignment ────────────────────────────────────────────
export type AgentAssignmentStatus = 'pending' | 'accepted' | 'rejected';

export interface AgentAssignment {
  id: string;
  property_id: string;
  landlord_id: string;
  agent_id: string;
  commission_rate: number;
  status: AgentAssignmentStatus;
  assigned_at: string;
  responded_at?: string;
}

// ─── Messaging ───────────────────────────────────────────────────
export interface Conversation {
  id: string;
  property_id: string;
  participant_ids: string[];
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  properties?: Property;
  participants?: Profile[];
  unread_count?: number;
}

export type MessageType = 'text' | 'custom_deal_offer' | 'system';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  custom_deal_offer_id?: string;
  read: boolean;
  created_at: string;
  edited_at?: string;
  deleted_for_everyone?: boolean;
  deleted_for?: string[];
  quoted_message_id?: string;
  sender?: Profile;
  custom_deal_offer?: CustomDealOffer;
  quoted_message?: Message;
}

// ─── Notifications ───────────────────────────────────────────────
export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'inspection_requested'
  | 'inspection_confirmed'
  | 'inspection_booked'
  | 'verification_approved'
  | 'verification_rejected'
  | 'listing_approved'
  | 'listing_rejected'
  | 'deal_state_change'
  | 'new_message'
  | 'custom_deal_offer'
  | 'agent_assignment'
  | 'refund_processed'
  | 'rent_renewal_reminder';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  message?: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  created_at: string;
}

// ─── Admin ───────────────────────────────────────────────────────
export interface AdminLog {
  id: string;
  actor_id: string;
  action: string;
  target_id?: string;
  target_type?: string;
  details: Record<string, unknown>;
  created_at: string;
  actor?: Profile;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  status: RequestStatus;
  nin?: string;
  nin_doc_url?: string;
  business_reg_url?: string;
  lasrera_id?: string;
  lasrera_doc_url?: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  submitted_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  profiles_private?: ProfilePrivate;
}

// ─── Landlord Strikes ────────────────────────────────────────────
export interface LandlordStrike {
  id: string;
  landlord_id: string;
  booking_id?: string;
  reason: string;
  issued_by: string;
  created_at: string;
}

// ─── Renewal ─────────────────────────────────────────────────────
export type RenewalStatus = 'offered' | 'accepted' | 'declined' | 'expired';

export interface RentRenewal {
  id: string;
  deal_id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  current_amount: number;
  new_amount: number;
  increase_percentage: number;
  new_duration: string;
  new_start_date: string;
  status: RenewalStatus;
  offered_at: string;
  responded_at?: string;
  expires_at: string;
}

// ─── Nigerian Banks ──────────────────────────────────────────────
export interface NigerianBank {
  name: string;
  code: string;
}

export const NIGERIAN_BANKS: NigerianBank[] = [
  { name: 'Access Bank', code: '044' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank', code: '214' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Opay', code: '999992' },
  { name: 'Palmpay', code: '999991' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
];