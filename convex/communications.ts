import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./lib/auth";
import { renderTemplate } from "./emailTemplates";

// ============================================================================
// QUERIES
// ============================================================================

export const list = query({
  args: {
    type: v.optional(
      v.union(
        v.literal("EMAIL"),
        v.literal("SMS"),
        v.literal("WHATSAPP"),
        v.literal("BRIEF"),
      ),
    ),
    orderId: v.optional(v.id("orders")),
    contactId: v.optional(v.id("contacts")),
  },
  handler: async (ctx, args) => {
    if (args.orderId) {
      return await ctx.db
        .query("communications")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId!))
        .take(100);
    }

    if (args.contactId) {
      return await ctx.db
        .query("communications")
        .withIndex("by_contactId", (q) => q.eq("contactId", args.contactId!))
        .take(100);
    }

    if (args.type) {
      return await ctx.db
        .query("communications")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .take(100);
    }

    // No filters — return most recent
    return await ctx.db
      .query("communications")
      .order("desc")
      .take(50);
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const allComms = await ctx.db.query("communications").take(500);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let sentThisMonth = 0;
    let concepts = 0;
    let failed = 0;

    for (const comm of allComms) {
      if (comm.status === "VERZONDEN" && comm.sentAt && comm.sentAt >= startOfMonth) {
        sentThisMonth++;
      }
      if (comm.status === "CONCEPT") concepts++;
      if (comm.status === "MISLUKT") failed++;
    }

    return { sentThisMonth, concepts, failed };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = mutation({
  args: {
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),
    contactId: v.optional(v.id("contacts")),
    companyId: v.optional(v.id("companies")),
    type: v.union(
      v.literal("EMAIL"),
      v.literal("SMS"),
      v.literal("WHATSAPP"),
      v.literal("BRIEF"),
    ),
    templateId: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    toEmail: v.optional(v.string()),
    ccEmails: v.optional(v.array(v.string())),
    bccEmails: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(
        v.literal("CONCEPT"),
        v.literal("VERZONDEN"),
        v.literal("MISLUKT"),
        v.literal("GEOPEND"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    return await ctx.db.insert("communications", {
      orderId: args.orderId,
      projectId: args.projectId,
      contactId: args.contactId,
      companyId: args.companyId,
      type: args.type,
      templateId: args.templateId,
      subject: args.subject,
      body: args.body,
      toEmail: args.toEmail,
      ccEmails: args.ccEmails,
      bccEmails: args.bccEmails,
      sentByUserId: user._id,
      status: args.status ?? "CONCEPT",
    });
  },
});

// Internal mutation to mark communication as sent
export const markAsSent = internalMutation({
  args: {
    communicationId: v.id("communications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.communicationId, {
      status: "VERZONDEN",
      sentAt: new Date().toISOString(),
    });
  },
});

// Internal mutation to mark communication as failed
export const markAsFailed = internalMutation({
  args: {
    communicationId: v.id("communications"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.communicationId, {
      status: "MISLUKT",
      errorMessage: args.errorMessage,
    });
  },
});

// Internal mutation for creating communication from action context
export const createInternal = internalMutation({
  args: {
    orderId: v.optional(v.id("orders")),
    projectId: v.optional(v.id("projects")),
    contactId: v.optional(v.id("contacts")),
    companyId: v.optional(v.id("companies")),
    type: v.union(
      v.literal("EMAIL"),
      v.literal("SMS"),
      v.literal("WHATSAPP"),
      v.literal("BRIEF"),
    ),
    templateId: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    toEmail: v.optional(v.string()),
    ccEmails: v.optional(v.array(v.string())),
    status: v.union(
      v.literal("CONCEPT"),
      v.literal("VERZONDEN"),
      v.literal("MISLUKT"),
      v.literal("GEOPEND"),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("communications", {
      orderId: args.orderId,
      projectId: args.projectId,
      contactId: args.contactId,
      companyId: args.companyId,
      type: args.type,
      templateId: args.templateId,
      subject: args.subject,
      body: args.body,
      toEmail: args.toEmail,
      ccEmails: args.ccEmails,
      status: args.status,
    });
  },
});

// Internal query to get template by slug (for use in actions)
export const getTemplateBySlug = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

export const sendEmail = action({
  args: {
    templateSlug: v.string(),
    toEmail: v.string(),
    data: v.any(),
    orderId: v.optional(v.id("orders")),
    contactId: v.optional(v.id("contacts")),
    companyId: v.optional(v.id("companies")),
    projectId: v.optional(v.id("projects")),
    ccEmails: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ success: boolean; communicationId?: string; error?: string }> => {
    // 1. Get template via internal query
    const template = await ctx.runQuery(internal.communications.getTemplateBySlug, {
      slug: args.templateSlug,
    });

    if (!template) {
      throw new Error(`Template "${args.templateSlug}" niet gevonden.`);
    }

    if (!template.isActive) {
      throw new Error(`Template "${args.templateSlug}" is niet actief.`);
    }

    // 2. Render template with data
    const placeholderData = args.data as Record<string, string>;
    const renderedSubject = renderTemplate(template.subject, placeholderData);
    const renderedBody = renderTemplate(template.body, placeholderData);

    // 3. Create communication record as CONCEPT first
    const communicationId = await ctx.runMutation(
      internal.communications.createInternal,
      {
        orderId: args.orderId,
        projectId: args.projectId,
        contactId: args.contactId,
        companyId: args.companyId,
        type: "EMAIL" as const,
        templateId: template._id,
        subject: renderedSubject,
        body: renderedBody,
        toEmail: args.toEmail,
        ccEmails: args.ccEmails,
        status: "CONCEPT" as const,
      },
    );

    // 4. TODO: Send email via Brevo/Resend/etc.
    // For now, we mark it as sent immediately
    try {
      // Here you would integrate with an email provider:
      // await sendViaBrevo({ to: args.toEmail, subject: renderedSubject, body: renderedBody });

      await ctx.runMutation(internal.communications.markAsSent, {
        communicationId,
      });

      return { success: true, communicationId };
    } catch (error) {
      await ctx.runMutation(internal.communications.markAsFailed, {
        communicationId,
        errorMessage: error instanceof Error ? error.message : "Onbekende fout bij verzenden",
      });
      return { success: false, communicationId, error: "Verzenden mislukt" };
    }
  },
});

// ============================================================================
// SEED DEFAULT TEMPLATES
// ============================================================================

export const seedDefaultTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);

    // Check if templates already exist
    const existing = await ctx.db.query("emailTemplates").take(1);
    if (existing.length > 0) {
      return { seeded: false, message: "Templates bestaan al." };
    }

    const defaults = [
      {
        name: "Bevestiging afspraak energielabel",
        slug: "appointment-confirmed",
        subject: "Bevestiging afspraak energielabel - {{adres}}",
        body: `Beste {{contact_naam}},

Hierbij bevestigen wij uw afspraak voor het opnemen van een energielabel.

Adres: {{adres}}
Datum: {{datum}}
Tijdstip: {{tijdstip}}
Adviseur: {{adviseur}}

Graag vragen wij u om aanwezig te zijn op het afgesproken tijdstip. Zorg ervoor dat alle ruimtes toegankelijk zijn, inclusief zolder en kruipruimte (indien aanwezig).

Heeft u vragen of wilt u de afspraak wijzigen? Neem dan contact met ons op.

Met vriendelijke groet,
VastVooruit
{{referentie}}`,
        triggerEvent: "APPOINTMENT_CONFIRMED" as const,
        isActive: true,
      },
      {
        name: "Energielabel gereed",
        slug: "label-delivered",
        subject: "Uw energielabel is gereed - {{adres}}",
        body: `Beste {{contact_naam}},

Goed nieuws! Het energielabel voor uw woning is gereed en geregistreerd bij RVO.

Adres: {{adres}}
Energielabel: {{energielabel}}
Referentie: {{referentie}}

U kunt uw energielabel terugvinden op www.ep-online.nl.

Heeft u vragen over het resultaat of wilt u advies over verduurzaming? Neem gerust contact met ons op.

Met vriendelijke groet,
VastVooruit`,
        triggerEvent: "LABEL_DELIVERED" as const,
        isActive: true,
      },
      {
        name: "Offerte VastVooruit",
        slug: "quote-sent",
        subject: "Offerte {{referentie}} - VastVooruit",
        body: `Beste {{contact_naam}},

Hierbij ontvangt u onze offerte voor de volgende werkzaamheden:

Adres: {{adres}}
Product: {{product}}
Bedrag: {{bedrag_excl}} excl. BTW ({{bedrag_incl}} incl. BTW)
Referentie: {{referentie}}

Deze offerte is geldig tot {{geldig_tot}}.

Wij hopen u hiermee een passend aanbod te doen. Bij akkoord kunt u de offerte bevestigen door te reageren op deze email.

Met vriendelijke groet,
VastVooruit`,
        triggerEvent: "QUOTE_SENT" as const,
        isActive: true,
      },
      {
        name: "Factuur VastVooruit",
        slug: "invoice-sent",
        subject: "Factuur {{referentie}} - VastVooruit",
        body: `Beste {{contact_naam}},

Hierbij ontvangt u de factuur voor de uitgevoerde werkzaamheden.

Factuurnummer: {{referentie}}
Bedrag: {{bedrag_excl}} excl. BTW ({{bedrag_incl}} incl. BTW)
Vervaldatum: {{vervaldatum}}

Wij verzoeken u het bedrag voor de vervaldatum over te maken.

Met vriendelijke groet,
VastVooruit`,
        triggerEvent: "INVOICE_SENT" as const,
        isActive: true,
      },
      {
        name: "Herinnering openstaande factuur",
        slug: "payment-reminder",
        subject: "Herinnering: openstaande factuur {{referentie}}",
        body: `Beste {{contact_naam}},

Wij willen u vriendelijk herinneren aan de openstaande factuur:

Factuurnummer: {{referentie}}
Bedrag: {{bedrag_incl}} incl. BTW
Oorspronkelijke vervaldatum: {{vervaldatum}}

Wij verzoeken u het bedrag zo spoedig mogelijk over te maken. Mocht u de betaling reeds hebben voldaan, dan kunt u deze herinnering als niet verzonden beschouwen.

Met vriendelijke groet,
VastVooruit`,
        triggerEvent: "PAYMENT_REMINDER" as const,
        isActive: true,
      },
    ];

    for (const template of defaults) {
      await ctx.db.insert("emailTemplates", template);
    }

    return { seeded: true, count: defaults.length };
  },
});
