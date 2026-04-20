export type UserRole = 'tenant' | 'landlord' | 'agent' | 'moderator' | 'admin' | 'banned';
export type VerificationStatus = 'unverified' | 'pending_verification' | 'verified' | 'rejected';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  verification_status: VerificationStatus;
  nin_verified: boolean;
  lasrera_id?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_code?: string;
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

export type PropertyType = 'house' | 'land';
export type TransactionType = 'sell' | 'rent';
export type PricePeriod = 'yearly' | 'monthly' | 'nightly' | 'outright';
export type LandSizeUnit = 'sqm' | 'plots' | 'acres';
export type LandTitle = 'C of O' | 'Deed of Assignment' | 'Governor\'s Consent' | 'Gazette' | 'Freehold';
export type PropertyStatus = 'active' | 'pending_review' | 'inactive' | 'sold' | 'rented' | 'flagged';

export interface Property {
  id: string;
  owner_id: string;
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
  land_size_value?: number;
  land_size_unit?: LandSizeUnit;
  land_title?: LandTitle;
  survey_plan_url?: string;
  images: string[];
  videos?: string[];
  amenities: string[];
  min_rental_duration?: string;
  house_rules?: string;
  inspection_fee?: number;
  has_active_deal: boolean;
  escrow_verified: boolean;
  status: PropertyStatus;
  view_count: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

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

export type DealStatus = 'pending_payment' | 'payment_received' | 'agreement_sent' | 'agreement_signed' | 'move_in_confirmed' | 'funds_released' | 'disputed';

export interface Deal {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  agent_id?: string;
  amount: number;
  inspection_fee_credit?: number;
  platform_fee: number;
  agent_fee: number;
  landlord_payout: number;
  status: DealStatus;
  agreement_url?: string;
  tenant_signed_at?: string;
  landlord_signed_at?: string;
  move_in_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  properties?: Property;
  profiles?: Profile;
}

export interface AdminLog {
  id: string;
  actor_id: string;
  action: string;
  target_id?: string;
  details: Record<string, any>;
  created_at: string;
  actor?: Profile;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  status: RequestStatus;
  nin?: string;
  nin_doc_url?: string;
  lasrera_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  profiles_private?: ProfilePrivate;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'inspection_requested' | 'inspection_confirmed' | 'verification_approved' | 'verification_rejected' | 'listing_approved' | 'listing_rejected' | 'deal_state_change' | 'new_message';
  read: boolean;
  link?: string;
  created_at: string;
}

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

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: Profile;
}

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

export interface LandlordStrike {
  id: string;
  landlord_id: string;
  booking_id?: string;
  reason: string;
  issued_by: string;
  created_at: string;
}

export interface DealLog {
  id: string;
  deal_id: string;
  action: string;
  performed_by: string;
  details: Record<string, any>;
  created_at: string;
  actor?: Profile;
}
