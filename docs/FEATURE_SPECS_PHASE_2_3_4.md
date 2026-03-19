# VastVooruit — Feature Specifications Phase 2, 3 & 4

**Tech Stack:** Next.js 16 + Convex (realtime DB) + Clerk (auth) + Tailwind v4 + shadcn/ui + React Native (Phase 3)
**Versie:** 1.0
**Datum:** 18 maart 2026
**Status:** Draft voor review

---

# PHASE 2: PLANNING & COMMUNICATIE

---

## 2.1 Slimme Planning + Outlook Sync

### 2.1.1 Adviseur Profiles

**User Story**
Als planner (Avia) wil ik per EP-adviseur een profiel beheren met specialisaties, thuislocatie, werkdagen en certificeringen, zodat het systeem slimme planningssuggesties kan doen op basis van geschiktheid en nabijheid.

**Acceptance Criteria**
- [ ] Elke EP-adviseur heeft een bewerkbaar profiel met alle onderstaande velden
- [ ] Profielwijzigingen worden direct opgeslagen (optimistic updates via Convex)
- [ ] Planner kan adviseurprofielen beheren; adviseurs kunnen hun eigen profiel inzien maar niet bewerken
- [ ] Systeem valideert dat thuislocatie een geldig Nederlands postcode is (format: 1234AB)
- [ ] Thuislocatie wordt automatisch geocoded naar coordinaten via Postcode API
- [ ] Bij het toewijzen van een order toont het systeem een matchingscore per adviseur

**UI Description**
- Adviseur profielpagina: avatar (Clerk), naam, email, telefoonnummer
- Sectie "Specialisaties": multi-select chips voor: Energielabel Woningbouw, Energielabel Utiliteitsbouw, Maatwerkadvies, BENG-berekening, WWS/Huurprijscheck, NEN 2580
- Sectie "Locatie & Reizen": postcode-invoerveld met autocomplete, kaartpreview (kleine embedded map), slider voor max reisafstand (10-150km, stappen van 5km)
- Sectie "Beschikbaarheid": weekoverzicht met toggles per dag (ma-za). Per dag optioneel: halve dag ochtend / halve dag middag / hele dag. Vakantie/verlof-periodes markeren (range picker)
- Sectie "Certificeringen": lijst met certificaatnaam, nummer, verloopdatum. Verlopen certificaten krijgen rode badge
- Sectie "Statistieken" (read-only): labels afgerond deze maand, gemiddelde doorlooptijd, no-show percentage
- Badge-systeem: groene badge = beschikbaar vandaag, oranje = beperkt beschikbaar, rood = niet beschikbaar

**Data Requirements**

```
adviseurProfiles: defineTable({
  userId: v.string(),              // Clerk user ID
  clerkEmail: v.string(),
  name: v.string(),
  phone: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),

  // Specialisaties
  specializations: v.array(v.union(
    v.literal("energielabel_woningbouw"),
    v.literal("energielabel_utiliteitsbouw"),
    v.literal("maatwerkadvies"),
    v.literal("beng"),
    v.literal("wws_huurprijscheck"),
    v.literal("nen2580"),
  )),

  // Locatie
  homePostcode: v.string(),        // "8321AE"
  homeCity: v.optional(v.string()), // Auto-filled via Postcode API
  homeLat: v.float64(),
  homeLng: v.float64(),
  maxTravelDistanceKm: v.float64(), // default 50

  // Beschikbaarheid
  workingDays: v.array(v.object({
    day: v.union(
      v.literal("monday"), v.literal("tuesday"),
      v.literal("wednesday"), v.literal("thursday"),
      v.literal("friday"), v.literal("saturday")
    ),
    availability: v.union(
      v.literal("full_day"),
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("unavailable")
    ),
  })),

  // Certificeringen
  certifications: v.array(v.object({
    name: v.string(),
    number: v.optional(v.string()),
    expiryDate: v.optional(v.float64()),  // timestamp
    isValid: v.boolean(),
  })),

  // Preferences
  prefersLongDistance: v.boolean(),   // Bijv. Jurre rijdt graag ver
  needsOfficeDays: v.boolean(),      // Bijv. Rick heeft kantoortijd nodig
  seniorityLevel: v.union(
    v.literal("junior"),
    v.literal("medior"),
    v.literal("senior")
  ),

  isActive: v.boolean(),
})
```

**Business Rules**
1. Specialisatie is verplicht: minimaal 1 specialisatie per adviseur
2. Certificeringen worden 30 dagen voor verloopdatum oranje gemarkeerd, na verloopdatum rood. Verlopen certificering blokkeert NIET automatisch planning (human override mogelijk), maar toont waarschuwing
3. Thuislocatie postcode moet valide zijn via Postcode API check
4. Max reisafstand wordt berekend hemelsbreed, niet rijtijd (eerste versie). Toekomstig: Google Distance Matrix API
5. Werkdagen worden wekelijks herhaald, vakantieperiodes overschrijven werkdagen
6. Bij het deactiveren van een adviseur: waarschuwing als er toekomstige afspraken gepland staan

**Edge Cases**
- Adviseur heeft geen specialisatie die matcht met een opdracht: systeem toont waarschuwing maar staat toewijzing toe (planner override)
- Adviseur verhuist (postcode wijzigt): alle toekomstige planningssuggesties herberekenen, bestaande afspraken blijven staan
- Certificering verloopt terwijl opdrachten gepland staan: notificatie naar planner + adviseur, maar niet automatisch annuleren
- Twee adviseurs op dezelfde postcode: beide worden gesuggereerd, gesorteerd op beschikbaarheid
- Adviseur werkt parttime en wisselt per week: basisrooster + uitzonderingen per week via Outlook sync

---

### 2.1.2 AI Route Optimization

**User Story**
Als planner wil ik bij het inplannen van een opdracht een slimme suggestie krijgen welke adviseur het beste past, zodat ik reistijd minimaliseer en specialisatie-match optimaliseer zonder zelf alle agenda's te moeten checken.

**Acceptance Criteria**
- [ ] Bij het openen van de planning voor een order verschijnt een "Suggesties" panel
- [ ] Suggesties rangschikken adviseurs op een gewogen score van: afstand, specialisatie-match, beschikbaarheid, bestaande afspraken die dag (clustering)
- [ ] Score is zichtbaar als percentage (0-100%) met breakdown tooltip
- [ ] Suggestie toont reistijd/afstand naar opdrachtadres
- [ ] Bij bulkplanning (project met meerdere adressen): optimalisatie over de hele set
- [ ] Planner kan suggestie accepteren met 1 klik of handmatig kiezen

**UI Description**
- Rechter sidebar bij planningsview: "Slimme suggestie" card
- Per adviseur in suggestielijst:
  - Avatar + naam
  - Matchscore als circulaire progress indicator (bijv. "87%")
  - Afstand badge: "12 km" in groen/oranje/rood
  - Beschikbaarheid: groene checkmark of "Vol na 14:00"
  - Cluster-indicator: "2 andere afspraken in Zwolle" met kaartje
  - Klik op adviseur -> expanded view met dagagenda preview
- Kaartweergave: bestaande afspraken als pins, nieuwe opdracht als pulserende marker, lijnen naar gesuggereerde adviseur's route

**Data Requirements**

```
// Geen apart table nodig - dit is een computed query/action

// Input voor suggestie-engine:
suggestieInput: {
  orderAddress: { postcode, lat, lng },
  requiredSpecialization: string,
  preferredDate: timestamp,
  preferredTimeSlot: "morning" | "afternoon" | "full_day",
}

// Output:
suggestieResult: {
  adviseurId: string,
  matchScore: number,          // 0-100
  scoreBreakdown: {
    distanceScore: number,     // 0-30 punten
    specializationScore: number, // 0-25 punten
    availabilityScore: number,   // 0-25 punten
    clusterScore: number,        // 0-20 punten
  },
  distanceKm: number,
  estimatedTravelMinutes: number,
  existingAppointmentsNearby: number,
  availableSlots: TimeSlot[],
}
```

**Business Rules**
1. Scoring gewichten (v1):
   - Afstand: 30% (0km = 30pt, >maxDistance = 0pt, lineair)
   - Specialisatie: 25% (exact match = 25pt, geen match = 0pt)
   - Beschikbaarheid: 25% (vrij = 25pt, deels vrij = 15pt, vol = 0pt)
   - Clustering: 20% (3+ afspraken <15km = 20pt, lineair afnemend)
2. Adviseur buiten max reisafstand wordt WEL getoond maar met oranje waarschuwing en lagere score
3. Beschikbaarheid wordt gecheckt via: werkdagen profiel + Outlook calendar (blokkades) + reeds geplande orders in systeem
4. Clustering kijkt naar alle afspraken op de gewenste datum binnen een straal van 15km van de nieuwe opdracht
5. Bij gelijke score: adviseur met minste werkdruk die week gaat voor
6. AI-suggestie is ALTIJD een suggestie, nooit automatisch toegewezen

**Edge Cases**
- Geen enkele adviseur beschikbaar op gewenste datum: toon dichtstbijzijnde beschikbare datum per adviseur
- Alle adviseurs buiten reisafstand: toon waarschuwing "Geen adviseur binnen reisafstand" met adviseurs gesorteerd op afstand
- Outlook sync niet beschikbaar voor een adviseur: markeer als "beschikbaarheid onbekend", gebruik alleen werkdagen-profiel
- Nieuw adres zonder postcode in systeem: fallback op plaatsnaam-geocoding
- Twee opdrachten op exact hetzelfde adres: detecteer en suggereer bundeling ("meerdere appartementen op dit adres?")

---

### 2.1.3 Outlook Bidirectional Sync

**User Story**
Als planner wil ik dat afspraken die ik in het VastVooruit systeem plan automatisch in de Outlook-agenda van de adviseur verschijnen, en dat wijzigingen in Outlook terugkomen in het systeem, zodat er een single source of truth is en adviseurs via Apple CarPlay naar het adres kunnen navigeren.

**Acceptance Criteria**
- [ ] OAuth flow via Microsoft Graph API: adviseur koppelt eenmalig zijn VastVooruit Outlook account
- [ ] Nieuwe afspraak in systeem -> automatisch calendar event in Outlook van de adviseur
- [ ] Calendar event bevat: titel, adres (als locatie, navigeerbaar), tijdstip, contactgegevens bewoner, opmerkingen, link naar order in systeem
- [ ] Blokkades in Outlook (bijv. vergaderingen, vakanties) worden als "niet beschikbaar" getoond in het planningssysteem
- [ ] Wijziging in Outlook (tijd verplaatst, geannuleerd) triggert notificatie in systeem + optionele sync
- [ ] Wijziging in systeem (verplaatsen/annuleren) updatet het Outlook event
- [ ] Sync vindt plaats binnen 60 seconden na wijziging (webhook-based, niet polling)

**UI Description**
- Instellingen pagina > "Agenda koppeling": knop "Verbind Outlook" met Microsoft OAuth flow
- Status indicator: "Verbonden met jarco@vastvooruit.nl" met groene dot
- Sync status: "Laatste sync: 2 seconden geleden"
- Bij sync-conflicten: modal "Conflict gedetecteerd" met keuze: "Systeem bijwerken" / "Outlook bijwerken" / "Negeren"
- In kalenderweergave: Outlook-afspraken die NIET via het systeem zijn gemaakt worden als grijze, niet-bewerkbare blokken getoond (bezet-indicatie)

**Data Requirements**

```
outlookConnections: defineTable({
  userId: v.string(),              // Clerk user ID
  adviseurId: v.id("adviseurProfiles"),
  microsoftUserId: v.string(),
  accessToken: v.string(),         // Encrypted
  refreshToken: v.string(),        // Encrypted
  tokenExpiresAt: v.float64(),
  calendarId: v.string(),          // Primary calendar ID
  syncEnabled: v.boolean(),
  lastSyncAt: v.float64(),
  webhookSubscriptionId: v.optional(v.string()),
  webhookExpiresAt: v.optional(v.float64()),
})

calendarEvents: defineTable({
  orderId: v.id("orders"),
  adviseurId: v.id("adviseurProfiles"),
  outlookEventId: v.optional(v.string()),
  title: v.string(),
  startTime: v.float64(),
  endTime: v.float64(),
  location: v.string(),            // Full address for navigation
  description: v.string(),         // Contact info + order link
  status: v.union(
    v.literal("scheduled"),
    v.literal("completed"),
    v.literal("cancelled"),
    v.literal("rescheduled")
  ),
  syncStatus: v.union(
    v.literal("synced"),
    v.literal("pending"),
    v.literal("conflict"),
    v.literal("error")
  ),
  lastModifiedBy: v.union(
    v.literal("system"),
    v.literal("outlook")
  ),
})
```

**Business Rules**
1. OAuth scope: `Calendars.ReadWrite` + `User.Read` via Microsoft Graph API
2. Calendar event format:
   - Titel: `"Energielabel - [Adres]"` of `"Maatwerkadvies - [Adres]"` (gebaseerd op opdrachttype)
   - Locatie: `"Straatnaam 12, 1234AB Plaats"` (zodat CarPlay/Google Maps het herkent)
   - Body: contactgegevens bewoner + link naar order + opmerkingen planner
   - Duur: standaard 45 minuten voor woningbouw, 90 minuten voor utiliteitsbouw (instelbaar)
3. Webhook via Microsoft Graph `subscriptions` endpoint voor realtime push. Fallback: polling elke 5 minuten als webhook faalt
4. Token refresh: automatisch via refresh token, 15 minuten voor expiry
5. Bij token-invalidatie (wachtwoord gewijzigd, account geblokkeerd): markeer verbinding als "verbroken", notificeer admin
6. Sync-conflict resolution: systeem-wijziging wint standaard, tenzij planner expliciet anders kiest
7. Privé-afspraken in Outlook: worden NIET inhoudelijk gesynchroniseerd, alleen als "bezet" blok getoond

**Edge Cases**
- Microsoft OAuth consent wordt geweigerd: uitleg modal met stappen voor IT-admin om toestemming te verlenen (tenant-level consent)
- Outlook account heeft meerdere calendars: standaard primary calendar, optie om specifieke calendar te kiezen
- Adviseur ontkoppelt Outlook: bestaande events in Outlook blijven staan (orphaned), systeem-afspraken blijven bestaan, sync stopt
- Outlook is offline/unavailable: queue wijzigingen en sync zodra beschikbaar (retry met exponential backoff, max 24 uur)
- Dubbele events: bij herverbinden na ontkoppeling, detecteer bestaande events op basis van orderId in extended properties om duplicaten te voorkomen
- Zomertijd/wintertijd: alle tijden opgeslagen in UTC, weergave in Europe/Amsterdam timezone
- Shared mailbox: als adviseur geen persoonlijke maar een gedeelde mailbox heeft, alternatieve OAuth flow met delegate permissions

---

### 2.1.4 Bulk Planning voor Corporaties

**User Story**
Als planner wil ik voor een corporatie-project met 100+ adressen in een keer een optimale verdeling over adviseurs en data genereren, zodat ik niet elk adres handmatig hoef in te plannen en de routes efficiënt zijn.

**Acceptance Criteria**
- [ ] Planner selecteert een project met meerdere orders en kiest "Bulk inplannen"
- [ ] Systeem genereert een planningsvoorstel: welke adviseur op welke dag welke adressen bezoekt
- [ ] Voorstel optimaliseert op: minimale totale reistijd, maximaal aantal bezoeken per dag, gelijke werklast verdeling
- [ ] Planner kan voorstel aanpassen via drag-drop voor individuele verschuivingen
- [ ] Na goedkeuring: alle afspraken worden tegelijk aangemaakt + Outlook events + bevestigingsmails
- [ ] Voortgangsbalk tijdens generatie (kan 10-30 seconden duren voor 100+ adressen)

**UI Description**
- Knop "Bulk inplannen" op project-detailpagina (alleen zichtbaar als project >5 ongeplande orders heeft)
- Stap 1: Selecteer welke orders (checkbox list, standaard alle ongeplande). Toon kaartoverzicht van alle adressen als clusters
- Stap 2: Kies periode (van-tot datum). Kies beschikbare adviseurs (multi-select, default: alle actieve)
- Stap 3: Systeem genereert voorstel. Weergave als:
  - Kaart met kleur-gecodeerde routes per adviseur per dag
  - Tabel: datum | adviseur | aantal bezoeken | adressen | geschatte rijtijd
  - Gantt-achtige dagview met tijdsblokken per adviseur
- Stap 4: Aanpassingen via drag-drop of handmatig verplaatsen
- Stap 5: Bevestiging + review. "Plan X afspraken in" knop

**Data Requirements**

```
bulkPlanningJobs: defineTable({
  projectId: v.id("projects"),
  createdBy: v.string(),           // Clerk user ID
  status: v.union(
    v.literal("generating"),
    v.literal("ready_for_review"),
    v.literal("approved"),
    v.literal("executing"),
    v.literal("completed"),
    v.literal("cancelled")
  ),
  orderIds: v.array(v.id("orders")),
  adviseurIds: v.array(v.id("adviseurProfiles")),
  dateRangeStart: v.float64(),
  dateRangeEnd: v.float64(),
  generatedPlan: v.optional(v.any()), // JSON with full planning proposal
  adjustments: v.optional(v.any()),   // Manual overrides by planner
  executionProgress: v.optional(v.object({
    total: v.float64(),
    completed: v.float64(),
    failed: v.float64(),
  })),
})
```

