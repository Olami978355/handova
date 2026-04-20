# Security Policy

## 1. Data Protection (NIN & PII)
Rent Easy takes the privacy of Nigerian citizens seriously.
- **`profiles_private`**: This table stores sensitive data like National Identification Numbers (NIN). It is protected by strict RLS and is **never** readable by other users, including landlords or agents. Only the user themselves and service-role functions can access this data.
- **Moderator Access**: Moderators can see that a user is "Verified" but cannot see the underlying NIN or documents unless specifically required during an active dispute review.

## 2. Row Level Security (RLS)
The database is not "open." Every query is filtered by the user's authentication context.
- **Read Access**: You cannot "scrape" the database. List queries for messages, deals, and notifications are filtered by `auth.uid()`.
- **Write Access**: Users can only insert or update their own records.

## 3. Payment Security
- **No Card Data**: Rent Easy never stores credit card details. All payments are handled by Paystack (PCIDSS compliant).
- **Escrow Integrity**: Funds are only released through automated state-transitions or verified admin intervention.

## 4. Reporting Vulnerabilities
If you discover a security vulnerability, please do NOT open a GitHub issue. Instead, email us directly:
- **Email**: joinrenteasy@gmail.com

We will respond within 24 hours.
