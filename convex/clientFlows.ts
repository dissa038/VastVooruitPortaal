import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// ============================================================================
// CLIENT FLOW TYPES
// ============================================================================

export type ClientType = "CORPORATIE" | "BELEGGER" | "PARTICULIER" | "MAKELAAR";

export type FlowStep = {
  status: string;
  label: string;
  required: boolean;
};

export type InvoiceSplit = {
  upfront: number; // percentage
  completion: number; // percentage
};

export type CommunicationRecipient = {
  role: "OPDRACHTGEVER" | "BEWONER" | "CORPORATIE_CONTACT" | "MAKELAAR";
  contactField: "contactId" | "bewonerId" | "intermediaryId";
};

// ============================================================================
// FLOW DEFINITIONS (pure functions — reusable server + client)
// ============================================================================

const CORPORATIE_STEPS: FlowStep[] = [
  { status: "NIEUW", label: "Batch import", required: true },
  // Skips OFFERTE_VERSTUURD and GEACCEPTEERD
  { status: "INGEPLAND", label: "Bulk planning", required: true },
  { status: "OPNAME_GEDAAN", label: "Opname", required: true },
  { status: "IN_UITWERKING", label: "Uitwerking", required: true },
  { status: "CONCEPT_GEREED", label: "Concept gereed", required: true },
  { status: "CONTROLE", label: "Controle", required: true },
  { status: "GEREGISTREERD", label: "Registratie", required: true },
  { status: "VERZONDEN", label: "Levering", required: true },
  { status: "AFGEROND", label: "Afronding", required: true },
];

const BELEGGER_STEPS: FlowStep[] = [
  { status: "NIEUW", label: "Lead & offerte", required: true },
  { status: "OFFERTE_VERSTUURD", label: "Offerte verstuurd", required: true },
  { status: "GEACCEPTEERD", label: "Geaccepteerd", required: true },
  { status: "INGEPLAND", label: "Planning", required: true },
  { status: "OPNAME_GEDAAN", label: "Opname", required: true },
  { status: "IN_UITWERKING", label: "Uitwerking", required: true },
  { status: "CONCEPT_GEREED", label: "Concept gereed", required: true },
  { status: "CONTROLE", label: "Controle", required: true },
  { status: "GEREGISTREERD", label: "Registratie", required: true },
  { status: "VERZONDEN", label: "Levering", required: true },
  { status: "AFGEROND", label: "Afronding", required: true },
];

const PARTICULIER_STEPS: FlowStep[] = [
  { status: "NIEUW", label: "Intake", required: true },
  // OFFERTE_VERSTUURD only if >= 100000 cents (€1.000)
  { status: "OFFERTE_VERSTUURD", label: "Offerte verstuurd", required: false },
  { status: "GEACCEPTEERD", label: "Geaccepteerd", required: false },
  { status: "INGEPLAND", label: "Planning", required: true },
  { status: "OPNAME_GEDAAN", label: "Opname", required: true },
  { status: "IN_UITWERKING", label: "Uitwerking", required: true },
  { status: "CONCEPT_GEREED", label: "Concept gereed", required: true },
  { status: "CONTROLE", label: "Controle", required: true },
  { status: "GEREGISTREERD", label: "Registratie", required: true },
  // Betaallink between GEREGISTREERD and VERZONDEN
  { status: "VERZONDEN", label: "Levering (na betaling)", required: true },
  { status: "AFGEROND", label: "Afronding", required: true },
];

const MAKELAAR_STEPS: FlowStep[] = PARTICULIER_STEPS; // Same flow as particulier

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Determine which flow a client type uses */
export function determineFlow(clientType: ClientType): string {
  switch (clientType) {
    case "CORPORATIE":
      return "CORPORATIE";
    case "BELEGGER":
      return "BELEGGER";
    case "PARTICULIER":
    case "MAKELAAR":
      return "PARTICULIER";
    default:
      return "PARTICULIER";
  }
}

/** Get all pipeline steps for this client type */
export function getRequiredSteps(clientType: ClientType): FlowStep[] {
  switch (clientType) {
    case "CORPORATIE":
      return CORPORATIE_STEPS;
    case "BELEGGER":
      return BELEGGER_STEPS;
    case "PARTICULIER":
      return PARTICULIER_STEPS;
    case "MAKELAAR":
      return MAKELAAR_STEPS;
    default:
      return PARTICULIER_STEPS;
  }
}

/**
 * Can this order skip the offerte step?
 * - Corporatie: always skips (contract-based)
 * - Particulier/Makelaar: skips if total < €1.000 (100000 cents)
 * - Belegger: never skips
 */
