# VastVooruit Platform — Technisch Implementatie Scope

> **Versie**: 1.0
> **Datum**: 18 maart 2026
> **Opgesteld door**: Airflows
> **Status**: Concept — ter review

---

## Inhoudsopgave

1. [Executive Summary](#1-executive-summary)
2. [Architectuur & Tech Stack](#2-architectuur--tech-stack)
3. [Data Model](#3-data-model)
4. [Authenticatie & Autorisatie](#4-authenticatie--autorisatie)
5. [Feature Specificaties per Fase](#5-feature-specificaties-per-fase)
6. [Proces Flows](#6-proces-flows)
7. [Integraties](#7-integraties)
8. [UI / Pagina-inventaris](#8-ui--pagina-inventaris)
9. [Security & Compliance](#9-security--compliance)
10. [Implementatie Strategie](#10-implementatie-strategie)

---

## 1. Executive Summary

### Wat bouwen we?

Een geïntegreerd platform dat de 15+ losstaande systemen van VastVooruit vervangt door één werkplaats voor het volledige energielabel-traject: van lead tot archief. Het platform combineert dossierbeheer (vervangt huidig Portal), CRM-light met offerteflow, boekhouding (Moneybird-koppeling), planning met Outlook-sync, nieuwbouw dossiervorming, en een browser-bot voor Uniec3 automatisering.

### Waarom?

| Probleem | Impact | Oplossing |
|---|---|---|
| 15+ losse systemen, 0 integraties | 40+ uur/week handmatige data-invoer | 1 geïntegreerd platform |
| Jarco's inbox = enige CRM | Volledige werkdag besteed aan email | CRM-light met intake pipeline |
| €40K+ openstaand door slechte opvolging | Directe cashflow impact | Moneybird-koppeling + auto-herinneringen |
| ~300 parameters handmatig in Uniec3 | 40+ uur/week repetitief werk | Browser-bot (bewezen in test) |
| Planning: dubbel werk Portal + Outlook | Elke afspraak 2x invoeren | Bidirectionele Outlook-sync |
| Leek ziet alle data | Security risico | Eigen platform, eigen data |
| Nieuwbouw dossiervorming 100% handmatig | Duizenden docs handmatig sorteren | Aannemer self-service portaal |

### Voor wie?

| Rol | Persoon | Primair gebruik |
|---|---|---|
| Admin | Jarco, Mark | Alles: CRM, offertes, overzicht, rapportage |
| EP-adviseur | Thijs, Daan, Rick, Jurre, Ben, Marit | Eigen orders, veldwerk, kostenmutaties, uren |
| Planner | Aviejah | Planning, intake, adviseur-toewijzing, kalender |
| Administratie | Jasper | Facturatie, debiteuren, kostenmutaties, rapportage |
| Back-office | Joris | Uitwerking, dossierbeheer, bot-review |
| Aannemer (extern) | Per project | Documenten uploaden in dossierstructuur |
| Makelaar (extern) | Per tussenpersoon | Status van eigen doorverwezen orders |

---

## 2. Architectuur & Tech Stack

### Core Stack

| Laag | Technologie | Waarom |
|---|---|---|
| **Frontend** | Next.js 16 (App Router) + React 19 | Server Components, snelle navigatie, SEO voor publieke pagina's |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Productie-klaar component library, VastVooruit branding |
| **Database** | Convex | Real-time by default (status pipeline, planning), TypeScript end-to-end, ingebouwde file storage, cron jobs |
| **Auth** | Clerk | Multi-role (7 rollen), externe gebruikers (aannemer/makelaar), org-based, webhook sync naar Convex |
| **Boekhouding** | Moneybird API v2 | Facturatie, debiteurenopvolging, BTW-aangifte |
| **Kalender** | Microsoft Graph API v1.0 | Outlook bidirectionele sync, email verzending vanuit adviseur-accounts |
| **Adressen** | BAG API (Kadaster) | Postcode lookup, bouwjaar, oppervlakte, verblijfsobject-ID |
| **Browser Bot** | Playwright (Docker op Fly.io) | Uniec3 parameter-invoer automatisering |
| **Betalingen** | Mollie | Betaallinks voor orders <€1.000 |
| **Hosting** | Vercel | Frontend + API routes, edge network |
| **Bot Worker** | Fly.io (Docker) | Uniec3 browser bot, aparte machine |

### Architectuur Diagram (tekstueel)

```
┌──────────────────────────────────────────────────────┐
│                    VERCEL (Next.js 16)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │Dashboard │ │ Orders   │ │ Planning │ │ CRM     │ │
│  │          │ │ Dossiers │ │ Kalender │ │ Offertes│ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │
│       └─────────────┴────────────┴─────────────┘     │
│                         │                            │
│                    Clerk Auth                        │
└─────────────────────────┬────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │     CONVEX (DB)       │
              │  Real-time queries    │
              │  Mutations            │
              │  File Storage         │
              │  Cron Jobs            │
              │  HTTP Actions         │
              └───┬───┬───┬───┬──────┘
                  │   │   │   │
         ┌────────┘   │   │   └────────┐
         │            │   │            │
    ┌────┴────┐  ┌────┴───┐  ┌────────┴──────┐
    │Moneybird│  │Outlook │  │ BAG API       │
    │API v2   │  │Graph   │  │ (Kadaster)    │
    │         │  │API v1  │  │               │
    └─────────┘  └────────┘  └───────────────┘

    ┌──────────────────────┐  ┌───────────────┐
    │ FLY.IO (Docker)      │  │ MOLLIE        │
    │ Uniec3 Browser Bot   │  │ Betaallinks   │
    │ Playwright + Cron    │  │               │
    └──────────────────────┘  └───────────────┘

┌───────────────── PUBLIEKE PAGINA'S ─────────────────┐
│  /track/[code]     Track & Trace (PostNL-model)     │
│  /accept/[code]    Offerte acceptatie + handtekening│
│  /contractor/[code] Aannemer document upload         │
│  /intake           Standalone intake formulier       │
└─────────────────────────────────────────────────────┘
```

### Convex Design Principes

- **Real-time first**: Alle data-wijzigingen zijn direct zichtbaar voor alle gebruikers (status pipeline, planning updates, nieuwbouw completeness)
- **Type-safe end-to-end**: Convex validators op backend → TypeScript types op frontend, geen runtime type-mismatches
- **File storage**: Convex Storage voor alle documenten/foto's, gekoppeld aan records via `v.id("_storage")`
- **Cron jobs**: Moneybird sync (elke 5 min), Outlook sync (elke 2 min), bot scheduling (nachtelijk), debiteurenherinneringen (dagelijks)
- **HTTP actions**: Webhooks van Moneybird, Outlook, Mollie afhandelen

---

## 3. Data Model

> **Volledig schema**: zie [`DATA_MODEL.md`](./DATA_MODEL.md)

### Overzicht: 27+ tabellen

| Categorie | Tabellen |
|---|---|
| **Kern** | `users`, `contacts`, `companies`, `addresses`, `orders`, `orderProducts`, `projects` |
| **Adviseur** | `adviseurProfiles` (specialisaties, locatie, reisbereidheid) |
| **Commercieel** | `intermediaries`, `products`, `pricingRules`, `quotes`, `quoteLineItems` |
| **Financieel** | `invoices`, `invoiceLineItems`, `costMutations`, `timeEntries` |
| **Documenten** | `dossiers`, `documents` (Convex Storage referenties) |
| **Nieuwbouw** | `nieuwbouwProjects`, `nieuwbouwDocumentRequirements` |
| **Planning** | `appointments` (Outlook-synced), `checklistTemplates` |
| **Communicatie** | `communications`, `emailTemplates`, `notifications`, `trackAndTrace` |
| **Audit** | `statusHistory`, `activityLog`, `settings` |

### Order Status Flow (kerntabel)

```
NIEUW → OFFERTE_VERSTUURD → GEACCEPTEERD → INGEPLAND → OPNAME_GEDAAN
  → IN_UITWERKING → CONCEPT_GEREED → CONTROLE → GEREGISTREERD
  → VERZONDEN → AFGEROND

Zijstatussen: ON_HOLD, GEANNULEERD, NO_SHOW
Bot-statussen: BOT_BEZIG, BOT_KLAAR, BOT_FOUT, BOT_WACHT_2FA
```

### Sleutelrelaties

```
Company (1) ←→ (N) Contacts
Company (1) ←→ (N) Projects
Project (1) ←→ (N) Orders
Order (1) ←→ (1) Address (BAG)
Order (1) ←→ (1) Dossier ←→ (N) Documents
Order (1) ←→ (N) CostMutations
Order (1) ←→ (N) TimeEntries
Order (1) ←→ (N) Appointments
Order (1) ←→ (0..1) Invoice ←→ (N) InvoiceLineItems
Quote (1) ←→ (N) QuoteLineItems
Quote (1) ←→ (0..1) Project (bij acceptatie)
NieuwbouwProject (1) ←→ (N) Orders (per woning)
NieuwbouwProject (1) ←→ (N) NieuwbouwDocumentRequirements
Intermediary (1) ←→ (N) Orders (doorverwezen)
User (1) ←→ (0..1) AdviseurProfile
```

---

## 4. Authenticatie & Autorisatie

### Clerk Configuratie

| Setting | Waarde |
|---|---|
| Model | Organization-based (VastVooruit = primaire org) |
| Rollen | Via `publicMetadata.role` op Clerk user |
| Externe gebruikers | Aparte org-leden met beperkte rollen |
| MFA | Optioneel voor intern, uitgeschakeld voor extern |
| Sessie | Intern: 7 dagen, 30 min idle. Extern: 24 uur. |
| Webhook sync | `user.created/updated/deleted` → Convex `users` tabel |

### Rollen & Permissies (samenvatting)

| Capability | Admin | EP-adviseur | Planner | Administratie | Back-office | Aannemer | Makelaar |
|---|---|---|---|---|---|---|---|
| Orders | CRUD | R + U(eigen) | CR + U(planning) | R + U(status) | R + U(uitwerken) | -- | R(eigen) |
| CRM | CRUD | R | CRUD | R | -- | -- | -- |
| Offertes | CRUD | R | R | R | -- | -- | -- |
| Planning | CRUD | R(eigen) | CRUD | -- | -- | -- | -- |
| Facturatie | CRUD | -- | -- | CRUD | -- | -- | -- |
| Nieuwbouw | CRUD | R(toegewezen) | CRU | R | RU(docs) | CRU(eigen) | -- |
| Rapporten | CRUD | R(eigen) | R(planning) | CRUD | -- | -- | -- |
| Instellingen | CRUD | R(eigen profiel) | -- | RU(prijzen) | -- | -- | -- |
| Bot dashboard | CRUD | R(eigen) | -- | -- | CRUD | -- | -- |

### Autorisatie op Convex-niveau

Elke Convex mutation/query valideert de rol:

```typescript
// Patroon: requireRole helper
const user = await requireRole(ctx, ["admin", "planner"]);

// Data scoping per rol
if (user.role === "ep_adviseur") {
  return orders.filter(o => o.adviseurId === user._id);
}
```

---

## 5. Feature Specificaties per Fase

> **Volledige specs**: zie [`FEATURE_SPECS_PHASE_0_AND_1.md`](./FEATURE_SPECS_PHASE_0_AND_1.md) en [`FEATURE_SPECS_PHASE_2_3_4.md`](./FEATURE_SPECS_PHASE_2_3_4.md)

### Fase 0 — Quick Wins (onafhankelijk van platform)

| Feature | Omschrijving | Impact |
|---|---|---|
| **0.1 Uniec3 Browser Bot** | Playwright-bot leest opnameformulier, voert ~300 params in Uniec3. Draait nachtelijk op Fly.io. Start met standaard woningen (basismethode). Menselijke review 's ochtends. | 40+ uur/week bespaard |
| **0.2 Intake Formulier** | Publiek webformulier op intake.vastvooruit.nl. BAG auto-fill, multi-adres support, CSV bulk upload. Concept-orders in systeem. | Alle kanalen gestandaardiseerd |

### Fase 1 — Portal MVP (vervangt huidig Portal)

| Feature | Omschrijving |
|---|---|
| **1.1 Dossierbeheer** | Order management met 11-staps status pipeline (kanban + tabel), BAG-integratie, Finder-achtige document preview (spatiebalk), foto-upload, EP-adviseur toewijzing, projectgroepering |
| **1.2 CRM-light + Offerteflow** | Contacten/bedrijven, intermediairprofielen, lead pipeline (Simplicate-stijl kanban), offertemodule met templates per klantgroep, auto-pricing, digitale handtekening >€1.000, offerte→project conversie |
| **1.3 Boekhouding** | Moneybird-koppeling: auto-factuur bij "AFGEROND", realtime betaaloverzicht, geautomatiseerde herinneringen (7/14/21 dagen), debiteurendashboard met aging buckets |
| **1.4 Kostenmutaties** | Per-order: meerwerk, minderwerk, no-show, destructief onderzoek. EP-adviseur meldt, admin bevestigt. Blokkeert "AFGEROND" tot bevestigd. Auto-doorrekening naar factuur |
| **1.5 Uurregistratie** | Kleurcoded kalender per werktype. Uren boeken op projecten. 40u/week target. Inzicht in rendement per type werk (niet voor controle) |
| **1.6 Pricing Engine** | Productcatalogus, prijsregels per klanttype (particulier fixed, belegger staffel, corporatie contract, utiliteit oppervlakte), toeslagen (spoed, no-show, regio) |
| **1.7 Drie Klantflows** | Corporatie: contract→batch→bulk planning→35/65 facturatie. Belegger: offerte→project→dual communicatie→10dgn factuur. Particulier: intake→direct order→betaallink→levering |

### Fase 2 — Planning & Communicatie

| Feature | Omschrijving |
|---|---|
| **2.1 Slimme Planning** | Adviseurprofielen (specialisatie, locatie, reisbereidheid), AI-routeoptimalisatie op postcode, bidirectionele Outlook-sync via OAuth, bulkplanning corporaties, drag-drop kalender |
| **2.2 Nieuwbouw Dossiervorming** | Gestructureerde mappenstructuur per BRL, project- vs woningniveau documenten, aannemersportaal met self-service upload en live checklist (groen/rood) |
| **2.3 Automatische Communicatie** | Email templates per trigger×klanttype, dynamische CC vanuit intermediairprofiel, correcte checklist per opdrachttype, multi-party emails (opdrachtgever + bewoner) |
| **2.4 Klantportaal** | Code-gebaseerd track & trace (PostNL-model), makelaarlogin voor eigen orders, reschedule-verzoek flow |
| **2.5 Tussenpersoon Management** | Intermediairprofielen met voorkeuren, lead-tracking per tussenpersoon, HomeVisuals-integratie |

### Fase 3 — Veldwerk & Data

| Feature | Omschrijving |
|---|---|
| **3.1 Mobiele App** | React Native + Expo. Agenda, foto-capture naar correct dossier, digitaal opnameformulier, offline capable, kostenmutatie-invoer |
| **3.2 Digitaal Opnameformulier** | Gestructureerde JSON output die direct de Uniec3 bot voedt. Checkbox-gedomineerd, variabele geometrietabellen, tekentool voor plattegrond |
| **3.3 Management Dashboards** | KPI's (labels/maand, omzet/doelgroep, doorlooptijd, conversie), seizoenspatronen, capaciteitsplanning, tussenpersoon performance |

### Fase 4 — AI & Optimalisatie

| Feature | Omschrijving |
|---|---|
| **4.1 Email AI Agent** | AI op plannings-mailbox: categoriseer (nieuwe aanvraag/wijziging/statusvraag), maak concept-orders, stel antwoorden op. Altijd mens-in-the-loop. |
| **4.2 Academy** | RAG-gebaseerde kennisbank (BRL/NTA 8800/ISO), onboarding per rol, expert-kennis vastleggen, AI Q&A |
| **4.3 HR-Systeem** | Vervangt Personio + Loket handmatige overdracht. Digitale dossiers, POP's, verlof, verzuim, Loket mutatie-export, recruitment |

---

## 6. Proces Flows

> **Volledige technische flows**: zie het process flows document (geëxporteerd als JSON vanwege omvang)

### Samenvatting kernprocessen

**1. Lead → Offerte → Project**
- Leads via 7+ kanalen → gestandaardiseerd intake formulier
- >€1.000: offerte met digitale handtekening → geaccepteerd → auto project+orders
- <€1.000: direct als order invoeren (skip offerte)
- 3 varianten: corporatie (contract), belegger (offerte), particulier (direct)

**2. Planning**
- Aviejah wijst adviseurs toe o.b.v. specialisatie + locatie + beschikbaarheid
- Outlook sync: 1x invoeren → synced naar adviseur-agenda + CarPlay
- Bevestigingsmail naar ALLE partijen (opdrachtgever + bewoner) met juiste checklist
- Corporatie bulk: 100+ adressen in batches, route-geoptimaliseerd

**3. Opname → Uitwerking → Levering**
- EP-adviseur op locatie: formulier + foto's → dossier
- Bot (nachtelijk): opnameformulier → Uniec3 (~300 params)
- Review → controle → registratie EP-online → levering (auto-email met CC's)
- <€1.000: betaallink eerst, label bij betaling

**4. Facturatie**
- Status "AFGEROND" triggert factuur (offerte + kostenmutaties)
- Moneybird sync: factuur + betaalstatus bidirectioneel
- Auto-herinneringen: 7, 14, 21 dagen na vervaldatum
- Per klanttype andere betaaltermijnen

**5. Nieuwbouw Dossiervorming**
- Aannemer uploadt documenten per element (vloer/gevel/dak)
- Live checklist: groen bij compleet
- Project-niveau (gedeeld) vs woning-niveau (specifiek)
- 15 jaar bewaarplicht per BRL

**6. Kostenmutaties**
- EP-adviseur rapporteert afwijkingen (meerwerk, no-show, etc.)
- Admin bevestigt → factuur wordt aangepast
- Order geblokkeerd tot alle mutaties bevestigd

---

## 7. Integraties

> **Volledige technische specs**: zie [`INTEGRATIONS_SCOPE.md`](./INTEGRATIONS_SCOPE.md)

### Overzicht

| Integratie | Type | Fase | Sync |
|---|---|---|---|
| **Moneybird** | REST API v2, OAuth 2.0 | 1 | Bidirectioneel (facturen + betaalstatus) |
| **Microsoft Graph** | REST API v1.0, OAuth 2.0 | 2 | Bidirectioneel (kalender + email) |
| **BAG API** | REST, API key | 1 | On-demand lookup + 30-dagen cache |
| **Uniec3** | Browser automation (Playwright) | 0 | Eenrichting (formulier → Uniec3) |
| **HomeVisuals** | TBD (webhook/email/CSV) | 2 | Eenrichting (orders importeren) |
| **Mollie** | REST API, webhooks | 2 | Bidirectioneel (betaallinks + status) |
| **EP-online** | Browser automation | 4 | Eenrichting (registratie) |
| **Loket/Harke** | Mutatierapport export | 4 | Eenrichting (HR → salarisadministratie) |

### Kritieke integratie: Moneybird

```
Order AFGEROND
  → Convex mutation: createInvoice()
    → POST /sales_invoices (Moneybird API)
      → Moneybird stuurt factuur naar klant
        → Betaling ontvangen
          → Webhook → Convex HTTP action → update order betaalstatus
```

### Kritieke integratie: Outlook

```
Afspraak gepland in VastVooruit platform
  → Convex mutation: createAppointment()
    → POST /users/{id}/events (Microsoft Graph)
      → Verschijnt in adviseur's Outlook + CarPlay
        → Wijziging in Outlook
          → Webhook notification → Convex HTTP action → update appointment
```

---

## 8. UI / Pagina-inventaris

### Totaal: 39 pagina's

| Sectie | Pagina's | Fase |
|---|---|---|
| Dashboard | 1 (rol-specifiek) | 1 |
| Orders (Dossierbeheer) | 3 (lijst, detail, nieuw) | 1 |
| CRM | 7 (contacts, companies, intermediaries, leads - elk lijst+detail) | 1-2 |
| Offertes | 4 (lijst, builder, PDF, publieke acceptatie) | 1 |
| Planning | 3 (kalender, bulk, routes) | 2 |
| Facturatie | 4 (lijst, detail, debiteuren, kostenmutaties) | 1 |
| Nieuwbouw | 4 (lijst, project, woning, contractor portaal) | 2 |
| Rapporten | 5 (hub, management, financial, adviseur, intermediary) | 3 |
| Instellingen | 8 (org, users, pricing, templates, checklists, products, integrations, hub) | 1-2 |
| Bot Dashboard | 1 | 0 |
| Publiek | 3 (track & trace, offerte acceptatie, intake formulier) | 0-2 |
| Extern | 1 (makelaar portaal) | 2 |

### Complete Route Map

```
/                                → Redirect to /dashboard
/sign-in                         → Clerk sign-in
/sign-up                         → Clerk invite-only sign-up

/dashboard                       → Rol-specifiek dashboard (Fase 1)

/orders                          → Orders lijst (kanban + tabel) (Fase 1)
/orders/new                      → Nieuwe order met BAG lookup (Fase 1)
/orders/[orderId]                → Order detail + dossier (Fase 1)

/crm/contacts                    → Contacten lijst (Fase 1)
/crm/contacts/[contactId]        → Contact detail (Fase 1)
/crm/companies                   → Bedrijven lijst (Fase 1)
/crm/companies/[companyId]       → Bedrijf detail (Fase 1)
/crm/intermediaries              → Tussenpersonen lijst (Fase 2)
/crm/intermediaries/[id]         → Tussenpersoon detail (Fase 2)
/crm/leads                       → Lead pipeline kanban (Fase 1)

/quotes                          → Offertes lijst (Fase 1)
/quotes/[quoteId]                → Offerte builder + detail (Fase 1)
/quotes/[quoteId]/pdf            → Offerte PDF preview (Fase 1)

/planning                        → Kalender view (Fase 2)
/planning/bulk                   → Bulk planning tool (Fase 2)
/planning/routes                 → Route optimizer (Fase 2)

/invoices                        → Facturen lijst (Fase 1)
/invoices/[invoiceId]            → Factuur detail (Fase 1)
/invoices/debtors                → Debiteuren dashboard (Fase 1)
/invoices/cost-mutations         → Kostenmutaties overzicht (Fase 1)

/nieuwbouw                       → Projecten lijst (Fase 2)
/nieuwbouw/[projectId]           → Project detail + gedeelde docs (Fase 2)
/nieuwbouw/[projectId]/[woningId]→ Woning dossier (Fase 2)

/reports                         → Rapporten hub (Fase 3)
/reports/management              → Management dashboard (Fase 3)
/reports/financial               → Financiële rapportage (Fase 3)
/reports/adviseurs               → Adviseur productiviteit (Fase 3)
/reports/intermediaries          → Tussenpersoon performance (Fase 3)

/settings                        → Instellingen hub (Fase 1)
/settings/organization           → Organisatie instellingen (Fase 1)
/settings/users                  → Gebruikersbeheer (Fase 1)
/settings/pricing                → Prijsregels (Fase 1)
/settings/email-templates        → Email templates (Fase 2)
/settings/checklists             → Checklist templates (Fase 2)
/settings/products               → Productcatalogus (Fase 1)
/settings/integrations           → Integratie instellingen (Fase 1)

/bot                             → Uniec3 bot dashboard (Fase 0)

--- Publiek (geen auth) ---
/intake                          → Standalone intake formulier (Fase 0)
/accept/[quoteCode]              → Offerte acceptatie (Fase 1)
/track/[trackCode]               → Track & trace klantportaal (Fase 2)

--- Extern (beperkte auth) ---
/contractor/[projectCode]        → Aannemer upload portaal (Fase 2)
/makelaar                        → Makelaar order overzicht (Fase 2)
```

---

## 9. Security & Compliance

### Data Security

| Aspect | Implementatie |
|---|---|
| Encryptie at rest | Convex standaard encryptie |
| Encryptie in transit | TLS 1.3 (Convex + Vercel standaard) |
| Toegang derden | Geen. Vervangt Leek's portaal volledig. |
| Rol-gebaseerde isolatie | Op Convex query/mutation niveau, niet alleen UI |
| Audit trail | `statusHistory` tabel: wie, wat, wanneer, oude waarde, nieuwe waarde. Immutable. |
| File access | Convex Storage met signed URLs (tijdgelimiteerd) |
| Input validatie | Convex validators op alle function arguments |

### AVG/GDPR

| Vereiste | Implementatie |
|---|---|
| Rechtsgrond | Uitvoering overeenkomst (klantdata), toestemming (marketing) |
| Recht op inzage | Admin exporteert alle data per contact als JSON/CSV |
| Recht op verwijdering | "Vergeet"-actie: anonimiseert PII. Uitzondering: labeldossiers 15 jaar bewaarplicht |
| Verwerkersregister | Gedocumenteerd in organisatie-instellingen |
| Verwerkers | Convex, Clerk, Vercel, Moneybird, Mollie — DPA met elk |

### BRL Compliance

| Vereiste | Implementatie |
|---|---|
| 15 jaar documentretentie | `retentionExpiry` per dossier, systeem voorkomt verwijdering |
| Volledige audit trail | Elke wijziging gelogd met user, timestamp, actie, oude/nieuwe waarde |
| Dossier completeness | Checklist per woningtype, order kan niet "AFGEROND" worden bij onvolledig dossier |
| Auditor export | Complete ZIP export per woning: alle documenten, foto's, berekeningen, audit trail |
| EP-adviseur traceerbaarheid | Elk label gekoppeld aan opname-adviseur én registratie-adviseur |

### File Storage & Retentie

| Aspect | Specificatie |
|---|---|
| Primaire opslag | Convex Storage (S3-backed, 99.999999999% durability) |
| Actieve periode | 2 jaar na afronding order |
| Archief | Na 2 jaar: compressie, metadata altijd toegankelijk |
| Totale retentie | 15 jaar voor labeldossiers |
| Geschatte groei | ~350 GB/jaar → ~5 TB over 15 jaar |
| Foto-verwerking | Auto-compressie (max 10 MB), EXIF GPS strip, thumbnail generatie |

---

## 10. Implementatie Strategie

### Fasering & Afhankelijkheden

```
Fase 0 (Quick Wins)          ← Onafhankelijk, direct startbaar
  ├── 0.1 Uniec3 Bot         ← Fly.io Docker + Playwright
  └── 0.2 Intake Formulier   ← Standalone Next.js pagina

Fase 1 (Portal MVP)          ← Kern van de transformatie
  ├── 1.1 Dossierbeheer      ← Basis: orders + dossiers + BAG
  ├── 1.2 CRM + Offerteflow  ← Bouwt voort op 1.1 (contacts/companies)
  ├── 1.3 Boekhouding        ← Vereist 1.1 + Moneybird integratie
  ├── 1.4 Kostenmutaties     ← Vereist 1.1
  ├── 1.5 Uurregistratie     ← Vereist users + orders
  ├── 1.6 Pricing Engine     ← Vereist products + pricingRules
  └── 1.7 Drie Klantflows    ← Integratie van 1.1-1.6

Fase 2 (Planning)            ← Vereist Fase 1 als basis
  ├── 2.1 Slimme Planning    ← Vereist Outlook integratie + adviseurProfiles
  ├── 2.2 Nieuwbouw          ← Vereist 1.1 dossierbeheer + Clerk externe users
  ├── 2.3 Auto Communicatie  ← Vereist emailTemplates + Outlook email
  ├── 2.4 Klantportaal       ← Vereist orders status flow
  └── 2.5 Tussenpersonen     ← Vereist CRM (1.2)

Fase 3 (Veldwerk)            ← Vereist Fase 1 + 2
  ├── 3.1 Mobiele App        ← React Native, Convex sync
  ├── 3.2 Digitaal Formulier ← Voedt bot (0.1)
  └── 3.3 Dashboards         ← Vereist data uit alle eerdere fases

Fase 4 (AI & HR)             ← Vereist volwassen platform
  ├── 4.1 Email AI Agent     ← Vereist Outlook integratie (2.1)
  ├── 4.2 Academy            ← Onafhankelijk te bouwen
  └── 4.3 HR-Systeem         ← Onafhankelijk te bouwen
```

### Parallelle Sporen

Fase 0 en Fase 1 kunnen **tegelijk** worden ontwikkeld:
- **Spoor A**: Uniec3 bot (onafhankelijk, Fly.io)
- **Spoor B**: Platform MVP (Next.js + Convex + Clerk)

### Leek-migratie

1. Platform MVP bouwen en testen
2. Data uit huidig Portal exporteren
3. Importeren in nieuw platform
4. Parallelle draaiperiode (1-2 weken)
5. Leek-toegang afsluiten
6. Besparing: ~€12K/jaar aan Portal-kosten

### Design Referentie

- **Simplicate** als UX-inspiratie: pipeline-based CRM, offerte→project flow, uurregistratie
- **VastVooruit branding**: deep teal `#0E2D2D`, vibrant green `#14AF52`, beige `#EAE3DF`
- **Finder-achtige document preview**: spatiebalk = quick preview, pijltjestoetsen = navigeren

---

## Bijlagen (aparte bestanden)

| Bestand | Inhoud |
|---|---|
| [`DATA_MODEL.md`](./DATA_MODEL.md) | Volledig Convex schema met 27+ tabellen, validators, indexes |
| [`FEATURE_SPECS_PHASE_0_AND_1.md`](./FEATURE_SPECS_PHASE_0_AND_1.md) | Gedetailleerde feature specs Fase 0 + 1 (acceptance criteria, UI, business rules) |
| [`FEATURE_SPECS_PHASE_2_3_4.md`](./FEATURE_SPECS_PHASE_2_3_4.md) | Gedetailleerde feature specs Fase 2, 3, 4 |
| [`INTEGRATIONS_SCOPE.md`](./INTEGRATIONS_SCOPE.md) | Technische integratie-specs (API details, auth, endpoints, error handling) |
| [`DISCOVERY_RAPPORT_VASTVOORUIT.html`](./DISCOVERY_RAPPORT_VASTVOORUIT.html) | Visueel discovery rapport v3.0 |

---

*Dit document is eigendom van VastVooruit. Niet delen zonder toestemming van beide partijen.*
