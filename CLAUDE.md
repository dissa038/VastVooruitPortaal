# VastVooruit Portaal

## Wat is dit?
Energielabel management platform voor VastVooruit (Staphorst). Vervangt 15+ legacy systemen met één portaal.

## Stack
- **Frontend**: Next.js 16 + React 19 + Tailwind v4 + shadcn/ui
- **Database**: Convex (dev: `upbeat-gazelle-312`)
- **Auth**: Clerk (apart project "VastVooruit Portaal")
- **Accounting**: Moneybird API v2
- **Calendar**: Microsoft Graph API v1.0 (Outlook)
- **Addresses**: BAG API (Kadaster)

## Branding
- Deep teal: `#0E2D2D`
- Vibrant green: `#14AF52`
- Beige: `#EAE3DF`
- Font: Geist Sans / Geist Mono
- Sharp corners (radius: 0.25rem)
- Dark mode default

## Conventies
- Tabelnamen: camelCase (`quoteLineItems`)
- Code: Engels
- UI tekst: Nederlands
- Status enums: SCREAMING_SNAKE (`OFFERTE_VERSTUURD`)
- Prijzen: altijd in centen (eurocent)
- Soft deletes: `isArchived: boolean` (15 jaar bewaarplicht)

## Fase planning
- **Fase 0**: Uniec3 bot (NIET in deze repo) + intake formulier
- **Fase 1**: Portal MVP (dossierbeheer, CRM, offertes, facturatie, pricing engine)
- **Fase 2**: Planning, Outlook sync, klantportaal, communicatie
- **Fase 3**: Mobiele app, dashboards
- **Fase 4**: AI agent, Academy, HR

## Docs
Alle planningsdocumenten staan in `/docs/`:
- `SCOPE_VASTVOORUIT_PLATFORM.md` — hoofdscope
- `DATA_MODEL.md` — compleet Convex schema
- `FEATURE_SPECS_PHASE_0_AND_1.md` — fase 0+1 specs
- `FEATURE_SPECS_PHASE_2_3_4.md` — fase 2-4 specs
- `INTEGRATIONS_SCOPE.md` — API integratie specs

## Integratie credentials
Nog niet beschikbaar — structuur staat klaar in `src/lib/integrations/`. Env vars staan in `.env.local` als placeholders.

@AGENTS.md
