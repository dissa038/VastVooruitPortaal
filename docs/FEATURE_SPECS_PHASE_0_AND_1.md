# VastVooruit — Feature Specifications Phase 0 & Phase 1

**Tech Stack:** Next.js 16 + Convex (realtime DB) + Clerk (auth) + Tailwind v4 + shadcn/ui
**Design Reference:** Simplicate (CRM with pipeline view, offerte-to-project flow, hour tracking)
**Version:** 1.0
**Date:** 18 maart 2026

---

# PHASE 0: QUICK WINS

These features are independent of the main platform and can be built and deployed standalone.

---

## 0.1 Uniec3 Browser Bot

### User Story

**As** VastVooruit's back-office team, **I want** an automated bot that enters opnameformulier data into the Uniec3 web application overnight, **so that** I no longer spend 40+ hours per week on repetitive manual data entry of ~300 parameters per energielabel.

### Acceptance Criteria

- [ ] Bot reads structured opnameformulier data from Convex (or a staging data store) and enters all ~300 parameters into Uniec3's web interface via Playwright browser automation
- [ ] Bot runs on a configurable nightly schedule (default: 22:00 - 06:00) on a dedicated Mac Mini
- [ ] Bot only processes orders that meet ALL of the following criteria:
  - `status === "OPNAME_GEDAAN"`
  - `type === "bestaande_bouw_woning"` (basismethode only)
  - `botEligible === true` (no manual override flags)
- [ ] Bot processes orders from a priority queue (FIFO by default, with manual priority override)
- [ ] Bot operates at human-like speed: 5-15 minutes per label, with variable pauses between entries (3-5 min), resulting in 4-12 labels/hour
- [ ] Bot captures a screenshot after EACH major step (login, navigation, section completion, final review) and stores them linked to the order
- [ ] After successful completion, bot sets order status to `BOT_KLAAR` (awaiting human review)
- [ ] On failure, bot sets order status to `BOT_FOUT`, captures error screenshot, logs the failure reason, and moves to the next order in the queue
- [ ] Next morning, a human reviewer (EP-adviseur or admin) reviews each bot-completed order:
  - **Approve** --> status changes to `CONCEPT_GEREED`
  - **Reject** --> status changes to `BOT_FOUT` with rejection reason, order goes back to manual queue
- [ ] Dashboard shows: bot queue (pending), last run results, success/failure counts, per-order status with screenshots of failures
- [ ] Admin can: pause/resume bot, change schedule, view detailed logs, manually add/remove orders from queue, set priority
- [ ] Bot handles Uniec3 session management: persistent browser profile, automatic session refresh on 30-minute timeout, 2FA handled via persistent session (initial manual setup)
- [ ] Bot uses anti-detection measures: headed Chrome mode, rebrowser-playwright patches, human-like typing speed (50-150ms between keystrokes), realistic viewport/timezone

### UI Description

**Pages:**

1. **Bot Dashboard** (`/admin/bot`)
   - Header with bot status indicator (Running / Paused / Idle / Error) and last heartbeat timestamp
   - Stats cards: Orders in queue, Processed tonight, Success rate (%), Average time per label
   - Toggle switch: Pause/Resume bot
   - Schedule picker: Start time, end time, days of week
   - Quick actions: "Process now" (run single order immediately), "Clear queue"

2. **Bot Queue** (`/admin/bot/queue`)
   - Table with columns: Order ID, Address, Queued at, Priority, Status (Pending/Processing/Done/Failed)
   - Drag-to-reorder for manual priority override
   - Bulk actions: Remove selected, Set priority
   - Filter: By status, by date queued

3. **Bot Results** (`/admin/bot/results`)
   - Table with columns: Order ID, Address, Processed at, Duration, Result (Success/Failed), Reviewer, Review status
   - Clicking a row opens a detail view with:
     - Step-by-step screenshot gallery (carousel with arrow key navigation)
     - Log output for that order
     - Approve/Reject buttons (only for `BOT_KLAAR` status)
     - Rejection reason text field (required on reject)

4. **Bot Logs** (`/admin/bot/logs`)
   - Real-time log stream (websocket via Convex)
   - Filter by: severity (info/warn/error), date range, order ID
   - Downloadable as CSV

**Components:**
- `BotStatusBadge` -- colored dot + text (green=running, yellow=paused, gray=idle, red=error)
- `ScreenshotCarousel` -- lightbox gallery of bot screenshots per order, with step labels
- `QueueTable` -- sortable, filterable table with drag-to-reorder
- `LogStream` -- auto-scrolling log view with color-coded severity

### Data Requirements

**Tables:**

```
botQueue {
  orderId: Id<"orders">,
  status: "pending" | "processing" | "completed" | "failed",
  priority: number,           // lower = higher priority, default 100
  queuedAt: number,           // timestamp
  startedAt?: number,
  completedAt?: number,
  durationSeconds?: number,
  failureReason?: string,
  screenshots: Array<{
    step: string,             // e.g. "login", "algemeen_invullen", "constructies", "installaties", "final_review"
    storageId: Id<"_storage">,
    timestamp: number,
  }>,
  logs: Array<{
    timestamp: number,
    level: "info" | "warn" | "error",
    message: string,
  }>,
  reviewStatus: "pending_review" | "approved" | "rejected" | "not_applicable",
  reviewedBy?: Id<"users">,
  reviewedAt?: number,
  rejectionReason?: string,
}

botConfig {
  scheduleStart: string,      // "22:00"
  scheduleEnd: string,        // "06:00"
  scheduleDays: number[],     // [1,2,3,4,5] = Mon-Fri
  isPaused: boolean,
  maxParallelSessions: number, // default 1
  processingSpeedMs: number,  // delay between actions, default 100
  lastHeartbeat: number,
  currentStatus: "running" | "paused" | "idle" | "error",
}

botRun {
  startedAt: number,
  endedAt?: number,
  ordersProcessed: number,
  ordersSucceeded: number,
  ordersFailed: number,
  totalDurationSeconds: number,
}
```

### Business Rules

1. **Basismethode only**: Bot ONLY processes `bestaande_bouw_woning` type with basismethode. Utiliteit, nieuwbouw, and detailmethode are excluded because their Uniec3 flows differ significantly.
2. **Queue ordering**: Default FIFO. Admin can manually set priority. Corporatie batch orders get automatic priority boost (priority = 50 instead of 100).
3. **Failure handling**: On failure, bot attempts the order once more after 5-minute cooldown. If second attempt fails, order is marked `BOT_FOUT` permanently. Admin must manually requeue if they want another attempt.
4. **Rate limiting**: Maximum 12 labels per hour. If bot completes faster, it waits. This prevents suspicious activity patterns on Uniec3.
5. **Screenshot retention**: Screenshots are retained for 30 days, then automatically deleted. Approved orders keep only the final review screenshot permanently.
6. **Schedule enforcement**: Bot does NOT run outside scheduled hours unless manually triggered via "Process now". "Process now" processes exactly 1 order.
7. **Data completeness check**: Before queuing an order, system validates that all required opnameformulier fields are present. Incomplete orders cannot be queued (status remains `OPNAME_GEDAAN` with a warning flag).

### Edge Cases

- **Uniec3 is down or unreachable**: Bot retries 3 times with 5-minute intervals, then pauses itself and alerts admin via dashboard notification.
- **Uniec3 UI changes**: Bot fails on selector mismatch. Error is logged with screenshot showing the unexpected UI. All remaining queue items stay pending. Admin must update selectors before resuming.
- **2FA required mid-session**: Bot pauses and sends notification. Admin must manually complete 2FA within 30 minutes or session expires. Bot resumes after 2FA is completed.
- **Order data changes while in queue**: If order data is modified after queuing but before processing, bot uses the latest data. If order status changes away from `OPNAME_GEDAAN`, bot skips it.
- **Duplicate queueing**: System prevents the same order from being queued twice. Attempting to queue an already-queued order shows an error.
- **Mac Mini loses power/network**: PM2 auto-restarts the bot process. Bot checks for interrupted orders (status = `processing`) and marks them as `failed` with reason "interrupted".
- **Reviewer disagrees with bot output**: On rejection, order goes back to manual uitwerking queue. The Uniec3 entry created by the bot must be manually deleted or corrected by the EP-adviseur.

---

## 0.2 Standalone Intake Formulier

### User Story

**As** Jarco (owner/commercial), **I want** a public web form that I can share via a link after first contact with a potential client, **so that** the client can enter their own information (addresses, contact details, service preferences) without me having to manually relay this data into the system, saving me hours of daily admin work.

### Acceptance Criteria

- [ ] Public web form accessible via a short, shareable URL (e.g., `intake.vastvooruit.nl` or `app.vastvooruit.nl/intake`)
- [ ] No login required to fill in the form
- [ ] Form collects:
  - Contactpersoon: voornaam, achternaam, email, telefoonnummer
  - Bedrijfsnaam (optional, shown when "Zakelijk" is selected)
  - KvK-nummer (optional, shown when bedrijfsnaam is filled)
  - Client type: Particulier / Makelaar / Belegger / Corporatie / Aannemer / Anders
  - One or more addresses (multi-address support for beleggers/corporaties)
  - Per address: postcode, huisnummer, toevoeging (optional)
  - Type dienst per address: Energielabel / Verduurzamingsadvies / NEN 2580 / WWS-Puntentelling / BENG / Blowerdoortest (multi-select checkboxes)
  - Voorkeursdatum of -periode (optional date range picker)
  - Bijzonderheden/opmerkingen (free text, max 2000 chars)
  - Hoe bent u bij ons gekomen? (optional dropdown: Google, Makelaar, HomeFlow, Doorverwijzing, Anders)
- [ ] Multi-address support: "Nog een adres toevoegen" button. Supports up to 100 addresses in a single submission. For >10 addresses, show a "Bulk upload" option that accepts CSV (columns: postcode, huisnummer, toevoeging)
- [ ] When postcode + huisnummer is entered, auto-fill straatnaam, woonplaats, and provincie via BAG API (pdok.nl). Show auto-filled data as read-only confirmed fields. If BAG lookup fails, allow manual entry.
- [ ] Auto-fill also retrieves and displays (read-only): bouwjaar, oppervlakte (m2), gebruiksdoel from BAG. This helps the user confirm they have the right address.
- [ ] On submission:
  - A concept order is created in the system per address, with status `NIEUW`
  - All addresses are grouped under a single intake submission (linked by `intakeId`)
  - Jarco receives a notification (in-app + email) with the intake summary
  - The submitter receives a confirmation email with a summary of their submission and a reference number
