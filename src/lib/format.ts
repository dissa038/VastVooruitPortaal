/**
 * Formatting utilities — Dutch locale
 */

/** Format cents to euros: 123456 → "€ 1.234,56" */
export function formatCurrency(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(euros);
}

/** Format cents with "excl. BTW" suffix */
export function formatCurrencyExVat(cents: number): string {
  return `${formatCurrency(cents)} excl. BTW`;
}

/** Format cents with "incl. BTW" suffix */
export function formatCurrencyInclVat(cents: number): string {
  return `${formatCurrency(cents)} incl. BTW`;
}

/** Format date string to Dutch format: "15 mrt 2026" */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format datetime to Dutch: "15 mrt 2026 om 14:30" */
export function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  const date = d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} om ${time}`;
}

/** Format duration in minutes: 90 → "1u 30m" */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}u`;
  return `${hours}u ${mins}m`;
}

/** Relative time: "2 dagen geleden", "zojuist" */
export function formatRelativeTime(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "zojuist";
  if (diffMins < 60) return `${diffMins} min geleden`;
  if (diffHours < 24) return `${diffHours} uur geleden`;
  if (diffDays === 1) return "gisteren";
  if (diffDays < 7) return `${diffDays} dagen geleden`;
  return formatDate(isoDate);
}

/** Dutch status labels for orders */
export const orderStatusLabels: Record<string, string> = {
  NIEUW: "Nieuw",
  OFFERTE_VERSTUURD: "Offerte verstuurd",
  GEACCEPTEERD: "Geaccepteerd",
  INGEPLAND: "Ingepland",
  OPNAME_GEDAAN: "Opname gedaan",
  IN_UITWERKING: "In uitwerking",
  CONCEPT_GEREED: "Concept gereed",
  CONTROLE: "Controle",
  GEREGISTREERD: "Geregistreerd",
  VERZONDEN: "Verzonden",
  AFGEROND: "Afgerond",
  ON_HOLD: "On hold",
  GEANNULEERD: "Geannuleerd",
  NO_SHOW: "No-show",
};

/** Dutch status labels for quotes */
export const quoteStatusLabels: Record<string, string> = {
  CONCEPT: "Concept",
  VERSTUURD: "Verstuurd",
  GEACCEPTEERD: "Geaccepteerd",
  VERLOPEN: "Verlopen",
  AFGEWEZEN: "Afgewezen",
};

/** Dutch status labels for invoices */
export const invoiceStatusLabels: Record<string, string> = {
  CONCEPT: "Concept",
  VERSTUURD: "Verstuurd",
  BETAALD: "Betaald",
  HERINNERING: "Herinnering",
  ONINBAAR: "Oninbaar",
};

/** Dutch labels for company types */
export const companyTypeLabels: Record<string, string> = {
  CORPORATIE: "Corporatie",
  BELEGGER: "Belegger",
  MAKELAARSKANTOOR: "Makelaarskantoor",
  AANNEMER: "Aannemer",
  BOUWBEDRIJF: "Bouwbedrijf",
  BANK: "Bank",
  MONUMENTENSTICHTING: "Monumentenstichting",
  VASTGOEDBEHEERDER: "Vastgoedbeheerder",
  PARTNER: "Partner",
  OVERIG: "Overig",
};

/** Dutch labels for contact roles */
export const contactRoleLabels: Record<string, string> = {
  EIGENAAR: "Eigenaar",
  HUURDER: "Huurder",
  OPDRACHTGEVER: "Opdrachtgever",
  BEWONER: "Bewoner",
  CONTACTPERSOON: "Contactpersoon",
  MAKELAAR: "Makelaar",
  AANNEMER_CONTACT: "Aannemer contact",
  OVERIG: "Overig",
};

/** Dutch labels for building types */
export const buildingTypeLabels: Record<string, string> = {
  APPARTEMENT: "Appartement",
  RIJTJESWONING: "Rijtjeswoning",
  TWEE_ONDER_EEN_KAP: "2-onder-1-kap",
  VRIJSTAAND: "Vrijstaand",
  BEDRIJFSPAND_LT_100: "Bedrijfspand < 100m²",
  BEDRIJFSPAND_100_250: "Bedrijfspand 100-250m²",
  BEDRIJFSPAND_251_500: "Bedrijfspand 251-500m²",
  BEDRIJFSPAND_501_1000: "Bedrijfspand 501-1000m²",
  BEDRIJFSPAND_1001_1500: "Bedrijfspand 1001-1500m²",
  BEDRIJFSPAND_GT_1500: "Bedrijfspand > 1500m²",
};

/** Dutch labels for product types */
export const productTypeLabels: Record<string, string> = {
  ENERGIELABEL: "Energielabel",
  VERDUURZAMINGSADVIES: "Verduurzamingsadvies",
  WWS_PUNTENTELLING: "WWS-puntentelling",
  NEN2580_METING: "NEN 2580 meting",
  BENG_BEREKENING: "BENG-berekening",
  BLOWERDOORTEST: "Blowerdoortest",
  HUURPRIJSCHECK: "Huurprijscheck",
  MAATWERK: "Maatwerk",
};

/** Dutch labels for work types (time entries) */
export const workTypeLabels: Record<string, string> = {
  OPNAME: "Opname",
  UITWERKING: "Uitwerking",
  CONTROLE: "Controle",
  REGISTRATIE: "Registratie",
  PLANNING: "Planning",
  ADMINISTRATIE: "Administratie",
  COMMERCIEEL: "Commercieel",
  REISTIJD: "Reistijd",
  NIEUWBOUW_DOSSIER: "Nieuwbouw dossier",
  OVERLEG: "Overleg",
  OVERIG: "Overig",
};
