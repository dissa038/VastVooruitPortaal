"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  SparklesIcon,
  MailIcon,
  TrashIcon,
} from "lucide-react";
import type { Id, Doc } from "../../../../../convex/_generated/dataModel";

// ============================================================================
// Constants
// ============================================================================

const TRIGGER_LABELS: Record<string, string> = {
  APPOINTMENT_CONFIRMED: "Afspraak bevestigd",
  APPOINTMENT_REMINDER: "Afspraak herinnering",
  LABEL_DELIVERED: "Label geleverd",
  QUOTE_SENT: "Offerte verstuurd",
  INVOICE_SENT: "Factuur verstuurd",
  PAYMENT_REMINDER: "Betalingsherinnering",
  STATUS_UPDATE: "Status update",
  NIEUWBOUW_ACCESS: "Nieuwbouw toegang",
  CUSTOM: "Aangepast",
};

const TRIGGER_COLORS: Record<string, string> = {
  APPOINTMENT_CONFIRMED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  APPOINTMENT_REMINDER: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LABEL_DELIVERED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  QUOTE_SENT: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  INVOICE_SENT: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  PAYMENT_REMINDER: "bg-red-500/20 text-red-400 border-red-500/30",
  STATUS_UPDATE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  NIEUWBOUW_ACCESS: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  CUSTOM: "text-muted-foreground border-muted",
};

const AVAILABLE_PLACEHOLDERS = [
  { group: "Contact", items: ["contact_naam", "contact_email", "contact_telefoon"] },
  { group: "Adres", items: ["adres", "postcode", "stad"] },
  { group: "Afspraak", items: ["datum", "tijdstip", "adviseur"] },
  { group: "Order", items: ["referentie", "product", "energielabel", "order_status"] },
  { group: "Financieel", items: ["bedrag_excl", "bedrag_incl", "vervaldatum", "geldig_tot"] },
];

const SAMPLE_DATA: Record<string, string> = {
  contact_naam: "Jan de Vries",
  contact_email: "jan@example.nl",
  contact_telefoon: "06-12345678",
  adres: "Kerkstraat 15, 8321 AE Urk",
  postcode: "8321 AE",
  stad: "Urk",
  datum: "25 maart 2026",
  tijdstip: "10:00",
  adviseur: "Rick Bakker",
  referentie: "VV-2601-A1B2",
  product: "Energielabel Woningbouw",
  energielabel: "B",
  order_status: "Afgerond",
  bedrag_excl: "\u20AC 195,00",
  bedrag_incl: "\u20AC 235,95",
  vervaldatum: "15 april 2026",
  geldig_tot: "1 april 2026",
};

type TriggerEvent =
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_REMINDER"
  | "LABEL_DELIVERED"
  | "QUOTE_SENT"
  | "INVOICE_SENT"
  | "PAYMENT_REMINDER"
  | "STATUS_UPDATE"
  | "NIEUWBOUW_ACCESS"
  | "CUSTOM";

function renderPreview(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return SAMPLE_DATA[key] ?? match;
  });
}

// ============================================================================
// Template form state
// ============================================================================

interface TemplateFormState {
  name: string;
  slug: string;
  subject: string;
  body: string;
  triggerEvent: TriggerEvent;
  isActive: boolean;
}

const EMPTY_FORM: TemplateFormState = {
  name: "",
  slug: "",
  subject: "",
  body: "",
  triggerEvent: "CUSTOM",
  isActive: true,
};

// ============================================================================
// Main page
// ============================================================================