export function canSkipOfferte(
  clientType: ClientType,
  totalAmountCents?: number
): boolean {
  if (clientType === "CORPORATIE") return true;
  if (clientType === "BELEGGER") return false;
  // Particulier / Makelaar: skip if under €1.000
  if (totalAmountCents !== undefined && totalAmountCents < 100000) return true;
  return false;
}

/** Payment term in days per client type */
export function getPaymentTerms(clientType: ClientType): number {
  switch (clientType) {
    case "CORPORATIE":
      return 30;
    case "BELEGGER":
      return 14;
    case "PARTICULIER":
    case "MAKELAAR":
      return 0; // Immediate — payment link (iDEAL)
    default:
      return 14;
  }
}

/** Invoice split: corporatie = 35/65, others = 100% on completion */
export function getInvoiceSplit(clientType: ClientType): InvoiceSplit {
  if (clientType === "CORPORATIE") {
    return { upfront: 35, completion: 65 };
  }
  return { upfront: 0, completion: 100 };
}

/**
 * Determine who should receive communications for this order.
 * - Corporatie: only corporatie contact (contactId)
 * - Belegger: both opdrachtgever (contactId) AND bewoner (bewonerId)
 * - Particulier: only the contact (who is usually eigenaar+bewoner)
 * - Makelaar: contact + CC to intermediary (makelaar)
 */
export function getCommunicationRecipients(
  clientType: ClientType
): CommunicationRecipient[] {
  switch (clientType) {
    case "CORPORATIE":
      return [
        { role: "CORPORATIE_CONTACT", contactField: "contactId" },
      ];
    case "BELEGGER":
      return [
        { role: "OPDRACHTGEVER", contactField: "contactId" },
        { role: "BEWONER", contactField: "bewonerId" },
      ];
    case "MAKELAAR":
      return [
        { role: "OPDRACHTGEVER", contactField: "contactId" },
        { role: "MAKELAAR", contactField: "intermediaryId" },
      ];
    case "PARTICULIER":
    default:
      return [
        { role: "OPDRACHTGEVER", contactField: "contactId" },
      ];
  }
}

/**
 * Determine initial order status based on client type and amount.
 * - Corporatie: starts at NIEUW (skips offerte)
 * - Belegger: starts at NIEUW (needs offerte)
 * - Particulier <€1.000: can go direct to GEACCEPTEERD (skip offerte)
 * - Particulier >=€1.000: starts at NIEUW
 */
export function getInitialStatus(
  clientType: ClientType,
  totalAmountCents?: number
): string {
  if (clientType === "CORPORATIE") return "NIEUW";
  if (clientType === "BELEGGER") return "NIEUW";
  // Particulier/Makelaar: direct accept if cheap
  if (canSkipOfferte(clientType, totalAmountCents)) return "GEACCEPTEERD";
  return "NIEUW";
}

/** Get the client type badge abbreviation */
export function getClientTypeBadge(clientType: ClientType): {
  abbr: string;
  label: string;
  className: string;
} {
  switch (clientType) {
    case "CORPORATIE":
      return {
        abbr: "CO",
        label: "Corporatie",
        className: "bg-purple-500/15 text-purple-400 border-purple-500/20",
      };
    case "BELEGGER":
      return {
        abbr: "BL",
        label: "Belegger",
        className: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      };
    case "PARTICULIER":
      return {
        abbr: "PA",
        label: "Particulier",
        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      };
    case "MAKELAAR":
      return {
        abbr: "MK",
        label: "Makelaar",
        className: "bg-orange-500/15 text-orange-400 border-orange-500/20",
      };
    default:
      return {
        abbr: "?",
        label: "Onbekend",
        className: "bg-muted text-muted-foreground",
      };
  }
}

// ============================================================================
// CONVEX QUERIES (for use in components via api.clientFlows.*)
// ============================================================================

/** Get flow configuration for a given client type */
export const getFlowConfig = query({
  args: {
    clientType: v.union(
      v.literal("CORPORATIE"),
      v.literal("BELEGGER"),
      v.literal("PARTICULIER"),
      v.literal("MAKELAAR")
    ),
    totalAmountCents: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const ct = args.clientType as ClientType;
    return {
      flow: determineFlow(ct),
      steps: getRequiredSteps(ct),
      canSkipOfferte: canSkipOfferte(ct, args.totalAmountCents),
      paymentTermDays: getPaymentTerms(ct),
      invoiceSplit: getInvoiceSplit(ct),
      communicationRecipients: getCommunicationRecipients(ct),
      initialStatus: getInitialStatus(ct, args.totalAmountCents),
      badge: getClientTypeBadge(ct),
    };
  },
});