**Business Rules**
1. Max 8 bezoeken per adviseur per dag (instelbaar per adviseur)
2. Eerste bezoek niet voor 08:30, laatste bezoek start niet na 16:30
3. Reistijd tussen bezoeken: minimaal 15 minuten buffer bovenop geschatte rijtijd
4. Adviseur start en eindigt op thuislocatie (retourrit meegerekend)
5. Weekenden worden standaard uitgesloten, tenzij adviseur zaterdag als werkdag heeft
6. Bestaande Outlook-blokkades worden gerespecteerd
7. Verdeling streeft naar gelijke werklast: max 20% verschil in aantal bezoeken per adviseur over de hele periode
8. Corporatie-projecten hebben vaak woningen in clusters (flatgebouwen, straten): algoritme groepeert adressen binnen 500m als cluster

**Edge Cases**
- Meer adressen dan beschikbare capaciteit in de gekozen periode: waarschuwing met hoeveel extra dagen nodig zijn
- Adviseur wordt ziek na goedkeuring maar voor uitvoering: optie om die adviseur's deel te herplannen naar andere adviseurs
- Sommige adressen zijn niet bereikbaar per auto (eilanden, afgesloten gebieden): markeer als "handmatig inplannen"
- Bewoner heeft specifieke tijdsvoorkeur (alleen ochtend): meenemen als constraint in optimalisatie
- Midden in bulk-planning wijzigt een bestaande afspraak: real-time herberekening van de rest

---

### 2.1.5 Drag-Drop Calendar

**User Story**
Als planner wil ik een visuele weekkalender per adviseur zien waarin ik orders naar tijdslots kan slepen, zodat ik snel en intuitief kan plannen.

**Acceptance Criteria**
- [ ] Weekweergave met kolommen per dag (ma-za) en rijen per 30 minuten (08:00-18:00)
- [ ] Tabs of dropdown om te wisselen tussen adviseurs, of "alle adviseurs" view met kolommen per adviseur
- [ ] Orders in status "Nieuw" zijn beschikbaar als draggable cards in een sidebar
- [ ] Bestaande afspraken worden als blokken getoond in het juiste tijdslot
- [ ] Drag-drop van sidebar naar kalender: maakt afspraak aan
- [ ] Drag-drop binnen kalender: verplaatst afspraak
- [ ] Kleurcodering per opdrachttype (energielabel = groen, maatwerkadvies = blauw, BENG = paars, NEN 2580 = oranje, huurprijscheck = geel)
- [ ] Outlook-bezettingen als grijze niet-bewerkbare blokken
- [ ] Real-time updates: als andere planner iets wijzigt, verschijnt het direct (Convex reactivity)

**UI Description**
- Layout: 3-koloms view
  - Links (250px): ongeplande orders lijst, zoekbaar/filterbaar, draggable cards met adres + type + kleur
  - Midden (flex): kalenderweergave, scrollbaar, tijdslots
  - Rechts (300px): detail panel bij hover/selectie van afspraak (adresgegevens, contactinfo, opmerkingen, snelacties)
- Navigatie boven kalender: week-picker (< vorige week | Week 12, 2026 | volgende week >)
- Adviseur-selector: avatar chips, klik om te activeren/deactiveren
- Afspraakblok toont: adres (verkort), type-icon, status-dot
- Hover op afspraak: expanded tooltip met volledige info
- Rechts-klik contextmenu: "Verplaatsen", "Annuleren", "Details openen", "Bevestiging sturen"
- Visuele indicator bij drag: groene glow als slot beschikbaar, rode glow als er een conflict is

**Data Requirements**
Hergebruikt `calendarEvents` table uit 2.1.3 + real-time Convex subscription op alle events voor de geselecteerde week/adviseur.

**Business Rules**
1. Afspraken kunnen niet in het verleden geplaatst worden
2. Overlap-detectie: waarschuwing bij overlappende afspraken (inclusief reistijd-buffer)
3. Bij verplaatsen: Outlook event wordt automatisch ge-updated
4. Bij verplaatsen: reschedule-communicatie wordt getriggerd (zie 2.1.6)
5. Minimale afspraakduur: 30 minuten
6. Afspraak op een dag dat adviseur niet werkt: waarschuwing maar toegestaan (override)

**Edge Cases**
- Twee planners slepen tegelijk naar hetzelfde slot: Convex optimistic concurrency conflict -> tweede planner krijgt "Slot is net bezet" melding
- Kalender met 15+ adviseurs in "alle adviseurs" view: horizontaal scrollbaar, sticky time column
- Order zonder adres (nog niet compleet): tonen in sidebar maar niet draggable, met badge "Onvolledig"
- Kalender op mobiel/tablet: niet ondersteund in v1, melding "Gebruik desktop voor planning"

---

### 2.1.6 Reschedule Flow

**User Story**
Als planner wil ik een afspraak kunnen verplaatsen naar een ander tijdstip of andere adviseur, waarbij automatisch de Outlook-agenda en alle betrokken partijen worden geinformeerd.

**Acceptance Criteria**
- [ ] Planner verplaatst afspraak via drag-drop of via detail panel
- [ ] Systeem updatet Outlook-event van oude adviseur (verwijderen) en nieuwe adviseur (aanmaken) bij adviseur-wissel
- [ ] Systeem updatet Outlook-event bij alleen tijd-wissel
- [ ] Automatische email naar bewoner met nieuw tijdstip
- [ ] Automatische email naar opdrachtgever (als dit een ander persoon is) met nieuw tijdstip
- [ ] CC naar tussenpersoon als die gekoppeld is aan de order
- [ ] Reden voor verplaatsing wordt gelogd in de order-tijdlijn
- [ ] Originele afspraak-timestamp blijft bewaard in de history

**UI Description**
- Bij drag-drop verplaatsen: confirmation dialog: "Afspraak verplaatsen van [datum/tijd] naar [datum/tijd]?"
  - Optioneel tekstveld: "Reden voor verplaatsing"
  - Checkbox: "Bevestiging sturen naar bewoner" (default: aan)
  - Checkbox: "Bevestiging sturen naar opdrachtgever" (default: aan als opdrachtgever != bewoner)
  - Knop "Verplaatsen" / "Annuleren"
- In order-tijdlijn: "Afspraak verplaatst van [oud] naar [nieuw] door [planner]. Reden: [tekst]"

**Data Requirements**

```
appointmentHistory: defineTable({
  calendarEventId: v.id("calendarEvents"),
  orderId: v.id("orders"),
  action: v.union(
    v.literal("created"),
    v.literal("rescheduled"),
    v.literal("cancelled"),
    v.literal("adviseur_changed")
  ),
  previousStartTime: v.optional(v.float64()),
  previousEndTime: v.optional(v.float64()),
  previousAdviseurId: v.optional(v.id("adviseurProfiles")),
  newStartTime: v.optional(v.float64()),
  newEndTime: v.optional(v.float64()),
  newAdviseurId: v.optional(v.id("adviseurProfiles")),
  reason: v.optional(v.string()),
  performedBy: v.string(),  // Clerk user ID
  emailsSent: v.array(v.object({
    recipient: v.string(),
    type: v.string(),
    sentAt: v.float64(),
  })),
})
```

**Business Rules**
1. Verplaatsen binnen 24 uur voor de afspraak: extra waarschuwing "Afspraak is morgen/vandaag, bewoner is mogelijk al onderweg"
2. Maximaal 3 verplaatsingen per order voordat een escalatie-notificatie naar de manager gaat
3. Bij verplaatsing door bewoner (via klantportaal): status wordt "Reschedule requested", planner moet bevestigen
4. Email-template voor verplaatsing verschilt van eerste bevestiging (zie 2.3)
5. Als opdrachtgever een corporatie is: CC naar de projectleider van die corporatie

**Edge Cases**
- Bewoner heeft geen email: markeer als "Handmatig bellen" taak voor planner
- Verplaatsing naar een datum in het verleden: blokkeren
- Adviseur is inmiddels niet meer beschikbaar op nieuwe datum: waarschuwing tonen
- Dubbele verplaatsing tegelijk (planner A en planner B): Convex conflict resolution, eerste wint

---

## 2.2 Nieuwbouw Dossiervorming

### 2.2.1 Project Creation

**User Story**
Als VastVooruit medewerker wil ik een nieuwbouwproject aanmaken met alle projectgegevens, zodat alle bijbehorende woningen en documenten gestructureerd beheerd worden.

**Acceptance Criteria**
- [ ] Nieuw project aanmaken met: projectnaam, bouwtype, aantal woningen, aannemer-info, locatie, BRL-richtlijn
- [ ] Project krijgt automatisch een uniek projectnummer (format: NB-2026-001)
- [ ] Bij aanmaken worden automatisch de vereiste documentmappen gegenereerd op basis van BRL-richtlijn
- [ ] Individuele woningen kunnen worden toegevoegd aan het project (handmatig of via CSV-import)
- [ ] Projectoverzicht toont alle woningen met completeness-percentage per woning

**UI Description**
- "Nieuw project" formulier als full-page wizard (3 stappen):
  1. Projectgegevens: naam, type (nieuwbouw/renovatie), omschrijving, verwachte oplevering
  2. Aannemer: bedrijfsnaam, contactpersoon, email, telefoon. Optie: selecteer bestaande aannemer uit systeem
  3. Woningen toevoegen: handmatig (adres zoeken via BAG) of CSV upload (kolommen: adres, postcode, plaats, woningtype)
- Na aanmaken: projectdashboard met progress bars per woning en document-status matrix

**Data Requirements**

```
nieuwbouwProjects: defineTable({
  projectNumber: v.string(),       // "NB-2026-001"
  name: v.string(),
  description: v.optional(v.string()),
  buildType: v.union(
    v.literal("nieuwbouw"),
    v.literal("renovatie"),
    v.literal("transformatie")
  ),
  expectedDeliveryDate: v.optional(v.float64()),
  province: v.optional(v.string()),
  city: v.optional(v.string()),

  // Aannemer
  contractorId: v.optional(v.id("contractors")),
  contractorName: v.string(),
  contractorContact: v.optional(v.string()),
  contractorEmail: v.optional(v.string()),
  contractorPhone: v.optional(v.string()),

  // BRL / regelgeving
  brlRichtlijn: v.union(
    v.literal("brl_9500"),
    v.literal("brl_9501"),
    v.literal("brl_9502"),
    v.literal("custom")
  ),

  status: v.union(
    v.literal("setup"),
    v.literal("active"),
    v.literal("review"),
    v.literal("completed"),
    v.literal("archived")
  ),

  homeCount: v.float64(),
  completedHomeCount: v.float64(),
  overallCompleteness: v.float64(), // 0-100 percentage

  createdBy: v.string(),
  createdAt: v.float64(),
})

contractors: defineTable({
  name: v.string(),
  contactPerson: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  kvkNumber: v.optional(v.string()),
  notes: v.optional(v.string()),
})
```

**Business Rules**
1. Projectnummer is auto-generated: NB-[jaar]-[volgnummer 3 cijfers]
2. Bij selectie van BRL-richtlijn worden automatisch de juiste document-templates geladen (zie 2.2.2)
3. Woningen in een project erven project-level documenten automatisch
4. Een project kan niet verwijderd worden als er woningen met documenten in zitten (soft-delete naar archief)
5. CSV-import valideert adressen via BAG API en toont fouten inline

**Edge Cases**
- CSV met ongeldige adressen: toon welke regels falen, sta toe om de rest wel te importeren
- Aannemer die al in systeem staat: autocomplete op bedrijfsnaam, pre-fill gegevens
- Project zonder woningen: toegestaan (setup-fase), maar niet markeerbaar als "active"
- Heel groot project (500+ woningen): paginering in woningenlijst, lazy loading van completeness data

---

### 2.2.2 Document Requirement Templates

**User Story**
Als VastVooruit medewerker wil ik dat per BRL-richtlijn automatisch een gestructureerde documentchecklist wordt gegenereerd met per bouwelement (vloer/gevel/dak/installaties) de vereiste documenttypen, zodat ik en de aannemer exact weten wat er nodig is.

**Acceptance Criteria**
- [ ] Beheerder kan document-templates definiëren per BRL-richtlijn
- [ ] Template bevat een hiërarchie: Element > Documenttype > Beschrijving
- [ ] Bij projectaanmaak worden templates automatisch toegepast
- [ ] Per woning is zichtbaar welke documenten verplicht, optioneel of n.v.t. zijn
- [ ] Beheerder kan templates aanpassen zonder bestaande projecten te beïnvloeden (versioning)

**UI Description**
- Admin > Templates pagina: lijst van BRL-templates
- Template editor: boomstructuur met drag-drop herordening
  ```
  BRL 9500 - Nieuwbouw Woningbouw
  ├── Bouwtekeningen
  │   ├── Overzichtstekening (verplicht)
  │   ├── Gedetailleerde tekening vloer (verplicht)
  │   ├── Gedetailleerde tekening gevel (verplicht)
  │   └── Gedetailleerde tekening dak (verplicht)
  ├── Vloer
  │   ├── RC-waarde berekening (verplicht)
  │   ├── Materiaalcertificaat isolatie (verplicht)
  │   ├── Foto plaatsing isolatie (verplicht)
  │   └── Verklaring aannemer (optioneel)
  ├── Gevel
  │   ├── RC-waarde berekening (verplicht)
  │   ├── Materiaalcertificaat isolatie (verplicht)
  │   ├── Foto plaatsing isolatie (verplicht)
  │   └── Verklaring aannemer (optioneel)
  ├── Dak
  │   ├── RC-waarde berekening (verplicht)
  │   ├── Materiaalcertificaat isolatie (verplicht)
  │   ├── Foto plaatsing isolatie (verplicht)
  │   └── Verklaring aannemer (optioneel)
  ├── Installaties
  │   ├── Specificatie verwarmingssysteem (verplicht)
  │   ├── Specificatie ventilatiesysteem (verplicht)
  │   └── Specificatie warm tapwater (verplicht)
  └── Overig
      ├── Energielabel (individueel per woning)
      └── Foto's binnen en buiten (individueel per woning)
  ```
- Per item: naam, beschrijving, verplicht/optioneel toggle, scope toggle (project-level / woning-level)

**Data Requirements**

```
documentTemplates: defineTable({
  name: v.string(),
  brlRichtlijn: v.string(),
  version: v.float64(),
  isActive: v.boolean(),
  elements: v.array(v.object({
    id: v.string(),                // UUID
    name: v.string(),              // "Vloer", "Gevel", etc.
    sortOrder: v.float64(),
    documentTypes: v.array(v.object({
      id: v.string(),              // UUID
      name: v.string(),            // "RC-waarde berekening"
      description: v.optional(v.string()),
      isRequired: v.boolean(),
      scope: v.union(
        v.literal("project"),      // Gedeeld over alle woningen
        v.literal("home")          // Per individuele woning
      ),
      acceptedFileTypes: v.array(v.string()), // ["pdf", "jpg", "png", "docx"]
      maxFileSizeMb: v.float64(),
      sortOrder: v.float64(),
    })),
  })),
  createdBy: v.string(),
  createdAt: v.float64(),
})
```

**Business Rules**
1. Templates zijn versioned: wijziging maakt nieuwe versie, bestaande projecten blijven op oude versie
2. Verplichte documenten blokkeren de status "completed" van een woning als ze ontbreken
3. Standaard templates voor BRL 9500/9501/9502 worden bij systeem-initialisatie aangemaakt
4. Beheerder kan project-specifieke afwijkingen maken (extra documenten toevoegen of verplicht-status wijzigen)
5. Document-scope "project" betekent: upload 1x op projectniveau, zichtbaar bij alle woningen
6. Document-scope "home" betekent: moet per individuele woning geupload worden

**Edge Cases**
- Template wijzigen terwijl projecten actief zijn: modal "Dit beïnvloedt X actieve projecten. Weet je het zeker?" -> nee, versioning voorkomt dit
- Element zonder documenttypen: toegestaan (placeholder)
- Heel lange template (30+ documenten): collapsible secties
- Dubbele documentnamen in template: waarschuwing maar toegestaan

---

### 2.2.3 Project/Home Document Hierarchy

**User Story**
Als VastVooruit medewerker wil ik dat project-level documenten (bijv. bouwtekeningen die voor alle 100 woningen gelden) slechts eenmaal worden opgeslagen maar bij elke woning zichtbaar zijn, zodat ik opslagruimte bespaar en consistentie behoud.

**Acceptance Criteria**
- [ ] Documenten geupload op project-niveau zijn automatisch zichtbaar bij elke woning in dat project
- [ ] Documenten geupload op woning-niveau zijn alleen zichtbaar bij die specifieke woning
- [ ] Bij een woning is duidelijk te onderscheiden of een document van project-niveau of woning-niveau komt (badge/icon)
- [ ] Project-level documenten kunnen niet verwijderd worden vanuit woning-view (alleen vanuit project-view)
- [ ] Totale opslagberekening toont werkelijk gebruikte ruimte (niet duplicated)

**UI Description**
- Woning-detailpagina > Documents tab:
  - Checklist-weergave per element (vloer/gevel/dak/etc.)
  - Per document-slot:
    - Groen vinkje + bestandsnaam als aanwezig
    - Geel uitroepteken als optioneel en ontbrekend
    - Rood kruis als verplicht en ontbrekend
    - Blauw link-icon als het een project-level document is (met tooltip "Gedeeld projectdocument")
  - Upload knop per slot (alleen voor woning-scope documenten)
  - Bij project-scope documenten: "Bekijk in project" link
- Project-detailpagina > Documents tab:
  - Dezelfde checklist maar dan alleen project-scope documenten
  - Upload-area per slot
  - Badge: "Geldt voor X woningen"

