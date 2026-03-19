# Data Model — VastVooruit Platform

## Tech Stack

- **Database**: Convex (realtime, reactive)
- **Auth**: Clerk (synced to `users` table)
- **Frontend**: Next.js 16 + Tailwind v4 + shadcn/ui
- **File Storage**: Convex built-in file storage (`v.id("_storage")`)

## Conventions

| Rule | Example |
|---|---|
| Table names | `camelCase` — `quoteLineItems` |
| Field names | `camelCase` — `buildYear`, `orgId` |
| Status enums | String literals — `v.literal("NIEUW")` |
| Code language | English |
| User-facing text | Dutch |
| Soft deletes | `isArchived: v.boolean()` (never hard delete dossier data — 15yr retention) |
| Timestamps | `_creationTime` (auto) + explicit fields like `completedAt` where needed |

## Status Flows

### Orders (Opdrachten)

```
NIEUW → OFFERTE_VERSTUURD → GEACCEPTEERD → INGEPLAND → OPNAME_GEDAAN →
IN_UITWERKING → CONCEPT_GEREED → CONTROLE → GEREGISTREERD → VERZONDEN → AFGEROND
                                                                          ↓
Side statuses: ON_HOLD, GEANNULEERD, NO_SHOW (can re-enter main flow)
```

### Quotes (Offertes)

```
CONCEPT → VERSTUURD → GEACCEPTEERD → VERLOPEN → AFGEWEZEN
```

### Invoices (Facturen)

```
CONCEPT → VERSTUURD → BETAALD → HERINNERING → ONINBAAR
```

### Nieuwbouw Document Requirements

```
NIET_AANGELEVERD → AANGELEVERD → GOEDGEKEURD → AFGEKEURD
```

---

## Complete Convex Schema

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// STATUS LITERALS (reusable)
// ============================================================================

const orderStatus = v.union(
  v.literal("NIEUW"),
  v.literal("OFFERTE_VERSTUURD"),
  v.literal("GEACCEPTEERD"),
  v.literal("INGEPLAND"),
  v.literal("OPNAME_GEDAAN"),
  v.literal("IN_UITWERKING"),
  v.literal("CONCEPT_GEREED"),
  v.literal("CONTROLE"),
  v.literal("GEREGISTREERD"),
  v.literal("VERZONDEN"),
  v.literal("AFGEROND"),
  v.literal("ON_HOLD"),
  v.literal("GEANNULEERD"),
  v.literal("NO_SHOW"),
);

const quoteStatus = v.union(
  v.literal("CONCEPT"),
  v.literal("VERSTUURD"),
  v.literal("GEACCEPTEERD"),
  v.literal("VERLOPEN"),
  v.literal("AFGEWEZEN"),
);

const invoiceStatus = v.union(
  v.literal("CONCEPT"),
  v.literal("VERSTUURD"),
  v.literal("BETAALD"),
  v.literal("HERINNERING"),
  v.literal("ONINBAAR"),
);

const clientType = v.union(
  v.literal("PARTICULIER"),
  v.literal("MAKELAAR"),
  v.literal("BELEGGER"),
  v.literal("CORPORATIE"),
  v.literal("AANNEMER"),
  v.literal("OVERIG"),
);

const companyType = v.union(
  v.literal("CORPORATIE"),
  v.literal("BELEGGER"),
  v.literal("MAKELAARSKANTOOR"),
  v.literal("AANNEMER"),
  v.literal("BOUWBEDRIJF"),
  v.literal("BANK"),
  v.literal("MONUMENTENSTICHTING"),
  v.literal("VASTGOEDBEHEERDER"),
  v.literal("PARTNER"),
  v.literal("OVERIG"),
);

const productType = v.union(
  v.literal("ENERGIELABEL"),
  v.literal("VERDUURZAMINGSADVIES"),
  v.literal("WWS_PUNTENTELLING"),
  v.literal("NEN2580_METING"),
  v.literal("BENG_BEREKENING"),
  v.literal("BLOWERDOORTEST"),
  v.literal("HUURPRIJSCHECK"),
  v.literal("MAATWERK"),
);

const buildingType = v.union(
  v.literal("APPARTEMENT"),
  v.literal("RIJTJESWONING"),
  v.literal("TWEE_ONDER_EEN_KAP"),
  v.literal("VRIJSTAAND"),
  v.literal("BEDRIJFSPAND_LT_100"),
  v.literal("BEDRIJFSPAND_100_250"),
  v.literal("BEDRIJFSPAND_251_500"),
  v.literal("BEDRIJFSPAND_501_1000"),
  v.literal("BEDRIJFSPAND_1001_1500"),
  v.literal("BEDRIJFSPAND_GT_1500"),
);

const deelgebied = v.union(
  v.literal("EPWB"), // Energieprestatie Woningbouw Bestaand
  v.literal("EPWD"), // Energieprestatie Woningbouw Dienstverlening
  v.literal("EPUB"), // Energieprestatie Utiliteitsbouw Bestaand
  v.literal("EPUD"), // Energieprestatie Utiliteitsbouw Dienstverlening
  v.literal("MWAW"), // Maatwerkadvies Woningen Aanvullend
  v.literal("MWAU"), // Maatwerkadvies Utiliteitsbouw
);

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

