# Technical Architecture

This document describes the internal structure and design of the Rent Easy platform.

## 1. Database Schema Overview

The database consists of 12+ interconnected tables using PostgreSQL on Supabase:

- **`profiles`**: Public user information (name, role, avatar).
- **`profiles_private`**: Sensitive user data (NIN, Bank Details) - strictly isolated.
- **`properties`**: Real estate listings with geo-coordinates and pricing.
- **`property_saves`**: "Wishlist" functionality for tenants.
- **`conversations`**: Chat metadata between participants.
- **`messages`**: Individual real-time chat messages.
- **`inspection_bookings`**: Manages the flow from fee payment to scheduling.
- **`deals`**: The escrow "Safe Deal" master record.
- **`deal_logs`**: Audit trail for all actions on an escrow deal.
- **`verification_requests`**: Queue for Admin/staff to review NIN/LASRERA submissions.
- **`notifications`**: System and user alerts.
- **`landlord_strikes`**: Penalty system for non-compliant landlords.
- **`admin_logs`**: Internal tracking of administrative actions.

## 2. Security Model (RLS)

Rent Easy uses a "Zero-Trust" database approach with **Row Level Security**:
- **Identity Isolation**: Users can only see private data (like bank details) for themselves.
- **Relational Access**: Messages/Deals can only be read if the `auth.uid()` matches one of the participants.
- **Role-Based Access (RBAC)**: moderators and admins use custom functions (`is_admin()`, `is_moderator_or_admin()`) to access management queues.
- **Integrity Checks**: Foreign keys ensure that a message cannot exist without a valid conversation, and a deal cannot exist without a valid property.

## 3. Edge Functions

Functions are deployed on Supabase/Deno and handle sensitive backend logic:

- **`verify-payment`**: Securely verifies Paystack transaction references.
- **`process-inspection-payment`**: Atomic creation of booking records after payment.
- **`submit-inspection-decision`**: Transitions a booking to "interested" or "declined" and triggers fee splits.
- **`auto-expire-decisions`**: A cron-like function that handles landlords who don't confirm inspections.
- **`resolve-inspection-dispute`**: Allows admins to override and refund/release funds in escrow.

## 4. Payment Flow (Escrow & Inspections)

1. **Inspection Fee**: Paid via Paystack Popup -> Webhook/Function creates `inspection_booking`.
2. **Escrow Start**: Once interested, tenant pays the full Rent/Purchase price.
3. **Holding**: Funds are held in Rent Easy's corporate account (metadata stored in `deals`).
4. **Release**: Funds only moved to Landlord after both parties sign off or 48h after move-in.

## 5. User Roles & Permissions

| Role | Permissions |
| :--- | :--- |
| **Tenant** | Search, Save, Book Inspection, Pay Escrow, Chat, Rate. |
| **Landlord** | Create Listings, Manage Inspections, Manage Deals, Get Verified. |
| **Agent** | Manage multiple listings, Receive commission, LASRERA verification. |
| **Moderator** | Review Listings, Verify Users. |
| **Admin** | Manage Escrows, Resolve Disputes, Issue Strikes, View Audit Logs. |