**Data Requirements**

```
projectDocuments: defineTable({
  projectId: v.id("nieuwbouwProjects"),
  homeId: v.optional(v.id("projectHomes")),  // null = project-level
  templateElementId: v.string(),
  templateDocTypeId: v.string(),
  fileName: v.string(),
  fileSize: v.float64(),
  mimeType: v.string(),
  storageId: v.string(),            // Convex file storage ID
  uploadedBy: v.string(),           // Clerk user ID or contractor ID
  uploadedAt: v.float64(),
  reviewStatus: v.union(
    v.literal("pending_review"),
    v.literal("approved"),
    v.literal("rejected")
  ),
  reviewedBy: v.optional(v.string()),
  reviewedAt: v.optional(v.float64()),
  rejectionReason: v.optional(v.string()),
  version: v.float64(),             // For re-uploads
})

projectHomes: defineTable({
  projectId: v.id("nieuwbouwProjects"),
  orderId: v.optional(v.id("orders")),   // Link to main order system
  address: v.string(),
  postcode: v.string(),
  city: v.string(),
  homeType: v.optional(v.string()),
  bagId: v.optional(v.string()),
  completeness: v.float64(),        // 0-100, calculated
  status: v.union(
    v.literal("setup"),
    v.literal("documents_pending"),
    v.literal("documents_complete"),
    v.literal("review"),
    v.literal("approved"),
    v.literal("registered")
  ),
})
```

**Business Rules**
1. Completeness wordt berekend als: (aanwezige verplichte documenten / totaal verplichte documenten) * 100
2. Project-level documenten tellen mee voor de completeness van elke woning
3. Bij verwijderen van een project-level document: completeness van ALLE woningen herberekenen
4. Maximale bestandsgrootte: 50MB per document, 10GB per project
5. 15-jaar bewaarplicht: documenten worden na 2 jaar "active" automatisch naar compressed/cold storage verplaatst
6. Versiebeheer: bij re-upload wordt de oude versie bewaard (niet overschreven), laatste versie is actief

**Edge Cases**
- Upload van een bestand dat niet het verwachte type is (bijv. .exe in plaats van .pdf): blokkeren met mime-type validatie
- Woning wordt verwijderd uit project: woning-level documenten worden gearchiveerd, project-level documenten niet beïnvloed
- Project-level document wordt afgekeurd: alle woningen waar dit document voor gold zien de completeness dalen
- Gelijktijdige upload door meerdere aannemers: beide worden opgeslagen als versies
- Extreem groot project (500+ woningen): completeness berekening als Convex scheduled function, niet real-time

---

### 2.2.4 Contractor Portal

**User Story**
Als aannemer wil ik via een uitnodigingslink toegang krijgen tot een gestructureerde upload-interface voor mijn project, zodat ik per bouwelement exact kan zien welke documenten nog nodig zijn en deze direct kan uploaden.

**Acceptance Criteria**
- [ ] Aannemer ontvangt email met Clerk invite-link naar contractor portal
- [ ] Na registratie ziet aannemer alleen zijn eigen project(en)
- [ ] Per element is zichtbaar: wat is nodig, wat is geupload, wat ontbreekt
- [ ] Items kleuren groen bij upload, rood als verplicht en ontbrekend
- [ ] Aannemer kan documenten uploaden via drag-drop of file picker
- [ ] Aannemer kan eerder geupload document vervangen
- [ ] VastVooruit ontvangt notificatie bij elke upload
- [ ] Aannemer kan GEEN documenten verwijderen na review door VastVooruit

**UI Description**
- Minimale, schone interface (geen volledige portal navigatie)
- Header: VastVooruit logo + projectnaam + aannemer-naam
- Hoofdweergave: accordion-lijst per element
  ```
  ▼ Bouwtekeningen                    3/4 ██████░░ 75%
    ✅ Overzichtstekening             overzicht_NB2026.pdf    [Bekijk]
    ✅ Gedetailleerde tekening vloer  vloer_detail.pdf        [Bekijk] [Vervang]
    ✅ Gedetailleerde tekening gevel  gevel_detail.pdf        [Bekijk] [Vervang]
    ❌ Gedetailleerde tekening dak    [Upload]

  ▼ Vloer                             1/3 ██░░░░░░ 33%
    ✅ RC-waarde berekening           rc_vloer.pdf            [Bekijk] [Vervang]
    ❌ Materiaalcertificaat isolatie  [Upload]
    ❌ Foto plaatsing isolatie        [Upload]
  ```
- Upload zone per item: drag-drop area met "Sleep bestand hierheen of klik om te selecteren"
- Progress bar bij upload
- Na upload: bestandsnaam verschijnt, item kleurt groen
- Overall progress bar bovenaan: "Uw dossier is 67% compleet"

**Data Requirements**
Hergebruikt `projectDocuments` table. Aanvullend:

```
contractorAccess: defineTable({
  contractorId: v.id("contractors"),
  projectId: v.id("nieuwbouwProjects"),
  clerkUserId: v.string(),
  invitedAt: v.float64(),
  invitedBy: v.string(),
  lastAccessAt: v.optional(v.float64()),
  permissions: v.array(v.union(
    v.literal("view_project"),
    v.literal("upload_documents"),
    v.literal("view_review_status")
  )),
})
```

**Business Rules**
1. Aannemer kan alleen documenten uploaden voor project-scope items (niet voor individuele woning items tenzij expliciet toegang)
2. Upload triggert notificatie naar VastVooruit team (in-app + email digest dagelijks)
3. Na "approved" review kan aannemer het document niet meer vervangen (alleen VastVooruit kan het terugzetten naar "pending")
4. Aannemer account vervalt 30 dagen na project-completion (configurable)
5. Aannemer heeft GEEN toegang tot financiële informatie, bewoner-gegevens, of interne opmerkingen
6. Maximaal 3 contractor-accounts per project (uitbreidbaar door admin)

**Edge Cases**
- Aannemer uploadt verkeerd document op verkeerde plek: VastVooruit kan het afkeuren met reden, aannemer uploadt opnieuw
- Invite-email komt in spam: re-send invite functionaliteit
- Aannemer heeft meerdere projecten bij VastVooruit: ziet een projectselector na inlog
- Aannemer-account wachtwoord vergeten: standaard Clerk password reset flow
- Aannemer uploadt enorm bestand (500MB video): blokkeren met duidelijke melding over maximale bestandsgrootte

---

### 2.2.5 Review Flow

**User Story**
Als VastVooruit medewerker (bijv. John) wil ik geüploade documenten kunnen reviewen, goedkeuren of afkeuren met reden, zodat de kwaliteit van dossiers gewaarborgd is.

**Acceptance Criteria**
- [ ] Review queue toont alle documenten met status "pending_review"
- [ ] Reviewer kan document inline bekijken (PDF viewer, image viewer)
- [ ] Reviewer kan goedkeuren (1 klik) of afkeuren (met verplichte reden)
- [ ] Bij afkeuring: aannemer ontvangt notificatie + ziet reden in contractor portal
- [ ] Bij goedkeuring: completeness percentage wordt ge-updated
- [ ] Review-history wordt bewaard per document (wie, wanneer, actie)

**UI Description**
- Review queue pagina: lijst van pending documents, sorteerbaar op: project, upload datum, element type
- Document viewer: split-screen met links het document (PDF/image) en rechts de metadata + acties
- Acties:
  - Groene knop "Goedkeuren" met checkmark
  - Rode knop "Afkeuren" -> expandeert tekstveld voor reden + voorgedefinieerde afkeurreden dropdown:
    - "Document onleesbaar"
    - "Verkeerd documenttype"
    - "Niet compleet"
    - "Verouderde versie"
    - "Anders" (vrij tekstveld)
- Badge op sidebar navigatie: "7 documenten wachten op review"

**Data Requirements**

```
documentReviews: defineTable({
  documentId: v.id("projectDocuments"),
  reviewedBy: v.string(),
  action: v.union(v.literal("approved"), v.literal("rejected")),
  rejectionReason: v.optional(v.string()),
  rejectionCategory: v.optional(v.string()),
  reviewedAt: v.float64(),
  notes: v.optional(v.string()),
})
```

**Business Rules**
1. Documenten moeten binnen 5 werkdagen gereviewed worden (SLA indicator in queue: groen/oranje/rood)
2. Alleen gebruikers met rol "reviewer" of "admin" kunnen reviews uitvoeren
3. Reviewer kan niet zijn eigen uploads goedkeuren (four-eyes principle)
4. Bij afkeuring gaat completeness van de woning omlaag
5. Aannemer wordt per email genotificeerd bij afkeuring (niet bij goedkeuring, tenzij alles compleet)
6. Als alle verplichte documenten goedgekeurd: project-status automatisch naar "review complete" + notificatie

**Edge Cases**
- Document is geüpload maar bestand is corrupt/onleesbaar: afkeuren met reden "Document onleesbaar"
- Reviewer begint review, andere reviewer ook: lock-mechanisme of "in review door [naam]" indicator
- Bulk-review: optie om meerdere documenten tegelijk goed te keuren (bijv. alle bouwtekeningen van 1 project)
- Re-upload na afkeuring: oude afgewezen versie blijft in history, nieuwe versie krijgt status "pending_review"

---

### 2.2.6 Completeness Tracking Dashboard

**User Story**
Als projectmanager wil ik een overzichtsdashboard zien met het percentage compleetheid per woning en per project, zodat ik in een oogopslag weet waar actie nodig is.

**Acceptance Criteria**
- [ ] Projectoverzicht toont totaal-completeness als progress bar
- [ ] Per woning: circulaire progress indicator met percentage
- [ ] Kleurcodering: 0-50% rood, 51-80% oranje, 81-99% geel, 100% groen
- [ ] Klik op woning toont breakdown per element welke documenten ontbreken
- [ ] Filter op: status (incompleet/compleet/in review), element, verplicht/optioneel
- [ ] Export naar Excel/PDF voor rapportage aan opdrachtgever

**UI Description**
- Bovenaan: project-level stats in cards
  - "42 van 100 woningen compleet" met grote progress bar
  - "87 documenten wachten op review"
  - "3 afgekeurde documenten"
  - "Geschatte oplevering: 2 weken" (op basis van huidige upload-snelheid)
- Daaronder: grid of lijst-weergave van woningen (toggle)
  - Grid: cards per woning met adres, circulaire progress, status badge
  - Lijst: tabel met adres, percentage, status, laatste upload datum, actie-knop
- Heatmap view (optioneel): matrix met woningen als rijen en elementen als kolommen. Cel = groen/rood/grijs

**Data Requirements**
Geen extra tables nodig. Completeness wordt berekend als Convex query die `projectDocuments` + `documentTemplates` joint per project/home.

**Business Rules**
1. Completeness wordt herberekend bij elke document upload/review/delete
2. Alleen verplichte documenten tellen mee voor completeness percentage
3. Optionele documenten worden apart weergegeven als bonus-percentage
4. 100% completeness triggert automatische notificatie naar projectmanager
5. Export bevat: project-info, per woning alle documenten met status, totaaloverzichten

**Edge Cases**
- Project met 0 verplichte documenten: toon 100% met melding "Geen verplichte documenten geconfigureerd"
- Template wordt gewijzigd na start project: project behoudt originele template (versioning), geen impact op completeness
- Extreem groot project: server-side pagination, completeness pre-computed en gecached

---

## 2.3 Automatische Communicatie

### 2.3.1 Email Templates

**User Story**
Als VastVooruit medewerker wil ik per trigger-type en klanttype vooraf gedefinieerde email-templates hebben die automatisch de juiste variabelen invullen, zodat alle communicatie consistent en professioneel is zonder handmatig typen.

**Acceptance Criteria**
- [ ] Template-editor met rich-text (WYSIWYG) en variabelen-insertie
- [ ] Templates per trigger: afspraakbevestiging, wijziging, labellevering, betaallink, herinnering, no-show
- [ ] Templates per klanttype: particulier, corporatie, belegger, makelaar
- [ ] Variabelen worden bij verzending automatisch ingevuld (naam, adres, datum, adviseur, etc.)
- [ ] Preview functie: template zien met voorbeeld-data voor verzending
- [ ] Beheerder kan templates bewerken, nieuwe aanmaken, deactiveren
- [ ] Templates ondersteunen bijlagen (checklist PDF, voorwaarden, etc.)

**UI Description**
- Admin > Email Templates: grid met template-cards gegroepeerd per trigger-type
- Template editor:
  - Links: WYSIWYG editor met toolbar (bold, italic, heading, list, link, image)
  - Rechts: variabelen-panel met klikbare variabelen:
    ```
    Ontvanger:
    {{bewoner_naam}}     {{bewoner_email}}
    {{opdrachtgever_naam}}  {{opdrachtgever_email}}

    Afspraak:
    {{afspraak_datum}}   {{afspraak_tijd}}
    {{afspraak_adres}}   {{adviseur_naam}}

    Order:
    {{order_nummer}}     {{order_type}}
    {{order_status}}     {{verwachte_levering}}

    Financieel:
    {{bedrag_excl}}      {{bedrag_incl}}
    {{betaallink}}

    Portaal:
    {{track_trace_code}} {{track_trace_url}}
    ```
  - Onderaan: bijlage-selector (checklists, voorwaarden)
  - "Preview" knop -> modal met ingevulde template
- Template matrix-view: rijen = trigger types, kolommen = klant types, cel = template naam of "Niet ingesteld"

**Data Requirements**

```
emailTemplates: defineTable({
  name: v.string(),
  triggerType: v.union(
    v.literal("appointment_confirmation"),
    v.literal("appointment_change"),
    v.literal("appointment_reminder"),
    v.literal("label_delivery"),
    v.literal("payment_link"),
    v.literal("payment_reminder"),
    v.literal("no_show"),
    v.literal("project_update"),
    v.literal("document_rejected"),
    v.literal("custom")
  ),
  clientType: v.union(
    v.literal("particulier"),
    v.literal("corporatie"),
    v.literal("belegger"),
    v.literal("makelaar"),
    v.literal("aannemer"),
    v.literal("all")
  ),
  subject: v.string(),             // Supports variables
  bodyHtml: v.string(),            // Rich text HTML
  bodyPlain: v.string(),           // Plain text fallback
  fromName: v.string(),            // "VastVooruit"
  fromEmail: v.string(),           // "planning@vastvooruit.nl"
  attachmentTemplateIds: v.array(v.string()), // Checklist PDFs etc.
  isActive: v.boolean(),
  version: v.float64(),
  createdBy: v.string(),
  updatedAt: v.float64(),
})

emailLog: defineTable({
  templateId: v.optional(v.id("emailTemplates")),
  orderId: v.optional(v.id("orders")),
  to: v.array(v.string()),
  cc: v.array(v.string()),
  bcc: v.array(v.string()),
  subject: v.string(),
  bodyHtml: v.string(),
  attachments: v.array(v.string()),
  status: v.union(
    v.literal("queued"),
    v.literal("sent"),
    v.literal("delivered"),
    v.literal("bounced"),
    v.literal("failed")
  ),
  sentAt: v.optional(v.float64()),
  deliveredAt: v.optional(v.float64()),
  error: v.optional(v.string()),
  triggeredBy: v.union(
    v.literal("system"),
    v.literal("manual")
  ),
  triggeredByUserId: v.optional(v.string()),
})
```

**Business Rules**
1. Elke trigger-type + klanttype combinatie kan maximaal 1 actieve template hebben
2. Als geen specifieke klanttype template bestaat, fallback naar "all" template
3. Variabelen die niet beschikbaar zijn worden vervangen door lege string + waarschuwing in log
4. Emails worden verstuurd via Brevo (transactional email API)
5. Alle verstuurde emails worden gelogd voor audit trail
6. Rate limiting: max 100 emails per uur per trigger-type (bescherming tegen loops)
7. Unsubscribe is niet nodig voor transactional emails (wettelijke communicatie), maar bewoner kan "niet storen" markeren

**Edge Cases**
- Template bevat variabele die niet bestaat op de order (bijv. {{betaallink}} bij een corporatie zonder directe betaling): lege string + warning in email log
- HTML-email wordt slecht weergegeven in Outlook: templates moeten getest worden op Outlook/Gmail/Apple Mail rendering (Litmus-achtige preview)
- Email bounced: markeer in log, notificatie naar planner "Email naar [adres] niet bezorgd"
- Bijlage te groot voor email (>10MB): opslaan in systeem, in email een downloadlink plaatsen

---

### 2.3.2 Dynamic CC Logic

**User Story**
Als systeem wil ik automatisch de juiste personen in CC zetten bij elke email, zodat tussenpersonen (makelaars, projectleiders, beleggers) automatisch op de hoogte zijn zonder dat de planner dit handmatig moet doen.

**Acceptance Criteria**
- [ ] Per order wordt de CC-lijst bepaald op basis van: tussenpersoon profiel, opdrachtgever-type, project-instellingen
- [ ] Tussenpersoon kan per profiel een default CC-email instellen
- [ ] Bij corporatie-projecten: projectleider automatisch in CC
- [ ] Planner kan voor individuele emails de CC-lijst aanpassen
- [ ] CC-ontvangers zien NIET de persoonlijke gegevens van andere CC-ontvangers (BCC optie beschikbaar)

**UI Description**
- Bij handmatig versturen van email: CC-veld is pre-filled met automatisch bepaalde adressen
- Elke auto-CC heeft een label: "(tussenpersoon)", "(projectleider)", "(opdrachtgever)"
- Planner kan CC's verwijderen of toevoegen met vrij emailveld
- Toggle: "Gebruik BCC in plaats van CC" (privacy-gevoelige situaties)

