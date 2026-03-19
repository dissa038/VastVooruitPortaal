/**
 * Currency formatting helpers — prices stored in cents, displayed in euros.
 * Uses Dutch locale: € 1.234,56
 */

const formatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format cents to "€ 1.234,56" */
export function formatCurrency(cents: number): string {
  return formatter.format(cents / 100);
}

/** Format cents to "€ 1.234,56 excl. BTW" */
export function formatCurrencyExVat(cents: number): string {
  return `${formatter.format(cents / 100)} excl. BTW`;
}

/** Format cents to "€ 1.234,56 incl. BTW" */
export function formatCurrencyInclVat(cents: number): string {
  return `${formatter.format(cents / 100)} incl. BTW`;
}