- [ ] Form has VastVooruit branding (logo, colors: teal #0E2D2D, green #14AF52, beige #EAE3DF)
- [ ] Form is mobile-responsive (many clients will open the link on their phone from WhatsApp)
- [ ] Form has client-side validation: email format, phone format (Dutch mobile/landline), postcode format (Dutch: 1234AB), required fields marked
- [ ] Anti-spam: honeypot field + rate limiting (max 5 submissions per IP per hour)
- [ ] Form supports Dutch language only

### UI Description

**Pages:**

1. **Intake Form** (`/intake`)
   - Clean, single-page form with progressive disclosure
   - VastVooruit logo top-left, "Intake Formulier" as page title
   - Sections separated by subtle dividers:
     - **Uw gegevens** (contact info)
       - Toggle: Particulier / Zakelijk (when Zakelijk: show bedrijfsnaam + KvK fields)
       - Voornaam + Achternaam (side by side on desktop)
       - Email
       - Telefoonnummer
       - Client type dropdown
     - **Adres(sen)** (addresses)
       - Card per address with:
         - Postcode + Huisnummer + Toevoeging (inline, side by side)
         - After BAG lookup: Straatnaam, Woonplaats, Provincie (read-only, gray background)
         - BAG info: Bouwjaar, Oppervlakte, Gebruiksdoel (small text, informational)
         - Type dienst checkboxes
         - Remove button (X) if more than 1 address
       - "+ Nog een adres toevoegen" button below the last card
       - "Bulk upload (CSV)" link that opens a file upload modal (shown after 3+ addresses are added)
     - **Planning & Opmerkingen**
       - Voorkeursdatum/periode (optional date range picker)
       - Bijzonderheden textarea
       - "Hoe bent u bij ons gekomen?" dropdown
     - **Verzenden** button (green, full width on mobile)
   - Loading state on submit with spinner
   - Success state: green checkmark, "Bedankt! Wij nemen zo snel mogelijk contact met u op. Uw referentienummer: VV-2026-0042"

2. **Intake Confirmation Email** (transactional email)
   - VastVooruit header
   - "Bedankt voor uw aanvraag"
   - Summary of submitted data
   - Reference number
   - "Wij nemen binnen 1 werkdag contact met u op"
   - Contact info footer

**Components:**
- `AddressCard` -- single address entry with BAG auto-fill, service type checkboxes, remove button
- `BagLookup` -- input group (postcode + huisnummer) with auto-lookup on blur/tab, loading spinner, error state
- `CsvUploadModal` -- modal for bulk CSV upload with preview table before confirmation
- `IntakeSuccessState` -- success message with reference number and confetti-less professional animation

### Data Requirements

**Tables:**

```
intakeSubmissions {
  referenceNumber: string,     // "VV-2026-0042" (auto-generated, sequential)

  // Contact
  voornaam: string,
  achternaam: string,
  email: string,
  telefoon: string,
  isZakelijk: boolean,
  bedrijfsnaam?: string,
  kvkNummer?: string,
  clientType: "particulier" | "makelaar" | "belegger" | "corporatie" | "aannemer" | "anders",

  // Planning
  voorkeursdatumVan?: number,  // timestamp
  voorkeursdatumTot?: number,
  bijzonderheden?: string,
  bron?: "google" | "makelaar" | "homeflow" | "doorverwijzing" | "anders",

  // Meta
  submittedAt: number,
  ipAddress: string,
  userAgent: string,

  // Processing
  status: "nieuw" | "bekeken" | "verwerkt",
  bekekendoor?: Id<"users">,
  verwerkdAt?: number,
  notificatieSentAt?: number,
}

intakeAdressen {
  intakeId: Id<"intakeSubmissions">,

  // Address input
  postcode: string,
  huisnummer: string,
  toevoeging?: string,

  // BAG auto-filled
  straatnaam?: string,
  woonplaats?: string,
  provincie?: string,
  bouwjaar?: number,
  oppervlakte?: number,
  gebruiksdoel?: string,
  bagVerblijfsobjectId?: string,
  bagPandId?: string,

  // Services requested
  diensten: Array<"energielabel" | "verduurzamingsadvies" | "nen2580" | "wws_puntentelling" | "beng" | "blowerdoortest">,

  // Link to created order
  orderId?: Id<"orders">,
}
```

### Business Rules

1. **Reference number format**: `VV-{YYYY}-{NNNN}` where NNNN is zero-padded sequential per year. Example: `VV-2026-0001`. This number is used in all communication with the client.
2. **BAG lookup**: Uses the PDOK Locatieserver API (`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free`). If the API is unavailable, form still works -- user manually enters straatnaam and woonplaats. BAG data is informational and not blocking.
3. **Duplicate detection**: On submission, system checks if the same postcode+huisnummer already exists as an active order (status not in `AFGEROND`, `ARCHIEF`, `VERWIJDERD`). If duplicate found, submission still succeeds but the notification to Jarco includes a "MOGELIJKE DUPLICAAT" warning with a link to the existing order.
4. **CSV bulk upload format**: Must have columns `postcode` and `huisnummer`. Optional column `toevoeging`. System validates each row against BAG on upload. Invalid rows are highlighted in red in the preview. User can fix or remove invalid rows before confirming.
5. **Client type determines flow**: When `clientType` is `corporatie` or `belegger` and address count > 1, the system automatically creates a project to group the orders (instead of standalone orders).
6. **Notification timing**: Jarco receives the notification within 60 seconds of submission (Convex real-time). Email confirmation to submitter is sent within 5 minutes.
7. **Data retention**: Intake submissions are retained indefinitely. They serve as the audit trail for how the order originated.

### Edge Cases

- **BAG returns multiple results for postcode+huisnummer**: Show a dropdown to let the user select the correct address (common with apartments that share a huisnummer but have different toevoegingen).
- **User enters 100+ addresses**: For bulk submissions, disable the manual "add address" UI and force CSV upload. Show a progress bar during BAG lookups (which happen sequentially to avoid API rate limits).
- **User submits and then submits again**: Each submission is independent with its own reference number. Duplicate detection flags it for Jarco but does not block the user.
- **User closes browser mid-form**: Form data is saved to localStorage every 10 seconds. On return, user is prompted "U heeft een onafgerond formulier. Wilt u verdergaan?" with Ja/Nee options.
- **Invalid or non-existent address**: BAG lookup returns nothing. Show warning: "Adres niet gevonden in BAG. Controleer de postcode en het huisnummer." Allow manual entry as fallback.
- **Phone number format**: Accept Dutch formats: 06-12345678, 0612345678, +31612345678, 020-1234567. Normalize to E.164 format on save.
- **CSV with semicolons**: Dutch Excel exports use semicolons as delimiter. Accept both comma and semicolon delimiters. Auto-detect based on first line.

---

# PHASE 1: PORTAL MVP

The Portal MVP replaces the current Energielabel Portal (portal.energielabelportal.nl) and adds CRM, invoicing, and cost tracking capabilities. Design inspired by Simplicate.

---

## 1.1 Dossierbeheer (Core Portal Replacement)

### User Story

**As** the VastVooruit team (Aviejah for planning, EP-adviseurs for field work, Jarco for oversight), **I want** a central order management system with a visual pipeline, BAG integration, document management, and adviseur assignment, **so that** I can track every energielabel order from intake to delivery in a single system, replacing the current Portal, Outlook, and OneDrive workarounds.

### Acceptance Criteria

**Order Management:**
- [ ] Create new orders manually (admin/planner) or automatically from intake form submissions
- [ ] Each order has a unique, human-readable reference number: `{clientTypePrefix}-{YY}-{NNNN}` (e.g., `PA-26-0142` for particulier, `BL-26-0088` for belegger, `CO-26-0015` for corporatie)
- [ ] View orders in two modes: **Pipeline/Kanban view** (default) and **List/Table view** (toggle)
- [ ] Edit all order fields inline or via a detail slide-over panel
- [ ] Archive orders (soft delete -- moves to "Archief" status, recoverable)
- [ ] Hard delete only by admin, with confirmation dialog: "Dit verwijdert het dossier permanent inclusief alle documenten. Dit kan niet ongedaan worden gemaakt."

**Status Pipeline:**
- [ ] Visual kanban board with columns for each status:
  `NIEUW` --> `OFFERTE_VERSTUURD` --> `GEACCEPTEERD` --> `INGEPLAND` --> `OPNAME_GEDAAN` --> `IN_UITWERKING` --> `CONCEPT_GEREED` --> `CONTROLE` --> `GEREGISTREERD` --> `VERZONDEN` --> `AFGEROND`
- [ ] Orders appear as cards in their status column, showing: address (bold), client name, woningtype icon, adviseur avatar, days in current status
- [ ] Drag-and-drop to move orders between statuses (with validation -- see business rules)
- [ ] Status transitions are logged in the order's activity timeline
- [ ] Color-coded urgency: green (<3 days in status), yellow (3-7 days), red (>7 days)
- [ ] Counter badge on each column header showing the number of orders

**BAG Integration:**
- [ ] When creating an order, enter postcode + huisnummer --> auto-fill: straatnaam, woonplaats, provincie, bouwjaar, oppervlakte (m2), gebruiksdoel, BAG verblijfsobject ID, BAG pand ID
- [ ] Show Google Maps embed + Street View on order detail page (using BAG coordinates)
- [ ] BAG data is stored on the order and can be manually overridden if incorrect

**Photo & Document Upload:**
- [ ] Drag-and-drop upload zone on order detail page
- [ ] Support for: JPG, PNG, HEIC (auto-convert to JPG), PDF, DOCX, XLSX
- [ ] Bulk upload: select 100+ files at once, with progress bar per file
- [ ] Files are auto-linked to the order
- [ ] Finder-like document browser:
  - Grid view (thumbnails) and list view (toggle)
  - Spacebar = quick preview (image viewer or PDF viewer overlay)
  - Arrow keys = navigate between files in preview mode
  - File categories: Foto's, Opnameformulier, Label, Rapport, Factuur, Overig
  - Drag files to categories to organize
- [ ] Maximum file size: 50MB per file, 2GB total per order
- [ ] 15-year retention (wettelijke bewaarplicht for energielabel dossiers)

**EP-Adviseur Assignment:**
- [ ] Assign one primary EP-adviseur to each order from a dropdown of active adviseurs
- [ ] Adviseur sees their assigned orders in a personal "Mijn Orders" view
- [ ] Adviseur profile shows: name, email, phone, specializations (woningbouw/utiliteitsbouw/nieuwbouw), woonplaats (for route planning), availability status
- [ ] Changing adviseur is logged in the activity timeline

**Project Grouping:**
- [ ] Create projects to group multiple orders (for corporatie batches, belegger portfolios)
- [ ] Project has: name, client/company link, description, start date, deadline
- [ ] Orders within a project share project-level documents (avoids duplicating shared docs like corporatie contracts across 100 orders)
- [ ] Project overview page shows: all orders with their statuses, progress bar (% afgerond), total value, assigned adviseurs

**Filtering & Search:**
- [ ] Filter bar at top of pipeline/list view with:
  - Status (multi-select checkboxes)
  - EP-adviseur (dropdown)
  - Client type (dropdown)
  - Date range (aangemaakt, opnamedatum)
  - Project (dropdown)
  - Deelgebied: EPWB, EPUB, EPWD, EPUD, MWAW, MWAU
  - No-show filter: Alle / Verberg no-shows / Alleen no-shows
- [ ] Full-text search across: address, contact name, company name, reference number, opmerkingen
- [ ] Search results highlight matching text
- [ ] Saved filter presets (e.g., "Mijn openstaande orders", "Corporatie Q2 2026")

### UI Description

**Pages:**

1. **Pipeline View** (`/orders` -- default)
   - Horizontal scrollable kanban board
   - Each column = a status, with a colored header and order count badge
   - Cards show: address (line 1), client name (line 2), woningtype icon + adviseur avatar (line 3), days badge (line 4)
   - Drag-and-drop between columns
   - Click card --> slide-over detail panel from right (60% width)
   - Top bar: search input, filter button (opens filter drawer), view toggle (kanban/list), "+ Nieuwe order" button

2. **List View** (`/orders?view=list`)
   - Full-width table with columns: Referentie, Adres, Contactpersoon, Type, Status, Adviseur, Project, Aangemaakt, Opnamedatum, Bedrag
   - All columns sortable (click header)
   - Row click --> same slide-over detail panel
   - Pagination: 50 rows per page, with total count

3. **Order Detail** (slide-over panel or full page `/orders/{id}`)
   - **Header**: Reference number, status badge (colored), "Volgende status" button (primary action)
   - **Left column (60%)**:
     - Tabs: Overzicht | Documenten | Tijdlijn | Kosten
     - **Overzicht tab**:
       - Address block with Google Maps mini-map
       - BAG info grid (bouwjaar, oppervlakte, gebruiksdoel, deelgebied)
       - Contactpersoon block (name, email, phone, company)
       - Via/Tussenpersoon block (intermediary info)
       - Opmerkingen (rich text editor)
       - Products/services selected with prices
     - **Documenten tab**:
       - Upload zone (drag-drop)
       - File browser with grid/list toggle
       - Category folders
       - Quick preview (spacebar)
     - **Tijdlijn tab**:
       - Chronological activity log
       - Shows: status changes, field edits, document uploads, cost mutations, emails sent
       - Each entry: timestamp, user who made the change, what changed (old --> new)
     - **Kosten tab**:
       - Original quote amount
       - Cost mutations table (see 1.4)
       - Running total
       - Invoice status
   - **Right column (40%)**:
     - Status pipeline mini-view (vertical steps with current step highlighted)
     - EP-Adviseur assignment card (avatar, name, change button)
     - Project link (or "Koppel aan project" button)
     - Quick stats: days since creation, days in current status

4. **New Order Modal** (`/orders/new`)
   - Step 1: Address lookup (postcode + huisnummer with BAG auto-fill)
   - Step 2: Woningtype selection (radio buttons with icons: Appartement, Rijtjeswoning, 2-onder-1-kap, Vrijstaand, Bedrijfspand <100m2, 100-250m2, 251-500m2, 501-1000m2, 1001-1500m2, >1501m2)
   - Step 3: Products/services selection (checkboxes with auto-calculated price)
   - Step 4: Contact & company info
   - Step 5: Review & create

5. **Projects Overview** (`/projects`)
   - Card grid of projects with: name, client, order count, progress percentage, deadline
   - Click --> project detail page with all grouped orders

6. **Mijn Orders** (`/mijn-orders`)
   - Personalized view for EP-adviseurs showing only their assigned orders
   - Grouped by status, with today's opnames highlighted at the top

**Components:**
- `OrderCard` -- kanban card with address, client, type icon, adviseur avatar, days badge
- `StatusBadge` -- colored pill for each status (consistent colors across the app)
- `BagAddressLookup` -- postcode+huisnummer input with live lookup, address confirmation display
- `DocumentBrowser` -- grid/list toggle, category tabs, drag-to-categorize, spacebar preview
- `QuickPreview` -- overlay modal for image/PDF preview with arrow key navigation
- `ActivityTimeline` -- chronological list of all changes to an order
- `FilterDrawer` -- slide-over panel with all filter options, "Opslaan als preset" button
- `ProjectProgressBar` -- segmented bar showing order statuses within a project

### Data Requirements

**Tables:**

```
orders {
  referenceNumber: string,     // "PA-26-0142"

  // Address
  postcode: string,
  huisnummer: string,
  toevoeging?: string,
  straatnaam: string,
  woonplaats: string,
  provincie: string,

  // BAG data
  bouwjaar?: number,
  oppervlakte?: number,
  gebruiksdoel?: string,
  bagVerblijfsobjectId?: string,
  bagPandId?: string,
  latitude?: number,
  longitude?: number,

  // Type
  woningtype: "appartement" | "rijtjeswoning" | "2_onder_1_kap" | "vrijstaand" | "bedrijfspand_lt100" | "bedrijfspand_100_250" | "bedrijfspand_251_500" | "bedrijfspand_501_1000" | "bedrijfspand_1001_1500" | "bedrijfspand_gt1501",
  deelgebied: "EPWB" | "EPWD" | "EPUB" | "EPUD" | "MWAW" | "MWAU",
  buildingCategory: "woning" | "utiliteit",
  constructionType: "bestaande_bouw" | "nieuwbouw",

  // Status
  status: "NIEUW" | "OFFERTE_VERSTUURD" | "GEACCEPTEERD" | "INGEPLAND" | "OPNAME_GEDAAN" | "IN_UITWERKING" | "CONCEPT_GEREED" | "CONTROLE" | "GEREGISTREERD" | "VERZONDEN" | "AFGEROND" | "ARCHIEF" | "VERWIJDERD" | "ON_HOLD",
  statusChangedAt: number,

  // Products & pricing
  products: Array<{
    productId: Id<"products">,
    naam: string,
    prijsExBtw: number,
    prijsInclBtw: number,
  }>,
  totaalExBtw: number,
  totaalInclBtw: number,

  // People
  contactpersoonId?: Id<"contacts">,
  bedrijfId?: Id<"companies">,
  tussenpersoonContactId?: Id<"contacts">,  // intermediary (makelaar, bank)
  adviseurId?: Id<"users">,

  // Planning
  opnamedatum?: number,
  opnametijd?: string,         // "09:00"

  // Project grouping
  projectId?: Id<"projects">,

  // Origin
  intakeId?: Id<"intakeSubmissions">,
  bron: "portal" | "intake_formulier" | "homeflow" | "email" | "telefoon" | "whatsapp",

  // No-show
  isNoShow: boolean,
  noShowCount: number,

  // EP-Online data
  huidigeLabel?: string,       // A, B, C, D, E, F, G
  nieuwLabel?: string,
  epOnlineStatus?: string,

  // Opmerkingen
  opmerkingen?: string,

  // Timestamps
  createdAt: number,
  updatedAt: number,
  createdBy: Id<"users">,
}

projects {
  naam: string,
  beschrijving?: string,
  bedrijfId?: Id<"companies">,
  contactpersoonId?: Id<"contacts">,
  startDatum?: number,
  deadline?: number,
  status: "actief" | "afgerond" | "on_hold",
  createdAt: number,
  createdBy: Id<"users">,
}

orderDocuments {
  orderId: Id<"orders">,
  storageId: Id<"_storage">,
  filename: string,
  filesize: number,            // bytes
  mimeType: string,
  category: "fotos" | "opnameformulier" | "label" | "rapport" | "factuur" | "overig",
  uploadedAt: number,
  uploadedBy: Id<"users">,
}

orderActivity {
  orderId: Id<"orders">,
  type: "status_change" | "field_edit" | "document_upload" | "document_delete" | "adviseur_change" | "cost_mutation" | "comment" | "email_sent",
  description: string,         // Human-readable: "Status gewijzigd van NIEUW naar INGEPLAND"
  oldValue?: string,
  newValue?: string,
  userId: Id<"users">,
  timestamp: number,
}
```

### Business Rules

1. **Status transition rules** (not all transitions are allowed):
   - Forward only by default. Allowed backward transitions:
     - Any status --> `ON_HOLD` (and back to previous status)
     - `CONCEPT_GEREED` --> `IN_UITWERKING` (rejected concept)
     - `CONTROLE` --> `CONCEPT_GEREED` (needs revision)
   - `NIEUW` --> `OFFERTE_VERSTUURD` requires an offerte to be linked
   - `GEACCEPTEERD` --> `INGEPLAND` requires an opnamedatum and an adviseur
   - `INGEPLAND` --> `OPNAME_GEDAAN` requires at least 1 document uploaded (opnameformulier or photo)
   - `CONTROLE` --> `GEREGISTREERD` requires all cost mutations to be confirmed (see 1.4)
   - `VERZONDEN` --> `AFGEROND` requires an invoice to exist (see 1.3)
   - Particulier orders skip `OFFERTE_VERSTUURD` and `GEACCEPTEERD` if total < 1000 EUR (go directly NIEUW --> INGEPLAND)

2. **Reference number generation**: Client type prefix is determined at creation:
   - `PA` = Particulier
   - `BL` = Belegger
   - `CO` = Corporatie
   - `MK` = Makelaar
   - `UT` = Utiliteit
   - `NB` = Nieuwbouw
   - Sequential number resets per year, zero-padded to 4 digits

3. **Document retention**: All documents must be retained for 15 years (wettelijke bewaarplicht). Documents cannot be permanently deleted. "Delete" moves to a hidden recycle bin accessible only by admin.

4. **BAG data is snapshot**: BAG data is fetched once at order creation and stored on the order. It is NOT auto-updated. Manual override is possible (e.g., if bouwjaar in BAG is incorrect due to renovation).

5. **No-show tracking**: When an adviseur reports a no-show, the order gets `isNoShow: true` and `noShowCount` increments. The order can be rescheduled. Each no-show triggers a cost mutation of 75 EUR (woning) or 150 EUR (utiliteit) -- see 1.4.

6. **Project document inheritance**: Documents uploaded at project level are visible on all orders within that project, but are NOT duplicated. They appear in the order's document browser under a "Project documenten" section.

### Edge Cases

- **Address already exists in system**: Show warning "Er bestaat al een order voor dit adres" with link to existing order. Allow creation anyway (e.g., new label after >10 years).
- **BAG returns "gebruiksdoel: woonfunctie, winkelfunctie"**: Mixed-use building. Show both and let user select primary function. This determines if it's woning or utiliteit pipeline.
- **Adviseur goes on leave**: "Mijn Orders" shows their orders. Admin can bulk-reassign orders to another adviseur. Activity timeline logs the reassignment.
- **HEIC photos from iPhone**: Auto-convert to JPG server-side on upload. Show the JPG in the browser. Keep original HEIC in storage for archival.
- **100+ photos in bulk upload**: Show upload progress per file. Allow user to continue working while upload runs in background. Failed uploads can be retried individually.
- **Order stuck in status for >14 days**: Auto-flag with red badge. Show in a "Aandacht vereist" section on the dashboard.
- **Drag order to invalid status**: Revert the drag with a shake animation and show toast: "Order kan niet naar {status} omdat {reason}".

---

## 1.2 CRM-light + Offerte Flow

### User Story

**As** Jarco (owner/commercial), **I want** a lightweight CRM to manage my contacts, companies, and leads with an offerte module that auto-calculates pricing and converts accepted offertes into projects with orders, **so that** I have a single place to manage my sales pipeline instead of relying on my head, email, and WhatsApp.

### Acceptance Criteria

**Contact Management:**
- [ ] Create, view, edit, and archive contacts
- [ ] Contact fields: voornaam, achternaam, email (multiple), telefoon (multiple), functie/rol, notities
- [ ] Contact roles: Eigenaar, Huurder, Makelaar, Projectleider, Contactpersoon corporatie, Accountmanager bank, Anders
- [ ] Each contact is optionally linked to one or more companies
- [ ] Contact detail page shows full activity history: all orders, offertes, invoices, interactions in a single timeline

**Company Management:**
- [ ] Create, view, edit, and archive companies
- [ ] Company fields: naam, type, KvK-nummer, BTW-nummer, bezoekadres, factuuradres, website, notities
- [ ] Company types: Particulier, Corporatie, Belegger, Makelaarskantoor, Bank, Aannemer, Overheid, Anders
- [ ] Company detail page shows: all linked contacts, all orders, all offertes, all invoices, total revenue

**Intermediary Profiles (Tussenpersonen):**
- [ ] Makelaars and banks can have intermediary-specific preferences stored on their company/contact profile:
  - CC-email voor labellevering (email address to always CC when delivering a label for their client)
  - Factuurvoorkeur: factuur naar tussenpersoon of naar eindklant
  - Standaard checklist (which pre-inspection checklist to send to their clients)
  - Default payment terms
  - Notities (e.g., "Altijd label + advies aanbieden bij dit kantoor")
- [ ] When creating an order via a tussenpersoon, these preferences are automatically applied

**Lead Pipeline:**
- [ ] Kanban board for leads (Simplicate-style), separate from the order pipeline
- [ ] Lead stages: `NIEUW` --> `CONTACT_GEHAD` --> `OFFERTE_VERSTUURD` --> `GEACCEPTEERD` --> `VERLOREN`
- [ ] Lead card shows: company/contact name, potential value, source, age (days since creation)
- [ ] Drag-and-drop between stages
- [ ] When a lead moves to `GEACCEPTEERD`, it automatically creates a project with orders (from the accepted offerte)
- [ ] When a lead moves to `VERLOREN`, user must select a loss reason: Te duur, Concurrent gekozen, Geen reactie, Niet meer nodig, Anders (free text)
- [ ] Conversion metrics visible on dashboard: leads per stage, conversion rate, average deal size, average time to close

**Offerte Module:**
- [ ] Create offertes from a lead or standalone
- [ ] Offerte builder with:
  - Client/company selection (with auto-fill of address and contact info)
  - Template selection per client group (Particulier, Belegger, Corporatie, Utiliteit) with standard voorwaarden per template
  - Line items from product catalog (see 1.6 Pricing Engine) with quantity
  - Automatic price calculation based on client type, woningtype, quantity (volume discounts auto-applied)
  - Manual price override with reason field (for custom deals)
  - Free text sections: introduction, scope, planning, voorwaarden
  - Subtotal, BTW (21%), total
- [ ] Volume discounts auto-calculated and shown as separate line:
  - Belegger: from 5th woning onwards, show "Seriekorting" line with discount amount
  - Corporatie: contract prices applied (eerste 4 at 295 EUR, 5th+ at 165 EUR)
- [ ] PDF generation from offerte with VastVooruit branding
- [ ] Send offerte via email directly from the system (with PDF attachment)
- [ ] Digital signature required for orders >1,000 EUR total. Use an embedded signature pad (draw signature on screen). Orders <=1,000 EUR can proceed with email acceptance only.
- [ ] Accept/reject tracking:
  - Offerte status: `CONCEPT` --> `VERSTUURD` --> `BEKEKEN` (email open tracking) --> `GEACCEPTEERD` / `AFGEWEZEN` / `VERLOPEN`
  - Client receives a link to view offerte in browser and accept/reject with one click
  - Accepted: offerte status = `GEACCEPTEERD`, lead status = `GEACCEPTEERD`, auto-create project + orders
  - Rejected: offerte status = `AFGEWEZEN`, lead status = `VERLOREN` (with reason)
  - Expiry: 30 days default (configurable per offerte). After expiry, status = `VERLOPEN`
- [ ] Offerte versioning: when an offerte is revised, a new version is created (v1, v2, v3). Previous versions remain accessible but marked as superseded.

**Activity Log:**
- [ ] Every contact and company has a timeline showing ALL interactions:
  - Orders (with status), Offertes (with status), Invoices (with payment status)
  - Emails sent from system
  - Manual notes/interactions added by users
  - Phone call logs (user manually adds: date, duration, summary)
- [ ] Activity can be filtered by type

### UI Description

**Pages:**

1. **Contacts List** (`/crm/contacts`)
   - Searchable table with columns: Naam, Bedrijf, Rol, Email, Telefoon, Laatste interactie
   - Quick-add floating button
   - Click --> contact detail page

2. **Contact Detail** (`/crm/contacts/{id}`)
   - Header: name, role badge, company link, email, phone (click-to-copy)
   - Tabs: Overzicht | Orders | Offertes | Facturen | Activiteit
   - Right sidebar: quick stats (total orders, total revenue, last interaction)

3. **Companies List** (`/crm/companies`)
   - Searchable table with columns: Naam, Type, Contacten, Open orders, Totale omzet
   - Click --> company detail page

4. **Company Detail** (`/crm/companies/{id}`)
   - Header: company name, type badge, KvK, address
   - Tabs: Overzicht | Contacten | Orders | Offertes | Facturen | Activiteit
   - "Tussenpersoon instellingen" section (if applicable)

5. **Lead Pipeline** (`/crm/leads`)
   - Horizontal kanban board with 5 stages
   - Lead cards: company/contact name, value, source badge, age
   - Click card --> lead detail slide-over with full info, linked offertes, actions
   - Top bar: "+ Nieuwe lead" button, filter by source, date range

6. **Offerte Builder** (`/crm/offertes/new` or `/crm/offertes/{id}/edit`)
   - Left panel (70%): offerte editor
     - Template selector (dropdown with preview)
     - Client/company search and selection
     - Address list (from project or manual entry)
     - Product table: Product | Woningtype | Aantal | Stukprijs | Totaal
     - "Regel toevoegen" button
     - Auto-calculated subtotals, discounts, BTW, total
     - Free text sections (rich text editor)
   - Right panel (30%): live PDF preview (updates on every change)
   - Bottom action bar: "Opslaan als concept" | "Versturen" | "Download PDF"

7. **Offerte View** (`/offerte/{token}` -- public, no login required)
   - Clean, branded offerte view
   - "Accepteren" button (green, large)
   - "Afwijzen" button (gray, smaller)
   - If >1,000 EUR: signature pad appears before acceptance
   - After acceptance: success screen with reference number

8. **Offerte List** (`/crm/offertes`)
   - Table: Referentie, Klant, Bedrag, Status, Verstuurd op, Geldig tot
   - Filterable by status, date range

**Components:**
- `LeadCard` -- kanban card for lead pipeline
- `OfferteLineItemTable` -- editable table with product lookup, quantity, price calculation
- `VolumeDiscountBanner` -- info bar showing applied discounts
- `SignaturePad` -- canvas-based signature drawing component
- `OfferteStatusTracker` -- horizontal step indicator (Concept --> Verstuurd --> Bekeken --> Geaccepteerd)
- `ActivityTimeline` -- shared component with type-filtered timeline
- `PdfPreview` -- live-updating PDF preview panel

### Data Requirements

**Tables:**

```
contacts {
  voornaam: string,
  achternaam: string,
  emails: Array<{ email: string, label: string, isPrimary: boolean }>,
  telefoons: Array<{ nummer: string, label: string, isPrimary: boolean }>,
  rol: "eigenaar" | "huurder" | "makelaar" | "projectleider" | "contactpersoon_corporatie" | "accountmanager_bank" | "anders",
  notities?: string,
  bedrijfIds: Array<Id<"companies">>,
  isArchived: boolean,
  createdAt: number,
  updatedAt: number,
}

companies {
  naam: string,
  type: "particulier" | "corporatie" | "belegger" | "makelaarskantoor" | "bank" | "aannemer" | "overheid" | "anders",
  kvkNummer?: string,
  btwNummer?: string,
  bezoekadres?: {
    straat: string,
    postcode: string,
    woonplaats: string,
  },
  factuuradres?: {
    straat: string,
    postcode: string,
    woonplaats: string,
  },
  website?: string,
  notities?: string,

  // Intermediary preferences
  isTussenpersoon: boolean,
  ccEmailLabellevering?: string,
  factuurvoorkeur?: "tussenpersoon" | "eindklant",
  standaardChecklist?: string,
  defaultPaymentTermDays?: number,
  tussenpersoonNotities?: string,

  isArchived: boolean,
  createdAt: number,
  updatedAt: number,
}

leads {
  contactId?: Id<"contacts">,
  bedrijfId?: Id<"companies">,
  titel: string,               // e.g. "10 woningen Groningen"
  geschatteWaarde: number,     // estimated deal value
  bron: "website" | "email" | "telefoon" | "whatsapp" | "homeflow" | "doorverwijzing" | "netwerk" | "anders",
  status: "NIEUW" | "CONTACT_GEHAD" | "OFFERTE_VERSTUURD" | "GEACCEPTEERD" | "VERLOREN",
  verliesReden?: "te_duur" | "concurrent" | "geen_reactie" | "niet_meer_nodig" | "anders",
  verliesRedenToelichting?: string,
  offerteId?: Id<"offertes">,
  projectId?: Id<"projects">,  // created on acceptance
  notities?: string,
  createdAt: number,
  updatedAt: number,
  createdBy: Id<"users">,
}

offertes {
  referenceNumber: string,     // "OFF-2026-0023"
  versie: number,              // 1, 2, 3...
  vorigeVersieId?: Id<"offertes">,

  leadId?: Id<"leads">,
  contactId: Id<"contacts">,
  bedrijfId?: Id<"companies">,

  templateId?: Id<"offerteTemplates">,

  // Content
  introductie?: string,
  scope?: string,
  planning?: string,
  voorwaarden?: string,

  // Line items
  regelItems: Array<{
    productId: Id<"products">,
    productNaam: string,
    woningtype?: string,
    aantal: number,
    stukprijsExBtw: number,
    totaalExBtw: number,
    isKorting: boolean,        // for discount lines
    kortingReden?: string,
  }>,

  subtotaalExBtw: number,
  btwPercentage: number,       // 21
  btwBedrag: number,
  totaalInclBtw: number,

  // Manual override
  isPriceOverridden: boolean,
  overrideReason?: string,

  // Status
  status: "CONCEPT" | "VERSTUURD" | "BEKEKEN" | "GEACCEPTEERD" | "AFGEWEZEN" | "VERLOPEN",
  verstuurdOp?: number,
  bekekendOp?: number,
  beantwoordOp?: number,
  geldigTot: number,           // expiry date

  // Signature
  requiresSignature: boolean,  // true if totaal > 1000
  signatureStorageId?: Id<"_storage">,
  signedAt?: number,

  // Public access
  publicToken: string,         // UUID for public offerte view URL

  // PDF
  pdfStorageId?: Id<"_storage">,

  createdAt: number,
  updatedAt: number,
  createdBy: Id<"users">,
}

offerteTemplates {
  naam: string,
  clientType: "particulier" | "belegger" | "corporatie" | "utiliteit",
  introductieTemplate: string,
  scopeTemplate: string,
  voorwaardenTemplate: string,
  isActive: boolean,
}

activities {
  // Polymorphic: linked to contact, company, lead, or order
  contactId?: Id<"contacts">,
  bedrijfId?: Id<"companies">,
  leadId?: Id<"leads">,
  orderId?: Id<"orders">,

  type: "notitie" | "telefoongesprek" | "email_verstuurd" | "email_ontvangen" | "offerte_verstuurd" | "offerte_geaccepteerd" | "offerte_afgewezen" | "order_aangemaakt" | "factuur_verstuurd" | "betaling_ontvangen" | "status_wijziging",
  beschrijving: string,
  details?: string,            // e.g., call duration, email subject
  userId: Id<"users">,
  timestamp: number,
}
```

### Business Rules

1. **Offerte-to-project conversion**: When an offerte is accepted:
   - Create a project linked to the company/contact
   - For each address in the offerte, create an order with status `GEACCEPTEERD` (skipping NIEUW and OFFERTE_VERSTUURD since that's already done via the offerte)
   - Copy pricing from offerte line items to each order
   - Link all orders to the project

2. **Offerte expiry**: Offertes expire after 30 days by default. 7 days before expiry, system sends an automatic reminder email to the client. After expiry, status changes to `VERLOPEN`. Admin can manually extend the expiry date.

3. **Offerte below 1,000 EUR**: For orders below 1,000 EUR (typically particulier single label), no formal offerte is needed. Jarco can create an order directly and skip the offerte flow. The order goes from `NIEUW` directly to `INGEPLAND`.

4. **Intermediary preferences auto-apply**: When a tussenpersoon is selected on an order, their CC email, checklist, and payment terms are automatically populated on the order. User can override.

5. **Lead source tracking**: Every lead must have a source. This data feeds into conversion analytics (which sources generate the most valuable leads?).

6. **Company deduplication**: When entering a company name, system shows suggestions of existing companies (fuzzy match). KvK number enforces uniqueness -- cannot create two companies with the same KvK.

7. **Contact merging**: If duplicate contacts are found (same email or phone), admin can merge them. All linked orders, offertes, and activities are transferred to the surviving contact.

### Edge Cases

- **Offerte accepted after expiry**: System shows warning but allows admin to override and accept anyway.
- **Client opens offerte link but does not respond**: `BEKEKEN` status is set on first open (via tracking pixel). After 7 days of no response post-viewing, auto-reminder email is sent.
- **Offerte for mixed client types**: E.g., a belegger ordering both energielabels and NEN2580. Each product uses its own pricing rule. Mixed pricing is calculated per line item, not per offerte.
- **Multiple offertes for same lead**: Allowed. Only the latest version is shown to the client. Previous versions are archived.
- **Company has multiple roles**: A makelaarskantoor could also be a belegger. Company type is the PRIMARY type. Notes field used for additional context.
- **Contact linked to multiple companies**: Supported. When creating an order, user selects both the contact AND the company context.

---

## 1.3 Boekhouding (Moneybird Integration)

### User Story

**As** Jasper (administration), **I want** invoices to be automatically generated when orders are completed, synced bidirectionally with Moneybird, with a real-time debtors dashboard and automated reminders, **so that** I no longer need to manually track 12 columns in Excel and we stop losing 40,000+ EUR to forgotten invoices.

### Acceptance Criteria

**Invoice Creation:**
- [ ] Invoice is automatically generated when an order reaches status `AFGEROND`
- [ ] Invoice contains:
  - Factuurnummer (auto-generated, sequential: `F-2026-0001`)
  - Factuurdatum (date of status change to AFGEROND)
  - Vervaldatum (based on payment terms for client type)
  - Client/company details (naam, adres, KvK, BTW)
  - Line items from original offerte/order products
  - Cost mutations (meerwerk/minderwerk) added as separate lines
  - Subtotaal, BTW (21%), Totaal
- [ ] Invoice can be manually reviewed and edited before sending (status: `CONCEPT`)
- [ ] "Versturen" button sends invoice via email and pushes to Moneybird simultaneously
- [ ] PDF generation with VastVooruit branding

**Moneybird Sync:**
- [ ] Outbound: Invoice created in VastVooruit system --> automatically created in Moneybird via API
- [ ] Inbound: Payment received in Moneybird --> webhook updates VastVooruit system with payment status and date
- [ ] Sync status visible per invoice: "Gesynchroniseerd", "Sync fout", "Niet gesynchroniseerd"
- [ ] Manual "Opnieuw synchroniseren" button for failed syncs
- [ ] Moneybird contact is auto-created or matched when first invoice is sent for a company

**Debtors Dashboard:**
- [ ] Real-time overview at `/admin/debiteuren`
- [ ] Summary cards: Totaal openstaand, Totaal >30 dagen, Totaal >60 dagen, Totaal >90 dagen
- [ ] Table with columns: Factuurnummer, Klant, Bedrag, Factuurdatum, Vervaldatum, Dagen openstaand, Status, Herinneringen verstuurd
- [ ] Aging buckets visualization (stacked bar chart): 0-30, 30-60, 60-90, 90+ days
- [ ] Click on client name --> all their invoices
- [ ] Export to CSV/Excel

**Automated Reminders:**
- [ ] Configurable reminder intervals (default: 7, 14, 21 days after due date)
- [ ] Each reminder is a pre-written email template (friendly --> firm --> final notice)
- [ ] Reminders are sent automatically unless manually paused for a specific invoice
- [ ] Each sent reminder is logged on the invoice and the contact's activity timeline
- [ ] After 3rd reminder (21 days), invoice is flagged as "Escalatie nodig" -- admin must manually decide next step

**Payment Terms per Client Type:**
- [ ] Corporatie: 35/65 split. 35% invoiced at `INGEPLAND`, remaining 65% at `AFGEROND`. Both invoices linked to same order. Payment term: 30 days.
- [ ] Belegger: 100% invoiced 10 days after opnamedatum. Payment term: 14 days.
- [ ] Particulier: 100% at delivery (status `VERZONDEN`). Payment via betaallink (iDEAL/Mollie). Label is NOT sent until payment is confirmed.
- [ ] Makelaar: per intermediary agreement (configurable on company profile). Default: 100% at delivery, 14 days.

### UI Description

**Pages:**

1. **Invoices List** (`/admin/facturen`)
   - Table: Factuurnummer, Klant, Bedrag, Status, Factuurdatum, Vervaldatum, Moneybird sync status
   - Status filter tabs: Alle | Concept | Verstuurd | Betaald | Achterstallig | Geannuleerd
   - "+ Nieuwe factuur" button (rarely used -- most are auto-generated)

2. **Invoice Detail** (`/admin/facturen/{id}`)
   - Invoice preview (styled like printed invoice)
   - Edit mode for concept invoices (inline editing of line items)
   - Actions: Versturen, Download PDF, Crediteren, Synchroniseer met Moneybird
   - Payment status timeline: Aangemaakt --> Verstuurd --> Herinnering 1 --> Herinnering 2 --> Herinnering 3 --> Betaald
   - Linked order(s) with direct links

3. **Debtors Dashboard** (`/admin/debiteuren`)
   - Summary stat cards (totals per aging bucket)
   - Aging chart (stacked horizontal bar)
   - Detailed table with sorting/filtering
   - Quick actions: "Stuur herinnering" button per row, "Pauzeer herinneringen" toggle

4. **Moneybird Settings** (`/admin/instellingen/moneybird`)
   - API key input
   - Connection status indicator
   - Sync log (last 50 sync attempts with status)
   - "Test verbinding" button

**Components:**
- `InvoicePreview` -- rendered invoice with branding, editable in concept mode
- `AgingChart` -- horizontal stacked bar chart for debtor aging
- `PaymentStatusTimeline` -- step indicator for invoice lifecycle
- `MoneybirdSyncBadge` -- colored badge showing sync status
- `ReminderSchedule` -- visual timeline of past and upcoming reminders per invoice

### Data Requirements

**Tables:**

```
invoices {
  factuurnummer: string,       // "F-2026-0001"

  orderId: Id<"orders">,
  contactId: Id<"contacts">,
  bedrijfId?: Id<"companies">,

  // Type
  type: "standaard" | "voorschot" | "eindafrekening" | "creditnota",
  splitPercentage?: number,    // 35 or 65 for corporatie split

  // Line items
  regelItems: Array<{
    beschrijving: string,
    aantal: number,
    stukprijsExBtw: number,
    totaalExBtw: number,
    isMeerwerk: boolean,
    isMinderwerk: boolean,
  }>,

  subtotaalExBtw: number,
  btwPercentage: number,
  btwBedrag: number,
  totaalInclBtw: number,

  // Dates
  factuurdatum: number,
  vervaldatum: number,

  // Status
  status: "concept" | "verstuurd" | "betaald" | "achterstallig" | "geannuleerd" | "gecrediteerd",

  // Payment
  betaaldOp?: number,
  betaalMethode?: "overboeking" | "ideal" | "betaallink",
  betaalReferentie?: string,

  // Betaallink (for particulier)
  betaallinkUrl?: string,
  betaallinkToken?: string,

  // Moneybird
  moneybirdId?: string,
  moneybirdSyncStatus: "niet_gesynchroniseerd" | "gesynchroniseerd" | "sync_fout",
  moneybirdLastSyncAt?: number,
  moneybirdSyncError?: string,

  // Reminders
  herinneringen: Array<{
    type: "herinnering_1" | "herinnering_2" | "herinnering_3",
    verstuurdOp: number,
    emailId?: string,
  }>,
  herinneringenGepauzeerd: boolean,

  // PDF
  pdfStorageId?: Id<"_storage">,

  createdAt: number,
  updatedAt: number,
  createdBy: Id<"users">,
}

moneybirdConfig {
  apiKey: string,
  administrationId: string,
  isConnected: boolean,
  lastSuccessfulSync: number,
}
```

### Business Rules

1. **Auto-invoice trigger**: When an order status changes to `AFGEROND`, the system checks the client type and creates the appropriate invoice:
   - Corporatie: if first invoice (35%) was already created at `INGEPLAND`, create the 65% eindafrekening now
   - Belegger: create 100% invoice (if opnamedatum was >10 days ago; otherwise schedule for 10 days after opnamedatum)
   - Particulier: create 100% invoice immediately and generate betaallink
   - All: include cost mutations as separate line items

2. **Corporatie 35/65 split**:
   - First invoice (35%) is auto-created when order reaches `INGEPLAND`. This is a "voorschot" type invoice.
   - Second invoice (65%) is auto-created when order reaches `AFGEROND`. This is an "eindafrekening" type invoice.
   - Both invoices reference the same order. If cost mutations exist, they are added ONLY to the eindafrekening.

3. **Particulier payment gate**: For particulier orders, the label PDF is NOT included in the `VERZONDEN` email until payment is confirmed. The email contains: "Uw energielabel is gereed. Gebruik onderstaande betaallink om het label te ontvangen." After payment: system auto-sends label PDF.

4. **Credit notes**: If an invoice needs to be corrected, a credit note is created (negative invoice) and a new correct invoice is issued. Original invoice status changes to `gecrediteerd`. Both sync to Moneybird.

5. **Reminder escalation**:
   - Herinnering 1 (7 days overdue): friendly tone, "Ter herinnering..."
   - Herinnering 2 (14 days overdue): firmer tone, "Tweede herinnering..."
   - Herinnering 3 (21 days overdue): final notice, "Laatste herinnering voor incasso..."
   - After herinnering 3: invoice flagged for manual escalation. No more auto-reminders.

6. **Moneybird as source of truth for payments**: Payment status comes FROM Moneybird via webhook. The VastVooruit system does NOT independently track bank payments. Moneybird handles bank reconciliation.

### Edge Cases

- **Moneybird API is down**: Invoice is created locally with `moneybirdSyncStatus: "sync_fout"`. System retries sync every hour for 24 hours. After 24 hours, admin is notified.
- **Partial payment received**: Moneybird webhook reports partial payment. Invoice stays `verstuurd` but shows partial amount received. Admin manually decides whether to accept partial or follow up.
- **Cost mutation added AFTER invoice was already sent**: Create a separate "meerwerk-factuur" for the additional amount. Link it to the same order. Do NOT modify the original invoice.
- **Order is cancelled after invoice sent**: Create credit note for full amount. Sync credit note to Moneybird.
- **Betaallink expires**: iDEAL betaallinks typically expire after 30 days. If payment not received, generate new betaallink and send via reminder email.
- **Company has both voorschot and eindafrekening overdue**: Show as separate entries in debtors dashboard. Reminders are sent per invoice independently.
- **BTW edge cases**: Some clients may be exempt (government/corporaties in specific cases). Allow BTW percentage override per invoice (0% or 21%).

---

## 1.4 Kostenmutaties

### User Story

**As** an EP-adviseur, **I want** to report cost deviations (meerwerk, minderwerk, no-show) directly after a field visit, **so that** the actual costs are tracked per order, approved by admin, and automatically reflected in the final invoice, eliminating the manual Excel-based cost tracking.

### Acceptance Criteria

- [ ] Per order, track: original quoted amount (from offerte/product selection) vs actual incurred costs
- [ ] EP-adviseur can add cost mutations from the order detail page or from a dedicated "Kosten bevestigen" screen after field visit
- [ ] Mutation types (predefined dropdown + amount auto-filled where applicable):
  - **Meerwerk**: custom amount + description (e.g., "Extra kamers boven standaard")
  - **Minderwerk**: negative amount + description (e.g., "Woning kleiner dan verwacht, herclassificatie naar appartement")
  - **No-show woning**: fixed 75 EUR
  - **No-show utiliteit**: fixed 150 EUR
  - **Destructief onderzoek**: custom amount (typically 50-150 EUR) + description + photo upload required
  - **Herbezoek**: fixed amount based on woningtype (same as original visit price)
  - **Extra kamers**: 25 EUR per extra kamer above 8
  - **Spoed toeslag**: 150 EUR
  - **Regio toeslag**: custom amount based on distance
- [ ] Each mutation has: type, amount (positive or negative), description, optional photo, created by, status
- [ ] Mutation status flow: `INGEDIEND` --> `GOEDGEKEURD` / `AFGEWEZEN` by admin
- [ ] Admin review screen shows all pending mutations across all orders
- [ ] Approved mutations automatically adjust the final invoice amount
- [ ] **Block rule**: An order CANNOT be moved to status `AFGEROND` until ALL cost mutations for that order are either `GOEDGEKEURD` or `AFGEWEZEN`
- [ ] Order detail "Kosten" tab shows: original amount, all mutations (with status), running total

### UI Description

**Pages:**

1. **Kosten Bevestigen** (EP-adviseur view, `/orders/{id}/kosten`)
   - Shows order details: address, woningtype, original quoted products + amounts
   - "Bevestig: kosten kloppen" button (green) -- confirms no mutations needed
   - "Mutatie toevoegen" button (orange) --> modal with:
     - Type dropdown (predefined types with auto-fill amounts)
     - Amount field (pre-filled for fixed types, editable for custom types)
     - Description textarea (required for Meerwerk/Minderwerk)
     - Photo upload (required for Destructief onderzoek)
     - Submit button
   - List of already-submitted mutations with their status

2. **Mutatie Review** (admin view, `/admin/kostenmutaties`)
   - Table: Order ref, Adres, Type, Bedrag, Ingediend door, Datum, Status
   - Filter by: status (pending/approved/rejected), mutation type, adviseur, date range
   - Inline approve/reject buttons per row
   - Reject requires reason text
   - Bulk approve for common types (e.g., approve all no-shows at once)

3. **Order Detail - Kosten Tab** (part of order detail)
   - Summary card: Offertebedrag | Meerwerk | Minderwerk | Eindtotaal
   - Table of all mutations with status badges
   - Warning banner if unconfirmed mutations exist: "Er zijn nog onbevestigde kostenmutaties. Order kan niet worden afgerond."

**Components:**
- `CostMutationForm` -- modal form with type-dependent fields
- `CostSummaryCard` -- visual summary of original vs final amount with delta
- `MutationReviewTable` -- admin table with inline approve/reject
- `BlockingWarningBanner` -- red banner on order detail when mutations are pending

### Data Requirements

**Tables:**

```
costMutations {
  orderId: Id<"orders">,

  type: "meerwerk" | "minderwerk" | "no_show_woning" | "no_show_utiliteit" | "destructief_onderzoek" | "herbezoek" | "extra_kamers" | "spoed_toeslag" | "regio_toeslag",
  bedrag: number,              // positive for meerwerk, negative for minderwerk
  beschrijving: string,
  aantalExtraKamers?: number,  // for extra_kamers type

  // Evidence
  fotoStorageId?: Id<"_storage">,

  // Status
  status: "ingediend" | "goedgekeurd" | "afgewezen",
  afwijzingReden?: string,

  // Audit
  ingediendDoor: Id<"users">,
  ingediendOp: number,
  beoordeeldDoor?: Id<"users">,
  beoordeeldOp?: number,

  // Invoice link
  invoiceRegelItemIndex?: number,  // index in invoice line items array
}

orderCostConfirmation {
  orderId: Id<"orders">,
  bevestigdDoor: Id<"users">,
  bevestigdOp: number,
  kostenKloppen: boolean,      // true = no mutations, false = mutations submitted
}
```

### Business Rules

1. **Confirmation required**: After every field visit (status `OPNAME_GEDAAN`), the assigned EP-adviseur MUST either confirm costs are correct OR submit mutations. The order shows a "Kosten niet bevestigd" warning until this is done.

2. **No-show amounts are fixed**: Woning = 75 EUR, Utiliteit = 150 EUR. These cannot be overridden by the adviseur. Admin can override during review.

3. **Destructief onderzoek requires photo**: The mutation cannot be submitted without uploading at least one photo as evidence. This protects against disputes.

4. **Extra kamers calculation**: Standard assumption is 8 kamers for a woning. If the woning has more, each extra kamer costs 25 EUR. Adviseur enters the actual count, system calculates the surcharge.

5. **Afgerond blocker**: This is a HARD block. The system technically prevents the status transition from `CONTROLE` (or any previous status) to `AFGEROND` while there are mutations with status `ingediend`. All must be resolved.

6. **Invoice impact**: Only `goedgekeurd` mutations appear on the invoice. `afgewezen` mutations are logged but do not affect the invoice.

7. **Multiple mutations per order**: An order can have multiple mutations (e.g., no-show + herbezoek on the second attempt, or meerwerk + spoed toeslag). All are independently reviewed.

### Edge Cases

- **Adviseur submits mutation but admin is on vacation**: Mutations stay in `ingediend` status. Orders are blocked from completion. Dashboard shows "X mutaties wachten op goedkeuring" as a persistent warning.
- **Mutation submitted after invoice was already sent**: System creates a separate "nacalculatie-factuur" for approved mutations. Does not modify the original invoice.
- **Adviseur disagrees with rejection**: No formal appeal process in system. Adviseur discusses offline with admin. Admin can re-create the mutation and approve it.
- **No-show followed by successful visit**: Both the no-show mutation (75/150 EUR) AND the regular order cost apply. The no-show is additive, not a replacement.
- **Client disputes a mutation**: Admin can create a `minderwerk` mutation to credit back a disputed amount. This creates a paper trail.
- **Herbezoek on corporatie project**: Herbezoek cost may be absorbed by VastVooruit if it's within the contract terms. Admin can approve the mutation but mark it as "niet doorbelasten" (custom description), which excludes it from the client invoice but keeps it in internal cost tracking.

---

## 1.5 Uurregistratie

### User Story

**As** Jarco (owner), **I want** every employee to log their hours per project, order, and work type, **so that** I have strategic insight into which activities are most time-consuming, which client types are most profitable, and where efficiency improvements are needed -- NOT for micro-management but for business intelligence.

### Acceptance Criteria

- [ ] Every user can log time entries: select a project/order (optional), select a work type, enter hours (in 15-minute increments), add a description
- [ ] Work types (predefined): Opname, Uitwerking, Controle, Administratie, Reistijd, Commercie/Acquisitie, Overleg, Opleiding, Overig
- [ ] Calendar view showing logged hours per day, color-coded by work type
- [ ] Weekly target: 40 hours/week. Progress bar showing logged vs target
- [ ] Quick entry: "Start timer" button that tracks time live (start/stop). Timer auto-suggests work type based on current activity context (e.g., if user is on an order detail page, suggest the order and work type based on order status)
- [ ] Bulk entry: log multiple days at once (useful for catching up on a week)
- [ ] Reports (admin only):
  - Hours per project
  - Hours per client type (corporatie/belegger/particulier)
  - Hours per adviseur
  - Hours per work type
  - Trend charts (weekly/monthly)
  - Average hours per label (by woningtype and client type)
  - Most profitable work types (hours vs revenue)
- [ ] Export reports to CSV/Excel
- [ ] Weekly summary email to Jarco: total hours logged across all employees, flagging employees who logged <35 hours

### UI Description

**Pages:**

1. **Uurregistratie** (`/uren` -- personal view)
   - Calendar view (month, with day cells showing total hours + colored bars per work type)
   - Click on day --> expand to show/add entries for that day
   - Right sidebar: "Vandaag" summary (total hours, per work type), timer widget
   - Weekly progress bar at top: "32/40 uur deze week"
   - Quick entry form: Date | Project/Order (searchable dropdown) | Work type | Uren | Beschrijving | Save

2. **Uurregistratie Overzicht** (`/admin/uren` -- admin view)
   - Team calendar: rows = employees, columns = days. Cell shows total hours (color intensity = hours logged)
   - Click cell --> see that person's entries for that day
   - Filter by: period (week/month/quarter), employee, work type, project
   - Summary cards: Totaal uren, Gemiddeld per medewerker, Meest gelogde werktype

3. **Uurrapportages** (`/admin/uren/rapportages`)
   - Tab: Per project | Per klanttype | Per adviseur | Per werktype
   - Each tab shows a bar chart + detailed table
   - Date range picker
   - Export button (CSV/Excel)

**Components:**
- `TimeCalendar` -- month view with colored hour bars per day
- `TimerWidget` -- floating start/stop timer with live counter
- `WeeklyProgressBar` -- segmented bar showing 40h target vs actual
- `TeamHeatmap` -- grid of employees x days with color intensity
- `HoursChart` -- bar/line chart for reports

### Data Requirements

**Tables:**

```
timeEntries {
  userId: Id<"users">,
  datum: string,               // "2026-03-18" (ISO date string)

  // Link to work
  orderId?: Id<"orders">,
  projectId?: Id<"projects">,

  // Type
  werktype: "opname" | "uitwerking" | "controle" | "administratie" | "reistijd" | "commercie" | "overleg" | "opleiding" | "overig",

  // Time
  uren: number,                // in hours, 0.25 increments (15 min)

  // Description
  beschrijving?: string,

  // Timer data
  timerStartedAt?: number,
  timerStoppedAt?: number,
  isFromTimer: boolean,

  createdAt: number,
  updatedAt: number,
}
```

### Business Rules

1. **15-minute increments**: Hours must be in multiples of 0.25 (15 minutes). System rounds timer values to nearest 15 minutes.

2. **Weekly target is advisory, not enforced**: The 40h/week target is shown as a progress bar and used in reports, but the system does NOT block any action if hours are not logged. It is purely informational.

3. **Retroactive entry**: Users can log hours up to 14 days in the past. Beyond 14 days, only admin can add/edit entries.

4. **No deletion by user**: Users can edit their own entries (same day only). Admin can edit any entry. Deleted entries are soft-deleted (hidden but retained for audit).

5. **Timer auto-pause**: If timer is running for >4 hours continuously, show a notification: "Timer draait al 4 uur. Vergeten te stoppen?" Timer continues but notification repeats every hour.

6. **Report access**: Only admin and eigenaar roles can see team-wide reports. Individual users can only see their own hours.

7. **Not used for payroll**: Uurregistratie is separate from Loket.nl (payroll). This data is for business intelligence only.

### Edge Cases

- **User forgets to log hours for a week**: Weekly reminder email on Friday: "Je hebt deze week {X} uur gelogd (doel: 40 uur). Log je uren via {link}."
- **Timer left running overnight**: Auto-stop timer at 23:59. Log accumulated time for that day. Show notification next morning: "Timer is automatisch gestopt om 23:59 met {X} uur."
- **Multiple timers**: Only one timer can run at a time. Starting a new timer stops the previous one and saves the entry.
- **Order linked to no project**: Allowed. Hours still count toward the individual order's cost analysis.
- **Part-time employee**: Weekly target is configurable per user in admin settings (e.g., 24h for a 3-day employee).

---

## 1.6 Pricing Engine

### User Story

**As** the VastVooruit system, **I want** a centralized product catalog with pricing rules per client type, automatic surcharge calculations, and volume discounts, **so that** offertes and orders always have the correct pricing without manual calculation, and pricing changes can be managed in one place.

### Acceptance Criteria

**Product Catalog:**
- [ ] Manage products: Energielabel, Maatwerkadvies (Verduurzamingsadvies), WWS-Puntentelling, NEN 2580, BENG, Blowerdoortest
- [ ] Each product has: name, description, base prices per woningtype, VAT percentage (default 21%), active/inactive toggle
- [ ] Products are versioned: changing a price creates a new version. Historical orders reference the price version at time of creation.

**Pricing Rules per Client Type:**

- [ ] **Particulier** (fixed prices per woningtype):
  - Appartement: 275 EUR incl. BTW
  - Rijtjeswoning: 299 EUR incl. BTW
  - 2-onder-1-kap: 325 EUR incl. BTW
  - Vrijstaand: 350 EUR incl. BTW
  - Utiliteit: see oppervlakte-based pricing below

- [ ] **Belegger**:
  - Base: 200 EUR per label (excl. BTW)
  - Seriekorting from 5th woning: 175 EUR per label
  - Maatwerkadvies: 75 EUR bij label (add-on)
  - NEN 2580: see product pricing
  - WWS-Puntentelling: see product pricing

- [ ] **Corporatie** (contract-based):
  - Eerste 4 labels: 295 EUR per label
  - 5e label en verder: 165 EUR per label
  - Contract terms configurable per corporatie (stored on company profile)
  - Custom pricing override possible per contract

- [ ] **Utiliteit** (oppervlakte-afhankelijk):
  - <100 m2: 495 EUR
  - 100-250 m2: 570-690 EUR
  - 251-500 m2: 695-850 EUR
  - 501-1000 m2: 775-940 EUR
  - 1001-1500 m2: 900-1100 EUR
  - >1501 m2: 1000+ EUR (manual quote)

**Surcharges:**
- [ ] Spoed toeslag: +150 EUR (order needs completion within 5 business days)
- [ ] No-show woning: 75 EUR (per occurrence)
- [ ] No-show utiliteit: 150 EUR (per occurrence)
- [ ] Destructief onderzoek: 50-150 EUR (variable, entered by adviseur)
- [ ] Extra kamers (>8): 25 EUR per extra kamer
- [ ] Regio toeslag: variable, based on distance from Staphorst (configurable per postcode range)
- [ ] Herbezoek: same price as original visit type

**Auto-calculation:**
- [ ] In offerte builder: select client type + products + woningtypes + quantities --> total price auto-calculated with all applicable discounts and surcharges
- [ ] Volume discounts are shown as separate line items with negative amounts and clear description (e.g., "Seriekorting (5e woning en verder, 8x): -200,00")
- [ ] Surcharges appear as additional line items

### UI Description

**Pages:**

1. **Product Catalog** (`/admin/producten`)
   - Card grid of products with: name, icon, base price range, active/inactive badge
   - Click --> product detail with pricing matrix (rows = woningtypes, columns = client types)
   - Edit prices inline

2. **Pricing Rules** (`/admin/prijsregels`)
   - Tab per client type: Particulier | Belegger | Corporatie | Utiliteit
   - Each tab shows the pricing table for that client type
   - Volume discount configuration per client type
   - Surcharge configuration (amounts, conditions)

3. **Corporatie Contracten** (`/admin/contracten`)
   - Table of active corporatie contracts with: company, start date, end date, pricing terms
   - Contract detail: custom price per product, volume thresholds, special conditions

**Components:**
- `PricingMatrix` -- editable grid of woningtype x price
- `VolumeDiscountConfig` -- threshold + discount amount editor
- `SurchargeList` -- list of configurable surcharges with conditions
- `PriceCalculator` -- real-time calculation widget used in offerte builder

### Data Requirements

**Tables:**

```
products {
  naam: string,
  beschrijving: string,
  icon: string,                // icon name from icon library
  btwPercentage: number,       // 21
  isActive: boolean,
  sortOrder: number,
  createdAt: number,
  updatedAt: number,
}

productPricing {
  productId: Id<"products">,
  woningtype: string,          // matches woningtype enum from orders
  clientType: "particulier" | "belegger" | "corporatie" | "utiliteit",
  prijsExBtw: number,
  prijsInclBtw: number,
  versie: number,              // auto-incremented on price change
  geldigVanaf: number,         // timestamp
  geldigTot?: number,          // null = current
}

volumeDiscounts {
  clientType: "belegger" | "corporatie",
  productId: Id<"products">,
  drempel: number,             // from this quantity
  kortingPrijsExBtw: number,   // discounted price per unit
  beschrijving: string,        // "Seriekorting vanaf 5e woning"
}

surcharges {
  naam: string,
  type: "spoed" | "no_show_woning" | "no_show_utiliteit" | "destructief_onderzoek" | "extra_kamers" | "regio" | "herbezoek",
  bedragExBtw: number,         // fixed amount (0 for variable)
  isVariabel: boolean,         // true for destructief_onderzoek, regio
  isPerUnit: boolean,          // true for extra_kamers (per kamer)
  btwPercentage: number,
  beschrijving: string,
  isActive: boolean,
}

corporatieContracten {
  bedrijfId: Id<"companies">,
  startDatum: number,
  eindDatum: number,

  // Custom pricing overrides
  customPricing: Array<{
    productId: Id<"products">,
    drempel: number,           // 0 = from first unit
    prijsExBtw: number,
  }>,

  voorwaarden?: string,        // free text contract conditions
  isActive: boolean,
  createdAt: number,
}
```

### Business Rules

1. **Price at time of order creation**: When an order is created, the current price version is "locked in" on the order. Future price changes do NOT retroactively affect existing orders or offertes.

2. **Volume discount calculation for belegger**: Based on the number of orders in the same project (or offerte). First 4 at full price, 5th onwards at discounted price. If a belegger sends 10 addresses: 4x 200 EUR + 6x 175 EUR = 1,850 EUR.

3. **Corporatie contract overrides product pricing**: If a corporatie has an active contract, the contract prices take precedence over default product pricing. If no contract exists, default pricing applies.

4. **Utiliteit manual quote for >1500m2**: System shows "Op aanvraag" instead of a price. User must manually enter the price after consultation with Jarco.

5. **Surcharges are additive**: They are ADDED to the base price. A spoed order for a particulier vrijstaand = 350 + 150 = 500 EUR incl BTW.

6. **Regio toeslag is distance-based**: Configurable as postcode ranges with associated surcharges. Default: 0 EUR within 50km of Staphorst (7951), 50 EUR for 50-100km, 100 EUR for >100km. Distance calculated using first 4 digits of postcode.

7. **Price includes all services selected**: If a client orders Energielabel + Verduurzamingsadvies, both products are separate line items on the offerte. The total is the sum.

### Edge Cases

- **Client type changes mid-order**: If a contact was initially classified as "particulier" but turns out to be a "belegger" with multiple properties, admin can change the client type. Prices are recalculated, but a new offerte must be sent if one was already accepted.
- **Corporatie orders exactly 4 labels**: No discount applied. Discount kicks in at the 5th label.
- **Mixed woningtypes in belegger project**: Each woningtype gets its own line item with its own price. Volume discount applies to the total count, not per woningtype.
- **Price change while offerte is pending**: The offerte keeps the old price. New offerte version needed to apply new prices.
- **Surcharge applies mid-process**: E.g., order was not spoed at creation, but client later requests spoed. Admin adds the spoed surcharge as a cost mutation (see 1.4), not a price change.
- **BTW exemption**: Some government entities or specific corporatie deals may be BTW-exempt. Allow per-offerte and per-invoice BTW override.

---

## 1.7 Three Client Flows

### User Story

**As** the VastVooruit team, **I want** the system to automatically apply the correct workflow, pricing, invoicing, and communication patterns based on the client type (Corporatie, Belegger, Particulier/Makelaar), **so that** each client segment gets the appropriate treatment without manual configuration per order.

### Acceptance Criteria

- [ ] Client type is determined at lead/intake level and propagated to all orders
- [ ] Each client type has a distinct flow through the system, with different:
  - Required stages (some stages are skipped)
  - Pricing rules (from 1.6)
  - Invoicing moments and payment terms (from 1.3)
  - Communication templates (emails, checklists)
  - Required fields and validations
- [ ] System enforces the correct flow per client type -- does not allow bypassing required steps
- [ ] Visual differentiation: client type badge is visible on every order card, lead card, and detail page

### Flow Definitions

---

#### CORPORATIE FLOW

```
Contract --> Jaarlijkse Batch --> Bulk Import Adressen --> Bulk Planning -->
Opname --> Uitwerking --> Levering --> Maandelijks gefactureerd (35/65 split)
```

**Detailed stages:**

| Stage | Status | What Happens | Who | System Actions |
|---|---|---|---|---|
| Contract | (Pre-system) | Multi-year contract signed offline. Terms entered in system as `corporatieContract`. | Jarco + Corporatie | Admin creates `corporatieContract` with custom pricing, links to company. |
| Batch Start | `NIEUW` | Corporatie sends batch of addresses (CSV/Excel, typically 100-2500+ per year). | Corporatie contactpersoon | Bulk import via CSV upload. All orders created under one project. Orders auto-priced from contract terms. |
| Bulk Planning | `INGEPLAND` | Aviejah assigns adviseurs in bulk (by postcode region). Adviseur sees batch in personal overview. | Aviejah (planner) | For each order: assign adviseur, set opnamedatum. System sends batch confirmation emails to corporatie contactpersoon. Per-address bevestigingsmail to huurder (bewoner). **Voorschot factuur (35%) auto-generated for entire batch.** |
| Opname | `OPNAME_GEDAAN` | EP-adviseur visits, fills opnameformulier, takes photos. | EP-adviseur | After upload of opnameformulier: order status auto-updates. Adviseur confirms costs (see 1.4). |
| Uitwerking | `IN_UITWERKING` | Back-office enters data in Uniec3 (or bot does it overnight). | Back-office / Bot | If bot-eligible: auto-queued for Uniec3 bot. |
| Controle | `CONTROLE` | Senior adviseur checks the label calculation. | Mark / Senior | Status change requires all cost mutations resolved. |
| Registratie | `GEREGISTREERD` | Label registered at EP-Online under adviseur's name. | EP-adviseur | Manual step (requires personal 2FA on EP-Online). |
| Levering | `VERZONDEN` | Label PDF emailed to corporatie contactpersoon (NOT individual huurders). | System (auto) | Auto-email to corporatie contact. Label PDF + rapport attached. CC to any configured recipients. |
| Afronding | `AFGEROND` | All deliverables sent, costs confirmed. | Admin | **Eindafrekening factuur (65%) auto-generated. Includes cost mutations. Payment term: 30 days.** |

**Corporatie-specific rules:**
- Orders skip `OFFERTE_VERSTUURD` and `GEACCEPTEERD` (covered by contract)
- Bulk CSV import creates all orders at once under a project
- Adviseur assignment can be done in bulk (select multiple orders --> assign adviseur)
- 35% voorschot is calculated on the TOTAL batch value, not per order
- Monthly invoicing option: instead of per-batch, corporatie can choose monthly aggregated invoicing
- Labels are delivered to the corporatie, not to individual huurders

---

#### BELEGGER FLOW

```
Offerte --> Acceptatie --> Project met Adressen --> Planning -->
Opname --> Adviseur bevestigt kosten --> Uitwerking --> Levering -->
Factuur (10 dagen na opname)
```

**Detailed stages:**

| Stage | Status | What Happens | Who | System Actions |
|---|---|---|---|---|
| Lead & Offerte | `NIEUW` / `OFFERTE_VERSTUURD` | Belegger contacts VastVooruit with portfolio (1-100 addresses). Offerte created with volume pricing. | Jarco + Belegger | Create lead, create offerte with products + addresses. Auto-apply volume discounts (5th woning+ at 175 EUR). Send offerte via email. |
| Acceptatie | `GEACCEPTEERD` | Belegger accepts offerte (digital signature if >1000 EUR). | Belegger | On acceptance: auto-create project + orders. Each address = one order. |
| Planning | `INGEPLAND` | Plan opnames. Belegger (opdrachtgever) AND huurder (bewoner) both need to be contacted. | Aviejah | Assign adviseur per order. Send bevestigingsmail to belegger AND bewoner. Include checklist appropriate for huurwoning. |
| Opname | `OPNAME_GEDAAN` | Adviseur visits. Note: bewoner may be huurder, not eigenaar. Access may need coordination. | EP-adviseur | Adviseur uploads opnameformulier. **Adviseur MUST confirm/report costs within 2 business days.** |
| Kosten bevestigd | (trigger) | Adviseur confirms costs are correct or submits mutations. | EP-adviseur | Cost mutations flow (see 1.4). |
| Uitwerking | `IN_UITWERKING` | Data entry in Uniec3. | Back-office / Bot | Standard flow. |
| Controle + Registratie | `CONTROLE` --> `GEREGISTREERD` | Quality check + EP-Online registration. | Senior + Adviseur | Standard flow. |
| Levering | `VERZONDEN` | Label emailed to belegger. If maatwerkadvies ordered: rapport also attached. | System (auto) | Auto-email to belegger. CC to any configured tussenpersoon. |
| Facturatie | `AFGEROND` | Invoice auto-generated. **Timing: 10 days after opnamedatum** (not after levering). | System | Create invoice, send to belegger. Payment term: 14 days. |

**Belegger-specific rules:**
- Communication goes to BOTH opdrachtgever (belegger) and bewoner (huurder) -- two separate emails per planning/confirmation
- Volume discount: 200 EUR/label for first 4, 175 EUR from 5th onwards, within same project
- Maatwerkadvies (verduurzamingsadvies) commonly ordered as add-on: 75 EUR per woning bij label
- Invoice timing is based on opnamedatum, NOT on completion date. This means invoice may be generated before label is delivered.
- If adviseur does not confirm costs within 2 business days, system sends reminder to adviseur and flags order

---

#### PARTICULIER / MAKELAAR FLOW

```
Intake formulier --> Direct als order (als <1.000 EUR) of offerte -->
Planning --> Opname --> Uitwerking --> Betaallink --> Betaling --> Levering
```

**Detailed stages:**

| Stage | Status | What Happens | Who | System Actions |
|---|---|---|---|---|
| Intake | `NIEUW` | Particulier fills intake form, OR makelaar sends request via email/HomeFlow. | Particulier / Makelaar | Order created from intake form or manually by Aviejah. BAG auto-fill. |
| Quick Accept (if <1000 EUR) | Skip to `INGEPLAND` | Most particulier orders are single labels (<1000 EUR). No offerte needed. | System | Auto-skip OFFERTE_VERSTUURD and GEACCEPTEERD. Order goes directly to planning. |
| Offerte (if >=1000 EUR) | `OFFERTE_VERSTUURD` | Rare for particulier. Multiple services or large utility. | Jarco | Standard offerte flow. |
| Planning | `INGEPLAND` | Schedule opname. Particulier = eigenaar = bewoner (usually). | Aviejah | Send bevestigingsmail to particulier. Include appropriate checklist. If via makelaar: CC makelaar. |
| Opname | `OPNAME_GEDAAN` | Standard opname. | EP-adviseur | Standard flow. |
| Uitwerking + Controle | Standard | Standard flow. | Back-office | Standard flow. |
| Registratie | `GEREGISTREERD` | Label registered. | EP-adviseur | Standard flow. |
| Betaallink | (between `GEREGISTREERD` and `VERZONDEN`) | **Generate betaallink (iDEAL via Mollie/Stripe).** Email to particulier: "Uw label is gereed. Betaal via onderstaande link om het label te ontvangen." | System | Auto-generate betaallink. Invoice created. Email sent with payment link. |
| Betaling | (trigger) | Particulier pays via iDEAL. | Particulier | Payment webhook confirms payment. Invoice marked as `betaald`. |
| Levering | `VERZONDEN` | **ONLY after payment confirmed.** Label PDF emailed. | System (auto) | Auto-send label + rapport. If via makelaar: CC makelaar + use makelaar's CC preferences. |
| Afronding | `AFGEROND` | Done. | System | Auto-complete. |

**Particulier/Makelaar-specific rules:**
- Payment BEFORE delivery: label is withheld until payment is confirmed
- If makelaar is tussenpersoon: use makelaar's CC preferences for all communications
- Fixed pricing by woningtype (no negotiation)
- No-show policy clearly communicated in bevestigingsmail: "Bij niet thuis zijn wordt 75 EUR in rekening gebracht"
- If payment not received within 7 days of betaallink: auto-reminder. After 21 days: escalate to admin.
- Makelaar factuurvoorkeur: some makelaars want the invoice sent to them (they charge client), others want it direct to particulier. Configurable per makelaar profile.

### UI Description

The three flows do NOT have separate UIs. They use the same pipeline, but the system:
1. Shows/hides relevant status columns based on client type (e.g., particulier sees fewer columns)
2. Enforces different validation rules per status transition
3. Triggers different automated actions (invoicing, emails) based on client type
4. Applies different pricing rules in offerte builder
5. Shows a **client type badge** on every order card: colored tag with "PA" / "BL" / "CO" / "MK"

**Dashboard should show:**
- Pipeline summary per client type (3 mini-pipelines)
- Alerts specific to each flow (e.g., "3 belegger-orders wachten op kostenbevestiging", "5 particulier-betalingen nog niet ontvangen")

### Data Requirements

Client type is stored on the order (`clientType` field) and determined from the company type or the intake form. All flow-specific behavior is driven by this single field.

Additional fields on orders for flow-specific data:

```
// On orders table, add:
clientType: "particulier" | "belegger" | "corporatie" | "makelaar",

// Corporatie-specific
corporatieContractId?: Id<"corporatieContracten">,
batchId?: string,              // groups orders in same batch import

// Belegger-specific
kostenBevestigdOp?: number,
kostenBevestigdDoor?: Id<"users">,

// Particulier-specific
betaallinkUrl?: string,
betaallinkToken?: string,
betaaldVoorLevering: boolean,  // gate for label delivery
```

### Business Rules

1. **Client type is immutable after first invoice**: Once an invoice has been generated for an order, the client type cannot be changed (because pricing rules differ). Before invoicing, admin can change client type with price recalculation.

2. **Mixed projects**: A project can contain orders for different woningtypes but NOT different client types. If a belegger owns both woningen and utiliteit, these are separate projects.

3. **Makelaar is a variant of Particulier**: Makelaar flow is identical to Particulier flow, with the addition of tussenpersoon handling (CC, factuurvoorkeur). In the pipeline, both show as "Particulier/Makelaar" but the badge distinguishes them (PA vs MK).

4. **Flow enforcement is advisory for admin**: Admin users can force status transitions even if business rules are not met. This is logged as "Admin override" in the activity timeline. Non-admin users cannot override.

5. **Status columns auto-filter**: In kanban view, users can toggle "Toon alleen relevant voor {clientType}" to see only the statuses that apply to a specific flow. Default: show all.

### Edge Cases

- **Corporatie sends a single address (not a batch)**: Still treated as corporatie flow if the company type is corporatie. Contract pricing applies. No volume discount for 1 address.
- **Belegger starts as particulier**: Initial order created as particulier. Belegger then calls and says "I have 10 more properties." Admin creates a new project for the batch, changes client type to belegger, and creates an offerte for all 11 addresses (original + 10 new). Original order is re-linked to the new project.
- **Makelaar orders for their own property**: If the makelaar is the eigenaar, they are treated as particulier with fixed pricing. Makelaar discount does not apply to own properties.
- **Corporatie huurder refuses access**: Order stays in `INGEPLAND`. After 2 failed attempts (2 no-shows), order is marked as "Geen toegang" and escalated to corporatie contactpersoon. VastVooruit charges 2x no-show fee.
- **Betaallink amount changes due to cost mutation**: If a mutation is approved after the betaallink was generated, the old link is invalidated and a new one is generated for the updated amount. Client receives updated email.
- **Belegger pays before invoice due date**: Early payment is fine. Moneybird webhook updates payment status. No special handling needed.

---

# APPENDIX: Status Definitions

| Status | Code | Description | Who triggers | Auto/Manual |
|---|---|---|---|---|
| Nieuw | `NIEUW` | Order is created, not yet processed | System (intake/manual) | Auto |
| Offerte Verstuurd | `OFFERTE_VERSTUURD` | Offerte sent to client | Jarco | Manual |
| Geaccepteerd | `GEACCEPTEERD` | Client accepted offerte | Client (via link) | Auto |
| Ingepland | `INGEPLAND` | Opname date and adviseur assigned | Aviejah (planner) | Manual |
| Opname Gedaan | `OPNAME_GEDAAN` | Field visit completed, formulier uploaded | EP-adviseur | Manual |
| In Uitwerking | `IN_UITWERKING` | Data being entered in Uniec3 | Back-office / Bot | Manual/Auto |
| Concept Gereed | `CONCEPT_GEREED` | Calculation complete, awaiting review | Back-office / Bot | Manual/Auto |
| Controle | `CONTROLE` | Senior reviewing the calculation | Senior adviseur | Manual |
| Geregistreerd | `GEREGISTREERD` | Label registered at EP-Online | EP-adviseur | Manual |
| Verzonden | `VERZONDEN` | Label delivered to client | System | Auto (after payment for particulier) |
| Afgerond | `AFGEROND` | All complete, ready for archival | Admin | Manual |
| Archief | `ARCHIEF` | Archived (soft, recoverable) | Admin | Manual |
| Verwijderd | `VERWIJDERD` | Deleted (soft, admin recoverable) | Admin | Manual |
| On Hold | `ON_HOLD` | Temporarily paused | Any user | Manual |

---

# APPENDIX: Role-Based Access

| Feature | Admin (Jarco) | Planner (Aviejah) | EP-adviseur (Mark, Thijs, etc.) | Back-office (Joris) | Administratie (Jasper) |
|---|---|---|---|---|---|
| Order CRUD | Full | Create, Edit | View own, Edit status | View all, Edit uitwerking fields | View all |
| CRM | Full | View | View own contacts | -- | View |
| Offertes | Full | View | -- | -- | View |
| Facturen | Full | -- | -- | -- | Full |
| Kostenmutaties | Approve/Reject | View | Submit | View | View |
| Uurregistratie | All + Reports | Own | Own | Own | Own |
| Bot Dashboard | Full | View | View | View | -- |
| Pricing Engine | Full | -- | -- | -- | View |
| Settings | Full | -- | -- | -- | -- |

---

# APPENDIX: Opnameformulier Data Structure

Based on analysis of the actual VastVooruit opnameformulier (3 pages, filled on iPad), the structured data that feeds into both the Uniec3 bot and the order system:

**Page 1 - Algemene Gegevens (~65-70 fields):**
- Identification: adres, plaats, datum, opdrachtgever, bouwtype (U-Bouw/W-Bouw/W-Bouw kamerhuur), aantal kamers
- Indeling gebouw: woningtype (vrijstaand/hoekwoning/tussenwoning/appartement), daktype (hellend/plat), positie, bouwlagen, daktype checkbox
- Constructie: daktype, vloertype, wandtype, type bouw (BB/BB Reno/NB), renovatiejaar
- Verwarming: type (WP/CV HR107/WP+CV/Overig), functie, gemeenschappelijk, locatie opwekker, aanvoertemp, leidingen buiten TZ, afgifte, regeling
- Ventilatie: type (A/B/C/D centraal/D decentraal), invoer (forfaitair/prod.spec), spec, fab.jaar, label, ZR roosters
- Warm tapwater: type, functie, keukenboiler separaat, buffervat, circulatieleiding, CW-klasse, leidinglengtes BK en K
- Airco/koeling: type, regeling, afgifte
- PV panelen: aanwezig/niet, aantal, orientatie, hoek, ventilatie
- Bouwjaarwaarneming: per element (VL A/B, Ge A/B/C, Dak A/B) -- observed construction quality codes

**Page 2 - Geometrie en Orientatie (variable rows):**
- Perimeter (Pm) in meters
- Compass orientation drawing
- Vaste constructies table: Rc, Rz, Nr, V/G/D (vloer/gevel/dak), Lengte, Hoogte, Opmerking
- Hand-drawn floor plan with numbered construction elements
- Transparante constructies table: Nr, R/D/P (raam/deur/paneel), M2, Omschrijving (glastype: HR++, E, D, etc.), Opmerking

**Page 3 - Extra Geometrie (if needed):**
- Same structure as page 2 for additional building sections (e.g., second floor, extension)