**Data Requirements**
CC-logica wordt bepaald door relaties tussen order, tussenpersoon-profiel en project. Geen apart table nodig.

**Business Rules**
1. CC-hiërarchie:
   - Particulier direct: geen CC (tenzij makelaar gekoppeld)
   - Via makelaar: makelaar in CC
   - Via belegger: belegger-contactpersoon in CC
   - Via corporatie: projectleider in CC + evt. inkoop-contactpersoon
2. Tussenpersoon CC-email kan afwijken van de hoofd-email (bijv. planning@tussenpersoon.nl)
3. Bij multi-party emails (bewoner + opdrachtgever krijgen APARTE emails): CC op de opdrachtgever-email, niet op de bewoner-email
4. Max 5 CC-adressen per email

**Edge Cases**
- Tussenpersoon heeft geen email: skip CC, log warning
- Opdrachtgever en bewoner zijn dezelfde persoon: stuur slechts 1 email
- CC-email is invalid (bounced eerder): waarschuwing bij planner

---

### 2.3.3 Checklist Attachment Logic

**User Story**
Als systeem wil ik automatisch de juiste checklist (PDF) meesturen bij afspraakbevestigingen, gebaseerd op het opdrachttype, zodat de bewoner weet hoe zich voor te bereiden.

**Acceptance Criteria**
- [ ] Per opdrachttype (energielabel, maatwerkadvies, WWS, etc.) is een checklist PDF gedefinieerd
- [ ] Bij afspraakbevestiging wordt automatisch de juiste checklist bijgevoegd
- [ ] Meerdere checklists mogelijk als order meerdere producten bevat
- [ ] Beheerder kan checklists uploaden en koppelen aan opdrachttypen

**UI Description**
- Admin > Checklists: lijst van geüploade PDFs met gekoppelde opdrachttypen
- Upload + koppeling interface: drag-drop PDF + selecteer opdrachttype(n)

**Data Requirements**

```
checklists: defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  fileStorageId: v.string(),
  fileName: v.string(),
  applicableServiceTypes: v.array(v.string()), // ["energielabel", "maatwerkadvies"]
  applicableBuildingTypes: v.optional(v.array(v.string())), // ["woningbouw", "utiliteitsbouw"]
  isActive: v.boolean(),
  version: v.float64(),
  updatedAt: v.float64(),
})
```

**Business Rules**
1. Bestaande bouw checklist verschilt van nieuwbouw checklist
2. Bij gecombineerde opdracht (energielabel + maatwerkadvies): beide checklists meesturen
3. Woningbouw vs utiliteitsbouw kan een andere checklist vereisen
4. Max 3 bijlagen per email (checklist + voorwaarden + eventueel extra)
5. Checklists worden als PDF bijgevoegd, niet als link (bewoner hoeft niet in te loggen)

**Edge Cases**
- Geen checklist geconfigureerd voor een opdrachttype: email wordt verstuurd zonder bijlage + warning in log
- Checklist PDF is corrupt: detecteren bij upload (PDF validation), blokkeren

---

### 2.3.4 Trigger-Based Sending

**User Story**
Als systeem wil ik automatisch emails versturen bij specifieke statuswijzigingen en events, zodat alle communicatie tijdig en consistent plaatsvindt zonder handmatige actie.

**Acceptance Criteria**
- [ ] Afspraak gepland -> bevestigingsmail naar bewoner (+ opdrachtgever als die verschilt)
- [ ] Status wijziging -> relevante notificatie naar betrokken partijen
- [ ] Factuur overdue -> herinnering op dag 7, 14, 30 (configureerbaar)
- [ ] Label klaar -> levering-email met label-PDF bijlage
- [ ] No-show -> interne notificatie + optionele email naar opdrachtgever
- [ ] Elke trigger kan per klanttype aan/uit gezet worden
- [ ] Triggers hebben een cooldown (niet 5x dezelfde email binnen een uur)

**UI Description**
- Admin > Trigger configuratie: overzichtstabel
  | Trigger | Actief | Template | Vertraging | Cooldown |
  |---|---|---|---|---|
  | Afspraak gepland | Ja | Bevestiging Particulier | Direct | 1 uur |
  | Status -> Uitwerken | Ja | Status update | Direct | - |
  | Factuur overdue | Ja | Herinnering betaling | 7 dagen | 7 dagen |
- Per trigger: toggle aan/uit, selecteer template, vertraging (direct/X uur/X dagen), cooldown

**Data Requirements**

```
emailTriggers: defineTable({
  name: v.string(),
  triggerEvent: v.string(),       // "appointment_created", "status_changed_to_uitwerken"
  templateId: v.id("emailTemplates"),
  isActive: v.boolean(),
  delayMinutes: v.float64(),      // 0 = direct, 10080 = 7 dagen
  cooldownMinutes: v.float64(),   // Minimale tijd tussen herhaalde triggers per order
  applicableClientTypes: v.array(v.string()),
  conditions: v.optional(v.any()), // Extra condities (bijv. alleen als bedrag > 0)
})
```

**Business Rules**
1. Triggers worden asynchroon uitgevoerd (Convex scheduled function)
2. Vertraging wordt berekend vanaf trigger-moment, niet afspraak-moment
3. Als een trigger meerdere keren afvuurt voor dezelfde order binnen de cooldown: skip
4. Factuurherinnering triggers stoppen als de factuur betaald is
5. Systeem houdt per order+trigger bij of en wanneer de email is verstuurd
6. Bij systeem-downtime: gemiste triggers worden alsnog verstuurd bij recovery (idempotent)

**Edge Cases**
- Trigger vuurt af maar template is gedeactiveerd: skip met warning in log
- Vertraging van 7 dagen maar order wordt tussentijds geannuleerd: annuleer de geplande email
- Bulk-import van 100 orders: throttle triggers om email-provider niet te overbelasten (batch met 10 per minuut)

---

### 2.3.5 Multi-Party Communication

**User Story**
Als planner wil ik dat bij opdrachten via een belegger of corporatie automatisch APARTE emails worden gestuurd naar de opdrachtgever EN de bewoner, met voor elke partij relevante inhoud.

**Acceptance Criteria**
- [ ] Systeem detecteert automatisch of opdrachtgever en bewoner verschillende personen/entiteiten zijn
- [ ] Opdrachtgever ontvangt: afspraakbevestiging, statusupdates, factuur, labellevering
- [ ] Bewoner ontvangt: afspraakbevestiging (met adres en voorbereidingsinstructies), wijzigingen, checklist
- [ ] Bewoner ontvangt GEEN financiële informatie
- [ ] Opdrachtgever ontvangt GEEN persoonlijke gegevens van bewoner (tenzij expliciet gedeeld)
- [ ] Tussenpersoon ontvangt alleen statusupdates en factuur (niet de bewoner-communicatie)

**UI Description**
- Order detail pagina > Communicatie tab:
  - Visueel schema van wie welke emails ontvangt:
    ```
    Bewoner (Pietje de Vries)          Opdrachtgever (Wonen NL BV)
    ✅ Afspraakbevestiging              ✅ Afspraakbevestiging
    ✅ Checklist                        ❌ Checklist
    ✅ Wijzigingsmelding                ✅ Wijzigingsmelding
    ❌ Factuur                          ✅ Factuur
    ✅ Label levering                   ✅ Label levering

    CC: makelaar@example.nl (tussenpersoon)
    ```
  - Per ontvanger: override mogelijk (aan/uit toggle per email-type)

**Data Requirements**
Geen extra tables. Logica bepaald door order-relaties (bewoner vs opdrachtgever) en emailTrigger configuratie.

**Business Rules**
1. Als `order.opdrachtgeverId !== order.bewonerId` -> multi-party modus actief
2. Bewoner ontvangt altijd: afspraakbevestiging, wijziging, checklist (praktische info)
3. Opdrachtgever ontvangt altijd: afspraakbevestiging (samenvatting), statusupdates, factuur, label
4. Financiële gegevens (prijs, factuur, betaallink) gaan NOOIT naar bewoner bij multi-party
5. Bij particulier (opdrachtgever = bewoner): single-party modus, 1 email met alles

**Edge Cases**
- Bewoner heeft geen email maar opdrachtgever wel: bewoner-communicatie markeren als "handmatig bellen"
- Opdrachtgever is een organisatie met meerdere contactpersonen: email naar hoofd-contactpersoon + CC naar secundair
- Corporatie met 100 woningen: bulk-emails, niet 100 individuele bevestigingen naar de corporatie. 1 samenvattingsmail naar corporatie + individuele bewoner-emails

---

## 2.4 Klantportaal (Track & Trace)

### 2.4.1 No-Account Track & Trace

**User Story**
Als bewoner/klant wil ik met een unieke code de status van mijn energielabel-aanvraag kunnen inzien op een publieke webpagina, zodat ik niet hoef te bellen voor statusupdates.

**Acceptance Criteria**
- [ ] Bij aanmaken order wordt automatisch een unieke 6-karakter code gegenereerd (bijv. "VV-A3K9")
- [ ] Code wordt meegestuurd in de afspraakbevestiging-email
- [ ] Publieke pagina op vastvooruit.nl/status (geen login nodig)
- [ ] Klant voert code in en ziet de status
- [ ] Pagina toont: huidige status, afspraakdetails, verwachte leveringsdatum, contactinfo
- [ ] Pagina is mobiel-responsive
- [ ] Code verloopt niet (bruikbaar tot 1 jaar na afronding)

**UI Description**
- Landing: schoon, branded VastVooruit pagina
  - Centraal: invoerveld "Voer uw track & trace code in" met zoekknop
  - Logo + tagline bovenaan
  - "Geen code ontvangen? Neem contact op" link onderaan
- Na invoer correcte code:
  ```
  ┌──────────────────────────────────────────────┐
  │  VastVooruit — Status van uw aanvraag        │
  │                                              │
  │  Adres: Kerkstraat 12, 8321AB Staphorst      │
  │  Referentie: VV-A3K9                         │
  │                                              │
  │  ● Aanvraag ontvangen    ✅  12 mrt          │
  │  ● Afspraak ingepland    ✅  15 mrt 10:00    │
  │  ● Opname uitgevoerd     ✅  15 mrt          │
  │  ● Label in bewerking    🔄  nu bezig        │
  │  ○ Label klaar           ⏳  ~20 mrt         │
  │  ○ Geregistreerd         ⏳                   │
  │                                              │
  │  ─────────────────────────────────────────── │
  │  Uw adviseur: Mark de Boer                   │
  │  Verwachte levering: 20 maart 2026           │
  │                                              │
  │  📞 Vragen? 038-1234567                      │
  │  📧 planning@vastvooruit.nl                   │
  │                                              │
  │  [Dit tijdstip past niet? Meld het hier]     │
  └──────────────────────────────────────────────┘
  ```
- Statusbalk: verticale progress tracker met iconen per stap
- Stap met 🔄 = huidige stap (animated pulse)
- Toekomstige stappen: grayed out met ⏳

**Data Requirements**

```
trackTraceCodes: defineTable({
  orderId: v.id("orders"),
  code: v.string(),              // "VV-A3K9" (unique, indexed)
  createdAt: v.float64(),
  expiresAt: v.float64(),        // createdAt + 1 year after completion
  accessCount: v.float64(),      // How often the page was viewed
  lastAccessAt: v.optional(v.float64()),
})
```

**Business Rules**
1. Code format: "VV-" + 4 alfanumerieke karakters (hoofdletters + cijfers, geen verwarrende chars: 0/O, 1/I/L uitgesloten)
2. Code is case-insensitive bij invoer
3. Uniekheid gegarandeerd (Convex unique index)
4. Geen login = geen persoonlijk identificeerbare informatie tonen behalve adres (dat klant zelf al kent)
5. Adviseur-naam wordt getoond (niet telefoonnummer/email van adviseur)
6. "Verwachte levering" is een geschatte datum op basis van huidige status + gemiddelde doorlooptijd
7. Rate limiting: max 10 code-lookups per IP per minuut (brute force bescherming)

**Edge Cases**
- Ongeldige code: "Code niet gevonden. Controleer uw code of neem contact op"
- Verlopen code: "Deze aanvraag is afgerond en gearchiveerd. Neem contact op voor uw dossier"
- Order is verwijderd/geannuleerd: "Deze aanvraag is geannuleerd. Neem contact op voor meer informatie"
- Meerdere orders op zelfde adres: elke order heeft een eigen code
- Code in email is niet klikbaar: pagina heeft een duidelijk invoerveld (niet alleen deeplink)

---

### 2.4.2 Client Interaction (Reschedule Request)

**User Story**
Als bewoner wil ik via de track & trace pagina kunnen melden dat het geplande tijdstip niet past, zodat ik niet hoef te bellen.

**Acceptance Criteria**
- [ ] Knop "Dit tijdstip past niet" is zichtbaar als afspraak gepland is en in de toekomst ligt
- [ ] Bewoner kan een korte toelichting geven en optioneel een voorkeur aangeven
- [ ] Na melding: planner ontvangt notificatie in het systeem
- [ ] Bewoner ziet bevestiging: "Uw melding is ontvangen, wij nemen contact op"
- [ ] Afspraak wordt NIET automatisch verplaatst (human-in-the-loop)

**UI Description**
- Knop onder afspraakdetails: "Dit tijdstip past niet? Meld het hier"
- Klik opent inline form:
  - Tekstveld: "Licht toe waarom dit tijdstip niet past" (optioneel)
  - Voorkeur: "Heeft u een voorkeur voor een ander moment?" met opties:
    - "Ochtend (08:00-12:00)"
    - "Middag (12:00-17:00)"
    - "Specifieke datum" (datumpicker, minimaal 2 werkdagen in toekomst)
    - "Geen voorkeur"
  - Knop "Verstuur melding"
- Na versturen: form verdwijnt, vervangen door: "Melding ontvangen op [datum]. Wij nemen zo snel mogelijk contact op."

**Data Requirements**

```
rescheduleRequests: defineTable({
  orderId: v.id("orders"),
  trackTraceCode: v.string(),
  reason: v.optional(v.string()),
  preferredTimeSlot: v.optional(v.union(
    v.literal("morning"),
    v.literal("afternoon"),
    v.literal("specific_date"),
    v.literal("no_preference")
  )),
  preferredDate: v.optional(v.float64()),
  status: v.union(
    v.literal("pending"),
    v.literal("acknowledged"),
    v.literal("resolved")
  ),
  createdAt: v.float64(),
  resolvedAt: v.optional(v.float64()),
  resolvedBy: v.optional(v.string()),
})
```

**Business Rules**
1. Reschedule request is alleen mogelijk als afspraak > 24 uur in de toekomst
2. Max 1 open reschedule request per order (nieuwe overschrijft de vorige)
3. Na melding: in-app notificatie naar planner + order krijgt badge "Verplaatsing aangevraagd"
4. Planner moet binnen 4 uur reageren (SLA indicator)
5. Geen CAPTCHA nodig (rate limited + code is voldoende authenticatie)

**Edge Cases**
- Bewoner stuurt meerdere verzoeken: alleen het laatste actieve verzoek wordt getoond
- Afspraak is over 2 uur: knop is disabled met melding "Het is te laat om online te verplaatsen. Bel ons op 038-..."
- Bewoner vult niets in en klikt verstuur: toegestaan (minimale melding is voldoende)

---

### 2.4.3 Makelaar Login

**User Story**
Als makelaar wil ik met mijn Clerk-account kunnen inloggen op het VastVooruit portaal om de status van al mijn doorverwezen orders te zien, zodat ik niet meer hoef te bellen voor statusupdates.

**Acceptance Criteria**
- [ ] Makelaars met Clerk account en rol "intermediary" kunnen inloggen
- [ ] Na inlog: overzicht van alle orders die via deze makelaar zijn binnengekomen
- [ ] Per order: status, adres, afspraakdatum, verwachte levering
- [ ] Filterbaar op status, datum, adres
- [ ] Makelaar kan NIET wijzigen, alleen inzien
- [ ] Makelaar ziet GEEN financiële details (prijzen, facturen) tenzij de tussenpersoon-instelling dit toestaat

**UI Description**
- Login via Clerk op vastvooruit.nl/portaal
- Dashboard met:
  - KPI-cards: "12 actieve aanvragen", "3 labels geleverd deze maand", "2 in behandeling"
  - Tabel met orders:
    | Adres | Status | Afspraak | Verwachte levering |
    |---|---|---|---|
    | Kerkstraat 12, Zwolle | Ingepland | 20 mrt 10:00 | 27 mrt |
    | Dorpstraat 5, Emmen | Uitwerken | 18 mrt 14:00 | 25 mrt |
  - Klik op order -> beperkte detail view (adres, status-progress, afspraak info)
- Geen toegang tot: planning, financieel, interne opmerkingen, andere makelaars' orders

**Data Requirements**
Geen extra tables. Queries filteren op `order.intermediaryId` gekoppeld aan de ingelogde Clerk user.

**Business Rules**
1. Makelaar ziet alleen orders waar hun tussenpersoon-profiel aan gekoppeld is
2. Makelaar kan geen orders aanmaken (dat gaat via email/formulier)
3. Sessie timeout: 8 uur (standaard Clerk settings)
4. Bij eerste inlog: welkomstbericht met uitleg over het portaal

