import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// ============================================================================
// Dutch currency formatter (cents -> euros)
// ============================================================================

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDateNL(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ============================================================================
// PDF Styles
// ============================================================================

const colors = {
  teal: "#0E2D2D",
  green: "#14AF52",
  beige: "#EAE3DF",
  white: "#FFFFFF",
  gray: "#666666",
  lightGray: "#F5F5F5",
  darkText: "#1A1A1A",
  border: "#DDDDDD",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.darkText,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.green,
  },
  headerLeft: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.teal,
  },
  companyInfo: {
    fontSize: 8,
    color: colors.gray,
    marginTop: 4,
    lineHeight: 1.5,
  },
  headerRight: {
    alignItems: "flex-end" as const,
  },
  quoteLabel: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.teal,
  },
  quoteRef: {
    fontSize: 10,
    color: colors.gray,
    marginTop: 2,
  },
  // Meta info
  metaSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: colors.gray,
    marginBottom: 2,
    textTransform: "uppercase" as const,
  },
  metaValue: {
    fontSize: 10,
    color: colors.darkText,
    marginBottom: 8,
  },
  // Title
  title: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: colors.teal,
    marginBottom: 10,
  },
  introText: {
    fontSize: 9,
    color: colors.gray,
    marginBottom: 20,
    lineHeight: 1.6,
  },
  // Table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.teal,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: colors.white,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase" as const,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    backgroundColor: colors.lightGray,
  },
  colDescription: { flex: 4 },
  colQuantity: { flex: 1, textAlign: "right" as const },
  colUnitPrice: { flex: 2, textAlign: "right" as const },
  colTotal: { flex: 2, textAlign: "right" as const },
  // Totals
  totalsContainer: {
    alignItems: "flex-end" as const,
    marginBottom: 25,
  },
  totalsBox: {
    width: 220,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1.5,
    borderTopColor: colors.teal,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: colors.gray,
  },
  totalValue: {
    fontSize: 9,
    color: colors.darkText,
  },
  totalLabelBold: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.teal,
  },
  totalValueBold: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.green,
  },
  // Conditions
  conditionsTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.teal,
    marginBottom: 6,
  },
  conditionsText: {
    fontSize: 8,
    color: colors.gray,
    lineHeight: 1.6,
    marginBottom: 25,
  },
  // Signature
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 15,
  },
  signatureBlock: {
    width: 200,
  },
  signatureLabel: {
    fontSize: 8,
    color: colors.gray,
    marginBottom: 4,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.darkText,
    marginTop: 35,
    marginBottom: 4,
  },
  signatureHint: {
    fontSize: 7,
    color: colors.gray,
  },
  // Footer
  footer: {
    position: "absolute" as const,
    bottom: 25,
    left: 40,
    right: 40,
    textAlign: "center" as const,
    fontSize: 7,
    color: colors.gray,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
});

// ============================================================================
// PDF Document Component
// ============================================================================

interface QuoteData {
  referenceCode: string;
  title: string | null;
  introText: string | null;
  conditions: string | null;
  totalExVat: number;
  totalInclVat: number;
  vatAmount: number;
  sentAt: string | null;
  validUntil: string | null;
  companyName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPriceExVat: number;
    totalExVat: number;
    vatPercentage: number;
    sortOrder: number;
  }>;
}

