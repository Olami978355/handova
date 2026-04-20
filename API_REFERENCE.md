# API Reference (Supabase Edge Functions)

These endpoints are internal to the Rent Easy platform and are typically called via `supabase.functions.invoke`.

---

## 1. `process-inspection-payment`
Handles the logic after a successful Paystack charge for an inspection.

- **Purpose**: Creates the `inspection_booking` record and triggers notifications.
- **Role Required**: Authenticated User (Tenant).
- **Request Body**:
  ```json
  {
    "reference": "paystack_ref_id",
    "metadata": {
      "property_id": "uuid",
      "tenant_id": "uuid"
    }
  }
  ```
- **Response**: `200 { success: true, bookingId: "uuid" }`

---

## 2. `submit-inspection-decision`
Tenant's final choice after viewing a property.

- **Purpose**: Updates booking status and automatically handles fee refunds/splits.
- **Role Required**: Authenticated User (Owner of the booking).
- **Request Body**:
  ```json
  {
    "bookingId": "uuid",
    "decision": "interested" | "declined",
    "notes": "optional feedback"
  }
  ```
- **Response**: `200 { status: "updated" }`

---

## 3. `auto-expire-decisions`
System maintenance for pending inspections.

- **Purpose**: Automatically refunds tenants if a landlord fails to show up or confirm.
- **Role Required**: Service Role (Scheduled CRON).
- **Request Body**: None (Scans database).
- **Response**: `200 { processed: [ids...] }`

---

## 4. `resolve-inspection-dispute`
Manual admin intervention.

- **Purpose**: Overrides automated logic to perform a partial or full refund.
- **Role Required**: Admin or Moderator.
- **Request Body**:
  ```json
  {
    "bookingId": "uuid",
    "action": "refund_full" | "refund_partial" | "release_to_landlord"
  }
  ```
- **Error Cases**:
  - `403`: Unauthorized.
  - `404`: Booking not found.
  - `400`: Invalid status transition.
