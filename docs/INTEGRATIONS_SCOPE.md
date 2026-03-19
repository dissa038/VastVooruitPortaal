# VastVooruit Platform — Integrations Technical Scope

**Stack**: Next.js 16 + Convex (realtime DB) + Clerk (auth)
**Last updated**: 2026-03-18

---

## Table of Contents

1. [Moneybird (Boekhouding)](#1-moneybird-boekhouding--phase-1)
2. [Microsoft Graph / Outlook](#2-microsoft-graph--outlook--phase-2)
3. [BAG API (Kadaster)](#3-bag-api-basisregistratie-adressen-en-gebouwen--phase-1)
4. [Uniec3 Browser Bot](#4-uniec3-browser-bot--phase-0)
5. [HomeVisuals](#5-homevisuals--phase-2)
6. [Mollie (Payments)](#6-mollie-payment-gateway--phase-2)
7. [EP-online / Raconi](#7-ep-online--raconi--phase-4)

---

## 1. Moneybird (Boekhouding) — Phase 1

### Overview

Moneybird handles all financial administration: invoice creation from orders, payment tracking, debtor management, and automated reminders. The integration is bidirectional — VastVooruit pushes invoices and contacts to Moneybird, Moneybird pushes payment status updates back via webhooks.

### API / Protocol Details

| Property | Value |
|---|---|
| **API Version** | v2 (REST) |
| **Base URL** | `https://moneybird.com/api/v2/{administration_id}/` |
| **Response Format** | JSON (XML also supported, but use JSON) |
| **Authentication** | OAuth 2.0 |
| **Data Flow** | Bidirectional |
| **Sync Strategy** | Event-driven (order events push to Moneybird) + Webhooks (payment status back) |

### Authentication — OAuth 2.0

Moneybird supports two auth methods. For a multi-user platform, use **OAuth 2.0**. For a single-admin backend service, a **Personal Access Token** (Bearer token) suffices and is simpler.

**Recommendation**: Start with a Personal Access Token for Phase 1 (single Moneybird administration owned by VastVooruit). Migrate to OAuth 2.0 only if third-party Moneybird accounts need to connect.

| OAuth Property | Value |
|---|---|
| Authorization URL | `https://moneybird.com/oauth/authorize` |
| Token URL | `https://moneybird.com/oauth/token` |
| Redirect URI | Must match registered app exactly |
| Scopes | `sales_invoices` (covers contacts + invoices), `settings` |
| Token Expiry | Currently does not expire (Moneybird reserves right to change) |
| Refresh Token | Provided; implement refresh flow proactively |
| App Registration | `https://moneybird.com/user/applications/new` |

```typescript
// Authentication header for all requests
const headers = {
  "Authorization": `Bearer ${MONEYBIRD_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
};
```

### Key Endpoints & Operations

#### 1. Contact Management (Company/Contact sync)

```typescript
// Create contact (debtor) — called when new company/contact is created in VastVooruit
POST /api/v2/{admin_id}/contacts.json
{
  "contact": {
    "company_name": "Woningcorporatie Eigen Haard",
    "firstname": "Jan",
    "lastname": "de Vries",
    "email": "jan@eigenhaard.nl",
    "phone": "+31612345678",
    "address1": "Keizersgracht 100",
    "zipcode": "1015 AA",
    "city": "Amsterdam",
    "country": "NL",
    "chamber_of_commerce": "12345678",
    "tax_number": "NL123456789B01",
    "delivery_method": "Email",
    "custom_fields_attributes": {
      "0": {
        "id": "{custom_field_id}",           // Map to VastVooruit company ID
        "value": "VV-COMP-00123"
      }
    }
  }
}

// Search contact by custom field or company name
GET /api/v2/{admin_id}/contacts.json?query=Eigen+Haard

// Update existing contact
PATCH /api/v2/{admin_id}/contacts/{id}.json
```

#### 2. Invoice Creation (from Order)

When an order reaches status `LABEL_OPGELEVERD` or `GEREED_VOOR_FACTURATIE`:

```typescript
// Create sales invoice
POST /api/v2/{admin_id}/sales_invoices.json
{
  "sales_invoice": {
    "contact_id": "481864485014865909",       // Moneybird contact ID (stored in Convex)
    "reference": "VV-ORD-2026-00456",         // VastVooruit order number
    "invoice_date": "2026-03-18",
    "due_date": "2026-04-01",                 // Net 14 days
    "prices_are_incl_tax": false,
    "details_attributes": [
      {
        "description": "Energielabel opname - Keizersgracht 100, Amsterdam",
        "price": "245.00",
        "amount": "1",
        "tax_rate_id": "{21_pct_btw_id}"      // 21% BTW
      },
      {
        "description": "Registratie EP-online",
        "price": "35.00",
        "amount": "1",
        "tax_rate_id": "{21_pct_btw_id}"
      },
      {
        "description": "Meerwerk: extra vertrekken (3x)",
        "price": "75.00",
        "amount": "1",
        "tax_rate_id": "{21_pct_btw_id}"
      }
    ]
  }
}
```

**Tax Rate Handling:**

| Scenario | BTW Rate | Moneybird `tax_rate_id` |
|---|---|---|
| Standard services (opname, registratie, meerwerk) | 21% | Lookup at startup via `GET /tax_rates` |
| Exempt / 0% services (if applicable) | 0% | Lookup at startup via `GET /tax_rates` |

```typescript
// Get available tax rates (cache at startup)
GET /api/v2/{admin_id}/tax_rates.json
// Filter response for "BTW 21%" and "BTW 0%" IDs
```

#### 3. Invoice Sending & Status

```typescript
// Send invoice via email (Moneybird sends from their system)
PATCH /api/v2/{admin_id}/sales_invoices/{id}/send_invoice.json
{
  "sales_invoice_sending": {
    "delivery_method": "Email"
  }
}

// Register manual payment (e.g., bank transfer detected)
PATCH /api/v2/{admin_id}/sales_invoices/{id}/register_a_payment.json
{
  "payment": {
    "payment_date": "2026-03-25",
    "price": "355.00",
    "financial_account_id": "{bank_account_id}"
  }
}

// Create credit note from existing invoice
PATCH /api/v2/{admin_id}/sales_invoices/{id}/duplicate_creditinvoice.json

// Download invoice PDF (returns 302 redirect to temp URL, valid 30s)
GET /api/v2/{admin_id}/sales_invoices/{id}/download_pdf.json
```

#### 4. Webhooks (Payment Status Back-Sync)

```typescript
// Register webhook for sales_invoice state changes
POST /api/v2/{admin_id}/webhooks.json
{
  "webhook": {
    "url": "https://api.vastvooruit.nl/webhooks/moneybird",
    "events": [
      "sales_invoice_state_changed_to_open",
      "sales_invoice_state_changed_to_paid",
      "sales_invoice_state_changed_to_late",
      "sales_invoice_state_changed_to_uncollectible"
    ]
  }
}
```

**Webhook Payload Handling (Convex HTTP Action):**

```typescript
// convex/http.ts — Moneybird webhook handler
import { httpAction } from "./_generated/server";

export const moneybirdWebhook = httpAction(async (ctx, request) => {
  const idempotencyKey = request.headers.get("Idempotency-Key");

  // Deduplicate using idempotency key
  const existing = await ctx.runQuery(internal.webhooks.checkIdempotency, {
    key: idempotencyKey,
  });
  if (existing) {
    return new Response("OK", { status: 200 });
  }

  const body = await request.json();
  const { entity_type, entity_id, state } = body;

  if (entity_type === "SalesInvoice") {
    // Look up order by Moneybird invoice ID
    await ctx.runMutation(internal.orders.updatePaymentStatus, {
      moneybirdInvoiceId: entity_id,
      paymentStatus: mapMoneybirdState(state),
      idempotencyKey,
    });
  }

  // MUST return 200, otherwise Moneybird retries 10 times with backoff
  return new Response("OK", { status: 200 });
});
```

### Rate Limits

| Limit | Value |
|---|---|
| Standard endpoints | 150 requests / 5 minutes (per IP) |
| Report endpoints (`/reports/`) | 50 requests / 5 minutes (per IP) |
| Throttle response | HTTP 429 with `Retry-After` header |
| Response headers | `RateLimit-Remaining`, `RateLimit-Limit`, `RateLimit-Reset` |

### Error Handling & Retry Strategy

| Scenario | Strategy |
|---|---|
| HTTP 429 (Rate Limited) | Respect `Retry-After` header; exponential backoff |
| HTTP 422 (Validation Error) | Log error details, mark order for manual review, do not retry |
| HTTP 401 (Unauthorized) | Refresh token, retry once |
| HTTP 5xx (Server Error) | Retry 3x with exponential backoff (1s, 4s, 16s) |
| Webhook delivery failure | Moneybird retries 10x with increasing intervals automatically |
| Network timeout | Retry 3x with 10s timeout per request |

### Data Model (Convex Side)

```typescript
// Store Moneybird mapping in orders table
orders: defineTable({
  // ... other fields
  moneybirdContactId: v.optional(v.string()),
  moneybirdInvoiceId: v.optional(v.string()),
  moneybirdInvoiceState: v.optional(v.string()),  // draft|open|paid|late|uncollectible
  moneybirdInvoiceUrl: v.optional(v.string()),     // Public view URL
  invoiceSentAt: v.optional(v.number()),
  paymentReceivedAt: v.optional(v.number()),
}),

// Store sync metadata
moneybirdSyncLog: defineTable({
  entityType: v.string(),        // "contact" | "sales_invoice"
  entityId: v.string(),          // VastVooruit ID
  moneybirdId: v.string(),       // Moneybird ID
  action: v.string(),            // "create" | "update" | "webhook"
  status: v.string(),            // "success" | "failed" | "pending"
  errorMessage: v.optional(v.string()),
  createdAt: v.number(),
}),
```

### Implementation Checklist

- [ ] Register Moneybird API application, obtain access token
- [ ] Fetch and cache tax rate IDs (21% BTW, 0% BTW) and ledger account IDs
- [ ] Implement contact create/update sync (VastVooruit -> Moneybird)
- [ ] Implement invoice creation from order line items + cost mutations
- [ ] Implement invoice sending (email via Moneybird)
- [ ] Set up webhook endpoint on Convex HTTP actions
- [ ] Implement payment status back-sync (Moneybird -> VastVooruit order status)
- [ ] Implement credit note creation
- [ ] Add PDF download and store in order attachments
- [ ] Test with Moneybird sandbox environment

---

## 2. Microsoft Graph / Outlook — Phase 2

### Overview

Each EP-adviseur connects their `@vastvooruit.nl` Outlook/Microsoft 365 account. The platform reads their calendar availability, creates appointments for opnames, and sends transactional emails from their account. Calendar changes in Outlook sync back to the platform via webhook subscriptions.

### API / Protocol Details

| Property | Value |
|---|---|
| **API Version** | Microsoft Graph REST API v1.0 |
| **Base URL** | `https://graph.microsoft.com/v1.0/` |
| **Response Format** | JSON |
| **Authentication** | OAuth 2.0 with delegated permissions (per-user consent) |
| **Data Flow** | Bidirectional |
| **Sync Strategy** | Webhook subscriptions + polling fallback (cron every 2 min) |

### Authentication — OAuth 2.0 (Delegated Flow)

Each EP-adviseur must consent to the app accessing their calendar and mail. This requires a **multi-tenant Azure AD App Registration** with delegated permissions.

| OAuth Property | Value |
|---|---|
| Authorization URL | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` |
| Token URL | `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` |
| Tenant | `organizations` (multi-tenant work accounts) |
| Redirect URI | `https://app.vastvooruit.nl/api/auth/microsoft/callback` |
| Access Token Lifetime | ~60-90 minutes |
| Refresh Token Lifetime | Up to 90 days (rolling) |

**Required Delegated Permission Scopes:**

| Scope | Purpose |
|---|---|
| `Calendars.ReadWrite` | Read availability, create/update/delete appointments |
| `Mail.Send` | Send confirmation & delivery emails from adviseur's account |
| `User.Read` | Read adviseur's profile info |
| `offline_access` | Obtain refresh tokens for background sync |

```typescript
// Azure AD App Registration scopes
const SCOPES = [
  "Calendars.ReadWrite",
  "Mail.Send",
  "User.Read",
  "offline_access",
];

// OAuth consent redirect (triggered from adviseur settings page)
const authUrl = `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?` +
  `client_id=${AZURE_CLIENT_ID}` +
  `&response_type=code` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPES.join(" "))}` +
  `&state=${encodeURIComponent(adviseurId)}` +
  `&prompt=consent`;
```

**Token Storage (Convex):** Store encrypted refresh tokens per adviseur. Use Convex `internal` mutations so tokens are never exposed to the client.

```typescript
// Schema for storing Microsoft tokens
adviseurMicrosoftAuth: defineTable({
  adviseurId: v.id("users"),
  microsoftUserId: v.string(),          // Microsoft user object ID
  email: v.string(),                     // user@vastvooruit.nl
  encryptedRefreshToken: v.string(),     // AES-256 encrypted
  tokenExpiresAt: v.number(),            // Access token expiry timestamp
  subscriptionId: v.optional(v.string()),        // Graph webhook subscription ID
  subscriptionExpiresAt: v.optional(v.number()), // Subscription expiry
  lastSyncAt: v.optional(v.number()),
  status: v.string(),                   // "active" | "expired" | "revoked"
}),
```

### Key Endpoints & Operations

#### 1. Read Calendar Availability

```typescript
// Get calendar view (expanded recurring events) for a date range
GET /users/{userId}/calendarView
  ?startDateTime=2026-03-18T00:00:00Z
  &endDateTime=2026-03-25T23:59:59Z
  &$select=subject,start,end,location,showAs,isAllDay
  &$orderby=start/dateTime
  &$top=100

Headers:
  Authorization: Bearer {access_token}
  Prefer: outlook.timezone="Europe/Amsterdam"
```

Use `calendarView` (not `/events`) to correctly expand recurring events into individual instances.

#### 2. Create Appointment (Opname Inplannen)

```typescript
// Create calendar event for EP-adviseur
POST /users/{userId}/events
{
  "subject": "Energielabel opname - Keizersgracht 100, Amsterdam",
  "body": {
    "contentType": "HTML",
    "content": "<h3>Opname details</h3><p>Order: VV-ORD-2026-00456</p><p>Bewoner: Mevr. Jansen (06-12345678)</p><p>Type: Bestaande bouw, eengezinswoning</p><p><a href='https://app.vastvooruit.nl/orders/abc123'>Open in VastVooruit</a></p>"
  },
  "start": {
    "dateTime": "2026-03-20T09:00:00",
    "timeZone": "Europe/Amsterdam"
  },
  "end": {
    "dateTime": "2026-03-20T10:00:00",
    "timeZone": "Europe/Amsterdam"
  },
  "location": {
    "displayName": "Keizersgracht 100, 1015 AA Amsterdam",
    "address": {
      "street": "Keizersgracht 100",
      "city": "Amsterdam",
      "postalCode": "1015 AA",
      "countryOrRegion": "NL"
    }
  },
  "isReminderOn": true,
  "reminderMinutesBeforeStart": 60,
  "showAs": "busy",
  "categories": ["VastVooruit Opname"]
}
```

**Apple CarPlay compatibility**: The `location.address` fields ensure the address appears in iOS/CarPlay navigation prompts. The `displayName` field is what CarPlay shows. Always include full street + city + postal code.

#### 3. Update / Cancel Appointment

```typescript
// Update event (e.g., reschedule)
PATCH /users/{userId}/events/{eventId}
{
  "start": { "dateTime": "2026-03-21T14:00:00", "timeZone": "Europe/Amsterdam" },
  "end": { "dateTime": "2026-03-21T15:00:00", "timeZone": "Europe/Amsterdam" }
}

// Cancel event
DELETE /users/{userId}/events/{eventId}
```

#### 4. Send Email (Confirmation / Label Delivery)

```typescript
// Send confirmation email from adviseur's account
POST /users/{userId}/sendMail
{
  "message": {
    "subject": "Bevestiging energielabel opname - Keizersgracht 100",
    "body": {
      "contentType": "HTML",
      "content": "<p>Geachte heer/mevrouw Jansen,</p><p>Hierbij bevestigen wij uw afspraak voor de energielabel opname op <strong>20 maart 2026 om 09:00</strong>.</p><p>Adres: Keizersgracht 100, Amsterdam</p><p>Met vriendelijke groet,<br/>Pieter Bakker<br/>EP-adviseur VastVooruit</p>"
    },
    "toRecipients": [
      { "emailAddress": { "address": "jansen@gmail.com" } }
    ]
  },
  "saveToSentItems": true
}

// Send label delivery email with PDF attachment
POST /users/{userId}/sendMail
{
  "message": {
    "subject": "Uw energielabel - Keizersgracht 100, Amsterdam",
    "body": {
      "contentType": "HTML",
      "content": "..."
    },
    "toRecipients": [
      { "emailAddress": { "address": "opdrachtgever@eigenhaard.nl" } }
    ],
    "attachments": [
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        "name": "Energielabel_Keizersgracht100_Amsterdam.pdf",
        "contentType": "application/pdf",
        "contentBytes": "{base64_encoded_pdf}"
      }
    ]
  },
  "saveToSentItems": true
}
```

#### 5. Webhook Subscriptions (Calendar Change Notifications)

```typescript
// Create subscription for calendar changes
POST /subscriptions
{
  "changeType": "created,updated,deleted",
  "notificationUrl": "https://api.vastvooruit.nl/webhooks/microsoft-graph",
  "resource": "users/{userId}/events",
  "expirationDateTime": "2026-03-21T18:23:45.9356913Z",  // Max ~3 days for calendar
  "clientState": "vastvooruit-calendar-secret-{adviseurId}",
  "latestSupportedTlsVersion": "v1_2"
}

// Renew subscription before expiry (cron job every 2 days)
PATCH /subscriptions/{subscriptionId}
{
  "expirationDateTime": "2026-03-24T18:23:45.9356913Z"
}
```

**Subscription Limits:**

| Resource | Max Expiration | Action |
|---|---|---|
| Calendar events | ~4230 minutes (~3 days) | Cron renewal every 2 days |
| Mail messages | ~4230 minutes (~3 days) | Only subscribe if needed |

**Webhook Handler:**

```typescript
// convex/http.ts — Microsoft Graph webhook handler
export const microsoftGraphWebhook = httpAction(async (ctx, request) => {
  const url = new URL(request.url);

  // Validation request — Graph sends this on subscription creation
  const validationToken = url.searchParams.get("validationToken");
  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const body = await request.json();
  const { value: notifications } = body;

  for (const notification of notifications) {
    // Verify clientState matches
    if (!notification.clientState?.startsWith("vastvooruit-calendar-secret-")) {
      continue;
    }

    const adviseurId = notification.clientState.replace("vastvooruit-calendar-secret-", "");

    await ctx.runMutation(internal.calendar.handleGraphNotification, {
      adviseurId,
      changeType: notification.changeType,
      resourceId: notification.resourceData?.id,
      subscriptionId: notification.subscriptionId,
    });
  }

  return new Response("", { status: 202 });
});
```

#### 6. Bulk Operations (Corporatie Planning)

For scheduling 100+ appointments at once (corporatie bulk planning), use **JSON batching**:

```typescript
// Batch up to 20 requests per call
POST /$batch
{
  "requests": [
    {
      "id": "1",
      "method": "POST",
      "url": "/users/{userId}/events",
      "headers": { "Content-Type": "application/json" },
      "body": { /* event 1 */ }
    },
    {
      "id": "2",
      "method": "POST",
      "url": "/users/{userId}/events",
      "headers": { "Content-Type": "application/json" },
      "body": { /* event 2 */ }
    }
    // ... up to 20 per batch
  ]
}
```

For 100 appointments: 5 batch requests of 20. Add 1-second delay between batches to respect throttling.

### Rate Limits

| Limit | Value |
|---|---|
| Per-app per-user | ~10,000 requests / 10 minutes |
| Per-app across all tenants | ~130,000 requests / 10 seconds |
| Batch request | Max 20 requests per batch |
| Throttle response | HTTP 429 with `Retry-After` header |
| Calendar subscriptions | Max ~3 days before renewal needed |

**Note (from Sept 2025 onward):** Per-app/per-user limit is capped at half the per-tenant limit. This is generous for VastVooruit's use case (5-10 adviseurs).

### Error Handling & Retry Strategy

| Scenario | Strategy |
|---|---|
| HTTP 429 (Throttled) | Respect `Retry-After` header; exponential backoff |
| HTTP 401 (Token Expired) | Refresh token, retry once. If refresh fails, mark adviseur auth as `expired`, notify admin |
| HTTP 403 (Consent Revoked) | Mark adviseur auth as `revoked`, prompt re-consent |
| HTTP 404 (Event Deleted in Outlook) | Sync deletion to VastVooruit, update order status |
| Subscription Expiry Missed | Polling fallback cron every 2 min catches missed changes |
| Network timeout | Retry 3x with 15s timeout |

### Polling Fallback (Cron)

If webhook subscription fails or expires, a Convex cron job polls every 2 minutes using **delta queries**:

```typescript
// convex/crons.ts
crons.interval("sync-calendars-fallback", { minutes: 2 }, internal.calendar.pollAllAdviseurs);

// Uses delta query to get only changes since last sync
GET /users/{userId}/calendarView/delta
  ?$select=subject,start,end,location,showAs
```

### Implementation Checklist

- [ ] Register Azure AD multi-tenant app with required scopes
- [ ] Build OAuth consent flow in adviseur settings page (Clerk + Microsoft)
- [ ] Implement secure token storage (encrypted refresh tokens in Convex)
- [ ] Build calendar availability reader (calendarView endpoint)
- [ ] Build appointment CRUD (create/update/delete events)
- [ ] Build email sender (sendMail with HTML templates + attachments)
- [ ] Set up webhook subscriptions per adviseur
- [ ] Build subscription renewal cron (every 2 days)
- [ ] Build polling fallback cron (every 2 min)
- [ ] Build batch appointment creator for corporatie planning
- [ ] Test with @vastvooruit.nl Microsoft 365 accounts

---

## 3. BAG API (Basisregistratie Adressen en Gebouwen) — Phase 1

### Overview

The BAG API provides official Dutch address and building data from Kadaster. Used for address validation (postcode + huisnummer lookup), auto-populating address fields, and retrieving bouwjaar (construction year) to determine the nieuwbouw vs. bestaande bouw flow.

### API / Protocol Details

| Property | Value |
|---|---|
| **API Version** | LVBAG Individuele Bevragingen v2 |
| **Base URL (Production)** | `https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2` |
| **Base URL (Test)** | `https://api.bag.acceptatie.kadaster.nl/lvbag/individuelebevragingen/v2` |
| **Response Format** | `application/hal+json` |
| **Authentication** | API Key (header: `X-Api-Key`) |
| **Data Flow** | One-way (BAG -> VastVooruit) |
| **Sync Strategy** | On-demand (user types postcode + huisnummer) |
| **Cost** | Free |

### Authentication

```typescript
const BAG_API_KEY = process.env.BAG_API_KEY; // Obtained via Kadaster registration form

const headers = {
  "X-Api-Key": BAG_API_KEY,
  "Accept": "application/hal+json",
  "Accept-Crs": "epsg:28992",  // Required for geometry data (Rijksdriehoekscoordinaten)
};
```

**API Key Registration**: Request via [Kadaster API key request form](https://formulieren.kadaster.nl/aanvraag_bag_api_individuele_bevragingen_702).

### Key Endpoints & Operations

#### 1. Address Lookup (Postcode + Huisnummer)

Primary use case: user enters postcode and house number, system returns full address + building data.

```typescript
// Step 1: Look up address by postcode + huisnummer
GET /adressenuitgebreid
  ?postcode=1015AA
  &huisnummer=100
  &exacteMatch=true

// Response (application/hal+json):
{
  "_embedded": {
    "adressen": [
      {
        "openbareRuimteNaam": "Keizersgracht",
        "huisnummer": 100,
        "huisletter": null,
        "huisnummertoevoeging": null,
        "postcode": "1015AA",
        "woonplaatsNaam": "Amsterdam",
        "adresseerbaarObjectIdentificatie": "0363010000123456",
        "pandIdentificaties": ["0363100012345678"],
        "oorspronkelijkBouwjaar": ["1892"],        // Construction year!
        "oppervlakte": 145,                         // m²
        "gebruiksdoelen": ["woonfunctie"],
        "status": "Verblijfsobject in gebruik"
      }
    ]
  }
}
```

The `/adressenuitgebreid` endpoint is the most useful — it combines address, verblijfsobject, and pand data in a single call.

#### 2. Address Search with Huisletter/Toevoeging

For apartments and split addresses:

```typescript
// Address with huisletter
GET /adressenuitgebreid?postcode=1015AA&huisnummer=100&huisletter=A&exacteMatch=true

// Address with toevoeging (e.g., "100-1", "100-2")
GET /adressenuitgebreid?postcode=1015AA&huisnummer=100&huisnummertoevoeging=1&exacteMatch=true

// List all addresses at a huisnummer (for showing picker to user)
GET /adressenuitgebreid?postcode=1015AA&huisnummer=100&exacteMatch=false
```

#### 3. Get Pand (Building) Details

If additional building data is needed beyond what `/adressenuitgebreid` returns:

```typescript
// Get pand (building) by ID
GET /panden/{pandIdentificatie}

// Response includes:
{
  "pand": {
    "identificatie": "0363100012345678",
    "oorspronkelijkBouwjaar": "1892",
    "status": "Pand in gebruik",
    "geometrie": { /* RD coordinates polygon */ }
  }
}
```

#### 4. Get Verblijfsobject Details

```typescript
// Get verblijfsobject (residential unit) by ID
GET /verblijfsobjecten/{verblijfsobjectIdentificatie}

// Response includes oppervlakte, gebruiksdoelen, status, pandIdentificaties
```

### Business Logic: Bouwjaar Decision Tree

```typescript
function determineBuildingFlow(bouwjaar: number): "nieuwbouw" | "bestaande_bouw" {
  // Nieuwbouw: built in 2021 or later (per NTA 8800 methodology)
  if (bouwjaar >= 2021) return "nieuwbouw";
  return "bestaande_bouw";
}
```

### Caching Strategy

Addresses and buildings rarely change. Cache aggressively.

```typescript
// Convex table for BAG cache
bagCache: defineTable({
  postcode: v.string(),
  huisnummer: v.number(),
  huisletter: v.optional(v.string()),
  huisnummertoevoeging: v.optional(v.string()),
  response: v.string(),          // Full JSON response, stringified
  cachedAt: v.number(),
}).index("by_address", ["postcode", "huisnummer", "huisletter", "huisnummertoevoeging"]),

// Cache TTL: 30 days (addresses are very stable)
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
```

### Query Parameters Reference

| Parameter | Pattern | Description |
|---|---|---|
| `postcode` | `^[1-9]{1}[0-9]{3}[a-zA-Z]{2}$` | Dutch postcode (no space) |
| `huisnummer` | `1-99999` | House number |
| `huisletter` | `^[a-zA-Z]{1}$` | Optional letter suffix |
| `huisnummertoevoeging` | `^[0-9a-zA-Z]{1,4}$` | Optional addition |
| `exacteMatch` | `true/false` | Exact match vs. fuzzy |
| `page` | `>= 1` | Pagination (default: 1) |
| `pageSize` | `10-100` | Results per page (default: 20) |

### Rate Limits

| Limit | Value |
|---|---|
| Cost | Free |
| Rate | Not explicitly documented; fair-use policy |
| Recommendation | Max 10 requests/second to be safe |
| Pagination | Default 20 results, max 100 per page |
| Geometry bbox search | Max 250,000 m² area |

### Error Handling

| Scenario | Strategy |
|---|---|
| HTTP 400 (Invalid postcode format) | Client-side validation before API call |
| HTTP 404 (Address not found) | Show user "Adres niet gevonden" message |
| HTTP 401 (Invalid API key) | Alert admin, check env vars |
| HTTP 5xx (Kadaster down) | Retry 2x, then allow manual address entry |
| No results | Allow user to manually enter address fields |

### Implementation — Next.js Server Action

```typescript
// app/actions/bag.ts
"use server";

export async function lookupAddress(postcode: string, huisnummer: number) {
  // Validate postcode format client-side first
  const cleanPostcode = postcode.replace(/\s/g, "").toUpperCase();

  // Check cache first (Convex query)
  const cached = await fetchQuery(api.bag.getCachedAddress, {
    postcode: cleanPostcode,
    huisnummer,
  });
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return JSON.parse(cached.response);
  }

  // Call BAG API
  const response = await fetch(
    `https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/adressenuitgebreid` +
    `?postcode=${cleanPostcode}&huisnummer=${huisnummer}&exacteMatch=true`,
    { headers: { "X-Api-Key": process.env.BAG_API_KEY!, "Accept": "application/hal+json" } }
  );

  if (!response.ok) {
    if (response.status === 404) return { addresses: [] };
    throw new Error(`BAG API error: ${response.status}`);
  }

  const data = await response.json();

  // Cache result
  await fetchMutation(api.bag.cacheAddress, {
    postcode: cleanPostcode,
    huisnummer,
    response: JSON.stringify(data),
  });

  return data;
}
```

### Implementation Checklist

- [ ] Request BAG API key from Kadaster
- [ ] Build postcode + huisnummer lookup server action
- [ ] Build address picker UI (handle multiple results for apartments)
- [ ] Implement bouwjaar-based flow decision (nieuwbouw vs bestaande bouw)
- [ ] Auto-populate all address fields from BAG response
- [ ] Store BAG identifiers (verblijfsobjectId, pandId) in order data
- [ ] Implement caching layer with 30-day TTL
- [ ] Handle edge cases: houseboats (ligplaats), caravans (standplaats)
- [ ] Add manual address entry fallback when BAG returns no results

---

## 4. Uniec3 Browser Bot — Phase 0

### Overview

The Uniec3 browser bot automates data entry of ~300 parameters from the digitized opnameformulier into the Uniec3 web-based calculation software. This is the most technically challenging integration due to browser automation, 2FA session management, and the need for humanized interaction speed.

### Architecture

| Property | Value |
|---|---|
| **Technology** | Playwright (preferred over Puppeteer for better stability) |
| **Runtime** | Docker container on Fly.io OR local machine |
| **Trigger** | Convex scheduled action (cron at 18:00) or manual trigger |
| **Communication** | Convex action triggers bot via HTTP → bot reports progress back to Convex |
| **Browser** | Chromium (headful or headless depending on 2FA needs) |

### High-Level Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ VastVooruit  │────>│ Convex Cron  │────>│ Bot Worker   │────>│ Uniec3 Web   │
│ Order ready  │     │ (18:00)      │     │ (Fly.io)     │     │ Interface    │
│ for Uniec3   │     │              │     │              │     │              │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                               │                      │
                                               │  Fill ~300 fields    │
                                               │  Save calculation    │
                                               │◄─────────────────────┘
                                               │
                                               ▼
                                    ┌──────────────────┐
                                    │ Report status     │
                                    │ back to Convex    │
                                    │ (success/fail)    │
                                    └──────────────────┘
```

### 2FA / Session Management

Uniec3 requires SMS-based 2FA per EP-adviseur account. Strategy:

```typescript
// Session management approach
interface Uniec3Session {
  adviseurId: string;
  cookies: string;             // Serialized browser cookies
  sessionValidUntil: number;   // Timestamp when session expires
  lastActivity: number;
}

// Strategy:
// 1. First login: Adviseur manually logs in + completes 2FA via browser UI
// 2. Export cookies after successful login
// 3. Inject cookies for subsequent automated sessions
// 4. If session expires: queue for manual 2FA re-auth (notify adviseur via Slack/email)
// 5. Monitor for 2FA challenge during automated runs; if triggered, pause & notify
```

### Bot Worker Architecture (Fly.io Docker)

```dockerfile
# Dockerfile for Uniec3 bot worker
FROM mcr.microsoft.com/playwright:v1.48.0-noble

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

# Store persistent browser data (cookies, sessions)
VOLUME /app/browser-data

ENV CONVEX_URL=https://your-deployment.convex.cloud
ENV NODE_ENV=production

CMD ["node", "dist/worker.js"]
```

### Field Mapping Strategy

The opnameformulier data (structured JSON in Convex) maps to Uniec3 form fields:

```typescript
// Mapping structure: opnameformulier field -> Uniec3 CSS selector + value
interface FieldMapping {
  sourceField: string;           // Path in opnameformulier JSON
  uniec3Selector: string;        // CSS selector in Uniec3 web UI
  uniec3InputType: "text" | "select" | "checkbox" | "radio";
  transform?: (value: any) => string;  // Value transformation if needed
  section: string;               // Uniec3 section/tab name
  required: boolean;
}

// Example mappings
const FIELD_MAPPINGS: FieldMapping[] = [
  {
    sourceField: "algemeen.bouwjaar",
    uniec3Selector: "#bouwjaar-input",
    uniec3InputType: "text",
    section: "Algemeen",
    required: true,
  },
  {
    sourceField: "schil.geveltype",
    uniec3Selector: "#geveltype-select",
    uniec3InputType: "select",
    transform: (v) => GEVELTYPE_MAP[v],    // Map VastVooruit values to Uniec3 options
    section: "Schil",
    required: true,
  },
  // ... ~300 more mappings
];
```

### Humanized Interaction

To avoid detection and ensure stability:

```typescript
// Humanized typing and interaction
async function humanType(page: Page, selector: string, text: string) {
  await page.click(selector);
  await randomDelay(100, 300);       // Random delay before typing

  for (const char of text) {
    await page.keyboard.type(char, { delay: randomInt(50, 150) });
  }

  await randomDelay(200, 500);       // Pause after typing
}

async function humanClick(page: Page, selector: string) {
  const element = await page.$(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);

  // Move mouse to element with realistic curve
  await element.hover();
  await randomDelay(100, 300);
  await element.click();
  await randomDelay(300, 800);       // Wait after click for UI to update
}

function randomDelay(min: number, max: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, randomInt(min, max)));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
```

### Execution Flow per Order

```typescript
async function processOrder(orderId: string, page: Page) {
  const order = await convex.query(api.orders.getForBot, { orderId });
  const formData = order.opnameformulier;

  // Update status
  await convex.mutation(api.orders.updateBotStatus, {
    orderId,
    status: "BOT_BEZIG",
    startedAt: Date.now(),
  });

  try {
    // Navigate to new calculation
    await page.goto("https://uniec3.nl/calculation/new");
    await page.waitForLoadState("networkidle");

    // Fill fields section by section
    for (const section of SECTIONS) {
      await navigateToSection(page, section);
      const sectionMappings = FIELD_MAPPINGS.filter(m => m.section === section);

      for (const mapping of sectionMappings) {
        const value = getNestedValue(formData, mapping.sourceField);
        if (!value && mapping.required) {
          throw new Error(`Missing required field: ${mapping.sourceField}`);
        }
        if (value) {
          await fillField(page, mapping, value);
        }
      }

      // Screenshot after each section for audit trail
      await page.screenshot({
        path: `/tmp/screenshots/${orderId}_${section}.png`,
        fullPage: true,
      });
    }

    // Save calculation
    await humanClick(page, "#save-calculation-btn");
    await page.waitForNavigation();

    // Capture calculation result/ID
    const calcId = await page.$eval("#calculation-id", el => el.textContent);

    await convex.mutation(api.orders.updateBotStatus, {
      orderId,
      status: "BOT_KLAAR",
      uniec3CalculationId: calcId,
      completedAt: Date.now(),
    });

  } catch (error) {
    // Screenshot on failure
    await page.screenshot({
      path: `/tmp/screenshots/${orderId}_ERROR.png`,
      fullPage: true,
    });

    await convex.mutation(api.orders.updateBotStatus, {
      orderId,
      status: "BOT_FOUT",
      errorMessage: error.message,
      errorScreenshot: await uploadScreenshot(`${orderId}_ERROR.png`),
    });
  }
}
```

### Scheduling

```typescript
// Convex cron: trigger bot runs at 18:00 (after office hours)
// convex/crons.ts
crons.cron("uniec3-bot-nightly", "0 18 * * 1-5", internal.bot.triggerNightlyRun);

// internal.bot.triggerNightlyRun:
// 1. Query orders with status "GEREED_VOOR_UNIEC3"
// 2. Send batch to bot worker via HTTP POST
// 3. Bot processes sequentially (one at a time to avoid session conflicts)
// 4. Each order takes ~5-15 minutes
// 5. Total capacity: ~30-50 orders per night (18:00-06:00)
```

### Logging & Audit Trail

Every bot action must be logged:

```typescript
botActionLog: defineTable({
  orderId: v.id("orders"),
  action: v.string(),           // "navigate" | "fill_field" | "click" | "screenshot" | "save"
  selector: v.optional(v.string()),
  value: v.optional(v.string()),
  section: v.optional(v.string()),
  success: v.boolean(),
  errorMessage: v.optional(v.string()),
  screenshotUrl: v.optional(v.string()),
  timestamp: v.number(),
  durationMs: v.number(),
}).index("by_order", ["orderId"]),
```

### Error Handling

| Scenario | Status | Action |
|---|---|---|
| Field not found on page | `BOT_FOUT` | Screenshot + skip to next order |
| Session expired (2FA needed) | `BOT_WACHT_2FA` | Notify adviseur, pause queue |
| Uniec3 down / unreachable | `BOT_FOUT` | Retry next night |
| Unexpected popup / modal | `BOT_FOUT` | Screenshot + attempt to dismiss, retry field |
| Calculation save failed | `BOT_FOUT` | Screenshot + manual review |
| Missing required form data | `BOT_FOUT` | Log which fields are missing, notify backoffice |
| All fields filled successfully | `BOT_KLAAR` | Mark order for human review |

### Scope Limitations (Phase 0)

- **Only standard woningen** (basismethode). Complex geometry sections (variabele geometrie) deferred.
- **One adviseur account at a time** per bot instance.
- **Sequential processing** (no parallel Uniec3 sessions).
- **Human review mandatory** — bot output must always be reviewed next morning.

### Implementation Checklist

- [ ] Set up Playwright project with Docker container
- [ ] Map first 50 most common fields (MVP field set)
- [ ] Build session/cookie management for 2FA
- [ ] Implement humanized typing/clicking
- [ ] Build screenshot-per-section audit trail
- [ ] Build Convex integration (status updates, logging)
- [ ] Deploy to Fly.io with persistent volume for browser data
- [ ] Build backoffice UI for bot status monitoring
- [ ] Test with 5 real orders (manual supervision)
- [ ] Expand field mappings to full ~300 fields
- [ ] Build nightly cron trigger

---

## 5. HomeVisuals — Phase 2

### Overview

HomeVisuals is a makelaar platform that sends orders for energy labels. Integration type is TBD pending HomeVisuals technical documentation. Three possible approaches, in order of preference:

### Option A: Webhook / API Integration (Preferred)

If HomeVisuals exposes an API or can send webhooks:

```typescript
// Webhook receiver (Convex HTTP action)
export const homevisualsWebhook = httpAction(async (ctx, request) => {
  // Verify signature/API key
  const apiKey = request.headers.get("X-HomeVisuals-Key");
  if (apiKey !== process.env.HOMEVISUALS_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { address, makelaar, service, preferredDate, referenceId } = body;

  // Create order in VastVooruit
  await ctx.runMutation(internal.orders.createFromHomeVisuals, {
    source: "homevisuals",
    externalReferenceId: referenceId,
    address: {
      street: address.street,
      houseNumber: address.houseNumber,
      postcode: address.postcode,
      city: address.city,
    },
    makelaar: {
      name: makelaar.name,
      email: makelaar.email,
      phone: makelaar.phone,
      company: makelaar.company,
    },
    requestedService: service,
    preferredDate: preferredDate,
    status: "NIEUW_HOMEVISUALS",
  });

  return new Response("OK", { status: 200 });
});
```

### Option B: Email Parsing (Fallback)

If HomeVisuals only sends order notifications via email:

```typescript
// Architecture:
// 1. Dedicated email: homevisuals@vastvooruit.nl
// 2. Microsoft Graph subscription on inbox
// 3. Parse incoming emails with structured data extraction
// 4. Create orders from parsed data

// Email parsing with regex patterns for HomeVisuals email format
function parseHomeVisualsEmail(body: string): Partial<Order> {
  // Extract structured data from HomeVisuals email template
  const address = body.match(/Adres:\s*(.+)/i)?.[1];
  const makelaar = body.match(/Makelaar:\s*(.+)/i)?.[1];
  const service = body.match(/Dienst:\s*(.+)/i)?.[1];
  // ... etc
  return { address, makelaar, service };
}
```

### Option C: Manual CSV Import (Simplest)

If no automation is possible initially:

```typescript
// Admin UI: upload HomeVisuals export CSV
// Parse and create orders in batch
// Migrate to Option A or B when HomeVisuals integration is available
```

### Implementation Checklist

- [ ] Contact HomeVisuals to determine available integration options
- [ ] If API available: implement webhook receiver
- [ ] If email only: implement email parsing via Microsoft Graph
- [ ] If neither: build CSV import as stopgap
- [ ] Build order mapping (HomeVisuals fields -> VastVooruit order schema)
- [ ] Add "HomeVisuals" as order source in the system
- [ ] Build status feedback to HomeVisuals (if they support it)

---

## 6. Mollie (Payment Gateway) — Phase 2

### Overview

Mollie generates payment links for orders under a certain threshold (e.g., <EUR 1,000 for particuliere klanten). Once paid, the system automatically releases the energy label to the client. Larger orders (corporaties) go through invoice-based payment via Moneybird.

### API / Protocol Details

| Property | Value |
|---|---|
| **API Version** | Mollie API v2 |
| **Base URL** | `https://api.mollie.com/v2/` |
| **Response Format** | JSON |
| **Authentication** | API Key (Bearer token) |
| **Data Flow** | Bidirectional (create payment -> webhook confirms) |
| **Sync Strategy** | On-demand (create) + Webhook (status updates) |

### Authentication

```typescript
// Two API keys: test + live
const MOLLIE_API_KEY = process.env.NODE_ENV === "production"
  ? process.env.MOLLIE_LIVE_API_KEY    // live_xxxxxxxxxx
  : process.env.MOLLIE_TEST_API_KEY;   // test_xxxxxxxxxx

const headers = {
  "Authorization": `Bearer ${MOLLIE_API_KEY}`,
  "Content-Type": "application/json",
};
```

### Key Endpoints & Operations

#### 1. Create Payment Link

For orders that need a payment link (sent via email to client):

```typescript
// Create payment link
POST https://api.mollie.com/v2/payment-links
{
  "amount": {
    "currency": "EUR",
    "value": "355.00"                    // Always string with 2 decimals
  },
  "description": "Energielabel Keizersgracht 100 - VV-ORD-2026-00456",
  "redirectUrl": "https://app.vastvooruit.nl/betaling/bedankt?order=abc123",
  "webhookUrl": "https://api.vastvooruit.nl/webhooks/mollie",
  "metadata": {
    "orderId": "abc123",
    "orderNumber": "VV-ORD-2026-00456"
  }
}

// Response:
{
  "resource": "payment-link",
  "id": "pl_4Y0eZitmBnQ6IDoMqZQKh",
  "_links": {
    "paymentLink": {
      "href": "https://paymentlink.mollie.com/payment/4Y0eZitmBnQ6IDoMqZQKh/",
      "type": "text/html"
    }
  }
}
```

#### 2. Create Direct Payment (Alternative)

If the user is already on the platform and can be redirected:

```typescript
// Create payment (redirects user to Mollie checkout)
POST https://api.mollie.com/v2/payments
{
  "amount": {
    "currency": "EUR",
    "value": "355.00"
  },
  "description": "Energielabel Keizersgracht 100 - VV-ORD-2026-00456",
  "redirectUrl": "https://app.vastvooruit.nl/betaling/bedankt?order=abc123",
  "cancelUrl": "https://app.vastvooruit.nl/betaling/geannuleerd?order=abc123",
  "webhookUrl": "https://api.vastvooruit.nl/webhooks/mollie",
  "method": ["ideal", "bancontact", "creditcard", "banktransfer"],
  "locale": "nl_NL",
  "metadata": {
    "orderId": "abc123",
    "orderNumber": "VV-ORD-2026-00456"
  }
}

// Response includes _links.checkout.href — redirect user there
```

#### 3. Webhook Handler (Payment Status)

```typescript
// convex/http.ts — Mollie webhook handler
export const mollieWebhook = httpAction(async (ctx, request) => {
  // Mollie sends POST with form-encoded body: id=tr_xxxxxxxx
  const formData = await request.formData();
  const paymentId = formData.get("id") as string;

  if (!paymentId) {
    return new Response("Missing payment ID", { status: 400 });
  }

  // Fetch payment details from Mollie (webhook only sends ID, not status)
  const payment = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
    headers: { "Authorization": `Bearer ${process.env.MOLLIE_LIVE_API_KEY}` },
  }).then(r => r.json());

  const orderId = payment.metadata?.orderId;
  if (!orderId) {
    return new Response("No order ID in metadata", { status: 400 });
  }

  // Update order based on payment status
  switch (payment.status) {
    case "paid":
      await ctx.runMutation(internal.orders.markAsPaid, {
        orderId,
        molliePaymentId: paymentId,
        paidAt: Date.now(),
      });
      // Trigger label release workflow
      await ctx.runMutation(internal.orders.releaseLabel, { orderId });
      break;

    case "failed":
    case "canceled":
    case "expired":
      await ctx.runMutation(internal.orders.updatePaymentStatus, {
        orderId,
        paymentStatus: payment.status,
        molliePaymentId: paymentId,
      });
      break;

    // "open" and "pending" — payment in progress, no action needed
  }

  return new Response("OK", { status: 200 });
});
```

#### 4. Check Payment Status (On-Demand)

```typescript
// Get payment status (for manual checks or polling fallback)
GET https://api.mollie.com/v2/payments/{paymentId}

// Payment statuses:
// open      → Customer has not yet completed payment
// canceled  → Customer cancelled
// pending   → Payment is being processed (bank transfer)
// expired   → Payment link expired
// failed    → Payment failed
// paid      → Payment successful ✓
```

### Mollie Payment Statuses

| Status | Meaning | VastVooruit Action |
|---|---|---|
| `open` | Payment initiated, not completed | Wait |
| `pending` | Processing (bank transfer in transit) | Wait, show "In behandeling" |
| `paid` | Payment confirmed | Release label, update order |
| `failed` | Payment attempt failed | Allow retry, send new link |
| `canceled` | Customer cancelled | Allow retry |
| `expired` | Payment link expired | Generate new link if needed |

### Label Release Flow

```
Order Ready → Generate Payment Link → Email to Client
                                          │
                                    Client Pays
                                          │
                              Mollie Webhook (paid)
                                          │
                                   Release Label
                                     │         │
                            Email PDF to    Update Order
                              Client         Status
```

### Rate Limits

| Limit | Value |
|---|---|
| General | Not explicitly documented; Mollie scales well |
| Recommendation | Max 50 requests/second for safety |
| Test mode | Unlimited (use `test_` API key) |

### Error Handling

| Scenario | Strategy |
|---|---|
| HTTP 401 (Invalid API Key) | Check env vars, alert admin |
| HTTP 422 (Validation Error) | Log error, fix request format |
| Webhook delivery failure | Mollie retries automatically |
| Payment stuck in "open" | Polling cron after 24h, send reminder |
| Duplicate webhook | Check payment status idempotently |

### Data Model (Convex Side)

```typescript
// Payment tracking fields on orders table
orders: defineTable({
  // ... other fields
  paymentMethod: v.optional(v.string()),      // "mollie" | "moneybird_invoice"
  molliePaymentId: v.optional(v.string()),
  molliePaymentLinkId: v.optional(v.string()),
  molliePaymentLinkUrl: v.optional(v.string()),
  molliePaymentStatus: v.optional(v.string()),
  paidAt: v.optional(v.number()),
  labelReleasedAt: v.optional(v.number()),
}),
```

### Implementation Checklist

- [ ] Create Mollie account, obtain test + live API keys
- [ ] Implement payment link creation (from order detail page)
- [ ] Implement direct payment creation (for online checkout flow)
- [ ] Build Mollie webhook handler on Convex HTTP actions
- [ ] Implement label release trigger on successful payment
- [ ] Build email with payment link (via Microsoft Graph or Moneybird)
- [ ] Build payment status display in order detail UI
- [ ] Add retry/resend payment link functionality
- [ ] Test full flow with Mollie test mode
- [ ] Switch to live keys for production

---

## 7. EP-online / Raconi — Phase 4

### Overview

EP-online is the government registration system for energy labels. After an energy label is calculated in Uniec3, it must be registered on EP-online to become officially valid. Raconi is the alternative registration portal. Both require per-adviseur login with SMS-based 2FA.

### Architecture (Deferred)

This integration follows the same browser automation pattern as the Uniec3 bot:

| Property | Value |
|---|---|
| **Technology** | Playwright browser automation |
| **Runtime** | Same Docker worker as Uniec3 bot (Fly.io) |
| **2FA** | SMS-based, per adviseur account |
| **Trigger** | After Uniec3 calculation is approved by human |
| **Session Management** | Cookie persistence, same as Uniec3 |

### High-Level Flow

```
Uniec3 Calculation Approved → Bot navigates EP-online → Login (2FA if needed)
  → Upload/enter calculation data → Submit registration → Capture registration number
  → Download registered label PDF → Store in order → Mark as "LABEL_GEREGISTREERD"
```

### Why Phase 4

- Requires mature bot infrastructure (proven stable with Uniec3 first)
- EP-online interface is complex and changes periodically
- Per-adviseur 2FA adds operational complexity
- Manual registration is feasible at current volume
- Government systems have unpredictable maintenance windows

### Preliminary Technical Notes

- EP-online may have an API in the future (monitor [RVO.nl](https://www.rvo.nl))
- Raconi is a third-party portal that might offer API access — investigate before building browser automation
- Registration data required: calculation XML (from Uniec3), building details, adviseur credentials
- Success output: registration number + official label PDF

### Implementation Checklist (Phase 4)

- [ ] Investigate if EP-online or Raconi offer API access by the time Phase 4 starts
- [ ] If no API: extend Uniec3 bot framework for EP-online
- [ ] Map EP-online form fields
- [ ] Build registration workflow
- [ ] Build label PDF download and storage
- [ ] Integrate with order status pipeline

---

## Cross-Cutting Concerns

### Environment Variables

```env
# Moneybird (Phase 1)
MONEYBIRD_ACCESS_TOKEN=
MONEYBIRD_ADMINISTRATION_ID=

# BAG API (Phase 1)
BAG_API_KEY=

# Microsoft Graph (Phase 2)
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_TENANT_ID=

# Mollie (Phase 2)
MOLLIE_LIVE_API_KEY=
MOLLIE_TEST_API_KEY=

# HomeVisuals (Phase 2)
HOMEVISUALS_WEBHOOK_SECRET=

# Uniec3 Bot (Phase 0)
UNIEC3_BOT_WORKER_URL=
UNIEC3_BOT_SECRET=

# Convex
CONVEX_DEPLOYMENT=
```

### Webhook Security Checklist

All webhook endpoints must:
1. Validate the source (API key, signature, or known IP range)
2. Implement idempotency (deduplicate by unique key)
3. Respond quickly (< 5s) — offload heavy processing to background mutations
4. Return 200/202 even if processing fails (to prevent retry storms)
5. Log all incoming payloads for debugging

### Shared HTTP Action Router (Convex)

```typescript
// convex/http.ts — Central webhook router
import { httpRouter } from "convex/server";
import { moneybirdWebhook } from "./webhooks/moneybird";
import { microsoftGraphWebhook } from "./webhooks/microsoftGraph";
import { mollieWebhook } from "./webhooks/mollie";
import { homevisualsWebhook } from "./webhooks/homevisuals";

const http = httpRouter();

http.route({
  path: "/webhooks/moneybird",
  method: "POST",
  handler: moneybirdWebhook,
});

http.route({
  path: "/webhooks/microsoft-graph",
  method: "POST",
  handler: microsoftGraphWebhook,
});

http.route({
  path: "/webhooks/mollie",
  method: "POST",
  handler: mollieWebhook,
});

http.route({
  path: "/webhooks/homevisuals",
  method: "POST",
  handler: homevisualsWebhook,
});

export default http;
```

### Integration Health Dashboard

Build a backoffice page showing real-time health of all integrations:

| Integration | Health Check | Interval |
|---|---|---|
| Moneybird | `GET /api/v2/{admin_id}/administrations.json` | Every 5 min |
| Microsoft Graph | `GET /me` per adviseur | Every 5 min |
| BAG API | `GET /adressenuitgebreid?postcode=1000AA&huisnummer=1` | Every 15 min |
| Mollie | `GET /v2/methods` | Every 5 min |
| Uniec3 Bot | HTTP health endpoint on Fly.io worker | Every 1 min |

---

## Phase Summary

| Phase | Integrations | Priority |
|---|---|---|
| **Phase 0** | Uniec3 Browser Bot | Critical path — removes biggest bottleneck |
| **Phase 1** | Moneybird + BAG API | Core business operations |
| **Phase 2** | Microsoft Graph + Mollie + HomeVisuals | Automation & payment |
| **Phase 4** | EP-online / Raconi | Government registration (defer) |