function createQuoteDocument(quote: QuoteData) {
  const sortedItems = [...quote.lineItems].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  return React.createElement(
    Document,
    { title: `Offerte ${quote.referenceCode}`, author: "VastVooruit" },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          { style: styles.headerLeft },
          React.createElement(
            Text,
            { style: styles.companyName },
            "VastVooruit"
          ),
          React.createElement(
            Text,
            { style: styles.companyInfo },
            "Energielabel & Duurzaamheidsadvies\nStaphorst\ninfo@vastvooruit.nl\nwww.vastvooruit.nl"
          )
        ),
        React.createElement(
          View,
          { style: styles.headerRight },
          React.createElement(Text, { style: styles.quoteLabel }, "OFFERTE"),
          React.createElement(
            Text,
            { style: styles.quoteRef },
            quote.referenceCode
          )
        )
      ),
      // Meta info
      React.createElement(
        View,
        { style: styles.metaSection },
        React.createElement(
          View,
          { style: styles.metaBlock },
          quote.companyName &&
            React.createElement(
              View,
              null,
              React.createElement(Text, { style: styles.metaLabel }, "Bedrijf"),
              React.createElement(
                Text,
                { style: styles.metaValue },
                quote.companyName
              )
            ),
          quote.contactName &&
            React.createElement(
              View,
              null,
              React.createElement(
                Text,
                { style: styles.metaLabel },
                "Contactpersoon"
              ),
              React.createElement(
                Text,
                { style: styles.metaValue },
                quote.contactName
              )
            ),
          quote.contactEmail &&
            React.createElement(
              View,
              null,
              React.createElement(Text, { style: styles.metaLabel }, "E-mail"),
              React.createElement(
                Text,
                { style: styles.metaValue },
                quote.contactEmail
              )
            )
        ),
        React.createElement(
          View,
          { style: { ...styles.metaBlock, alignItems: "flex-end" as const } },
          quote.sentAt &&
            React.createElement(
              View,
              null,
              React.createElement(Text, { style: styles.metaLabel }, "Datum"),
              React.createElement(
                Text,
                { style: styles.metaValue },
                formatDateNL(quote.sentAt)
              )
            ),
          quote.validUntil &&
            React.createElement(
              View,
              null,
              React.createElement(
                Text,
                { style: styles.metaLabel },
                "Geldig tot"
              ),
              React.createElement(
                Text,
                { style: styles.metaValue },
                formatDateNL(quote.validUntil)
              )
            )
        )
      ),
      // Title
      quote.title &&
        React.createElement(Text, { style: styles.title }, quote.title),
      // Intro text
      quote.introText &&
        React.createElement(Text, { style: styles.introText }, quote.introText),
      // Table
      React.createElement(
        View,
        { style: styles.table },
        // Table header
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(
            Text,
            { style: { ...styles.tableHeaderText, ...styles.colDescription } },
            "Omschrijving"
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableHeaderText, ...styles.colQuantity } },
            "Aantal"
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableHeaderText, ...styles.colUnitPrice } },
            "Stukprijs"
          ),
          React.createElement(
            Text,
            { style: { ...styles.tableHeaderText, ...styles.colTotal } },
            "Totaal"
          )
        ),
        // Table rows
        ...sortedItems.map((item, i) =>
          React.createElement(
            View,
            {
              key: String(i),
              style: i % 2 === 1 ? styles.tableRowAlt : styles.tableRow,
            },
            React.createElement(
              Text,
              { style: styles.colDescription },
              item.description
            ),
            React.createElement(
              Text,
              { style: styles.colQuantity },
              String(item.quantity)
            ),
            React.createElement(
              Text,
              { style: styles.colUnitPrice },
              formatEuro(item.unitPriceExVat)
            ),
            React.createElement(
              Text,
              { style: styles.colTotal },
              formatEuro(item.totalExVat)
            )
          )
        )
      ),
      // Totals
      React.createElement(
        View,
        { style: styles.totalsContainer },
        React.createElement(
          View,
          { style: styles.totalsBox },
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(
              Text,
              { style: styles.totalLabel },
              "Subtotaal excl. BTW"
            ),
            React.createElement(
              Text,
              { style: styles.totalValue },
              formatEuro(quote.totalExVat)
            )
          ),
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(
              Text,
              { style: styles.totalLabel },
              "BTW (21%)"
            ),
            React.createElement(
              Text,
              { style: styles.totalValue },
              formatEuro(quote.vatAmount)
            )
          ),
          React.createElement(
            View,
            { style: styles.totalRowFinal },
            React.createElement(
              Text,
              { style: styles.totalLabelBold },
              "Totaal incl. BTW"
            ),
            React.createElement(
              Text,
              { style: styles.totalValueBold },
              formatEuro(quote.totalInclVat)
            )
          )
        )
      ),
      // Conditions
      quote.conditions &&
        React.createElement(
          View,
          null,
          React.createElement(
            Text,
            { style: styles.conditionsTitle },
            "Voorwaarden"
          ),
          React.createElement(
            Text,
            { style: styles.conditionsText },
            quote.conditions
          )
        ),
      // Signature area
      React.createElement(
        View,
        { style: styles.signatureSection },
        React.createElement(
          View,
          { style: styles.signatureBlock },
          React.createElement(
            Text,
            { style: styles.signatureLabel },
            "Voor akkoord, VastVooruit"
          ),
          React.createElement(View, { style: styles.signatureLine }),
          React.createElement(
            Text,
            { style: styles.signatureHint },
            "Naam / Datum"
          )
        ),
        React.createElement(
          View,
          { style: styles.signatureBlock },
          React.createElement(
            Text,
            { style: styles.signatureLabel },
            "Voor akkoord, opdrachtgever"
          ),
          React.createElement(View, { style: styles.signatureLine }),
          React.createElement(
            Text,
            { style: styles.signatureHint },
            "Naam / Datum / Handtekening"
          )
        )
      ),
      // Footer
      React.createElement(
        Text,
        { style: styles.footer },
        "VastVooruit \u2022 Energielabel & Duurzaamheidsadvies \u2022 Staphorst \u2022 info@vastvooruit.nl \u2022 www.vastvooruit.nl"
      )
    )
  );
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const quote = await convex.query(api.quotes.getPublicById, {
      id: id as Id<"quotes">,
    });

    if (!quote) {
      return NextResponse.json(
        { error: "Offerte niet gevonden" },
        { status: 404 }
      );
    }

    const pdfBuffer = await renderToBuffer(
      createQuoteDocument(quote as QuoteData)
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="offerte-${quote.referenceCode}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: "Fout bij het genereren van de PDF" },
      { status: 500 }
    );
  }
}
