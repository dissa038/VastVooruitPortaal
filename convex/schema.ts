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
  v.literal("EPWB"),
  v.literal("EPWD"),
  v.literal("EPUB"),
  v.literal("EPUD"),
  v.literal("MWAW"),
  v.literal("MWAU"),
);

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

export default defineSchema({
  // USERS — Internal team members, synced from Clerk
  users: defineTable({
    clerkId: v.string(),
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

  // ADVISEUR PROFILES — EP-adviseur specializations, location, travel prefs
  adviseurProfiles: defineTable({
    userId: v.id("users"),
    specializations: v.array(productType),
    buildingTypeExperience: v.array(buildingType),
    homePostcode: v.string(),
    homeCity: v.string(),
    maxTravelDistanceKm: v.optional(v.number()),
    travelWillingness: v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
    ),
    weeklyCapacityHours: v.number(),
    canDoNieuwbouw: v.boolean(),
    canDoUtiliteit: v.boolean(),
    outlookCalendarId: v.optional(v.string()),
    outlookEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
    isAvailable: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_homePostcode", ["homePostcode"]),

  // CONTACTS — External people: clients, tenants, intermediaries, contractors
  contacts: defineTable({
    companyId: v.optional(v.id("companies")),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    postcode: v.optional(v.string()),
    city: v.optional(v.string()),
    role: v.union(
      v.literal("EIGENAAR"),
      v.literal("HUURDER"),
      v.literal("OPDRACHTGEVER"),
      v.literal("BEWONER"),
      v.literal("CONTACTPERSOON"),
      v.literal("MAKELAAR"),
      v.literal("AANNEMER_CONTACT"),
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

  // COMPANIES — Corporaties, beleggers, makelaarkantoren, aannemers, etc.
  companies: defineTable({
    name: v.string(),
    type: companyType,
    kvkNumber: v.optional(v.string()),
    vatNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    postcode: v.optional(v.string()),
    city: v.optional(v.string()),
    invoiceEmail: v.optional(v.string()),
    invoiceAddress: v.optional(v.string()),
    invoicePostcode: v.optional(v.string()),
    invoiceCity: v.optional(v.string()),
    paymentTermDays: v.optional(v.number()),
    leadSource: v.optional(v.string()),
    accountManagerId: v.optional(v.id("users")),
    hasContract: v.boolean(),
    contractStartDate: v.optional(v.string()),
    contractEndDate: v.optional(v.string()),
    contractNotes: v.optional(v.string()),
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

  // INTERMEDIARIES — Tussenpersonen
  intermediaries: defineTable({
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    name: v.string(),
    type: v.union(
      v.literal("MAKELAAR"),
      v.literal("BANK"),
      v.literal("VASTGOEDBEHEERDER"),
      v.literal("BOUWBEDRIJF"),
      v.literal("HOMEVISUALS"),
      v.literal("TIMAX"),
      v.literal("OVERIG"),
    ),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    ccEmailOnDelivery: v.optional(v.string()),
    preferredChecklistType: v.optional(v.string()),
    invoiceViaIntermediary: v.boolean(),
    invoiceEmail: v.optional(v.string()),
    totalOrdersReferred: v.optional(v.number()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_type", ["type"])
    .searchIndex("search_intermediaries", {
      searchField: "name",
      filterFields: ["type"],
    }),

  // PRODUCTS — Service catalog
  products: defineTable({
    name: v.string(),
    type: productType,
    description: v.optional(v.string()),
    basePriceExVat: v.number(),
    vatPercentage: v.number(),
    isActive: v.boolean(),
    sortOrder: v.number(),
    requiresOnSiteVisit: v.boolean(),
    estimatedDurationMinutes: v.optional(v.number()),
  })
    .index("by_type", ["type"])
    .index("by_isActive", ["isActive"]),

  // PRICING RULES — Per client type, per product, volume discounts, surcharges
  pricingRules: defineTable({
    productId: v.id("products"),
    buildingType: v.optional(buildingType),
    clientType: v.optional(clientType),
    companyId: v.optional(v.id("companies")),
    priceExVat: v.number(),
    minQuantity: v.optional(v.number()),
    maxQuantity: v.optional(v.number()),
    isSurcharge: v.boolean(),
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
    validFrom: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_productId", ["productId"])
    .index("by_companyId", ["companyId"])
    .index("by_clientType", ["clientType"]),

  // ADDRESSES — BAG-linked address data
  addresses: defineTable({
    street: v.string(),
    houseNumber: v.string(),
    houseNumberAddition: v.optional(v.string()),
    postcode: v.string(),
    city: v.string(),
    province: v.optional(v.string()),
    country: v.optional(v.string()),
    bagVerblijfsobjectId: v.optional(v.string()),
    bagPandId: v.optional(v.string()),
    bagOppervlakte: v.optional(v.number()),
    bagBouwjaar: v.optional(v.number()),
    bagGebruiksdoel: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    isNieuwbouw: v.optional(v.boolean()),
    buildingType: v.optional(buildingType),
  })
    .index("by_postcode", ["postcode"])
    .index("by_bagVerblijfsobjectId", ["bagVerblijfsobjectId"])
    .index("by_bagPandId", ["bagPandId"])
    .searchIndex("search_addresses", {
      searchField: "street",
      filterFields: ["postcode", "city"],
    }),

  // PROJECTS — Grouping of orders
  projects: defineTable({
    name: v.string(),
    referenceCode: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
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
    description: v.optional(v.string()),
    estimatedOrderCount: v.optional(v.number()),
    quoteId: v.optional(v.id("quotes")),
    contractPriceExVat: v.optional(v.number()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    deadline: v.optional(v.string()),
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

  // ORDERS — Individual assignment per address (CORE entity)
  orders: defineTable({
    referenceCode: v.string(),
    addressId: v.id("addresses"),
    projectId: v.optional(v.id("projects")),
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    bewonerId: v.optional(v.id("contacts")),
    intermediaryId: v.optional(v.id("intermediaries")),
    assignedAdviseurId: v.optional(v.id("users")),
    status: orderStatus,
    clientType: v.optional(clientType),
    buildingType: v.optional(buildingType),
    deelgebied: v.optional(deelgebied),
    isNieuwbouw: v.boolean(),
    requestedDate: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    opnameDoneAt: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    totalPriceExVat: v.optional(v.number()),
    totalPriceInclVat: v.optional(v.number()),
    epOnlineGebouwklasse: v.optional(v.string()),
    epOnlineGebouwtype: v.optional(v.string()),
    epOnlineGebouwsubtype: v.optional(v.string()),
    epOnlineStatusBijAanmelding: v.optional(v.string()),
    epOnlineNieuweStatus: v.optional(v.string()),
    epOnlineLabelOud: v.optional(v.string()),
    epOnlineLabelNieuw: v.optional(v.string()),
    epOnlineRegistratieId: v.optional(v.string()),
    uniec3Status: v.optional(v.union(
      v.literal("NIET_GESTART"),
      v.literal("IN_WACHTRIJ"),
      v.literal("BEZIG"),
      v.literal("VOLTOOID"),
      v.literal("FOUT"),
    )),
    uniec3LastRunAt: v.optional(v.string()),
    invoiceId: v.optional(v.id("invoices")),
    quoteId: v.optional(v.id("quotes")),
    isNoShow: v.boolean(),
    noShowCount: v.optional(v.number()),
    requiresHerbezoek: v.optional(v.boolean()),
    costsConfirmedByAdviseur: v.boolean(),
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
    .index("by_clientType", ["clientType"])
    .searchIndex("search_orders", {
      searchField: "referenceCode",
      filterFields: ["status", "projectId", "assignedAdviseurId", "companyId"],
    }),

  // ORDER PRODUCTS — Products assigned to an order
  orderProducts: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    priceExVat: v.number(),
    priceInclVat: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_productId", ["productId"]),

  // QUOTES — Offertes with line items
  quotes: defineTable({
    referenceCode: v.string(),
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    projectId: v.optional(v.id("projects")),
    intermediaryId: v.optional(v.id("intermediaries")),
    status: quoteStatus,
    title: v.optional(v.string()),
    introText: v.optional(v.string()),
    conditions: v.optional(v.string()),
    totalExVat: v.number(),
    totalInclVat: v.number(),
    vatAmount: v.number(),
    sentAt: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    acceptedAt: v.optional(v.string()),
    rejectedAt: v.optional(v.string()),
    signedByName: v.optional(v.string()),
    signedAt: v.optional(v.string()),
    signatureStorageId: v.optional(v.id("_storage")),
    createdByUserId: v.id("users"),
    notes: v.optional(v.string()),
    isArchived: v.boolean(),
  })
    .index("by_status", ["status"])
    .index("by_companyId", ["companyId"])
    .index("by_projectId", ["projectId"])
    .index("by_referenceCode", ["referenceCode"])
    .index("by_createdByUserId", ["createdByUserId"]),

  // QUOTE LINE ITEMS
  quoteLineItems: defineTable({
    quoteId: v.id("quotes"),
    productId: v.optional(v.id("products")),
    description: v.string(),
    quantity: v.number(),
    unitPriceExVat: v.number(),
    totalExVat: v.number(),
    vatPercentage: v.number(),
    buildingType: v.optional(buildingType),
    sortOrder: v.number(),
  })
    .index("by_quoteId", ["quoteId"]),

  // INVOICES — Moneybird-synced
  invoices: defineTable({
    referenceCode: v.string(),
    moneybirdInvoiceId: v.optional(v.string()),
    moneybirdInvoiceUrl: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    contactId: v.optional(v.id("contacts")),
    projectId: v.optional(v.id("projects")),
    status: invoiceStatus,
    totalExVat: v.number(),
    totalInclVat: v.number(),
    vatAmount: v.number(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    sentAt: v.optional(v.string()),
    paidAt: v.optional(v.string()),
    reminderCount: v.optional(v.number()),
    lastReminderSentAt: v.optional(v.string()),
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

  // INVOICE LINE ITEMS
  invoiceLineItems: defineTable({
    invoiceId: v.id("invoices"),
    orderId: v.optional(v.id("orders")),
    productId: v.optional(v.id("products")),
    description: v.string(),
    quantity: v.number(),
    unitPriceExVat: v.number(),
    totalExVat: v.number(),
    vatPercentage: v.number(),
    sortOrder: v.number(),
  })
    .index("by_invoiceId", ["invoiceId"])
    .index("by_orderId", ["orderId"]),

  // COST MUTATIONS — Meerwerk/minderwerk per order
  costMutations: defineTable({
    orderId: v.id("orders"),
    createdByUserId: v.id("users"),
    type: v.union(
      v.literal("MEERWERK"),
      v.literal("MINDERWERK"),
      v.literal("NO_SHOW"),
      v.literal("HERBEZOEK"),
      v.literal("DESTRUCTIEF_ONDERZOEK"),
      v.literal("TYPE_WIJZIGING"),
      v.literal("OVERIG"),
    ),
    description: v.string(),
    amountExVat: v.number(),
    isApproved: v.boolean(),
    approvedByUserId: v.optional(v.id("users")),
    approvedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_createdByUserId", ["createdByUserId"])
    .index("by_isApproved", ["isApproved"]),

  // APPOINTMENTS — Planned visits, linked to Outlook
  appointments: defineTable({
    orderId: v.id("orders"),
    additionalOrderIds: v.optional(v.array(v.id("orders"))),
    adviseurId: v.id("users"),
    startTime: v.string(),
    endTime: v.string(),
    isAllDay: v.boolean(),
    addressId: v.id("addresses"),
    outlookEventId: v.optional(v.string()),
    outlookCalendarId: v.optional(v.string()),
    isSyncedToOutlook: v.boolean(),
    lastSyncedAt: v.optional(v.string()),
    status: v.union(
      v.literal("GEPLAND"),
      v.literal("BEVESTIGD"),
      v.literal("ONDERWEG"),
      v.literal("VOLTOOID"),
      v.literal("NO_SHOW"),
      v.literal("GEANNULEERD"),
      v.literal("VERZET"),
    ),
    confirmationSentAt: v.optional(v.string()),
    reminderSentAt: v.optional(v.string()),
    notes: v.optional(v.string()),
    travelTimeMinutes: v.optional(v.number()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_adviseurId", ["adviseurId"])
    .index("by_startTime", ["startTime"])
    .index("by_adviseurId_and_startTime", ["adviseurId", "startTime"])
    .index("by_outlookEventId", ["outlookEventId"])
    .index("by_status", ["status"]),

  // DOSSIERS — Document collection per order
  dossiers: defineTable({
    orderId: v.id("orders"),
    projectId: v.optional(v.id("projects")),
    completenessPercentage: v.number(),
    isComplete: v.boolean(),
    requiredDocumentTypes: v.array(v.string()),
    isAuditable: v.boolean(),
    lastCheckedAt: v.optional(v.string()),
    retentionExpiresAt: v.optional(v.string()),
    isArchivedForRetention: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_projectId", ["projectId"])
    .index("by_isComplete", ["isComplete"]),

  // DOCUMENTS — Files: photos, forms, certificates, labels
  documents: defineTable({
    storageId: v.id("_storage"),
    dossierId: v.optional(v.id("dossiers")),
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),
    nieuwbouwProjectId: v.optional(v.id("nieuwbouwProjects")),
    fileName: v.string(),
    fileType: v.string(),
    fileSizeBytes: v.number(),
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
    isProjectLevel: v.boolean(),
    uploadedByUserId: v.optional(v.id("users")),
    uploadedByContactId: v.optional(v.id("contacts")),
    uploadedAt: v.string(),
    notes: v.optional(v.string()),
    isArchived: v.boolean(),
  })
    .index("by_dossierId", ["dossierId"])
    .index("by_orderId", ["orderId"])
    .index("by_projectId", ["projectId"])
    .index("by_nieuwbouwProjectId", ["nieuwbouwProjectId"])
    .index("by_category", ["category"])
    .index("by_storageId", ["storageId"]),

  // NIEUWBOUW PROJECTS — Construction projects with structured doc requirements
  nieuwbouwProjects: defineTable({
    projectId: v.id("projects"),
    aannemerId: v.optional(v.id("companies")),
    aannemerContactId: v.optional(v.id("contacts")),
    accessToken: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.string()),
    totalRequirements: v.optional(v.number()),
    fulfilledRequirements: v.optional(v.number()),
    completenessPercentage: v.optional(v.number()),
    woningType: v.optional(v.string()),
    aantalWoningen: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_aannemerId", ["aannemerId"])
    .index("by_accessToken", ["accessToken"]),

  // NIEUWBOUW DOCUMENT REQUIREMENTS
  nieuwbouwDocumentRequirements: defineTable({
    nieuwbouwProjectId: v.id("nieuwbouwProjects"),
    orderId: v.optional(v.id("orders")),
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
    description: v.string(),
    isRequired: v.boolean(),
    isProjectLevel: v.boolean(),
    status: v.union(
      v.literal("NIET_AANGELEVERD"),
      v.literal("AANGELEVERD"),
      v.literal("GOEDGEKEURD"),
      v.literal("AFGEKEURD"),
    ),
    documentId: v.optional(v.id("documents")),
    reviewedByUserId: v.optional(v.id("users")),
    reviewedAt: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    sortOrder: v.number(),
  })
    .index("by_nieuwbouwProjectId", ["nieuwbouwProjectId"])
    .index("by_orderId", ["orderId"])
    .index("by_status", ["status"])
    .index("by_nieuwbouwProjectId_and_element", ["nieuwbouwProjectId", "element"]),

  // TIME ENTRIES — Hour registration
  timeEntries: defineTable({
    userId: v.id("users"),
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),
    date: v.string(),
    durationMinutes: v.number(),
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

  // COMMUNICATIONS — Sent emails audit trail
  communications: defineTable({
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),
    contactId: v.optional(v.id("contacts")),
    companyId: v.optional(v.id("companies")),
    type: v.union(
      v.literal("EMAIL"),
      v.literal("SMS"),
      v.literal("WHATSAPP"),
      v.literal("BRIEF"),
    ),
    templateId: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    toEmail: v.optional(v.string()),
    ccEmails: v.optional(v.array(v.string())),
    bccEmails: v.optional(v.array(v.string())),
    sentAt: v.optional(v.string()),
    sentByUserId: v.optional(v.id("users")),
    status: v.union(
      v.literal("CONCEPT"),
      v.literal("VERZONDEN"),
      v.literal("MISLUKT"),
      v.literal("GEOPEND"),
    ),
    errorMessage: v.optional(v.string()),
    attachmentStorageIds: v.optional(v.array(v.id("_storage"))),
  })
    .index("by_orderId", ["orderId"])
    .index("by_projectId", ["projectId"])
    .index("by_contactId", ["contactId"])
    .index("by_type", ["type"])
    .index("by_sentAt", ["sentAt"]),

  // STATUS HISTORY — Audit trail of status changes
  statusHistory: defineTable({
    orderId: v.id("orders"),
    previousStatus: v.optional(v.string()),
    newStatus: v.string(),
    changedByUserId: v.optional(v.id("users")),
    changedAt: v.string(),
    reason: v.optional(v.string()),
    metadata: v.optional(v.string()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_newStatus", ["newStatus"])
    .index("by_changedAt", ["changedAt"]),

  // CHECKLIST TEMPLATES
  checklistTemplates: defineTable({
    name: v.string(),
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
    items: v.array(v.object({
      label: v.string(),
      isRequired: v.boolean(),
      sortOrder: v.number(),
    })),
    emailSubjectTemplate: v.optional(v.string()),
    emailBodyTemplate: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_orderType", ["orderType"])
    .index("by_isActive", ["isActive"]),

  // NOTIFICATIONS
  notifications: defineTable({
    userId: v.id("users"),
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
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),
    quoteId: v.optional(v.id("quotes")),
    invoiceId: v.optional(v.id("invoices")),
    isRead: v.boolean(),
    readAt: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_isRead", ["userId", "isRead"])
    .index("by_type", ["type"]),

  // SETTINGS — Organization-level config
  settings: defineTable({
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
    updatedByUserId: v.optional(v.id("users")),
    updatedAt: v.optional(v.string()),
  })
    .index("by_key", ["key"]),

  // EMAIL TEMPLATES
  emailTemplates: defineTable({
    name: v.string(),
    slug: v.string(),
    subject: v.string(),
    body: v.string(),
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

  // TRACK AND TRACE — Public status page codes
  trackAndTrace: defineTable({
    orderId: v.id("orders"),
    code: v.string(),
    contactId: v.optional(v.id("contacts")),
    lastPublicStatus: v.string(),
    lastPublicStatusUpdatedAt: v.string(),
    appointmentDate: v.optional(v.string()),
    adviseurFirstName: v.optional(v.string()),
    isActive: v.boolean(),
    expiresAt: v.optional(v.string()),
  })
    .index("by_code", ["code"])
    .index("by_orderId", ["orderId"]),

  // ACTIVITY LOG — General audit log
  activityLog: defineTable({
    userId: v.optional(v.id("users")),
    actorName: v.optional(v.string()),
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
    entityId: v.string(),
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
    description: v.string(),
    metadata: v.optional(v.string()),
    timestamp: v.string(),
  })
    .index("by_entityType_and_entityId", ["entityType", "entityId"])
    .index("by_userId", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"]),
});