**Edge Cases**
- Makelaar met 0 orders: lege state met melding "Nog geen aanvragen. Neem contact op om orders te plaatsen"
- Makelaar met 500+ orders: paginering + zoekfunctie
- Makelaar-account gedeactiveerd: toegang geblokkeerd, melding bij login

---

## 2.5 Tussenpersoon Management

### 2.5.1 Intermediary Profiles

**User Story**
Als admin wil ik per tussenpersoon (makelaar, vastgoedpartij, bank) een profiel beheren met communicatievoorkeuren, facturatieafspraken en standaard-instellingen, zodat het systeem automatisch de juiste logica toepast bij orders via deze tussenpersoon.

**Acceptance Criteria**
- [ ] Tussenpersoon profiel bevat: bedrijfsnaam, contactpersoon(en), email(s), factuurvoorkeuren, communicatievoorkeuren
- [ ] Default CC-email instelbaar (kan afwijken van hoofd-email)
- [ ] Facturatierichting instelbaar: direct aan klant, via tussenpersoon, of gesplitst
- [ ] Standaard checklist-type koppelbaar
- [ ] Bij nieuwe order via deze tussenpersoon: instellingen worden automatisch overgenomen
- [ ] Overzicht van alle orders via deze tussenpersoon

**UI Description**
- Tussenpersonen pagina: lijst met zoek/filter
- Profiel detail:
  - Sectie "Bedrijfsgegevens": naam, KvK, adres, hoofdcontact
  - Sectie "Contactpersonen": tabel met naam, email, telefoon, rol (multiple)
  - Sectie "Communicatie": default CC-email, email-voorkeuren (welke emails wil deze tussenpersoon ontvangen)
  - Sectie "Facturatie": facturatierichting, betalingstermijn, standaard kortingspercentage
  - Sectie "Producten": welke producten/checklists zijn standaard voor orders via deze tussenpersoon
  - Sectie "Statistieken": leads per maand chart, conversieratio, totale omzet, gemiddelde orderwaarde

**Data Requirements**

```
intermediaries: defineTable({
  name: v.string(),
  type: v.union(
    v.literal("makelaar"),
    v.literal("belegger"),
    v.literal("corporatie"),
    v.literal("bank"),
    v.literal("aannemer"),
    v.literal("overig")
  ),
  kvkNumber: v.optional(v.string()),
  address: v.optional(v.string()),
  postcode: v.optional(v.string()),
  city: v.optional(v.string()),

  contacts: v.array(v.object({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
    isPrimary: v.boolean(),
  })),

  // Communicatie
  defaultCcEmail: v.optional(v.string()),
  emailPreferences: v.object({
    receiveAppointmentConfirmations: v.boolean(),
    receiveStatusUpdates: v.boolean(),
    receiveInvoices: v.boolean(),
    receiveLabelDelivery: v.boolean(),
  }),

  // Facturatie
  invoiceDirection: v.union(
    v.literal("direct_to_client"),
    v.literal("via_intermediary"),
    v.literal("split")
  ),
  paymentTermDays: v.float64(),     // Default: 30
  defaultDiscountPercentage: v.optional(v.float64()),
  invoiceEmail: v.optional(v.string()),

  // Defaults
  defaultChecklistType: v.optional(v.string()),
  defaultProductIds: v.optional(v.array(v.string())),

  // Meta
  isActive: v.boolean(),
  notes: v.optional(v.string()),
  createdAt: v.float64(),
})
```

**Business Rules**
1. Bij nieuwe order: als tussenpersoon wordt geselecteerd, worden alle defaults (CC, facturatie, checklist) overgenomen maar zijn per-order overschrijfbaar
2. Facturatie "via_intermediary" betekent: factuur gaat naar tussenpersoon, niet naar eindklant
3. Facturatie "split" betekent: advieskosten naar tussenpersoon, labelkosten naar eindklant (configureerbaar)
4. Kortingspercentage wordt automatisch toegepast op orders via deze tussenpersoon
5. Tussenpersoon deactiveren: waarschuwing bij actieve orders, geen nieuwe orders mogelijk

**Edge Cases**
- Tussenpersoon wordt overgenomen door ander bedrijf: mogelijkheid om orders te migreren naar nieuw profiel
- Tussenpersoon met 0 orders: toch aanmaken (prospect)
- Conflicterende instellingen (bijv. tussenpersoon zegt "factuur via mij" maar order zegt "direct"): order-level instelling wint

---

### 2.5.2 Lead Tracking per Intermediary

**User Story**
Als commercieel manager (Jarco) wil ik per tussenpersoon inzicht in het aantal leads, conversieratio en gegenereerde omzet, zodat ik weet welke partnerships het meest waardevol zijn.

**Acceptance Criteria**
- [ ] Per tussenpersoon: totaal aantal orders, conversieratio (offerte->order), totale omzet, gemiddelde orderwaarde
- [ ] Grafiek met trends over tijd (maandelijks)
- [ ] Vergelijkingsview: meerdere tussenpersonen naast elkaar
- [ ] Filter op periode, product-type, status

**UI Description**
- Tussenpersonen overzicht met sorteerbare kolommen: naam, orders dit kwartaal, omzet dit kwartaal, conversie%, trend-indicator (pijl omhoog/omlaag)
- Klik op tussenpersoon: detail dashboard met:
  - Lijn-chart: orders per maand (12 maanden)
  - Staaf-chart: omzet per maand
  - KPI cards: gem. doorlooptijd, gem. orderwaarde, % herhaalopdrachten
- Vergelijkingspagina: selecteer 2-5 tussenpersonen, side-by-side metrics

**Data Requirements**
Geen extra tables. Aggregatie-queries op bestaande orders + intermediary relatie. Eventueel pre-computed in:

```
intermediaryStats: defineTable({
  intermediaryId: v.id("intermediaries"),
  period: v.string(),             // "2026-03", "2026-Q1", "2026"
  totalOrders: v.float64(),
  completedOrders: v.float64(),
  cancelledOrders: v.float64(),
  totalRevenue: v.float64(),
  averageOrderValue: v.float64(),
  averageLeadTimedays: v.float64(),
  conversionRate: v.float64(),
  computedAt: v.float64(),
})
```

**Business Rules**
1. Stats worden nightly herberekend (Convex cron job)
2. Conversieratio = completedOrders / totalOrders * 100
3. Omzet wordt berekend op basis van gefactureerde bedragen (niet offerte-bedragen)
4. Periode-filter: standaard huidige kwartaal, uitbreidbaar naar custom range

**Edge Cases**
- Tussenpersoon met 1 order: percentages zijn misleidend, toon absolute aantallen prominenter
- Nieuwe tussenpersoon zonder historie: "Nog geen data beschikbaar"
- Order die later van tussenpersoon wijzigt: stats worden herberekend

---

### 2.5.3 HomeVisuals Integration

**User Story**
Als systeem wil ik automatisch orders importeren die via HomeVisuals/HomeFlow binnenkomen, zodat deze niet handmatig hoeven te worden overgetypt.

**Acceptance Criteria**
- [ ] HomeVisuals stuurt order-data via webhook of gestructureerde email naar het systeem
- [ ] Systeem parsed de data en maakt een concept-order aan met alle beschikbare velden
- [ ] Concept-order verschijnt in de "Inbox" met label "HomeVisuals import"
- [ ] Planner reviewt en bevestigt de concept-order met 1 klik
- [ ] Bij incomplete data: markeer welke velden ontbreken

**UI Description**
- Inbox pagina: aparte sectie "Automatische imports" met HomeVisuals badge
- Import-card toont: adres, geplande datum (indien beschikbaar), contactgegevens, bron
- "Bevestig import" knop -> order wordt aangemaakt in status "Nieuw"
- "Wijzig & bevestig" knop -> edit form met pre-filled data

**Data Requirements**

```
importQueue: defineTable({
  source: v.union(
    v.literal("homevisuals"),
    v.literal("email_agent"),
    v.literal("website_form"),
    v.literal("manual")
  ),
  rawData: v.any(),                // Original payload
  parsedData: v.optional(v.object({
    address: v.optional(v.string()),
    postcode: v.optional(v.string()),
    city: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    serviceType: v.optional(v.string()),
    preferredDate: v.optional(v.float64()),
    notes: v.optional(v.string()),
  })),
  status: v.union(
    v.literal("pending"),
    v.literal("confirmed"),
    v.literal("rejected"),
    v.literal("duplicate")
  ),
  confirmedOrderId: v.optional(v.id("orders")),
  createdAt: v.float64(),
  processedAt: v.optional(v.float64()),
  processedBy: v.optional(v.string()),
})
```

**Business Rules**
1. Duplicate detectie: als adres + postcode al bestaat als open order -> markeer als "mogelijke duplicate"
2. HomeVisuals orders krijgen automatisch de "HomeVisuals" tussenpersoon gekoppeld
3. Als datum is meegestuurd door HomeVisuals: overnemen als voorstel maar planner kan wijzigen
4. Import queue items ouder dan 7 dagen zonder actie: escalatie-notificatie naar planner

**Edge Cases**
- HomeVisuals stuurt ongeldig/incompleet adres: markeer als "Adres niet gevonden in BAG", handmatige invoer nodig
- Webhook faalt (timeout): retry met exponential backoff, max 3 pogingen
- HomeVisuals formaat verandert: parser breekt -> fallback naar raw data weergave + alert naar admin
- Dubbele webhook calls: idempotent verwerking op basis van externe referentie-ID

---

# PHASE 3: VELDWERK & DATA

---

## 3.1 Mobiele App (React Native)

### 3.1.1 Agenda View

**User Story**
Als EP-adviseur wil ik op mijn telefoon/tablet mijn dagagenda zien met alle afspraken, adressen en navigatieknoppen, zodat ik efficiënt van afspraak naar afspraak kan rijden.

**Acceptance Criteria**
- [ ] App toont vandaag's afspraken als chronologische lijst
- [ ] Per afspraak: tijdstip, adres, opdrachttype, naam bewoner, status
- [ ] Navigatieknop opent Apple Maps / Google Maps met het adres als bestemming
- [ ] Belknop opent telefoon met bewoner-nummer
- [ ] Swipe om status te wijzigen: "Onderweg", "Aangekomen", "Opname gestart", "Opname afgerond"
- [ ] Pull-to-refresh voor actuele data
- [ ] Morgen en overmorgen bekijkbaar via tab of swipe

**UI Description**
- Top bar: "Vandaag, 18 maart 2026" met datum-navigation (< > pijlen)
- Overzicht-kaartje bovenaan: "4 afspraken vandaag | 127 km totaal"
- Afspraak-cards:
  ```
  ┌─────────────────────────────────────────┐
  │ 09:00 - 09:45                    🟢 Gepland │
  │ Energielabel Woning                        │
  │ Kerkstraat 12, 8321AB Staphorst            │
  │ Bewoner: J. de Vries | 📞 06-12345678     │
  │                                            │
  │ [🗺 Navigeer]  [📞 Bel]  [📋 Start opname] │
  └─────────────────────────────────────────┘
  ```
- Status-indicator: kleur-dot die verandert per status
- Lege dag: "Geen afspraken gepland" illustratie

**Data Requirements**
App leest van dezelfde `calendarEvents` + `orders` tables via Convex React Native client. Realtime subscriptions.

Lokale cache (offline):
```
// AsyncStorage / MMKV
localAppointments: {
  date: string,
  appointments: CalendarEvent[],
  lastSyncedAt: number,
}
```

**Business Rules**
1. Agenda toont alleen afspraken van de ingelogde adviseur
2. Navigatieknop stuurt full address string naar device's default maps app
3. Status-wijzigingen worden direct gesynchroniseerd naar server (optimistic update)
4. Bij offline: status wordt lokaal opgeslagen en gesynchroniseerd bij herverbinding
5. Push notifications: 30 minuten voor volgende afspraak "Volgende afspraak over 30 min: [adres]"
6. Adviseur kan order-details inzien maar niet financiële gegevens

**Edge Cases**
- Geen internetverbinding: laatst bekende agenda getoond met "Offline modus" banner
- Afspraak wordt verplaatst terwijl adviseur onderweg is: push notificatie + banner in app
- Adviseur heeft 10+ afspraken op 1 dag: scrollbare lijst, geen paginering
- Dubbele afspraken (overlap): rode waarschuwingsbadge

---

### 3.1.2 Photo Capture

**User Story**
Als EP-adviseur wil ik tijdens de opname foto's maken die automatisch gekoppeld worden aan het huidige dossier, zodat ik geen foto's handmatig hoef te uploaden of te organiseren.

**Acceptance Criteria**
- [ ] Camera opent vanuit de actieve afspraak met 1 tik
- [ ] Foto's worden automatisch gekoppeld aan de huidige order + dossier
- [ ] Foto's worden getagd met timestamp, GPS-locatie en order-referentie
- [ ] Foto's worden opgeslagen in Convex file storage
- [ ] Bulkfotografie: camera blijft open na foto, snelle opeenvolging mogelijk
- [ ] Preview van gemaakte foto's met optie om te verwijderen
- [ ] Upload gebeurt op achtergrond (niet blokkeren van de app)

**UI Description**
- In afspraak-detail: grote "Camera" knop
- Camera view: full-screen camera met:
  - Sluiterknop (groot, midden-onder)
  - Thumbnail van laatste foto (links-onder, tik om gallery te openen)
  - Tag-selector (rechts-boven): "Voorgevel", "Achtergevel", "Zijgevel", "CV-ketel", "Isolatie", "Meterkast", "Overig"
  - Teller: "7 foto's gemaakt"
- Gallery view: grid van foto's voor deze order, tik om groot te bekijken, swipe om te verwijderen
- Upload indicator: kleine progress bar in app header bij achtergrond-upload

**Data Requirements**

```
orderPhotos: defineTable({
  orderId: v.id("orders"),
  adviseurId: v.id("adviseurProfiles"),
  storageId: v.string(),          // Convex file storage
  fileName: v.string(),
  tag: v.union(
    v.literal("voorgevel"),
    v.literal("achtergevel"),
    v.literal("zijgevel"),
    v.literal("cv_ketel"),
    v.literal("isolatie"),
    v.literal("meterkast"),
    v.literal("dakconstructie"),
    v.literal("plattegrond"),
    v.literal("overig")
  ),
  gpsLat: v.optional(v.float64()),
  gpsLng: v.optional(v.float64()),
  capturedAt: v.float64(),
  uploadedAt: v.optional(v.float64()),
  uploadStatus: v.union(
    v.literal("pending"),
    v.literal("uploading"),
    v.literal("uploaded"),
    v.literal("failed")
  ),
  fileSizeBytes: v.float64(),
})
```

**Business Rules**
1. Foto's worden gecomprimeerd naar max 2MB voor upload (origineel bewaard op device tot upload bevestigd)
2. GPS-locatie wordt automatisch gelogd als device GPS aan staat (niet verplicht)
3. Maximum 50 foto's per order (daarna waarschuwing)
4. Upload retry: 3 pogingen met exponential backoff, daarna "Upload mislukt" melding
5. Foto's zijn zichtbaar in het webportaal onder het order-dossier zodra geüpload
6. Adviseur kan foto's verwijderen tot de order status "Afgerond" is, daarna niet meer (dossier-integriteit)

**Edge Cases**
- Device opslag vol: waarschuwing "Onvoldoende opslagruimte. Verwijder bestanden of upload eerst"
- Camera permissie geweigerd: instructie-scherm hoe permissie te verlenen in device settings
- 50 foto's in offline modus: allemaal queued, upload begint bij herverbinding (kan lang duren, progress indicator)
- Foto per ongeluk bij verkeerde order: optie om foto naar andere order te verplaatsen (alleen in web portal door admin)

---

### 3.1.3 Digitaal Opnameformulier

**User Story**
Als EP-adviseur wil ik het opnameformulier digitaal invullen op mijn tablet, met dezelfde structuur als het papieren formulier maar dan met selectievakjes en dropdowns, zodat de data gestructureerd wordt opgeslagen en direct bruikbaar is voor de Uniec3 berekening.

**Acceptance Criteria**
- [ ] Formulier heeft dezelfde secties als het papieren formulier: Algemene Gegevens, Indeling Gebouw, Verwarming, Ventilatie, Warm Tapwater, Airco/Koeling, PV Panelen, Bouwjaar Waarneming, Geometrie & Orientatie
- [ ] Alle velden zijn checkbox-gedomineerd, aangevuld met dropdowns en number inputs
- [ ] Sectie "Geometrie" bevat een dynamische tabel voor vaste constructies en transparante constructies
- [ ] Formulier slaat tussentijds automatisch op (autosave)
- [ ] Formulier werkt offline
- [ ] Output is gestructureerde JSON die als input dient voor de Uniec3 browser bot
- [ ] Pre-fill van BAG-gegevens (adres, bouwjaar, oppervlakte) vanuit de order

**UI Description**
Het formulier volgt exact de structuur van het papieren opnameformulier (VastVooruit template). Weergave als scrollbare pagina met collapsible secties:

**Sectie 1: Algemene Gegevens**
- Adres, Plaats, Datum (pre-filled)
- Opdrachtgever (pre-filled)
- Gebouwtype: radio buttons (U-Bouw / W-Bouw / W-Bouw kamerhuur)
- Aantal kamers: number input

