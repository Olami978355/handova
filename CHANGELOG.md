# Changelog

All notable changes to the Rent Easy project will be documented in this file.

## [1.0.0] - 2026-04-20

### Added
- **Authentication & Onboarding**:
  - Multi-role based authentication (Tenant, Landlord, Agent).
  - Detailed profile setup including NIN and LASRERA collection.
- **Property Marketplace**:
  - Support for Houses and Land listings.
  - Advanced filtering (Price, Category, Location).
  - Google Maps integration for property location and searching.
- **Escrow Payment System**:
  - Secure "Safe Deal" flow for rent and sales.
  - Auto-release logic after confirmation.
  - Dispute resolution bridge.
- **Inspection Booking**:
  - Paystack integration for inspection fee payment.
  - Real-time scheduling and status updates.
  - Automatic refund logic for failed inspections or non-availability.
- **Messaging & Notifications**:
  - Real-time chat system between participants.
  - Deep linking from property pages to chats.
  - Notification bell for unread messages and system updates.
- **Admin & Moderator Dashboard**:
  - Centralized queue for user verifications.
  - Property moderation tools.
  - Dispute management and strike system for landlords.
- **Security**:
  - 40+ Row Level Security (RLS) policies for strict data isolation.
  - Private data protection for sensitive information (NIN).
- **Automation (Edge Functions)**:
  - `verify-payment`: Validates Paystack transactions.
  - `process-inspection-payment`: Handles backend booking creation.
  - `auto-expire-decisions`: Automatically recovers fees from inactive landlords.
  - `resolve-inspection-dispute`: Admin-driven refund/release logic.
  - `submit-inspection-decision`: Handles tenant post-inspection choices.
