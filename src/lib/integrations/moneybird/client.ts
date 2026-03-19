/**
 * Moneybird API v2 Client
 *
 * Handles authentication and API calls to Moneybird.
 * Requires environment variables:
 * - MONEYBIRD_API_TOKEN: API token from Moneybird
 * - MONEYBIRD_ADMINISTRATION_ID: The administration (bedrijf) ID
 *
 * Docs: https://developer.moneybird.com/
 */

const MONEYBIRD_BASE_URL = "https://moneybird.com/api/v2";

export function getMoneybirdClient() {
  const token = process.env.MONEYBIRD_API_TOKEN;
  const administrationId = process.env.MONEYBIRD_ADMINISTRATION_ID;

  if (!token || !administrationId) {
    throw new Error(
      "Missing MONEYBIRD_API_TOKEN or MONEYBIRD_ADMINISTRATION_ID"
    );
  }

  const baseUrl = `${MONEYBIRD_BASE_URL}/${administrationId}`;

  async function request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Moneybird API error ${res.status}: ${error}`);
    }

    return res.json();
  }

  return {
    // Contacts
    contacts: {
      list: () => request<MoneybirdContact[]>("/contacts.json"),
      get: (id: string) => request<MoneybirdContact>(`/contacts/${id}.json`),
      create: (data: Partial<MoneybirdContact>) =>
        request<MoneybirdContact>("/contacts.json", {
          method: "POST",
          body: JSON.stringify({ contact: data }),
        }),
      update: (id: string, data: Partial<MoneybirdContact>) =>
        request<MoneybirdContact>(`/contacts/${id}.json`, {
          method: "PATCH",
          body: JSON.stringify({ contact: data }),
        }),
    },
    // Sales Invoices
    invoices: {
      list: () =>
        request<MoneybirdInvoice[]>("/sales_invoices.json"),
      get: (id: string) =>
        request<MoneybirdInvoice>(`/sales_invoices/${id}.json`),
      create: (data: Partial<MoneybirdInvoice>) =>
        request<MoneybirdInvoice>("/sales_invoices.json", {
          method: "POST",
          body: JSON.stringify({ sales_invoice: data }),
        }),
      sendInvoice: (id: string, method: "Email" | "Simplerinvoicing" = "Email") =>
        request(`/sales_invoices/${id}/send_invoice.json`, {
          method: "PATCH",
          body: JSON.stringify({
            sales_invoice_sending: { delivery_method: method },
          }),
        }),
    },
  };
}

// Types (minimal — extend as needed)
export interface MoneybirdContact {
  id: string;
  company_name: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  chamber_of_commerce: string;
  tax_number: string;
  send_invoices_to_email: string;
}

export interface MoneybirdInvoice {
  id: string;
  contact_id: string;
  reference: string;
  invoice_date: string;
  due_date: string;
  state: string;
  total_price_excl_tax: string;
  total_price_incl_tax: string;
  url: string;
  details: MoneybirdInvoiceDetail[];
}

export interface MoneybirdInvoiceDetail {
  description: string;
  price: string;
  amount: string;
  tax_rate_id: string;
}