**Sectie 2: Indeling Gebouw**
- Woningtype: radio buttons (Vrijstaand / Hoekwoning / Tussenwoning / Appartement)
- Tekstveld: opmerking locatie
- Daktype: checkboxes (Met kap/hellend dak / Met plat dak / Geen dak)
- Bouwlaag: dropdown (Onder / Tussen / Boven)
- Positie: radio (Tussen / Hoek)
- Woonlagen: radio (1 / 2 / 3 / 4)
- Dak: radio (Met dak / Zonder dak)
- Daktype: radio (Hellend dak / Plat dak)
- Vloer-type: checkboxes (Hsb, Ssb of hout / Geisoleerd aan binnenzijde / NM-Beton / M-Beton)
- Wand-type: checkboxes (Hsb, Ssb of hout / Geisoleerd aan binnenzijde / NM-Beton / M-Beton)
- Type bouw: radio (BB / BB Reno / NB)
- Renovatiejaar: number input (conditionally visible als BB Reno)

**Sectie 3: Verwarming**
- Type: radio (WP / CV HR107 / WP+CV / Overig)
- Functie: radio (Verwarming + warm tapwater / Verwarming)
- Gemeenschappelijk: radio (Nee / Ja) + conditional text input (Ag GO)
- Locatie opwekker: radio (Binnen TZ / Buiten TZ)
- Aanvoertemp: radio (45deg / 55deg / 75deg / 90deg)
- Leidingen buiten TZ: radio (Onbekend / Geen / Bekend) + conditional length input
- Afgifte: checkboxes (Radiatoren / Vloervw / Luchtvw)
- Regeling: checkboxes (Hoofdvertrek / Centraal + naregeling / Per ruimte / Overig)

**Sectie 4: Ventilatie**
- Type: radio (A / B / C / D centraal / D decentraal)
  - A = natuurlijke ventilatie, B = Mech toevoer, C = Nat toevoer + Mech afvoer, D = Mech toe- en afvoer
- Invoer: radio (Forfaitair / Prod.Spec)
- Conditional fields als Prod.Spec: Spec text, Fab. Jaar, Label/P.Nom
- ZR roosters: radio (Ja / Nee)

**Sectie 5: Warm Tapwater**
- Type: radio (WP / CV HR107 / WP+CV / Boiler / Overig)
- Functie: radio (Verwarming + warm tapwater / Tapwater)
- Keukenboiler separaat: radio (Nee / Ja)
- Buffervat aanwezig: radio (Nee / Ja) + radio (Ind. / Dir.)
- Circulatieleiding: radio (Nee / Ja) + conditional text (diameter & isolatie)
- CW-klasse: radio (CW3 / CW4,5,6)
- Leidinglengte BK: 7 checkboxes (length ranges)
- Leidinglengte K: 7 checkboxes (length ranges)

**Sectie 6: Airco/Koeling**
- Type: checkboxes (Airco / Vloerkoeling / LBK / Overig)
- Compressor: radio (Compressie / Bodem)
- Regeling: radio (Per ruimte / Centraal / Hoofdvertrek)
- Afgifte: checkboxes (Plafond / Wand / Vloerk.)

**Sectie 7: PV Panelen**
- PV aanwezig: radio (Ja / Nee)
- Conditional: Aantal (number), Orientatie (dropdown: N/NO/O/ZO/Z/ZW/W/NW), Hoek (number deg), Jaar/type (text)
- Gemeenschappelijk: radio (Ja / Nee)
- Ventilatie: checkboxes (N / M / S)

**Sectie 8: Bouwjaar Waarneming**
- Per element (VL A, VL B, VL Opm, Ge A, Ge B, Ge C, Ge Opm, Dak A, Dak B, Dak Opm): tekstveld voor Rc-waarde of omschrijving

**Sectie 9: Geometrie & Orientatie**
- Kompas-widget: draaibaar voor noordpijl-orientatie
- Pm (perimeter): number input in meters
- **Vaste Constructies tabel** (dynamisch, rijen toevoegbaar):
  | Rc | Rz | Nr. | V/G/D | Lengte | Hoogte | Opmerking |
  - V = Vloer, G = Gevel, D = Dak
  - Rc/Rz: number inputs voor thermische weerstand
  - Lengte x Hoogte berekent automatisch m2
  - Totaal per type (V/G/D) wordt automatisch berekend

- **Transparante Constructies tabel** (dynamisch, rijen toevoegbaar):
  | Nr. | R/D/P | M2 | Omschr. | Opmerking |
  - R = Raam, D = Deur, P = Paneel
  - Omschr: dropdown (HR++, E, D, etc.)
  - Totaal m2 wordt automatisch berekend

- **Plattegrond-tekenveld**: canvas met:
  - Rechthoek-tool voor ruimtes tekenen
  - Nummering tool (1, 2, 3... corresponderend met tabel-nummers)
  - Labels (K = keuken, BK = badkamer, CV = CV-ruimte, etc.)
  - Simpele lijn-tool voor scheidingswanden
  - Dak-driehoek tool
  - Undo/redo

**Data Requirements**

```
opnameFormulieren: defineTable({
  orderId: v.id("orders"),
  adviseurId: v.id("adviseurProfiles"),
  status: v.union(
    v.literal("draft"),
    v.literal("completed"),
    v.literal("reviewed")
  ),

  // Sectie 1: Algemene Gegevens
  algemeen: v.object({
    adres: v.string(),
    plaats: v.string(),
    datum: v.string(),
    opdrachtgever: v.optional(v.string()),
    gebouwType: v.union(
      v.literal("u_bouw"),
      v.literal("w_bouw"),
      v.literal("w_bouw_kamerhuur")
    ),
    aantalKamers: v.optional(v.float64()),
  }),

  // Sectie 2: Indeling Gebouw
  indelingGebouw: v.object({
    woningType: v.union(
      v.literal("vrijstaand"),
      v.literal("hoekwoning"),
      v.literal("tussenwoning"),
      v.literal("appartement")
    ),
    opmerkingLocatie: v.optional(v.string()),
    metKapHellendDak: v.boolean(),
    metPlatDak: v.boolean(),
    geenDak: v.boolean(),
    bouwlaag: v.optional(v.union(
      v.literal("onder"), v.literal("tussen"), v.literal("boven")
    )),
    positie: v.optional(v.union(v.literal("tussen"), v.literal("hoek"))),
    woonlagen: v.optional(v.union(
      v.literal("1"), v.literal("2"), v.literal("3"), v.literal("4")
    )),
    metDak: v.optional(v.boolean()),
    daktype: v.optional(v.union(v.literal("hellend"), v.literal("plat"))),
    vloerType: v.array(v.string()),
    wandType: v.array(v.string()),
    typeBouw: v.union(v.literal("bb"), v.literal("bb_reno"), v.literal("nb")),
    renovatieJaar: v.optional(v.float64()),
  }),

  // Sectie 3: Verwarming
  verwarming: v.object({
    type: v.union(
      v.literal("wp"), v.literal("cv_hr107"),
      v.literal("wp_cv"), v.literal("overig")
    ),
    functie: v.union(
      v.literal("verwarming_tapwater"), v.literal("verwarming")
    ),
    gemeenschappelijk: v.boolean(),
    gemeenschappelijkOpmerking: v.optional(v.string()),
    locatieOpwekker: v.union(v.literal("binnen_tz"), v.literal("buiten_tz")),
    aanvoerTemp: v.union(
      v.literal("45"), v.literal("55"), v.literal("75"), v.literal("90")
    ),
    leidingenBuitenTz: v.union(
      v.literal("onbekend"), v.literal("geen"), v.literal("bekend")
    ),
    leidingenBuitenTzLengte: v.optional(v.float64()),
    afgifte: v.array(v.union(
      v.literal("radiatoren"), v.literal("vloervw"), v.literal("luchtvw")
    )),
    regeling: v.array(v.union(
      v.literal("hoofdvertrek"), v.literal("centraal_naregeling"),
      v.literal("per_ruimte"), v.literal("overig")
    )),
  }),

  // Sectie 4: Ventilatie
  ventilatie: v.object({
    type: v.union(
      v.literal("a"), v.literal("b"), v.literal("c"),
      v.literal("d_centraal"), v.literal("d_decentraal")
    ),
    invoer: v.union(v.literal("forfaitair"), v.literal("prod_spec")),
    spec: v.optional(v.string()),
    fabJaar: v.optional(v.string()),
    labelPNom: v.optional(v.string()),
    zrRoosters: v.boolean(),
  }),

  // Sectie 5: Warm Tapwater
  warmTapwater: v.object({
    type: v.union(
      v.literal("wp"), v.literal("cv_hr107"),
      v.literal("wp_cv"), v.literal("boiler"), v.literal("overig")
    ),
    functie: v.union(
      v.literal("verwarming_tapwater"), v.literal("tapwater")
    ),
    keukenboilerSeparaat: v.boolean(),
    keukenboilerOpmerking: v.optional(v.string()),
    buffervatAanwezig: v.boolean(),
    buffervatType: v.optional(v.union(v.literal("ind"), v.literal("dir"))),
    circulatieleiding: v.boolean(),
    circulatieleidingSpec: v.optional(v.string()),
    cwKlasse: v.union(v.literal("cw3"), v.literal("cw456")),
    leidinglengteBk: v.optional(v.float64()),
    leidinglengteK: v.optional(v.float64()),
  }),

  // Sectie 6: Airco/Koeling
  aircoKoeling: v.optional(v.object({
    types: v.array(v.union(
      v.literal("airco"), v.literal("vloerkoeling"),
      v.literal("lbk"), v.literal("overig")
    )),
    compressor: v.optional(v.union(v.literal("compressie"), v.literal("bodem"))),
    regeling: v.optional(v.union(
      v.literal("per_ruimte"), v.literal("centraal"), v.literal("hoofdvertrek")
    )),
    afgifte: v.optional(v.array(v.union(
      v.literal("plafond"), v.literal("wand"), v.literal("vloerk")
    ))),
  })),

  // Sectie 7: PV Panelen
  pvPanelen: v.object({
    aanwezig: v.boolean(),
    aantal: v.optional(v.float64()),
    orientatie: v.optional(v.string()),
    hoek: v.optional(v.float64()),
    jaarType: v.optional(v.string()),
    gemeenschappelijk: v.optional(v.boolean()),
    ventilatie: v.optional(v.array(v.union(
      v.literal("n"), v.literal("m"), v.literal("s")
    ))),
  }),

  // Sectie 8: Bouwjaar Waarneming
  bouwjaarWaarneming: v.object({
    vlA: v.optional(v.string()),
    vlB: v.optional(v.string()),
    vlOpm: v.optional(v.string()),
    geA: v.optional(v.string()),
    geB: v.optional(v.string()),
    geC: v.optional(v.string()),
    geOpm: v.optional(v.string()),
    dakA: v.optional(v.string()),
    dakB: v.optional(v.string()),
    dakOpm: v.optional(v.string()),
  }),

  // Sectie 9: Geometrie & Orientatie
  geometrie: v.object({
    noordOrientatie: v.float64(),  // Degrees from top (0-360)
    perimeter: v.optional(v.float64()),
    vasteConstructies: v.array(v.object({
      rc: v.optional(v.float64()),
      rz: v.optional(v.float64()),
      nr: v.float64(),
      type: v.union(v.literal("v"), v.literal("g"), v.literal("d")),
      lengte: v.optional(v.float64()),
      hoogte: v.optional(v.float64()),
      oppervlakte: v.optional(v.float64()), // Auto-calculated or manual for V
      opmerking: v.optional(v.string()),
    })),
    transparanteConstructies: v.array(v.object({
      nr: v.float64(),
      type: v.union(v.literal("r"), v.literal("d"), v.literal("p")),
      m2: v.float64(),
      omschrijving: v.optional(v.string()),  // HR++, E, D, etc.
      opmerking: v.optional(v.string()),
    })),
    plattegrondSvg: v.optional(v.string()),  // SVG string of the floor plan drawing
    plattegrondStorageId: v.optional(v.string()), // Or stored as image
  }),

  // Meta
  lastAutoSaveAt: v.float64(),
  completedAt: v.optional(v.float64()),
  reviewedBy: v.optional(v.string()),
  reviewedAt: v.optional(v.float64()),
})
```

**Business Rules**
1. Autosave elke 10 seconden als er wijzigingen zijn (debounced)
2. Formulier kan in draft-status onvolledig zijn (niet alle velden verplicht)
3. Bij status "completed": validatie dat alle verplichte velden ingevuld zijn
4. Geometrie-tabel totalen worden automatisch berekend (som van oppervlaktes per type)
5. Vaste constructies: als lengte EN hoogte zijn ingevuld, bereken oppervlakte automatisch (L x H)
6. Bij vloer (V): oppervlakte wordt direct ingevuld (geen lengte x hoogte)
7. Opmerking met "-" prefix (bijv. "- 2.8m2") wordt van de oppervlakte afgetrokken (aftrek voor openslaande deuren etc.)
8. Formulier-data wordt als gestructureerde JSON opgeslagen, bruikbaar als input voor Uniec3 bot
9. Offline: volledig formulier beschikbaar, sync bij herverbinding

**Edge Cases**
- Adviseur sluit app per ongeluk: draft is opgeslagen door autosave
- Tablet gaat uit tijdens opname: data is lokaal opgeslagen
- Extreem groot formulier (30+ rijen in geometrie): smooth scrolling, geen performance issues
- Adviseur opent formulier van andere adviseur: read-only modus
- Meerdere formulieren per order (bijv. hercalculatie): versioning, oude versies bewaard

---

### 3.1.4 Offline Capability

**User Story**
Als EP-adviseur wil ik de app volledig kunnen gebruiken zonder internetverbinding, zodat ik in kelders, op het platteland of in nieuwbouw (waar vaak geen wifi is) normaal kan werken.

**Acceptance Criteria**
- [ ] Agenda, formulier en camera werken volledig offline
- [ ] Data wordt lokaal opgeslagen op het device
- [ ] Bij herverbinding synchroniseert automatisch alle lokale wijzigingen naar de server
- [ ] Conflict resolution: server-data wint bij conflicten (met melding)
- [ ] Offline indicator duidelijk zichtbaar in de app

**UI Description**
- Offline banner: gele balk bovenaan "Offline modus - wijzigingen worden gesynchroniseerd bij verbinding"
- Sync indicator: bij herverbinding groen vinkje "Alle data gesynchroniseerd"
- Bij sync-conflict: dialog "Er zijn wijzigingen gevonden die conflicteren. [Bekijk details]"
- Queue indicator: "3 foto's wachten op upload" met voortgangsbalk

**Data Requirements**
Lokale storage via MMKV of WatermelonDB:
- Agenda events: cached voor huidige week
- Opnameformulieren: volledige draft opgeslagen lokaal
- Foto's: opgeslagen als lokale bestanden met metadata in lokale DB
- Sync queue: lijst van alle pending mutations

**Business Rules**
1. App cached bij laatste sync: huidige week agenda + alle orders voor die week
2. Maximale offline periode: 7 dagen (daarna warning dat data verouderd kan zijn)
3. Sync volgorde: formulieren eerst, dan foto's (formulieren zijn kritischer)
4. Bij conflict: server-versie wint, lokale wijzigingen worden als "conflict" bewaard voor review
5. Foto-upload bij herverbinding: max 3 concurrent uploads (battery/data saving)

**Edge Cases**
- App wordt ge-update terwijl offline: lokale data migratie bij eerste online sync
- Device opslag vol: waarschuwing, prioriteer formulier-data boven foto's
- 100+ foto's in queue: scherm toont geschatte upload-tijd
- Sync mislukt herhaaldelijk: fallback-optie om data als ZIP te exporteren

---

### 3.1.5 Cost Mutation Entry

**User Story**
Als EP-adviseur wil ik direct na een opname kosten-wijzigingen kunnen invoeren (meerwerk of minder werk), zodat de administratie altijd actueel is.

**Acceptance Criteria**
- [ ] Na afronding opname: optie "Kosten bijwerken" beschikbaar
- [ ] Adviseur kan meerwerk toevoegen met type en bedrag
- [ ] Adviseur kan reden selecteren uit voorgedefinieerde lijst of vrij invoeren
- [ ] Mutatie wordt gelogd in de order-timeline
- [ ] Planner/admin ontvangt notificatie bij kosten-mutatie

**UI Description**
- Knop "Kosten bijwerken" in afspraak-detail na status "Opname afgerond"
- Form:
  - Type: radio (Meerwerk / Minderwerk / Correctie)
  - Reden: dropdown (Ander woningtype dan opgegeven / Extra product nodig / No-show kosten / Moeilijk bereikbaar / Overig)
  - Bedrag: number input met euro-teken
  - Toelichting: tekstveld
  - "Opslaan" knop
- In order-timeline: "Meerwerk +€75,00 door Mark: Ander woningtype dan opgegeven (utiliteitsbouw i.p.v. woningbouw)"

**Data Requirements**

```
costMutations: defineTable({
  orderId: v.id("orders"),
  adviseurId: v.id("adviseurProfiles"),
  type: v.union(
    v.literal("meerwerk"),
    v.literal("minderwerk"),
    v.literal("correctie")
  ),
  reason: v.string(),
  reasonCategory: v.union(
    v.literal("ander_woningtype"),
    v.literal("extra_product"),
    v.literal("no_show"),
    v.literal("moeilijk_bereikbaar"),
    v.literal("extra_opname_nodig"),
    v.literal("overig")
  ),
  amount: v.float64(),           // Positive for meerwerk, negative for minderwerk
  description: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected")
  ),
  approvedBy: v.optional(v.string()),
  approvedAt: v.optional(v.float64()),
  createdAt: v.float64(),
})
```

