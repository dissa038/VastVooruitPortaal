"use client";

import { use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, type OrderStatus } from "@/components/orders/status-badge";
import {
  StatusPipeline,
  getNextStatus,
} from "@/components/orders/status-pipeline";
import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentList } from "@/components/documents/document-list";
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  BuildingIcon,
  FileTextIcon,
  UploadIcon,
  ClockIcon,
  PhoneIcon,
  MailIcon,
  ChevronRightIcon,
  EuroIcon,
  HashIcon,
} from "lucide-react";

// ============================================================================
// Mock data — will be replaced by Convex useQuery
// ============================================================================

type MockOrderDetail = {
  _id: string;
  referenceCode: string;
  status: OrderStatus;
  address: {
    street: string;
    houseNumber: string;
    postcode: string;
    city: string;
    buildingType: string;
    bouwjaar: number | null;
    oppervlakte: number | null;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
    role: string;
  } | null;
  company: {
    name: string;
    type: string;
  } | null;
  adviseur: {
    name: string;
    email: string;
  } | null;
  product: string;
  source: string;
  isNieuwbouw: boolean;
  scheduledDate: string | null;
  opnameDoneAt: string | null;
  completedAt: string | null;
  totalPriceExVat: number | null;
  totalPriceInclVat: number | null;
  notes: string | null;
  documents: {
    _id: string;
    fileName: string;
    category: string;
    uploadedAt: string;
  }[];
  statusHistory: {
    _id: string;
    previousStatus: string | null;
    newStatus: string;
    changedAt: string;
    changedBy: string | null;
    reason: string | null;
  }[];
  _creationTime: number;
};

const MOCK_ORDER: MockOrderDetail = {
  _id: "2",
  referenceCode: "VV-2601-C3D4",
  status: "INGEPLAND",
  address: {
    street: "Hoofdweg",
    houseNumber: "42",
    postcode: "8042 AB",
    city: "Zwolle",
    buildingType: "Rijtjeswoning",
    bouwjaar: 1985,
    oppervlakte: 120,
  },
  contact: {
    name: "Mevrouw Jansen",
    email: "jansen@email.nl",
    phone: "06-12345678",
    role: "Eigenaar",
  },
  company: {
    name: "Woonborg",
    type: "Corporatie",
  },
  adviseur: {
    name: "Jan de Vries",
    email: "jan@vastvooruit.nl",
  },
  product: "Energielabel",
  source: "Portaal",
  isNieuwbouw: false,
  scheduledDate: "2026-03-22",
  opnameDoneAt: null,
  completedAt: null,
  totalPriceExVat: 19500,
  totalPriceInclVat: 23595,
  notes: "Bewoner is doordeweeks thuis na 14:00.",
  documents: [
    {
      _id: "doc1",
      fileName: "opnameformulier_hoofdweg42.pdf",
      category: "OPNAMEFORMULIER",
      uploadedAt: "2026-03-18T10:30:00Z",
    },
    {
      _id: "doc2",
      fileName: "foto_voorgevel.jpg",
      category: "FOTO_BUITEN",
      uploadedAt: "2026-03-18T10:35:00Z",
    },
  ],
  statusHistory: [
    {
      _id: "sh1",
      previousStatus: null,
      newStatus: "NIEUW",
      changedAt: "2026-03-15T09:00:00Z",
      changedBy: "Systeem",
      reason: "Opdracht aangemaakt",
    },
    {
      _id: "sh2",
      previousStatus: "NIEUW",
      newStatus: "INGEPLAND",
      changedAt: "2026-03-16T14:30:00Z",
      changedBy: "Jan de Vries",
      reason: "Afspraak ingepland op 22 maart",
    },
  ],
  _creationTime: Date.now(),
};

// ============================================================================
// Helper: format price (cents to euros)
// ============================================================================