export default function EmailTemplatesPage() {
  const templates = useQuery(api.emailTemplates.list);
  const createTemplate = useMutation(api.emailTemplates.create);
  const updateTemplate = useMutation(api.emailTemplates.update);
  const removeTemplate = useMutation(api.emailTemplates.remove);
  const seedTemplates = useMutation(api.communications.seedDefaultTemplates);

  const [editingId, setEditingId] = useState<Id<"emailTemplates"> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateFormState | null>(null);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const handleEdit = (template: Doc<"emailTemplates">) => {
    setEditingId(template._id);
    setForm({
      name: template.name,
      slug: template.slug,
      subject: template.subject,
      body: template.body,
      triggerEvent: (template.triggerEvent ?? "CUSTOM") as TriggerEvent,
      isActive: template.isActive,
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await updateTemplate({
          id: editingId,
          name: form.name,
          slug: form.slug,
          subject: form.subject,
          body: form.body,
          triggerEvent: form.triggerEvent,
          isActive: form.isActive,
        });
      } else {
        await createTemplate({
          name: form.name,
          slug: form.slug,
          subject: form.subject,
          body: form.body,
          triggerEvent: form.triggerEvent,
          isActive: form.isActive,
        });
      }
      setShowForm(false);
      setEditingId(null);
    } catch {
      // Error is shown by Convex
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: Id<"emailTemplates">) => {
    await removeTemplate({ id });
  };

  const handleToggleActive = async (template: Doc<"emailTemplates">) => {
    await updateTemplate({
      id: template._id,
      isActive: !template.isActive,
    });
  };

  const handlePreview = (template: TemplateFormState) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleSeed = async () => {
    await seedTemplates();
  };

  const insertPlaceholder = (placeholder: string) => {
    setForm((prev) => ({
      ...prev,
      body: prev.body + `{{${placeholder}}}`,
    }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/settings"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" />
          Instellingen
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Email-templates</h1>
          <p className="text-sm text-muted-foreground">
            Beheer automatische email-templates met variabelen.
          </p>
        </div>
        <div className="flex gap-2">
          {templates && templates.length === 0 && (
            <Button variant="outline" onClick={handleSeed}>
              <SparklesIcon className="size-4" />
              Standaard templates laden
            </Button>
          )}
          <Button onClick={handleNew}>
            <PlusIcon className="size-4" />
            Nieuwe template
          </Button>
        </div>
      </div>

      {/* Template list */}
      {templates === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/30" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <MailIcon className="size-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">Geen templates</p>
              <p className="text-xs text-muted-foreground">
                Klik op &quot;Standaard templates laden&quot; om de standaard set aan te maken.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template._id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <MailIcon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{template.name}</p>
                      {!template.isActive && (
                        <Badge variant="outline" className="text-muted-foreground border-muted">
                          Inactief
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground font-mono">
                        {template.slug}
                      </span>
                      {template.triggerEvent && (
                        <Badge
                          variant="outline"
                          className={TRIGGER_COLORS[template.triggerEvent] ?? ""}
                        >
                          {TRIGGER_LABELS[template.triggerEvent] ?? template.triggerEvent}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={template.isActive}
                    onCheckedChange={() => handleToggleActive(template)}
                    size="sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      handlePreview({
                        name: template.name,
                        slug: template.slug,
                        subject: template.subject,
                        body: template.body,
                        triggerEvent: (template.triggerEvent ?? "CUSTOM") as TriggerEvent,
                        isActive: template.isActive,
                      })
                    }
                  >
                    <EyeIcon className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleEdit(template)}
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(template._id)}
                  >
                    <TrashIcon className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Template bewerken" : "Nieuwe template"}
            </DialogTitle>
            <DialogDescription>
              Gebruik {"{{placeholder}}"} syntax voor variabelen die automatisch worden ingevuld.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Name + slug */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Naam</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name,
                      ...(editingId ? {} : { slug: generateSlug(name) }),
                    }));
                  }}
                  placeholder="Bijv. Bevestiging afspraak"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="bijv. appointment-confirmed"
                  className="font-mono"
                />
              </div>
            </div>

            {/* Trigger event */}
            <div className="space-y-1.5">
              <Label>Trigger event</Label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, triggerEvent: key as TriggerEvent }))
                    }
                    className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                      form.triggerEvent === key
                        ? "border-[var(--color-vv-green)] bg-[var(--color-vv-green)]/10 text-[var(--color-vv-green)]"
                        : "border-muted hover:border-foreground/20"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label>Onderwerp</Label>
              <Input
                value={form.subject}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subject: e.target.value }))
                }
                placeholder="Bijv. Bevestiging afspraak energielabel - {{adres}}"
              />
            </div>

            {/* Body + placeholders */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Inhoud</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, body: e.target.value }))
                  }
                  placeholder="Typ hier de email inhoud met {{placeholders}}..."
                  className="min-h-48 font-mono text-xs"
                />
              </div>
              <div className="space-y-3">
                <Label>Variabelen</Label>
                <div className="space-y-3 text-xs">
                  {AVAILABLE_PLACEHOLDERS.map((group) => (
                    <div key={group.group}>
                      <p className="font-medium text-muted-foreground mb-1">
                        {group.group}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {group.items.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => insertPlaceholder(item)}
                            className="rounded border border-muted bg-muted/30 px-1.5 py-0.5 font-mono hover:bg-muted/60 transition-colors"
                          >
                            {`{{${item}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isActive: checked as boolean }))
                }
              />
              <Label>Template is actief</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                handlePreview(form)
              }
            >
              <EyeIcon className="size-4" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.slug}>
              {saving ? "Opslaan..." : editingId ? "Opslaan" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Template preview</DialogTitle>
            <DialogDescription>
              Voorbeeld met fictieve data
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Onderwerp</p>
                  <p className="text-sm font-medium">
                    {renderPreview(previewTemplate.subject)}
                  </p>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">Inhoud</p>
                  <div className="whitespace-pre-wrap text-sm text-foreground">
                    {renderPreview(previewTemplate.body)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