**Business Rules**
1. Kosten-mutatie boven €200 vereist goedkeuring door admin
2. Kosten-mutatie onder €200 wordt automatisch goedgekeurd (maar wel gelogd)
3. Goedgekeurde mutatie wijzigt het factuurbedrag van de order
4. Afgewezen mutatie wordt bewaard in history maar niet verwerkt
5. Adviseur kan eigen mutatie niet goedkeuren (four-eyes bij >€200)
6. Mutatie is mogelijk tot de factuur is verstuurd, daarna creditnota nodig

**Edge Cases**
- Meerdere mutaties op dezelfde order: worden opgeteld
- Negatieve mutatie (minderwerk) groter dan orderbedrag: blokkeren met waarschuwing
- Mutatie terwijl factuur al verstuurd: systeem meldt "Factuur is al verstuurd. Creditnota vereist."

---

## 3.2 Digitaal Opnameformulier (Web)

### 3.2.1 Structured Data Output (Uniec3 Feed)

**User Story**
Als systeem wil ik de ingevulde opnameformulier-data als gestructureerde JSON exporteren in het formaat dat de Uniec3 browser bot verwacht, zodat de bot de ~300 parameters automatisch kan invullen.

**Acceptance Criteria**
- [ ] Na "completed" status van formulier: "Exporteer voor Uniec3" knop beschikbaar
- [ ] Export genereert JSON met alle velden gemapped naar Uniec3 parameternamen
- [ ] Mapping is configureerbaar (admin kan veldmappings aanpassen)
- [ ] Export bevat validatie: ontbrekende verplichte Uniec3-velden worden gemarkeerd
- [ ] Export kan direct naar de Uniec3 bot queue gestuurd worden

**Data Requirements**

```
uniec3Exports: defineTable({
  opnameFormulierId: v.id("opnameFormulieren"),
  orderId: v.id("orders"),
  exportedData: v.any(),          // Mapped JSON for Uniec3
  mappingVersion: v.string(),
  validationErrors: v.array(v.object({
    field: v.string(),
    message: v.string(),
  })),
  status: v.union(
    v.literal("generated"),
    v.literal("sent_to_bot"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  ),
  exportedAt: v.float64(),
  exportedBy: v.string(),
})
```

**Business Rules**
1. Mapping versie wordt bijgehouden zodat bij Uniec3 updates de mapping aangepast kan worden
2. Niet alle formulier-velden mappen 1:1 naar Uniec3: sommige vereisen transformatie
3. Bot queue verwerking is asynchroon (uren, niet seconden)
4. Bij bot-fout: order krijgt status "Bot error" + foutmelding

**Edge Cases**
- Formulier incompleet maar toch exported: ontbrekende velden worden als null meegegeven, bot moet hier mee omgaan
- Uniec3 parameternamen wijzigen: mapping-configuratie aanpassen zonder code-deploy

---

## 3.3 Management Dashboards

### 3.3.1 KPI Dashboard

**User Story**
Als manager (Jarco) wil ik een real-time dashboard zien met de belangrijkste KPI's van het bedrijf, zodat ik snel inzicht heb in prestaties en bottlenecks.

**Acceptance Criteria**
- [ ] KPI cards met: labels per maand/week, omzet per doelgroep, gemiddelde doorlooptijd, conversieratio, openstaande debiteuren
- [ ] Alle KPI's real-time (Convex reactivity, geen page refresh nodig)
- [ ] Vergelijking met vorige periode (maand/kwartaal) als percentage stijging/daling
- [ ] Klikbaar: klik op KPI opent detail-view
- [ ] Export naar PDF voor rapportage

**UI Description**
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Labels     │  Omzet      │  Doorlooptijd │  Debiteuren │
│  deze maand │  deze maand │  gemiddeld    │  openstaand │
│             │             │               │             │
│    127      │  €38.450    │   5.2 dagen   │  €12.340    │
│  ↑ 12%     │  ↑ 8%       │  ↓ 0.3 dag    │  ↑ €2.100   │
└─────────────┴─────────────┴─────────────┴─────────────┘

┌──────────────────────────────────────────────────────┐
│  Labels per maand (12 maanden)                       │
│  ████ ███ █████ ████ ██████ ████████ ...             │
│  Jan  Feb  Mrt  Apr   Mei    Jun                     │
└──────────────────────────────────────────────────────┘

┌────────────────────────┬─────────────────────────────┐
│  Omzet per doelgroep   │  Adviseur productiviteit    │
│  🟢 Particulier: 45%  │  Mark: 34 labels (██████)   │
│  🔵 Corporatie:  30%  │  Jurre: 28 labels (█████)   │
│  🟠 Belegger:    25%  │  Marie: 22 labels (████)    │
└────────────────────────┴─────────────────────────────┘
```

**Data Requirements**

```
dashboardSnapshots: defineTable({
  period: v.string(),             // "2026-03-18", "2026-W12", "2026-03"
  periodType: v.union(v.literal("day"), v.literal("week"), v.literal("month")),
  metrics: v.object({
    labelsCompleted: v.float64(),
    labelsInProgress: v.float64(),
    newOrders: v.float64(),
    totalRevenue: v.float64(),
    revenueByClientType: v.any(),  // { particulier: 1234, corporatie: 5678 }
    averageLeadTimeDays: v.float64(),
    conversionRate: v.float64(),
    outstandingDebt: v.float64(),
    noShowCount: v.float64(),
    adviseurProductivity: v.any(), // { adviseurId: count }
  }),
  computedAt: v.float64(),
})
```

**Business Rules**
1. KPI's worden real-time berekend voor "vandaag" en "deze week"
2. Historische periodes worden als snapshots opgeslagen (nightly cron)
3. Doorlooptijd = verschil tussen order aanmaak en label registratie
4. Conversieratio = afgeronde orders / totaal orders (excl. geannuleerd)
5. Openstaande debiteuren = som van verstuurde maar niet betaalde facturen
6. Vergelijkingspercentage altijd t.o.v. dezelfde periode vorig jaar (niet vorige maand) voor seizoenscorrectie

**Edge Cases**
- Eerste maand gebruik: geen vergelijkingsdata -> toon "Geen vorige periode beschikbaar"
- 0 orders in een periode: toon 0, geen NaN/infinity voor percentages
- Extreem hoge waarden (na data-import): sanity check op dashboard (melding bij >200% verandering)

---

### 3.3.2 Capacity Planning

**User Story**
Als manager wil ik inzicht in hoeveel labels we komende maand kunnen afhandelen op basis van adviseur-beschikbaarheid, zodat ik weet of ik extra capaciteit nodig heb.

**Acceptance Criteria**
- [ ] Berekening: beschikbare uren per adviseur per week * gemiddelde labels per uur
- [ ] Toon per week: beschikbare capaciteit vs geplande orders
- [ ] Waarschuwing als geplande orders > beschikbare capaciteit
- [ ] Scenario-tool: "Wat als adviseur X ziek is?" of "Wat als we een extra adviseur aannemen?"

**UI Description**
- Gantt-achtig overzicht: weken als kolommen, adviseurs als rijen
- Per cel: bezettingspercentage (kleurgecodeerd: groen <70%, oranje 70-90%, rood >90%)
- Totaalrij onderaan: team-brede capaciteit
- Scenario sidebar: toggles om adviseurs tijdelijk aan/uit te zetten, slider voor extra capaciteit

**Data Requirements**
Berekening op basis van `adviseurProfiles.workingDays` + `calendarEvents` + historisch gemiddelde labels per dag per adviseur.

**Business Rules**
1. Gemiddelde capaciteit per adviseur: 4-6 labels per dag (configureerbaar per adviseur op basis van historisch gemiddelde)
2. Uitwerktijd niet meegerekend in veld-capaciteit (dat is kantoortijd)
3. Vakantie/verlof vermindert capaciteit
4. Outlook-blokkades verminderen capaciteit

**Edge Cases**
- Nieuwe adviseur zonder historische data: gebruik team-gemiddelde als startwaarde
- Alle adviseurs tegelijk op vakantie: rode waarschuwing "Geen capaciteit beschikbaar in week X"

---

# PHASE 4: AI & OPTIMALISATIE

---

## 4.1 Email AI Agent

### 4.1.1 Email Triage Agent

**User Story**
Als systeem wil ik inkomende emails op planning@vastvooruit.nl en Jarco's inbox automatisch categoriseren en waar mogelijk conceptacties voorstellen, zodat handmatige verwerking vermindert.

**Acceptance Criteria**
- [ ] Agent connected met planning@ mailbox en Jarco's mailbox via Microsoft Graph API
- [ ] Elke inkomende email wordt automatisch gecategoriseerd: Nieuwe aanvraag / Wijzigingsverzoek / Statusvraag / Bevestiging / Overig
- [ ] Bij "Nieuwe aanvraag": parse emailinhoud, extract adres/contactgegevens/opdrachttype, maak concept-order
- [ ] Bij "Statusvraag": auto-reply met huidige orderstatus (als order gevonden)
- [ ] Bij "Wijzigingsverzoek": update afspraak + trigger bevestigingsflow
- [ ] ALTIJD human-in-the-loop voor kritische acties (order aanmaken, afspraak wijzigen)
- [ ] AI drafts worden ter goedkeuring aangeboden, nooit automatisch verstuurd

**UI Description**
- Inbox view in het systeem:
  - Lijst van inkomende emails met AI-classificatie badge
  - Per email: preview, AI-categorie, voorgestelde actie(s)
  - Actieknoppen:
    - "Goedkeuren" -> voert voorgestelde actie uit
    - "Bewerken" -> open actie in edit-modus
    - "Negeren" -> markeer als afgehandeld zonder actie
    - "Fout" -> corrigeer AI-classificatie (training feedback)
- AI concept-order: pre-filled order form met velden die de AI heeft geëxtraheerd, gemarkeerd met "AI geëxtraheerd" badge
- AI auto-reply draft: email preview met "Verstuur" / "Bewerk" / "Annuleer"

**Data Requirements**

```
emailInbox: defineTable({
  source: v.union(
    v.literal("planning_mailbox"),
    v.literal("jarco_mailbox")
  ),
  microsoftMessageId: v.string(),
  from: v.string(),
  fromName: v.optional(v.string()),
  to: v.array(v.string()),
  cc: v.array(v.string()),
  subject: v.string(),
  bodyText: v.string(),
  bodyHtml: v.optional(v.string()),
  receivedAt: v.float64(),
  hasAttachments: v.boolean(),
  attachmentNames: v.optional(v.array(v.string())),

  // AI processing
  aiClassification: v.optional(v.union(
    v.literal("new_request"),
    v.literal("schedule_change"),
    v.literal("status_question"),
    v.literal("confirmation"),
    v.literal("complaint"),
    v.literal("other")
  )),
  aiConfidence: v.optional(v.float64()),  // 0-1
  aiExtractedData: v.optional(v.any()),   // Parsed fields
  aiSuggestedAction: v.optional(v.string()),
  aiDraftReply: v.optional(v.string()),

  // Processing
  status: v.union(
    v.literal("unprocessed"),
    v.literal("ai_processed"),
    v.literal("human_reviewed"),
    v.literal("action_taken"),
    v.literal("ignored")
  ),
  linkedOrderId: v.optional(v.id("orders")),
  processedBy: v.optional(v.string()),
  processedAt: v.optional(v.float64()),
  feedbackCorrectClassification: v.optional(v.boolean()), // For AI training
})
```

**Business Rules**
1. AI classificatie gebruikt GPT-4 / Claude met VastVooruit-specifieke system prompt
2. Confidence threshold: >0.8 = auto-suggest actie, 0.5-0.8 = suggestie met vraagteken, <0.5 = "Onzeker, handmatig beoordelen"
3. Auto-reply op statusvragen: ALLEEN als een bestaande order kan worden gevonden (op basis van adres, naam, of referentienummer in de email)
4. Auto-reply wordt ALTIJD als draft getoond, nooit automatisch verstuurd (human-in-the-loop)
5. Nieuwe aanvraag-extractie: zoek naar adres (postcode regex), contactgegevens (email, telefoonnummer), opdrachttype (keywords: energielabel, maatwerkadvies, etc.)
6. Emails van bekende tussenpersonen worden automatisch aan het juiste tussenpersoon-profiel gekoppeld
7. Duplicate detectie: als een email over een order gaat waar al een concept of actie voor loopt, markeer als "Mogelijk dubbel"
8. Processing queue: emails worden binnen 2 minuten na ontvangst verwerkt

**Edge Cases**
- Email in andere taal (Engels/Duits): AI probeert alsnog te classifien, markeer als "Niet-Nederlands"
- Spam/marketing emails: classificeer als "other", auto-ignore optie
- Email met meerdere verzoeken (bijv. "Plan afspraak voor adres A en adres B"): AI splitst in twee conceptacties
- Email-thread (reply chain): AI extraheert context uit volledige thread
- Bijlagen (PDF offerte-aanvraag): AI kan PDF-tekst extracten voor classificatie
- AI hallucinatie (verkeerd adres geëxtraheerd): human review vangt dit op, feedback loop verbetert model

---

## 4.2 Academy & Kennisborging

### 4.2.1 Knowledge Base

**User Story**
Als EP-adviseur of medewerker wil ik BRL-, NTA 8800- en ISO-standaarden kunnen doorzoeken, zodat ik snel antwoorden vind op technische vragen zonder in PDF's te moeten zoeken.

**Acceptance Criteria**
- [ ] Upload van regelgevings-PDFs (BRL 9500, NTA 8800, etc.) die worden geïndexeerd
- [ ] Full-text zoekfunctie met relevante resultaten
- [ ] AI-powered Q&A: stel een vraag in natuurlijke taal, krijg antwoord met bronverwijzing
- [ ] Categorisering per regelgeving, per onderwerp
- [ ] Favorieten en bookmarks per gebruiker
- [ ] Versie-management bij updates van regelgeving

**UI Description**
- Zoekbalk centraal bovenaan
- Links: navigatie per regelgeving/categorie (boom-structuur)
- Midden: zoekresultaten of document-viewer
- Rechts: AI-chat panel "Vraag het de AI"
  - Input: "Wat is de minimale RC-waarde voor een vloer bij een bestaande woning?"
  - Output: "Volgens NTA 8800, hoofdstuk 12.3, is de minimale RC-waarde... [bron: NTA 8800 v2024, p.187]"

**Data Requirements**

```
knowledgeDocuments: defineTable({
  title: v.string(),
  category: v.string(),           // "BRL 9500", "NTA 8800", "ISO 52016"
  version: v.string(),
  fileStorageId: v.string(),
  fullText: v.string(),           // Extracted text for search
  chunks: v.array(v.object({      // For RAG
    chunkId: v.string(),
    text: v.string(),
    page: v.optional(v.float64()),
    section: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())), // Vector embedding
  })),
  uploadedBy: v.string(),
  uploadedAt: v.float64(),
  isActive: v.boolean(),
})

knowledgeQA: defineTable({
  question: v.string(),
  answer: v.string(),
  sources: v.array(v.object({
    documentId: v.id("knowledgeDocuments"),
    chunkId: v.string(),
    page: v.optional(v.float64()),
    relevanceScore: v.float64(),
  })),
  askedBy: v.string(),
  askedAt: v.float64(),
  helpful: v.optional(v.boolean()), // User feedback
})
```

**Business Rules**
1. RAG-gebaseerde Q&A: vectorsearch op document-chunks, context meegeven aan LLM
2. Antwoorden ALTIJD met bronverwijzing (document, pagina, sectie)
3. Bij geen relevant antwoord: "Ik kon geen relevant antwoord vinden. Raadpleeg een senior adviseur."
4. Q&A history wordt opgeslagen zodat veelgestelde vragen sneller beantwoord worden
5. Feedback loop: "Was dit antwoord nuttig?" verbetert ranking
6. Documenten worden niet naar extern gestuurd (LLM processing on-premise of met data-agreement)

**Edge Cases**
- Verouderde regelgeving: markeer als "Verouderd" met link naar actuele versie
- Tegenstrijdige informatie in twee documenten: AI noemt beide bronnen + melding
- Vraag buiten scope (niet over energielabels): "Deze vraag valt buiten mijn kennisgebied"

---

### 4.2.2 Onboarding Modules

**User Story**
Als nieuwe medewerker wil ik een gestructureerd onboarding-traject doorlopen met per rol de juiste modules en checklists, zodat ik snel productief ben.

**Acceptance Criteria**
- [ ] Per rol (EP-adviseur, planner, admin) een onboarding-traject met modules
- [ ] Module bevat: tekst, video's, quizzes, checklists
- [ ] Voortgang wordt bijgehouden per medewerker
- [ ] Manager kan voortgang van alle medewerkers inzien
- [ ] Na afronding: certificaat/badge in HR-profiel

**UI Description**
- Leerpad als horizontale stappen:
  ```
  [1. Introductie] → [2. Systeem] → [3. Regelgeving] → [4. Praktijk] → [5. Toets]
       ✅               ✅             🔄 bezig          ⏳              ⏳
  ```
- Per module: rich content pagina met next/previous navigatie
- Quiz: multiple choice met directe feedback
- Checklist: interactieve checklist met aftekenen door mentor

**Data Requirements**

```
onboardingModules: defineTable({
  title: v.string(),
  description: v.string(),
  applicableRoles: v.array(v.string()),
  sortOrder: v.float64(),
  content: v.array(v.object({
    type: v.union(
      v.literal("text"), v.literal("video"),
      v.literal("quiz"), v.literal("checklist")
    ),
    title: v.string(),
    bodyHtml: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    quizQuestions: v.optional(v.array(v.object({
      question: v.string(),
      options: v.array(v.string()),
      correctIndex: v.float64(),
      explanation: v.optional(v.string()),
    }))),
    checklistItems: v.optional(v.array(v.string())),
  })),
  isActive: v.boolean(),
})