function formatPrice(cents: number | null): string {
  if (cents === null) return "-";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    FOTO_BUITEN: "Foto (buiten)",
    FOTO_BINNEN: "Foto (binnen)",
    OPNAMEFORMULIER: "Opnameformulier",
    ENERGIELABEL_PDF: "Energielabel",
    VERDUURZAMINGSADVIES_PDF: "Verduurzamingsadvies",
    NEN2580_RAPPORT: "NEN2580 Rapport",
    WWS_RAPPORT: "WWS Rapport",
    BENG_BEREKENING: "BENG Berekening",
    BLOWERDOORTEST_RAPPORT: "Blowerdoortest",
    BOUWTEKENING: "Bouwtekening",
    PLATTEGROND: "Plattegrond",
    OVERIG: "Overig",
  };
  return labels[category] ?? category;
}

// ============================================================================
// Next status button labels
// ============================================================================

const NEXT_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  NIEUW: "Inplannen",
  INGEPLAND: "Opname afronden",
  OPNAME_GEDAAN: "Start uitwerking",
  IN_UITWERKING: "Concept gereed",
  CONCEPT_GEREED: "Naar controle",
  CONTROLE: "Registreren",
  GEREGISTREERD: "Afronden",
};

// ============================================================================
// Component
// ============================================================================

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // TODO: Replace with real Convex query
  // const order = useQuery(api.orders.getById, { id });
  const order: MockOrderDetail | undefined = MOCK_ORDER;
  const isLoading = false;

  if (isLoading) {
    return <OrderDetailSkeleton />;
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="text-lg font-medium">Opdracht niet gevonden</h2>
        <p className="text-sm text-muted-foreground">
          De opdracht met ID &quot;{id}&quot; bestaat niet of is verwijderd.
        </p>
        <Link href="/orders">
          <Button variant="outline">
            <ArrowLeftIcon className="size-4" />
            Terug naar opdrachten
          </Button>
        </Link>
      </div>
    );
  }

  const nextStatus = getNextStatus(order.status);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/orders"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" />
          Opdrachten
        </Link>
        <ChevronRightIcon className="size-3.5" />
        <span className="text-foreground">{order.referenceCode}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{order.referenceCode}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {order.address.street} {order.address.houseNumber}, {order.address.postcode}{" "}
            {order.address.city}
          </p>
        </div>
        <div className="flex gap-2">
          {nextStatus && (
            <Button
              onClick={() => {
                // TODO: Call Convex mutation to update status
                console.log("Transition to:", nextStatus);
              }}
            >
              {NEXT_STATUS_LABELS[order.status] ?? "Volgende stap"}
              <ChevronRightIcon className="size-4" />
            </Button>
          )}
          {order.status !== "GEANNULEERD" && order.status !== "AFGEROND" && (
            <Button
              variant="outline"
              onClick={() => {
                // TODO: Call Convex mutation
                console.log("Cancel or hold");
              }}
            >
              On hold
            </Button>
          )}
        </div>
      </div>

      {/* Status pipeline */}
      <Card>
        <CardContent className="pt-2">
          <StatusPipeline currentStatus={order.status} />
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Order details (2 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Order info */}
          <Card>
            <CardHeader>
              <CardTitle>Opdrachtgegevens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow
                  icon={<HashIcon className="size-4" />}
                  label="Referentie"
                  value={order.referenceCode}
                />
                <InfoRow
                  icon={<MapPinIcon className="size-4" />}
                  label="Adres"
                  value={`${order.address.street} ${order.address.houseNumber}`}
                  sub={`${order.address.postcode} ${order.address.city}`}
                />
                <InfoRow
                  icon={<BuildingIcon className="size-4" />}
                  label="Gebouwtype"
                  value={order.address.buildingType}
                  sub={
                    [
                      order.address.bouwjaar ? `Bouwjaar ${order.address.bouwjaar}` : null,
                      order.address.oppervlakte ? `${order.address.oppervlakte}m\u00B2` : null,
                    ]
                      .filter(Boolean)
                      .join(" \u2022 ") || undefined
                  }
                />
                <InfoRow
                  icon={<FileTextIcon className="size-4" />}
                  label="Product"
                  value={order.product}
                />
                <InfoRow
                  icon={<CalendarIcon className="size-4" />}
                  label="Ingepland"
                  value={formatDate(order.scheduledDate)}
                />
                <InfoRow
                  icon={<EuroIcon className="size-4" />}
                  label="Prijs"
                  value={formatPrice(order.totalPriceExVat)}
                  sub={
                    order.totalPriceInclVat
                      ? `${formatPrice(order.totalPriceInclVat)} incl. BTW`
                      : undefined
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact & Company */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Opdrachtgever</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {order.contact && (
                  <>
                    <InfoRow
                      icon={<UserIcon className="size-4" />}
                      label="Contactpersoon"
                      value={order.contact.name}
                      sub={order.contact.role}
                    />
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <MailIcon className="size-3.5 text-muted-foreground" />
                        <a
                          href={`mailto:${order.contact.email}`}
                          className="text-[var(--color-vv-green)] hover:underline"
                        >
                          {order.contact.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <PhoneIcon className="size-3.5 text-muted-foreground" />
                        <a
                          href={`tel:${order.contact.phone}`}
                          className="text-[var(--color-vv-green)] hover:underline"
                        >
                          {order.contact.phone}
                        </a>
                      </div>
                    </div>
                  </>
                )}
                {order.company && (
                  <InfoRow
                    icon={<BuildingIcon className="size-4" />}
                    label="Bedrijf"
                    value={order.company.name}
                    sub={order.company.type}
                  />
                )}
                {order.adviseur && (
                  <InfoRow
                    icon={<UserIcon className="size-4" />}
                    label="Adviseur"
                    value={order.adviseur.name}
                    sub={order.adviseur.email}
                  />
                )}
              </div>

              {order.notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Notities
                    </span>
                    <p className="mt-1 text-sm text-foreground">{order.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Tijdlijn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative flex flex-col gap-0">
                {order.statusHistory
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <div key={entry._id} className="flex gap-3 pb-6 last:pb-0">
                      {/* Dot + line */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-2.5 w-2.5 shrink-0 rounded-full mt-1.5 ${
                            index === 0
                              ? "bg-[var(--color-vv-green)]"
                              : "bg-muted-foreground/30"
                          }`}
                        />
                        {index < order.statusHistory.length - 1 && (
                          <div className="w-px flex-1 bg-muted-foreground/20" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={entry.newStatus as OrderStatus} />
                          {entry.changedBy && (
                            <span className="text-xs text-muted-foreground">
                              door {entry.changedBy}
                            </span>
                          )}
                        </div>
                        {entry.reason && (
                          <p className="text-sm text-muted-foreground">{entry.reason}</p>
                        )}
                        <span className="text-xs text-muted-foreground/60">
                          {formatDateTime(entry.changedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Dossier (1 col) */}
        <div className="flex flex-col gap-6">
          {/* Document upload */}
          <Card>
            <CardHeader>
              <CardTitle>Document uploaden</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUpload orderId={order._id as never} />
            </CardContent>
          </Card>

          {/* Document list */}
          <Card>
            <CardHeader>
              <CardTitle>Dossier</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentList orderId={order._id as never} />
            </CardContent>
          </Card>

          {/* Quick info card */}
          <Card>
            <CardHeader>
              <CardTitle>Samenvatting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aangemaakt</span>
                  <span>
                    {new Date(order._creationTime).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bron</span>
                  <span>{order.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nieuwbouw</span>
                  <span>{order.isNieuwbouw ? "Ja" : "Nee"}</span>
                </div>
                {order.opnameDoneAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Opname gedaan</span>
                    <span>{formatDate(order.opnameDoneAt)}</span>
                  </div>
                )}
                {order.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Afgerond</span>
                    <span>{formatDate(order.completedAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Info row component
// ============================================================================

function InfoRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">{value}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton loading state
// ============================================================================

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-4 w-4" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