export default defineSchema({
  // ==========================================================================
  // USERS — Internal team members, synced from Clerk
  // ==========================================================================
  // Represents every VastVooruit employee. Clerk webhook keeps this in sync.
  // Roles: ADMIN (Jarco), SENIOR_ADVISEUR (Mark), EP_ADVISEUR, PLANNER (Aviejah),
  // ADMINISTRATIE (Jasper), BACKOFFICE (Joris), NIEUWBOUW (John, Matthias).
  // ==========================================================================
  users: defineTable({
    clerkId: v.string(),            // Clerk user ID (e.g. "user_2x...")
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    role: v.union(
      v.literal("ADMIN"),
      v.literal("SENIOR_ADVISEUR"),
      v.literal("EP_ADVISEUR"),
      v.literal("PLANNER"),
      v.literal("ADMINISTRATIE"),
      v.literal("BACKOFFICE"),
      v.literal("NIEUWBOUW"),
    ),
    isActive: v.boolean(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_isActive", ["isActive"]),

  // ==========================================================================
  // ADVISEUR PROFILES — EP-adviseur specializations, location, travel prefs
  // ==========================================================================
  // Extends user data with domain-specific info for smart planning/matching.
  // Used by AI planning to suggest optimal adviseur-order assignments based on
  // location (postcode), specializations, travel willingness, and availability.
  // ==========================================================================
  adviseurProfiles: defineTable({
    userId: v.id("users"),
    specializations: v.array(productType),          // e.g. ["ENERGIELABEL", "VERDUURZAMINGSADVIES"]
    buildingTypeExperience: v.array(buildingType),   // what building types they handle
    homePostcode: v.string(),                        // for route optimization
    homeCity: v.string(),
    maxTravelDistanceKm: v.optional(v.number()),     // how far they're willing to travel
    travelWillingness: v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
    ),
    weeklyCapacityHours: v.number(),                 // standard: 40
    canDoNieuwbouw: v.boolean(),                     // nieuwbouw is a specialist skill
    canDoUtiliteit: v.boolean(),                     // utiliteit (bedrijfspanden) requires certification
    outlookCalendarId: v.optional(v.string()),        // Microsoft Graph calendar ID
    outlookEmail: v.optional(v.string()),             // Outlook email for calendar sync
    notes: v.optional(v.string()),                   // e.g. "Rick needs more office time"
    isAvailable: v.boolean(),                        // can be temporarily set to false (vacation, sick)
  })
    .index("by_userId", ["userId"])
    .index("by_homePostcode", ["homePostcode"]),

  // ==========================================================================
  // CONTACTS — External people: clients, tenants, intermediaries, contractors
  // ==========================================================================
  // Anyone outside VastVooruit who is involved in orders. Can be a homeowner,
  // tenant (huurder), property manager, makelaar contact, aannemer contact, etc.
  // A contact can be linked to a company (e.g. contactperson at a corporatie).
  // ==========================================================================
  contacts: defineTable({
    companyId: v.optional(v.id("companies")),  // optional link to a company
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),           // personal/mailing address
    postcode: v.optional(v.string()),
    city: v.optional(v.string()),
    role: v.union(
      v.literal("EIGENAAR"),           // property owner
      v.literal("HUURDER"),            // tenant
      v.literal("OPDRACHTGEVER"),      // client who orders the work
      v.literal("BEWONER"),            // resident (may or may not be owner)
      v.literal("CONTACTPERSOON"),     // generic contact at a company
      v.literal("MAKELAAR"),           // individual makelaar
      v.literal("AANNEMER_CONTACT"),   // aannemer project lead
      v.literal("OVERIG"),
    ),
    notes: v.optional(v.string()),
    isArchived: v.boolean(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .searchIndex("search_contacts", {
      searchField: "lastName",
      filterFields: ["companyId", "role"],
    }),

  // ==========================================================================
  // COMPANIES — Corporaties, beleggers, makelaarkantoren, aannemers, etc.
  // ==========================================================================
  // Represents organizations that VastVooruit works with. Each company has a
  // type that determines the client flow (corporatie vs belegger vs makelaar).
  // Companies can have multiple contacts and multiple projects.
  // ==========================================================================
  companies: defineTable({
    name: v.string(),
    type: companyType,
    kvkNumber: v.optional(v.string()),         // KvK (Chamber of Commerce) number
    vatNumber: v.optional(v.string()),         // BTW-nummer
    email: v.optional(v.string()),             // general company email
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    postcode: v.optional(v.string()),
    city: v.optional(v.string()),
    // Billing
    invoiceEmail: v.optional(v.string()),      // may differ from general email
    invoiceAddress: v.optional(v.string()),
    invoicePostcode: v.optional(v.string()),
    invoiceCity: v.optional(v.string()),
    paymentTermDays: v.optional(v.number()),   // default payment term (e.g. 30)
    // CRM fields
    leadSource: v.optional(v.string()),        // how they found VastVooruit
    accountManagerId: v.optional(v.id("users")),
    // Contract info (for corporaties)
    hasContract: v.boolean(),
    contractStartDate: v.optional(v.string()), // ISO date
    contractEndDate: v.optional(v.string()),   // ISO date
    contractNotes: v.optional(v.string()),
    // Moneybird sync
    moneybirdContactId: v.optional(v.string()),
    notes: v.optional(v.string()),
    isArchived: v.boolean(),
  })
    .index("by_type", ["type"])
    .index("by_moneybirdContactId", ["moneybirdContactId"])
    .index("by_accountManagerId", ["accountManagerId"])
    .searchIndex("search_companies", {
      searchField: "name",
      filterFields: ["type", "isArchived"],
    }),

  // ==========================================================================
  // INTERMEDIARIES — Tussenpersonen: makelaars, banken, vastgoedbeheerders
  // ==========================================================================
  // Separate from companies because they have specific preferences for how
  // VastVooruit communicates with them (CC addresses, invoice routing, checklist
  // types). Tracks lead generation per intermediary for commercial insights.
  // Links to a company OR stands alone (e.g. individual makelaar).
  // ==========================================================================
  intermediaries: defineTable({
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),    // primary contact person
    name: v.string(),                            // display name
    type: v.union(
      v.literal("MAKELAAR"),
      v.literal("BANK"),
      v.literal("VASTGOEDBEHEERDER"),
      v.literal("BOUWBEDRIJF"),
      v.literal("HOMEVISUALS"),                  // HomeFlow/HomeVisuals partner
      v.literal("TIMAX"),                        // BENG referral partner
      v.literal("OVERIG"),
    ),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    // Preferences
    ccEmailOnDelivery: v.optional(v.string()),   // CC when label is delivered
    preferredChecklistType: v.optional(v.string()),
    invoiceViaIntermediary: v.boolean(),          // should we invoice via them?
    invoiceEmail: v.optional(v.string()),
    // Tracking
    totalOrdersReferred: v.optional(v.number()), // denormalized counter
    notes: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_type", ["type"])
    .searchIndex("search_intermediaries", {
      searchField: "name",
      filterFields: ["type"],
    }),

  // ==========================================================================
  // PRODUCTS — Service catalog: energielabel, advies, WWS, NEN2580, BENG, etc.
  // ==========================================================================
  // Master list of services VastVooruit offers. Referenced by quoteLineItems,
  // orderProducts, and pricingRules. Each product has a base price but actual
  // pricing depends on building type, client type, and volume (see pricingRules).
  // ==========================================================================
  products: defineTable({
    name: v.string(),                   // e.g. "Energielabel"
    type: productType,
    description: v.optional(v.string()),
    basePriceExVat: v.number(),         // base price excl. BTW in cents
    vatPercentage: v.number(),          // 21 (as percentage)
    isActive: v.boolean(),
    sortOrder: v.number(),              // display ordering
    requiresOnSiteVisit: v.boolean(),   // energielabel yes, some services no
    estimatedDurationMinutes: v.optional(v.number()), // for planning
  })
    .index("by_type", ["type"])
    .index("by_isActive", ["isActive"]),

  // ==========================================================================
  // PRICING RULES — Per client type, per product, volume discounts, surcharges
  // ==========================================================================
  // Flexible pricing engine. Determines the actual price for a quote line item
  // based on multiple dimensions: product, building type, client type, volume.
  // Supports: base pricing, surcharges (spoed, regio, no-show, destructief
  // onderzoek, extra kamers), and volume discounts (seriekorting).
  // ==========================================================================
  pricingRules: defineTable({
    productId: v.id("products"),
    // Matching criteria (all optional — most specific match wins)
    buildingType: v.optional(buildingType),
    clientType: v.optional(clientType),
    companyId: v.optional(v.id("companies")),  // company-specific pricing (contracts)
    // Pricing
    priceExVat: v.number(),                     // price in cents
    // Volume discount
    minQuantity: v.optional(v.number()),        // seriekorting from N units
    maxQuantity: v.optional(v.number()),
    // Surcharge rules
    isSurcharge: v.boolean(),                   // true = this is an add-on surcharge
    surchargeType: v.optional(v.union(
      v.literal("SPOED"),
      v.literal("REGIO_TOESLAG"),
      v.literal("NO_SHOW"),
      v.literal("DESTRUCTIEF_ONDERZOEK"),
      v.literal("EXTRA_KAMERS"),
      v.literal("HERBEZOEK"),
      v.literal("OVERIG"),
    )),
    surchargeDescription: v.optional(v.string()),
    // Validity
    validFrom: v.optional(v.string()),          // ISO date
    validUntil: v.optional(v.string()),         // ISO date
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_productId", ["productId"])
    .index("by_companyId", ["companyId"])
    .index("by_clientType", ["clientType"]),

  // ==========================================================================
  // ADDRESSES — BAG-linked address data
  // ==========================================================================
  // Normalized address records with BAG (Basisregistratie Adressen en Gebouwen)
  // integration. Auto-populated from BAG API on lookup. One address can have
  // multiple orders over time (e.g. label renewal after 10 years).
  // ==========================================================================
  addresses: defineTable({
    street: v.string(),
    houseNumber: v.string(),
    houseNumberAddition: v.optional(v.string()),  // e.g. "A", "bis"
    postcode: v.string(),                          // e.g. "8019XP"
    city: v.string(),
    province: v.optional(v.string()),              // e.g. "Overijssel"
    country: v.optional(v.string()),               // default "NL"
    // BAG data
    bagVerblijfsobjectId: v.optional(v.string()),  // BAG nr Verblijfsobject
    bagPandId: v.optional(v.string()),             // BAG nr PandID
    bagOppervlakte: v.optional(v.number()),        // Gebruiksoppervlakte in m²
    bagBouwjaar: v.optional(v.number()),           // Bouwjaar
    bagGebruiksdoel: v.optional(v.string()),       // e.g. "woonfunctie"
    // Geolocation (for route planning)
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    // Derived
    isNieuwbouw: v.optional(v.boolean()),          // bouwjaar >= 2021
    buildingType: v.optional(buildingType),
  })
    .index("by_postcode", ["postcode"])
    .index("by_bagVerblijfsobjectId", ["bagVerblijfsobjectId"])
    .index("by_bagPandId", ["bagPandId"])
    .searchIndex("search_addresses", {
      searchField: "street",
      filterFields: ["postcode", "city"],
    }),

  // ==========================================================================
  // PROJECTS — Grouping of orders (corporatie batch, belegger portfolio, etc.)
  // ==========================================================================
  // A project groups multiple orders together under one client/contract.
  // Corporatie: batch of 100-2500 homes over a 3-5 year contract.
  // Belegger: portfolio of up to ~100 units.
  // Nieuwbouw: construction project with structured document requirements.
  // Particulier orders may or may not have a project (often standalone).
  // ==========================================================================
  projects: defineTable({
    name: v.string(),
    referenceCode: v.optional(v.string()),       // kenmerksysteem: e.g. "CORP-24-001"
    companyId: v.optional(v.id("companies")),    // the client company
    contactId: v.optional(v.id("contacts")),     // primary contact for this project
    intermediaryId: v.optional(v.id("intermediaries")),
    type: v.union(
      v.literal("CORPORATIE"),
      v.literal("BELEGGER"),
      v.literal("NIEUWBOUW"),
      v.literal("PARTICULIER"),
      v.literal("MAKELAAR"),
      v.literal("OVERIG"),
    ),
    status: v.union(
      v.literal("CONCEPT"),
      v.literal("OFFERTE"),
      v.literal("ACTIEF"),
      v.literal("AFGEROND"),
      v.literal("GEANNULEERD"),
    ),
    // Scope
    description: v.optional(v.string()),
    estimatedOrderCount: v.optional(v.number()),  // expected number of addresses
    // Contract details
    quoteId: v.optional(v.id("quotes")),          // linked accepted quote
    contractPriceExVat: v.optional(v.number()),    // total contract value in cents
    // Dates
    startDate: v.optional(v.string()),             // ISO date
    endDate: v.optional(v.string()),               // ISO date
    deadline: v.optional(v.string()),              // ISO date
    // Denormalized counters (updated via mutations)
    totalOrders: v.optional(v.number()),
    completedOrders: v.optional(v.number()),
    notes: v.optional(v.string()),
    isArchived: v.boolean(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_referenceCode", ["referenceCode"])
    .searchIndex("search_projects", {
      searchField: "name",
      filterFields: ["type", "status", "companyId"],
    }),

  // ==========================================================================
  // ORDERS — Individual assignment per address (the CORE entity)
  // ==========================================================================
  // One order = one address = one dossier. This is the central entity that
  // flows through the entire pipeline from NIEUW to AFGEROND. Every order has
  // an address, optionally a project, an assigned adviseur, and a dossier.
  // Orders track the status, assigned products, costs, and all related entities.
  // ==========================================================================
  orders: defineTable({
    referenceCode: v.string(),                   // unique: e.g. "VV-2026-00142"
    addressId: v.id("addresses"),
    projectId: v.optional(v.id("projects")),
    companyId: v.optional(v.id("companies")),    // direct client (or via project)
    // People
    contactId: v.optional(v.id("contacts")),     // opdrachtgever
    bewonerId: v.optional(v.id("contacts")),     // bewoner/huurder (can differ from contactId)
    intermediaryId: v.optional(v.id("intermediaries")),
    assignedAdviseurId: v.optional(v.id("users")),
    // Status
    status: orderStatus,
    // Building info (can override/extend address data)
    buildingType: v.optional(buildingType),
    deelgebied: v.optional(deelgebied),
    isNieuwbouw: v.boolean(),
    // Dates
    requestedDate: v.optional(v.string()),       // when client wants the visit
    scheduledDate: v.optional(v.string()),        // planned opname date (ISO datetime)
    opnameDoneAt: v.optional(v.string()),         // when opname actually happened
    completedAt: v.optional(v.string()),          // when order reached AFGEROND
    // Pricing (resolved from pricingRules or overridden)
    totalPriceExVat: v.optional(v.number()),      // total in cents
    totalPriceInclVat: v.optional(v.number()),
    // EP-online data (after registration)
    epOnlineGebouwklasse: v.optional(v.string()),
    epOnlineGebouwtype: v.optional(v.string()),
    epOnlineGebouwsubtype: v.optional(v.string()),
    epOnlineStatusBijAanmelding: v.optional(v.string()),
    epOnlineNieuweStatus: v.optional(v.string()),
    epOnlineLabelOud: v.optional(v.string()),     // e.g. "C"
    epOnlineLabelNieuw: v.optional(v.string()),   // e.g. "A+"
    epOnlineRegistratieId: v.optional(v.string()),
    // Uniec3 automation
    uniec3Status: v.optional(v.union(
      v.literal("NIET_GESTART"),
      v.literal("IN_WACHTRIJ"),
      v.literal("BEZIG"),
      v.literal("VOLTOOID"),
      v.literal("FOUT"),
    )),
    uniec3LastRunAt: v.optional(v.string()),
    // Invoice link
    invoiceId: v.optional(v.id("invoices")),
    quoteId: v.optional(v.id("quotes")),
    // Flags
    isNoShow: v.boolean(),
    noShowCount: v.optional(v.number()),
    requiresHerbezoek: v.optional(v.boolean()),
    costsConfirmedByAdviseur: v.boolean(),        // blocks "doorgezet" until true
    // Source
    source: v.optional(v.union(
      v.literal("PORTAL"),
      v.literal("EMAIL"),
      v.literal("WEBSITE"),
      v.literal("HOMEVISUALS"),
      v.literal("TELEFOON"),
      v.literal("WHATSAPP"),
      v.literal("FORMULIER"),
      v.literal("HANDMATIG"),
    )),
    notes: v.optional(v.string()),
    isArchived: v.boolean(),
  })
    .index("by_status", ["status"])
    .index("by_projectId", ["projectId"])
    .index("by_companyId", ["companyId"])
    .index("by_addressId", ["addressId"])
    .index("by_assignedAdviseurId", ["assignedAdviseurId"])
    .index("by_referenceCode", ["referenceCode"])
    .index("by_intermediaryId", ["intermediaryId"])
    .index("by_invoiceId", ["invoiceId"])
    .index("by_scheduledDate", ["scheduledDate"])
    .index("by_status_and_assignedAdviseurId", ["status", "assignedAdviseurId"])
    .index("by_isArchived_and_status", ["isArchived", "status"])
    .searchIndex("search_orders", {
      searchField: "referenceCode",
      filterFields: ["status", "projectId", "assignedAdviseurId", "companyId"],
    }),

  // ==========================================================================
  // ORDER PRODUCTS — Products assigned to an order (many-to-many)
  // ==========================================================================
  // An order can have multiple products (e.g. Energielabel + Verduurzamingsadvies
  // + Huurprijscheck). Each line has its own resolved price.
  // ==========================================================================
  orderProducts: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    priceExVat: v.number(),            // resolved price in cents
    priceInclVat: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_productId", ["productId"]),

  // ==========================================================================
  // QUOTES — Offertes with line items
  // ==========================================================================
  // Formal quotes sent to clients. Required for orders > €1.000.
  // Corporatie contracts start with a detailed quote. Belegger projects always
  // get a quote. Particulier orders < €1.000 can skip the quote step.
  // Accepted quotes become projects automatically.
  // ==========================================================================
  quotes: defineTable({
    referenceCode: v.string(),               // e.g. "OFF-2026-00042"
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    projectId: v.optional(v.id("projects")),  // linked after acceptance
    intermediaryId: v.optional(v.id("intermediaries")),
    status: quoteStatus,
    // Content
    title: v.optional(v.string()),
    introText: v.optional(v.string()),        // intro/cover text
    conditions: v.optional(v.string()),       // voorwaarden
    // Totals (denormalized from line items)
    totalExVat: v.number(),                   // in cents
    totalInclVat: v.number(),
    vatAmount: v.number(),
    // Dates
    sentAt: v.optional(v.string()),           // when sent to client
    validUntil: v.optional(v.string()),       // expiry date
    acceptedAt: v.optional(v.string()),
    rejectedAt: v.optional(v.string()),
    // Signature
    signedByName: v.optional(v.string()),
    signedAt: v.optional(v.string()),
    signatureStorageId: v.optional(v.id("_storage")),
    // Metadata
    createdByUserId: v.id("users"),
    notes: v.optional(v.string()),
    isArchived: v.boolean(),
  })
    .index("by_status", ["status"])
    .index("by_companyId", ["companyId"])
    .index("by_projectId", ["projectId"])
    .index("by_referenceCode", ["referenceCode"])
    .index("by_createdByUserId", ["createdByUserId"]),

  // ==========================================================================
  // QUOTE LINE ITEMS — Individual lines on a quote
  // ==========================================================================
  quoteLineItems: defineTable({
    quoteId: v.id("quotes"),
    productId: v.optional(v.id("products")),  // optional for custom lines
    description: v.string(),                   // product name or custom description
    quantity: v.number(),
    unitPriceExVat: v.number(),                // per unit in cents
    totalExVat: v.number(),                    // quantity * unitPrice
    vatPercentage: v.number(),                 // e.g. 21
    buildingType: v.optional(buildingType),    // for price context
    sortOrder: v.number(),
  })
    .index("by_quoteId", ["quoteId"]),

  // ==========================================================================
  // INVOICES — Moneybird-synced invoices
  // ==========================================================================
  // Created when an order reaches AFGEROND (or manually). Synced bidirectionally
  // with Moneybird for accounting. Supports automated debiteurenopvolging.
  // ==========================================================================
  invoices: defineTable({
    referenceCode: v.string(),                  // e.g. "FAC-2026-00321"
    moneybirdInvoiceId: v.optional(v.string()), // Moneybird external ID
    moneybirdInvoiceUrl: v.optional(v.string()),
    // Links
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    projectId: v.optional(v.id("projects")),
    // Status
    status: invoiceStatus,
    // Totals
    totalExVat: v.number(),                     // in cents
    totalInclVat: v.number(),
    vatAmount: v.number(),
    // Dates
    invoiceDate: v.string(),                    // ISO date
    dueDate: v.string(),                        // ISO date
    sentAt: v.optional(v.string()),
    paidAt: v.optional(v.string()),
    // Reminders
    reminderCount: v.optional(v.number()),
    lastReminderSentAt: v.optional(v.string()),
    // Metadata
    createdByUserId: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    isArchived: v.boolean(),
  })
    .index("by_status", ["status"])
    .index("by_companyId", ["companyId"])
    .index("by_projectId", ["projectId"])
    .index("by_moneybirdInvoiceId", ["moneybirdInvoiceId"])
    .index("by_referenceCode", ["referenceCode"])
    .index("by_dueDate", ["dueDate"]),

  // ==========================================================================
  // INVOICE LINE ITEMS — Individual lines on an invoice
  // ==========================================================================
  invoiceLineItems: defineTable({
    invoiceId: v.id("invoices"),
    orderId: v.optional(v.id("orders")),       // link back to order
    productId: v.optional(v.id("products")),
    description: v.string(),
    quantity: v.number(),
    unitPriceExVat: v.number(),                 // in cents
    totalExVat: v.number(),
    vatPercentage: v.number(),
    sortOrder: v.number(),
  })
    .index("by_invoiceId", ["invoiceId"])
    .index("by_orderId", ["orderId"]),

  // ==========================================================================
  // COST MUTATIONS — Meerwerk/minderwerk per order
  // ==========================================================================
  // Tracks deviations from the quoted price per order. EP-adviseurs add these
  // after opname: no-show fees, destructief onderzoek, herbezoek, ander type
  // pand, extra verduurzamingsadvies, etc. System blocks "doorgezet" status
  // until all cost mutations are confirmed.
  // ==========================================================================
  costMutations: defineTable({
    orderId: v.id("orders"),
    createdByUserId: v.id("users"),            // which adviseur reported this
    type: v.union(
      v.literal("MEERWERK"),
      v.literal("MINDERWERK"),
      v.literal("NO_SHOW"),
      v.literal("HERBEZOEK"),
      v.literal("DESTRUCTIEF_ONDERZOEK"),
      v.literal("TYPE_WIJZIGING"),             // pand turned out to be different type
      v.literal("OVERIG"),
    ),
    description: v.string(),                   // what and why
    amountExVat: v.number(),                   // in cents (positive = meerwerk, negative = minderwerk)
    isApproved: v.boolean(),                   // admin approval
    approvedByUserId: v.optional(v.id("users")),
    approvedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_createdByUserId", ["createdByUserId"])
    .index("by_isApproved", ["isApproved"]),

  // ==========================================================================
  // APPOINTMENTS — Planned visits, linked to Outlook calendar
  // ==========================================================================
  // Represents a scheduled opname visit. Bidirectionally synced with Outlook
  // via Microsoft Graph API. One appointment can cover multiple orders at the
  // same address or nearby addresses (route optimization).
  // ==========================================================================
  appointments: defineTable({
    orderId: v.id("orders"),                    // primary order
    additionalOrderIds: v.optional(v.array(v.id("orders"))), // if multiple orders same visit
    adviseurId: v.id("users"),
    // Schedule
    startTime: v.string(),                      // ISO datetime
    endTime: v.string(),                        // ISO datetime
    isAllDay: v.boolean(),
    // Location (from order's address)
    addressId: v.id("addresses"),
    // Outlook sync
    outlookEventId: v.optional(v.string()),      // Microsoft Graph event ID
    outlookCalendarId: v.optional(v.string()),
    isSyncedToOutlook: v.boolean(),
    lastSyncedAt: v.optional(v.string()),
    // Status
    status: v.union(
      v.literal("GEPLAND"),
      v.literal("BEVESTIGD"),
      v.literal("ONDERWEG"),
      v.literal("VOLTOOID"),
      v.literal("NO_SHOW"),
      v.literal("GEANNULEERD"),
      v.literal("VERZET"),                      // rescheduled
    ),
    // Communication
    confirmationSentAt: v.optional(v.string()), // when bevestigingsmail was sent
    reminderSentAt: v.optional(v.string()),
    // Metadata
    notes: v.optional(v.string()),              // internal notes for adviseur
    travelTimeMinutes: v.optional(v.number()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_adviseurId", ["adviseurId"])
    .index("by_startTime", ["startTime"])
    .index("by_adviseurId_and_startTime", ["adviseurId", "startTime"])
    .index("by_outlookEventId", ["outlookEventId"])
    .index("by_status", ["status"]),

  // ==========================================================================
  // DOSSIERS — Document collection per order
  // ==========================================================================
  // Every order has one dossier. The dossier tracks overall completeness and
  // compliance status. Individual files live in the `documents` table.
  // Dossiers must be retained for 15 years (wettelijke bewaarplicht).
  // ==========================================================================
  dossiers: defineTable({
    orderId: v.id("orders"),
    projectId: v.optional(v.id("projects")),
    // Completeness tracking
    completenessPercentage: v.number(),          // 0-100
    isComplete: v.boolean(),
    // Required document checklist (denormalized for quick access)
    requiredDocumentTypes: v.array(v.string()),  // e.g. ["OPNAMEFORMULIER", "FOTOS", "ENERGIELABEL"]
    // Compliance
    isAuditable: v.boolean(),                    // all required docs present for BRL audit
    lastCheckedAt: v.optional(v.string()),
    // Retention
    retentionExpiresAt: v.optional(v.string()),  // 15 years from completion
    isArchivedForRetention: v.boolean(),          // moved to cold storage after 2 years
    notes: v.optional(v.string()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_projectId", ["projectId"])
    .index("by_isComplete", ["isComplete"]),

  // ==========================================================================
  // DOCUMENTS — Files: photos, forms, certificates, drawings, labels
  // ==========================================================================
  // All files stored in Convex storage. Metadata (type, category, who uploaded)
  // stored here. Supports both order-level documents (photos, opnameformulier)
  // and project-level documents (shared bouwtekeningen for nieuwbouw).
  // ==========================================================================
  documents: defineTable({
    storageId: v.id("_storage"),                 // Convex file storage reference
    dossierId: v.optional(v.id("dossiers")),     // per-order dossier
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),     // project-level shared docs
    nieuwbouwProjectId: v.optional(v.id("nieuwbouwProjects")),
    // File metadata
    fileName: v.string(),
    fileType: v.string(),                        // MIME type
    fileSizeBytes: v.number(),
    // Document classification
    category: v.union(
      v.literal("FOTO_BUITEN"),
      v.literal("FOTO_BINNEN"),
      v.literal("OPNAMEFORMULIER"),
      v.literal("ENERGIELABEL_PDF"),
      v.literal("VERDUURZAMINGSADVIES_PDF"),
      v.literal("NEN2580_RAPPORT"),
      v.literal("WWS_RAPPORT"),
      v.literal("BENG_BEREKENING"),
      v.literal("BLOWERDOORTEST_RAPPORT"),
      v.literal("BOUWTEKENING"),
      v.literal("RC_BEREKENING"),
      v.literal("ISOLATIE_CERTIFICAAT"),
      v.literal("VERKLARING"),
      v.literal("PLATTEGROND"),
      v.literal("OFFERTE_PDF"),
      v.literal("FACTUUR_PDF"),
      v.literal("CONTRACT"),
      v.literal("CORRESPONDENTIE"),
      v.literal("OVERIG"),
    ),
    // Nieuwbouw specific
    nieuwbouwElement: v.optional(v.union(
      v.literal("VLOER"),
      v.literal("GEVEL"),
      v.literal("DAK"),
      v.literal("KOZIJN"),
      v.literal("INSTALLATIE"),
      v.literal("ALGEMEEN"),
    )),
    nieuwbouwDocType: v.optional(v.union(
      v.literal("TEKENING"),
      v.literal("FOTO"),
      v.literal("CERTIFICAAT"),
      v.literal("RC_BEREKENING"),
      v.literal("VERKLARING"),
      v.literal("OVERIG"),
    )),
    // Scope
    isProjectLevel: v.boolean(),                 // true = shared across all orders in project
    // Upload info
    uploadedByUserId: v.optional(v.id("users")),
    uploadedByContactId: v.optional(v.id("contacts")), // e.g. aannemer uploading
    uploadedAt: v.string(),                      // ISO datetime
    notes: v.optional(v.string()),
    isArchived: v.boolean(),
  })
    .index("by_dossierId", ["dossierId"])
    .index("by_orderId", ["orderId"])
    .index("by_projectId", ["projectId"])
    .index("by_nieuwbouwProjectId", ["nieuwbouwProjectId"])
    .index("by_category", ["category"])
    .index("by_storageId", ["storageId"]),

  // ==========================================================================
  // NIEUWBOUW PROJECTS — Construction projects with structured doc requirements
  // ==========================================================================
  // Extends the base project for nieuwbouw-specific needs. Tracks the
  // structured folder/checklist system where aannemers must upload specific
  // documents per element (vloer/gevel/dak). Bouwjaar >= 2021.
  // ==========================================================================
  nieuwbouwProjects: defineTable({
    projectId: v.id("projects"),                 // links to base project
    aannemerId: v.optional(v.id("companies")),   // the bouwbedrijf
    aannemerContactId: v.optional(v.id("contacts")),
    // Self-service portal
    accessToken: v.optional(v.string()),          // for aannemer portal access
    accessTokenExpiresAt: v.optional(v.string()),
    // Completeness
    totalRequirements: v.optional(v.number()),
    fulfilledRequirements: v.optional(v.number()),
    completenessPercentage: v.optional(v.number()),
    // Metadata
    woningType: v.optional(v.string()),           // type bouw
    aantalWoningen: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_aannemerId", ["aannemerId"])
    .index("by_accessToken", ["accessToken"]),

  // ==========================================================================
  // NIEUWBOUW DOCUMENT REQUIREMENTS — What documents are needed per element
  // ==========================================================================
  // Per nieuwbouw project, defines what documents are required for each
  // building element. This is the "checklist" that turns into a live portal
  // for aannemers. Items turn green when the aannemer uploads the right doc.
  // ==========================================================================
  nieuwbouwDocumentRequirements: defineTable({
    nieuwbouwProjectId: v.id("nieuwbouwProjects"),
    orderId: v.optional(v.id("orders")),         // null = project-level requirement
    // What is needed
    element: v.union(
      v.literal("VLOER"),
      v.literal("GEVEL"),
      v.literal("DAK"),
      v.literal("KOZIJN"),
      v.literal("INSTALLATIE"),
      v.literal("ALGEMEEN"),
    ),
    documentType: v.union(
      v.literal("TEKENING"),
      v.literal("GEDETAILLEERDE_TEKENING"),
      v.literal("FOTO"),
      v.literal("CERTIFICAAT"),
      v.literal("RC_BEREKENING"),
      v.literal("VERKLARING"),
      v.literal("OVERIG"),
    ),
    description: v.string(),                     // e.g. "RC-waarde berekening vloerisolatie"
    isRequired: v.boolean(),
    isProjectLevel: v.boolean(),                 // true = same for all units, false = per unit
    // Fulfillment
    status: v.union(
      v.literal("NIET_AANGELEVERD"),
      v.literal("AANGELEVERD"),
      v.literal("GOEDGEKEURD"),
      v.literal("AFGEKEURD"),
    ),
    documentId: v.optional(v.id("documents")),   // linked uploaded document
    reviewedByUserId: v.optional(v.id("users")),
    reviewedAt: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    sortOrder: v.number(),
  })
    .index("by_nieuwbouwProjectId", ["nieuwbouwProjectId"])
    .index("by_orderId", ["orderId"])
    .index("by_status", ["status"])
    .index("by_nieuwbouwProjectId_and_element", ["nieuwbouwProjectId", "element"]),

  // ==========================================================================
  // TIME ENTRIES — Hour registration per user per project/order
  // ==========================================================================
  // Not for micro-management — for insight into profitability per project type.
  // Every employee books 40 hours/week. Color-coded by work type.
  // ==========================================================================
  timeEntries: defineTable({
    userId: v.id("users"),
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),
    // Time
    date: v.string(),                            // ISO date
    durationMinutes: v.number(),
    // Classification
    workType: v.union(
      v.literal("OPNAME"),
      v.literal("UITWERKING"),
      v.literal("CONTROLE"),
      v.literal("REGISTRATIE"),
      v.literal("PLANNING"),
      v.literal("ADMINISTRATIE"),
      v.literal("COMMERCIEEL"),
      v.literal("REISTIJD"),
      v.literal("NIEUWBOUW_DOSSIER"),
      v.literal("OVERLEG"),
      v.literal("OVERIG"),
    ),
    description: v.optional(v.string()),
    isBillable: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_orderId", ["orderId"])
    .index("by_projectId", ["projectId"])
    .index("by_userId_and_date", ["userId", "date"])
    .index("by_date", ["date"]),

  // ==========================================================================
  // COMMUNICATIONS — Sent emails, with template reference
  // ==========================================================================
  // Audit trail of all outgoing communications. Covers: appointment
  // confirmations, label delivery, payment reminders, checklist emails.
  // Templates determine content per contact type and order type.
  // ==========================================================================
  communications: defineTable({
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),
    contactId: v.optional(v.id("contacts")),
    companyId: v.optional(v.id("companies")),
    // Content
    type: v.union(
      v.literal("EMAIL"),
      v.literal("SMS"),
      v.literal("WHATSAPP"),
      v.literal("BRIEF"),
    ),
    templateId: v.optional(v.string()),          // reference to email template
    subject: v.optional(v.string()),
    body: v.optional(v.string()),                // rendered content
    // Recipients
    toEmail: v.optional(v.string()),
    ccEmails: v.optional(v.array(v.string())),
    bccEmails: v.optional(v.array(v.string())),
    // Delivery
    sentAt: v.optional(v.string()),
    sentByUserId: v.optional(v.id("users")),     // null = system-sent
    status: v.union(
      v.literal("CONCEPT"),
      v.literal("VERZONDEN"),
      v.literal("MISLUKT"),
      v.literal("GEOPEND"),                      // if tracking is enabled
    ),
    errorMessage: v.optional(v.string()),
    // Attachments
    attachmentStorageIds: v.optional(v.array(v.id("_storage"))),
  })
    .index("by_orderId", ["orderId"])
    .index("by_projectId", ["projectId"])
    .index("by_contactId", ["contactId"])
    .index("by_type", ["type"])
    .index("by_sentAt", ["sentAt"]),

  // ==========================================================================
  // STATUS HISTORY — Audit trail of status changes on orders
  // ==========================================================================
  // Every status transition on an order is logged. Enables timeline view on
  // the order detail page and supports KPI reporting (doorlooptijden per fase).
  // ==========================================================================
  statusHistory: defineTable({
    orderId: v.id("orders"),
    previousStatus: v.optional(v.string()),      // null for initial status
    newStatus: v.string(),
    changedByUserId: v.optional(v.id("users")),  // null = system change
    changedAt: v.string(),                        // ISO datetime
    reason: v.optional(v.string()),               // e.g. "No-show op 15 maart"
    metadata: v.optional(v.string()),             // JSON string for extra context
  })
    .index("by_orderId", ["orderId"])
    .index("by_newStatus", ["newStatus"])
    .index("by_changedAt", ["changedAt"]),

  // ==========================================================================
  // CHECKLIST TEMPLATES — Per assignment type
  // ==========================================================================
  // Defines what checklist is sent to which stakeholder for which order type.
  // Different checklists for: corporatie huurder, particulier eigenaar,
  // belegger bewoner, nieuwbouw aannemer, etc.
  // ==========================================================================
  checklistTemplates: defineTable({
    name: v.string(),                            // e.g. "Checklist Huurder - Corporatie"
    // Matching criteria
    orderType: v.optional(v.union(
      v.literal("CORPORATIE"),
      v.literal("BELEGGER"),
      v.literal("PARTICULIER"),
      v.literal("MAKELAAR"),
      v.literal("NIEUWBOUW"),
    )),
    recipientRole: v.optional(v.union(
      v.literal("BEWONER"),
      v.literal("EIGENAAR"),
      v.literal("HUURDER"),
      v.literal("OPDRACHTGEVER"),
      v.literal("AANNEMER"),
    )),
    productType: v.optional(productType),
    // Content
    items: v.array(v.object({
      label: v.string(),                         // e.g. "Zorg dat alle kamers toegankelijk zijn"
      isRequired: v.boolean(),
      sortOrder: v.number(),
    })),
    // Email
    emailSubjectTemplate: v.optional(v.string()),
    emailBodyTemplate: v.optional(v.string()),   // with {{placeholders}}
    isActive: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_orderType", ["orderType"])
    .index("by_isActive", ["isActive"]),

  // ==========================================================================
  // NOTIFICATIONS — In-app notifications for team members
  // ==========================================================================
  // Real-time notifications pushed to users. Covers: new orders assigned,
  // status changes, documents uploaded, costs to approve, reminders.
  // ==========================================================================
  notifications: defineTable({
    userId: v.id("users"),                       // recipient
    // Content
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("ORDER_ASSIGNED"),
      v.literal("STATUS_CHANGE"),
      v.literal("DOCUMENT_UPLOADED"),
      v.literal("COST_MUTATION_PENDING"),
      v.literal("INVOICE_OVERDUE"),
      v.literal("APPOINTMENT_REMINDER"),
      v.literal("QUOTE_ACCEPTED"),
      v.literal("QUOTE_REJECTED"),
      v.literal("NIEUWBOUW_DOC_UPLOADED"),
      v.literal("SYSTEM"),
    ),
    // Links
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),
    quoteId: v.optional(v.id("quotes")),
    invoiceId: v.optional(v.id("invoices")),
    // State
    isRead: v.boolean(),
    readAt: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_isRead", ["userId", "isRead"])
    .index("by_type", ["type"]),

  // ==========================================================================
  // SETTINGS — Organization-level settings
  // ==========================================================================
  // Global configuration for the VastVooruit instance. Single-row table
  // (keyed by `key` field). Covers: default payment terms, email sender,
  // Moneybird credentials, reference code counters, etc.
  // ==========================================================================
  settings: defineTable({
    key: v.string(),                             // e.g. "moneybird_api_token", "default_payment_term_days"
    value: v.string(),                           // stored as string, parsed by consumers
    description: v.optional(v.string()),
    updatedByUserId: v.optional(v.id("users")),
    updatedAt: v.optional(v.string()),
  })
    .index("by_key", ["key"]),

  // ==========================================================================
  // EMAIL TEMPLATES — Reusable email templates for automated communications
  // ==========================================================================
  // Templates with {{placeholder}} support. Used by the communication system
  // for: appointment confirmations, label delivery, payment reminders,
  // quote sending, checklist emails.
  // ==========================================================================
  emailTemplates: defineTable({
    name: v.string(),                            // internal name
    slug: v.string(),                            // unique identifier
    subject: v.string(),                         // with {{placeholders}}
    body: v.string(),                            // HTML with {{placeholders}}
    // Context
    triggerEvent: v.optional(v.union(
      v.literal("APPOINTMENT_CONFIRMED"),
      v.literal("APPOINTMENT_REMINDER"),
      v.literal("LABEL_DELIVERED"),
      v.literal("QUOTE_SENT"),
      v.literal("INVOICE_SENT"),
      v.literal("PAYMENT_REMINDER"),
      v.literal("STATUS_UPDATE"),
      v.literal("NIEUWBOUW_ACCESS"),
      v.literal("CUSTOM"),
    )),
    isActive: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_triggerEvent", ["triggerEvent"]),

  // ==========================================================================
  // TRACK AND TRACE — Public status page codes for clients
  // ==========================================================================
  // PostNL-style: client receives a code (no account needed), can check status
  // and appointment details. Reduces after-sales calls to VastVooruit.
  // ==========================================================================
  trackAndTrace: defineTable({
    orderId: v.id("orders"),
    code: v.string(),                            // unique public code, e.g. "VV-A3K9-X2M1"
    contactId: v.optional(v.id("contacts")),
    // What the client can see
    lastPublicStatus: v.string(),                // simplified Dutch status
    lastPublicStatusUpdatedAt: v.string(),
    appointmentDate: v.optional(v.string()),
    adviseurFirstName: v.optional(v.string()),   // just first name for privacy
    // Access control
    isActive: v.boolean(),
    expiresAt: v.optional(v.string()),           // auto-expire after delivery + buffer
  })
    .index("by_code", ["code"])
    .index("by_orderId", ["orderId"]),

  // ==========================================================================
  // ACTIVITY LOG — General audit log for all entity changes
  // ==========================================================================
  // Broader than statusHistory — tracks any significant action across the
  // platform. Used for the timeline view and compliance auditing.
  // ==========================================================================
  activityLog: defineTable({
    // Actor
    userId: v.optional(v.id("users")),           // null = system/bot
    actorName: v.optional(v.string()),           // for display when user deleted
    // Target
    entityType: v.union(
      v.literal("ORDER"),
      v.literal("PROJECT"),
      v.literal("QUOTE"),
      v.literal("INVOICE"),
      v.literal("CONTACT"),
      v.literal("COMPANY"),
      v.literal("DOCUMENT"),
      v.literal("APPOINTMENT"),
      v.literal("COST_MUTATION"),
      v.literal("SETTING"),
    ),
    entityId: v.string(),                        // the _id of the target entity
    // Action
    action: v.union(
      v.literal("CREATED"),
      v.literal("UPDATED"),
      v.literal("DELETED"),
      v.literal("STATUS_CHANGED"),
      v.literal("ASSIGNED"),
      v.literal("UPLOADED"),
      v.literal("SENT"),
      v.literal("APPROVED"),
      v.literal("REJECTED"),
    ),
    description: v.string(),                     // human-readable: "Status gewijzigd van NIEUW naar INGEPLAND"
    metadata: v.optional(v.string()),            // JSON string for diff/extra context
    timestamp: v.string(),                       // ISO datetime
  })
    .index("by_entityType_and_entityId", ["entityType", "entityId"])
    .index("by_userId", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"]),
});
```

---

## File Storage Strategy

| Aspect | Approach |
|---|---|
| **Storage backend** | Convex built-in file storage (`_storage` system table) |
| **References** | `v.id("_storage")` in `documents.storageId` and `communications.attachmentStorageIds` |
| **Upload flow** | Client generates upload URL via `storage.generateUploadUrl()`, uploads file, receives `storageId`, creates `documents` row with metadata |
| **Serving** | `storage.getUrl(storageId)` returns a short-lived signed URL for viewing/download |
| **Retention** | Documents linked to dossiers are retained 15 years. `dossiers.retentionExpiresAt` tracks expiry. `isArchivedForRetention` flag enables cold-storage optimization after 2 years of inactivity |
| **Nieuwbouw uploads** | Aannemers upload via self-service portal using `nieuwbouwProjects.accessToken`. Documents land in `documents` with `isProjectLevel: true` for shared docs or with specific `orderId` for per-unit docs |
| **Size limits** | Convex supports files up to 100MB. Photos typically 2-10MB, PDFs 0.5-5MB. No issues expected |

## Entity Relationship Summary

```
companies ──1:N──> contacts
companies ──1:N──> projects
companies ──1:N──> intermediaries
companies ──1:N──> orders (direct)

projects  ──1:N──> orders
projects  ──1:1──> nieuwbouwProjects (if type=NIEUWBOUW)
projects  ──1:N──> quotes
projects  ──1:N──> invoices

orders    ──N:1──> addresses
orders    ──1:N──> orderProducts
orders    ──1:1──> dossiers
orders    ──1:N──> appointments
orders    ──1:N──> costMutations
orders    ──1:N──> documents (via dossier)
orders    ──1:N──> statusHistory
orders    ──1:N──> communications
orders    ──1:1──> trackAndTrace
orders    ──N:1──> invoices
orders    ──N:1──> users (assignedAdviseurId)

quotes    ──1:N──> quoteLineItems
invoices  ──1:N──> invoiceLineItems

nieuwbouwProjects ──1:N──> nieuwbouwDocumentRequirements

products  ──1:N──> pricingRules
products  ──1:N──> orderProducts
products  ──1:N──> quoteLineItems

users     ──1:1──> adviseurProfiles (if EP-adviseur role)
users     ──1:N──> timeEntries
users     ──1:N──> notifications
```

## Index Strategy Notes

1. **Compound indexes** like `by_status_and_assignedAdviseurId` on `orders` support the most common dashboard queries: "show me all orders in status X assigned to adviseur Y"
2. **Search indexes** on `orders`, `contacts`, `companies`, `projects`, `addresses`, and `intermediaries` enable the global search bar (zoekfunctie)
3. **Date-based indexes** on `appointments`, `timeEntries`, and `statusHistory` support calendar views and reporting queries
4. **Foreign key indexes** (e.g. `by_orderId` on almost every child table) are essential for Convex's query model since there are no JOINs — you always query children by parent ID
5. The `by_key` index on `settings` enables O(1) lookup of any config value

## Reference Code Format

| Entity | Pattern | Example |
|---|---|---|
| Order | `VV-{YYYY}-{5-digit seq}` | `VV-2026-00142` |
| Quote | `OFF-{YYYY}-{5-digit seq}` | `OFF-2026-00042` |
| Invoice | `FAC-{YYYY}-{5-digit seq}` | `FAC-2026-00321` |
| Project | `{TYPE}-{YY}-{3-digit seq}` | `CORP-26-001`, `BEL-26-014` |
| Track & Trace | `VV-{4 alphanum}-{4 alphanum}` | `VV-A3K9-X2M1` |