onboardingProgress: defineTable({
  userId: v.string(),
  moduleId: v.id("onboardingModules"),
  status: v.union(
    v.literal("not_started"),
    v.literal("in_progress"),
    v.literal("completed")
  ),
  completedContentIds: v.array(v.string()),
  quizScores: v.optional(v.any()),
  startedAt: v.optional(v.float64()),
  completedAt: v.optional(v.float64()),
})
```

**Business Rules**
1. Modules moeten in volgorde worden doorlopen (vorige moet completed zijn)
2. Quiz vereist minimaal 80% score om door te gaan
3. Checklist items moeten door een mentor worden afgetekend (niet door de medewerker zelf)
4. Na afronding volledige traject: automatische notificatie naar HR + badge in profiel
5. Onboarding-voortgang wordt gekoppeld aan HR-systeem (Phase 4.3)

**Edge Cases**
- Medewerker met meerdere rollen: gecombineerd traject zonder duplicatie
- Module-content wordt gewijzigd: medewerkers die al bezig zijn behouden hun voortgang
- Quiz-score onder 80%: module kan opnieuw worden gedaan, geen limiet

---

## 4.3 HR-Systeem Vision

### 4.3.1 Digitaal Personeelsdossier

**User Story**
Als HR-manager wil ik per medewerker een digitaal dossier bijhouden met contracten, certificeringen, beoordelingen en documenten, zodat we Personio kunnen vervangen en alles in een systeem zit.

**Acceptance Criteria**
- [ ] Per medewerker: persoonlijke gegevens, contractinfo, documenten, certificeringen, beoordelingen
- [ ] Document upload met categorisering (contract, ID, certificaat, etc.)
- [ ] Digitale ondertekening van documenten
- [ ] Automatische herinnering bij verlopen documenten/certificeringen
- [ ] GDPR-compliant: medewerker kan eigen gegevens inzien, verwijderverzoek indienen
- [ ] Role-based access: HR ziet alles, manager ziet team, medewerker ziet eigen dossier

**UI Description**
- Medewerker profiel pagina:
  - Tab "Persoonlijk": naam, geboortedatum, BSN (encrypted), adres, noodcontact, bankrekeningnummer
  - Tab "Contract": huidig contract, historie, salaris (alleen HR), functieprofiel
  - Tab "Documenten": categorized document lijst met upload/download
  - Tab "Certificeringen": lijst met verloopdatums, status badges
  - Tab "Beoordelingen": jaarlijkse beoordelingen, POP-doelen
  - Tab "Verlof": saldo, aanvragen, historie (zie 4.3.2)
  - Tab "Verzuim": verzuimhistorie (zie 4.3.3)
  - Tab "Opleiding": Academy voortgang, gevolgde trainingen

**Data Requirements**

```
hrEmployees: defineTable({
  userId: v.string(),              // Clerk user ID
  // Persoonlijk
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.optional(v.string()),  // Encrypted
  bsn: v.optional(v.string()),          // Encrypted
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  postcode: v.optional(v.string()),
  phone: v.optional(v.string()),
  emergencyContact: v.optional(v.object({
    name: v.string(),
    phone: v.string(),
    relation: v.string(),
  })),
  bankAccount: v.optional(v.string()),   // Encrypted (IBAN)

  // Contract
  employmentType: v.union(
    v.literal("fulltime"),
    v.literal("parttime"),
    v.literal("zzp"),
    v.literal("intern")
  ),
  contractStartDate: v.float64(),
  contractEndDate: v.optional(v.float64()), // null = onbepaalde tijd
  hoursPerWeek: v.float64(),
  functionTitle: v.string(),
  department: v.optional(v.string()),
  managerId: v.optional(v.string()),

  // Meta
  isActive: v.boolean(),
  createdAt: v.float64(),
  updatedAt: v.float64(),
})

hrDocuments: defineTable({
  employeeId: v.id("hrEmployees"),
  category: v.union(
    v.literal("contract"),
    v.literal("id_document"),
    v.literal("certification"),
    v.literal("performance_review"),
    v.literal("warning"),
    v.literal("other")
  ),
  title: v.string(),
  fileStorageId: v.string(),
  requiresSignature: v.boolean(),
  signedAt: v.optional(v.float64()),
  signedBy: v.optional(v.string()),
  expiresAt: v.optional(v.float64()),
  uploadedBy: v.string(),
  uploadedAt: v.float64(),
})
```

**Business Rules**
1. BSN en bankrekeningnummer worden encrypted opgeslagen (field-level encryption)
2. Alleen HR-rol kan BSN en salarisgegevens inzien
3. Manager kan team-leden dossier inzien maar niet financiële gegevens
4. Medewerker kan eigen dossier inzien (excl. interne notities/waarschuwingen)
5. Certificeringen 30 dagen voor verloopdatum: automatische herinnering naar medewerker + HR
6. Documenten met handtekening-vereiste: digitale ondertekening via integratie (bijv. DocuSign of native)
7. Verwijderverzoek (GDPR): na uitdiensttreding + wettelijke bewaartermijn (7 jaar fiscaal)

**Edge Cases**
- ZZP'er vs werknemer: andere velden (geen BSN, geen verlof, wel uurtarief)
- Medewerker treedt uit en weer in: nieuw dossier met verwijzing naar oud dossier
- Bulkimport vanuit Personio: CSV-import met mapping tool

---

### 4.3.2 Verlofbeheer

**User Story**
Als medewerker wil ik verlof kunnen aanvragen en mijn saldo inzien, en als manager wil ik verlofaanvragen kunnen goedkeuren, zodat we Personio hiervoor niet meer nodig hebben.

**Acceptance Criteria**
- [ ] Medewerker dient verlofaanvraag in: datum van-tot, type verlof, reden
- [ ] Manager ontvangt notificatie en keurt goed/af
- [ ] Verlofsaldo wordt automatisch berekend en bijgehouden
- [ ] Kalenderoverzicht: wie is wanneer afwezig (team-view)
- [ ] Integratie met planning: goedgekeurd verlof blokkeert die dagen in de planningskalender
- [ ] Integratie met Outlook: verlof verschijnt als all-day event

**UI Description**
- Medewerker view:
  - Saldo cards: "Wettelijk: 15 van 20 dagen | Bovenwettelijk: 3 van 5 dagen"
  - "Verlof aanvragen" knop -> form met datum-range picker, type dropdown, reden tekstveld
  - Overzicht eigen aanvragen met status
- Manager view:
  - Pending aanvragen met "Goedkeuren" / "Afwijzen" knoppen
  - Team-kalender: horizontale balkjes per medewerker
- HR view: volledig overzicht alle medewerkers, saldo-correcties mogelijk

**Data Requirements**

```
leaveRequests: defineTable({
  employeeId: v.id("hrEmployees"),
  type: v.union(
    v.literal("wettelijk"),         // Wettelijke vakantiedagen
    v.literal("bovenwettelijk"),     // Extra vakantiedagen
    v.literal("bijzonder"),          // Bijzonder verlof (huwelijk, overlijden, etc.)
    v.literal("onbetaald"),
    v.literal("ouderschaps")
  ),
  startDate: v.float64(),
  endDate: v.float64(),
  totalDays: v.float64(),           // Calculated (excl. weekenden)
  reason: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected"),
    v.literal("cancelled")
  ),
  approvedBy: v.optional(v.string()),
  approvedAt: v.optional(v.float64()),
  rejectionReason: v.optional(v.string()),
  createdAt: v.float64(),
})

leaveBalances: defineTable({
  employeeId: v.id("hrEmployees"),
  year: v.float64(),
  type: v.string(),
  totalDays: v.float64(),
  usedDays: v.float64(),
  remainingDays: v.float64(),
  corrections: v.array(v.object({
    amount: v.float64(),
    reason: v.string(),
    correctedBy: v.string(),
    correctedAt: v.float64(),
  })),
})
```

**Business Rules**
1. Wettelijk verlof: standaard 20 dagen/jaar (fulltime), pro-rata voor parttime
2. Bovenwettelijk verlof: volgens contract (standaard 5 dagen)
3. Wettelijk verlof vervalt per 1 juli van het volgende jaar
4. Bovenwettelijk verlof vervalt 5 jaar na opbouw
5. Aanvraag min. 2 weken van tevoren voor periodes >3 dagen
6. Manager moet binnen 3 werkdagen reageren
7. Bij goedkeuring: Outlook event aanmaken + planningskalender blokkeren
8. Bij afwijzing: reden verplicht
9. Bijzonder verlof (huwelijk, overlijden): conform CAO, niet aftrekken van regulier saldo

**Edge Cases**
- Verlofaanvraag op een dag met al geplande afspraken: waarschuwing "Er staan X afspraken gepland"
- Negatief saldo: blokkeren tenzij HR override geeft
- Medewerker annuleert goedgekeurd verlof: saldo wordt teruggeboekt, Outlook event verwijderd
- Halve dag verlof: ondersteund (0.5 dag)

---

### 4.3.3 Verzuimbeheer

**User Story**
Als HR-medewerker wil ik verzuimmeldingen registreren en het wettelijk verplichte verzuimproces (Wet Verbetering Poortwachter) bijhouden, inclusief Arbodienst-koppeling.

**Acceptance Criteria**
- [ ] Ziekmelding registreren: datum, medewerker, aard (kort/lang verwacht)
- [ ] Automatische tijdlijn Wet Verbetering Poortwachter (week 6: probleemanalyse, week 8: plan van aanpak, etc.)
- [ ] Herinneringen voor deadlines poortwachter
- [ ] Hersteldmelding registreren
- [ ] Verzuimpercentage per medewerker en team
- [ ] Arbodienst koppeling: notificatie bij ziekmelding >5 dagen
- [ ] Privacy: verzuimreden wordt NIET geregistreerd (conform AVG)

**UI Description**
- HR dashboard: verzuimoverzicht
  - "3 medewerkers momenteel ziek"
  - Verzuimpercentage team: 4.2% (12-maands gemiddelde)
  - Timeline per zieke medewerker met Poortwachter-stappen
- Ziekmelding form: datum, verwachte duur, afdeling (GEEN reden)
- Poortwachter timeline:
  ```
  Week 1:  Ziekmelding           ✅ 15 mrt
  Week 6:  Probleemanalyse Arbo  ⏳ 26 apr (nog 5 weken)
  Week 8:  Plan van Aanpak       ⏳ 10 mei
  Week 42: Eerstejaarsevaluatie  ⏳ 23 dec
  Week 91: WIA-aanvraag          ⏳ ...
  ```

**Data Requirements**

```
sickLeaveRecords: defineTable({
  employeeId: v.id("hrEmployees"),
  startDate: v.float64(),
  endDate: v.optional(v.float64()),   // null = nog ziek
  expectedDuration: v.optional(v.union(
    v.literal("short"),              // <2 weken
    v.literal("medium"),             // 2-6 weken
    v.literal("long")                // >6 weken
  )),
  status: v.union(
    v.literal("active"),
    v.literal("recovered"),
    v.literal("long_term")
  ),

  // Poortwachter stappen
  poortwachterSteps: v.array(v.object({
    type: v.string(),                // "probleemanalyse", "plan_van_aanpak", etc.
    dueDate: v.float64(),
    completedDate: v.optional(v.float64()),
    notes: v.optional(v.string()),
    documentId: v.optional(v.id("hrDocuments")),
  })),

  reportedBy: v.string(),
  createdAt: v.float64(),
})
```

**Business Rules**
1. Ziekmelding dag 1: registratie in systeem + notificatie naar manager
2. Ziekmelding >3 dagen: notificatie naar Arbodienst (email of API)
3. Poortwachter-deadlines worden automatisch berekend vanaf eerste ziekdag
4. Geen medische gegevens opslaan (AVG): alleen data, duur en procesmatige stappen
5. Verzuimpercentage = (totaal ziektedagen / totaal werkdagen) * 100
6. Bij frequent verzuim (3x in 12 maanden): automatische flagging voor HR
7. Na herstelmelding: planning-beschikbaarheid automatisch herstellen

**Edge Cases**
- Medewerker wordt ziek tijdens verlof: verlof wordt omgezet in ziekte (saldo teruggeboekt)
- Gedeeltelijke werkhervatting: registreer als percentage (bijv. 50% werken)
- ZZP'er wordt ziek: geen Poortwachter-traject, alleen registratie voor planning

---

### 4.3.4 Loket Sync (Salary Mutation Report)

**User Story**
Als HR-medewerker wil ik met een klik een mutatierapport genereren voor Loket.nl (salarisverwerker), zodat ik niet handmatig wijzigingen hoef over te typen.

**Acceptance Criteria**
- [ ] Systeem houdt alle HR-mutaties bij sinds laatste export (nieuw dienstverband, uitdiensttreding, salariswijziging, verlof, verzuim)
- [ ] Export knop genereert rapport in Loket-compatible formaat (CSV of XML)
- [ ] Rapport toont: medewerker, type mutatie, datum, oude waarde, nieuwe waarde
- [ ] Na export: mutaties gemarkeerd als "geëxporteerd"
- [ ] Controle: "Alles kloppend?" bevestigingsstap voor HR

**UI Description**
- HR > Loket Export pagina
  - "Periode: 1-31 maart 2026"
  - Mutatie lijst:
    | Medewerker | Type | Datum | Detail |
    |---|---|---|---|
    | Mark de Boer | Verlof | 10-14 mrt | 5 dagen wettelijk |
    | Rick Jansen | Ziekmelding | 18 mrt | Dag 1 |
    | Ben Smit | Indiensttreding | 1 mrt | Fulltime, EP-adviseur |
  - "Download Loket rapport" knop
  - "Markeer als verzonden" knop

**Data Requirements**

```
loketExports: defineTable({
  period: v.string(),
  mutations: v.array(v.object({
    employeeId: v.id("hrEmployees"),
    type: v.string(),
    date: v.float64(),
    details: v.any(),
  })),
  exportedAt: v.float64(),
  exportedBy: v.string(),
  confirmedAt: v.optional(v.float64()),
  confirmedBy: v.optional(v.string()),
})
```

**Business Rules**
1. Mutaties worden automatisch verzameld uit alle HR-modules
2. Export bevat alleen mutaties sinds laatste geconfirmeerde export
3. Format: conform Loket.nl import specificatie
4. Dubbele export-bescherming: waarschuwing als period al geëxporteerd is
5. Controle-stap is verplicht: HR moet bevestigen voor de export als "verzonden" wordt gemarkeerd

**Edge Cases**
- Geen mutaties in periode: leeg rapport met melding "Geen mutaties in deze periode"
- Mutatie teruggedraaid na export (bijv. verlof geannuleerd): in volgende export als correctie-mutatie opnemen
- Loket formaat wijzigt: export-template configureerbaar door admin

---

### 4.3.5 POP (Persoonlijke Ontwikkelplannen)

**User Story**
Als medewerker en manager wil ik persoonlijke ontwikkeldoelen kunnen vastleggen, voortgang bijhouden en koppelen aan opleidingen uit de Academy, zodat professionele groei gestructureerd plaatsvindt.

**Acceptance Criteria**
- [ ] Medewerker en manager stellen samen doelen vast
- [ ] Doelen hebben: omschrijving, deadline, meetbare criteria, gekoppelde Academy-modules
- [ ] Periodieke check-in momenten (configureerbaar: maandelijks/kwartaal)
- [ ] Voortgang tracking met status per doel
- [ ] Jaarlijkse beoordeling koppelbaar aan POP-voortgang
- [ ] Historie van alle POP's per medewerker

**UI Description**
- POP overzicht per medewerker:
  - Actieve doelen als cards met voortgangsbalk
  - Per doel: omschrijving, deadline, status (On track / At risk / Completed), gekoppelde training
  - Check-in history: timeline met notities van manager en medewerker
  - "Nieuw doel toevoegen" formulier
- Manager view: overzicht van alle POP's van teamleden, upcoming check-ins

**Data Requirements**

```
developmentPlans: defineTable({
  employeeId: v.id("hrEmployees"),
  year: v.float64(),
  status: v.union(
    v.literal("draft"),
    v.literal("active"),
    v.literal("completed"),
    v.literal("archived")
  ),
  goals: v.array(v.object({
    id: v.string(),
    description: v.string(),
    measurableCriteria: v.string(),
    deadline: v.float64(),
    linkedModuleIds: v.optional(v.array(v.id("onboardingModules"))),
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("on_track"),
      v.literal("at_risk"),
      v.literal("completed")
    ),
  })),
  checkIns: v.array(v.object({
    date: v.float64(),
    notes: v.string(),
    createdBy: v.string(),
    goalUpdates: v.optional(v.any()),
  })),
  createdAt: v.float64(),
  updatedAt: v.float64(),
})
```

**Business Rules**
1. POP wordt jaarlijks opgesteld (of bij indiensttreding)
2. Minimaal 1 check-in per kwartaal verplicht
3. Check-in herinnering naar medewerker + manager
4. Bij "at risk" status: automatische escalatie naar HR
5. Afgeronde Academy-modules updaten automatisch de voortgang van gekoppelde doelen
6. POP-voortgang wordt meegenomen in jaarlijkse beoordeling

**Edge Cases**
- Medewerker wisselt van manager: nieuwe manager neemt lopend POP over
- Doel wordt halverwege irrelevant: status "Cancelled" met reden
- Medewerker weigert POP: HR-escalatie

---

*Einde Feature Specifications Phase 2, 3 & 4*
