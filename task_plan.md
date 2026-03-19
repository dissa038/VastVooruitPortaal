# VastVooruit Portaal — Fase 1 Build Plan

## Goal
Build the complete Fase 1 Portal MVP: dossierbeheer, CRM-light, offerteflow, facturatie, kostenmutaties, uurregistratie, pricing engine.

## Phases

### Phase 1: Core Convex Functions [in_progress]
- [ ] Orders CRUD (list, create, update, status transitions)
- [ ] Contacts CRUD
- [ ] Companies CRUD
- [ ] Projects CRUD
- [ ] Addresses (with BAG lookup action)
- [ ] Auth helper (getAuthUser, requireRole guards)

### Phase 2: Orders/Dossierbeheer UI [pending]
- [ ] Orders list page (table + kanban toggle)
- [ ] Order detail page (status pipeline, linked entities, documents)
- [ ] New order form (with address BAG lookup)
- [ ] Status transition controls
- [ ] Document upload to dossier

### Phase 3: CRM Pages [pending]
- [ ] Contacts list + detail + create/edit
- [ ] Companies list + detail + create/edit
- [ ] Intermediaries list + detail
- [ ] Lead pipeline kanban view

### Phase 4: Quotes (Offertes) [pending]
- [ ] Quote builder (line items, products, pricing)
- [ ] Quote PDF generation
- [ ] Quote status flow (send, accept, reject)
- [ ] Public acceptance page (/offerte/[id])

### Phase 5: Invoices (Facturen) [pending]
- [ ] Invoice list with aging buckets
- [ ] Auto-invoice from completed orders
- [ ] Moneybird sync actions (structure ready)
- [ ] Debiteurenopvolging dashboard

### Phase 6: Cost Mutations + Time Entries [pending]
- [ ] Cost mutation create/approve flow
- [ ] Time entry calendar view
- [ ] Time entry logging per order/project

### Phase 7: Pricing Engine [pending]
- [ ] Product catalog management
- [ ] Pricing rules CRUD
- [ ] Price resolver (product + building type + client type + volume)

### Phase 8: Dashboard KPIs [pending]
- [ ] Real dashboard stats (counts by status)
- [ ] Recent orders, upcoming appointments
- [ ] Quick actions

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|

## Files Modified
(tracked per phase)
