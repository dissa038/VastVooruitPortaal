"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import type { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  InboxIcon,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatCurrencyExVat, orderStatusLabels } from "@/lib/format";

// ============================================================================
// Constants
// ============================================================================

type ProjectType =
  | "CORPORATIE"
  | "BELEGGER"
  | "NIEUWBOUW"
  | "PARTICULIER"
  | "MAKELAAR"
  | "OVERIG";

type ProjectStatus =
  | "CONCEPT"
  | "OFFERTE"
  | "ACTIEF"
  | "AFGEROND"
  | "GEANNULEERD";

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  CORPORATIE: "Corporatie",
  BELEGGER: "Belegger",
  NIEUWBOUW: "Nieuwbouw",
  PARTICULIER: "Particulier",
  MAKELAAR: "Makelaar",
  OVERIG: "Overig",
};

const PROJECT_TYPE_COLORS: Record<ProjectType, string> = {
  CORPORATIE: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  BELEGGER: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  NIEUWBOUW: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  PARTICULIER: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  MAKELAAR: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  OVERIG: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
};

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  CONCEPT: "Concept",
  OFFERTE: "Offerte",
  ACTIEF: "Actief",
  AFGEROND: "Afgerond",
  GEANNULEERD: "Geannuleerd",
};

const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  CONCEPT: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
  OFFERTE: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  ACTIEF: "bg-green-500/15 text-green-600 dark:text-green-400",
  AFGEROND: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  GEANNULEERD: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  NIEUW: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  OFFERTE_VERSTUURD: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  GEACCEPTEERD: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  INGEPLAND: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  OPNAME_GEDAAN: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  IN_UITWERKING: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  CONCEPT_GEREED: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  CONTROLE: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  GEREGISTREERD: "bg-lime-500/15 text-lime-600 dark:text-lime-400",
  VERZONDEN: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  AFGEROND: "bg-green-500/15 text-green-600 dark:text-green-400",
  ON_HOLD: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
  GEANNULEERD: "bg-red-500/15 text-red-600 dark:text-red-400",
  NO_SHOW: "bg-red-500/15 text-red-600 dark:text-red-400",
};

/** Valid next-status transitions per current status */
const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  CONCEPT: ["OFFERTE", "ACTIEF", "GEANNULEERD"],
  OFFERTE: ["ACTIEF", "GEANNULEERD"],
  ACTIEF: ["AFGEROND", "GEANNULEERD"],
  AFGEROND: ["ACTIEF"],
  GEANNULEERD: ["CONCEPT"],
};

// ============================================================================
// Component
// ============================================================================

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as Id<"projects">;

  const project = useQuery(api.projects.getByIdWithDetails, { id: projectId });
  const updateStatus = useMutation(api.projects.updateStatus);

  // Loading state
  if (project === undefined) {
    return <ProjectDetailSkeleton />;
  }

  // Not found
  if (project === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">Project niet gevonden</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/projects")}
        >
          Terug naar projecten
        </Button>
      </div>
    );
  }

  const type = project.type as ProjectType;
  const status = project.status as ProjectStatus;
  const nextStatuses = STATUS_TRANSITIONS[status] || [];

  async function handleStatusChange(newStatus: ProjectStatus) {
    await updateStatus({ id: projectId, status: newStatus });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/projects")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              <Badge
                variant="secondary"
                className={PROJECT_TYPE_COLORS[type] || PROJECT_TYPE_COLORS.OVERIG}
              >
                {PROJECT_TYPE_LABELS[type] || type}
              </Badge>
              <Badge
                variant="secondary"
                className={PROJECT_STATUS_COLORS[status] || PROJECT_STATUS_COLORS.CONCEPT}
              >
                {PROJECT_STATUS_LABELS[status] || status}
              </Badge>
            </div>
            {project.referenceCode && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {project.referenceCode}
              </p>
            )}
          </div>
        </div>

        {/* Status update buttons */}
        {nextStatuses.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((s) => (
              <Button
                key={s}
                variant={s === "GEANNULEERD" ? "destructive" : "outline"}
                size="sm"
                onClick={() => handleStatusChange(s)}
              >
                {PROJECT_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Project info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Projectgegevens</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <DetailRow label="Naam" value={project.name} />
                <DetailRow
                  label="Type"
                  value={PROJECT_TYPE_LABELS[type] || type}
                />
                <DetailRow
                  label="Status"
                  value={PROJECT_STATUS_LABELS[status] || status}
                />
                {project.description && (
                  <DetailRow label="Beschrijving" value={project.description} />
                )}
                {project.startDate && (
                  <DetailRow
                    label="Startdatum"
                    value={formatDate(project.startDate)}
                    icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                  />
                )}
                {project.endDate && (
                  <DetailRow
                    label="Einddatum"
                    value={formatDate(project.endDate)}
                    icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                  />
                )}
                {project.deadline && (
                  <DetailRow
                    label="Deadline"
                    value={formatDate(project.deadline)}
                    icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                  />
                )}
                {project.estimatedOrderCount != null && (
                  <DetailRow
                    label="Geschat aantal opdrachten"
                    value={String(project.estimatedOrderCount)}
                    icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
                  />
                )}
                {project.contractPriceExVat != null && (
                  <DetailRow
                    label="Contractprijs"
                    value={formatCurrencyExVat(project.contractPriceExVat)}
                  />
                )}
                <DetailRow
                  label="Opdrachten"
                  value={`${project.orders.length} totaal${project.completedOrders ? `, ${project.completedOrders} afgerond` : ""}`}
                  icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                />
              </dl>
              {project.notes && (
                <div className="mt-4 rounded-md bg-muted p-3">
                  <p className="text-sm text-muted-foreground">{project.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Company + Contact */}
        <div className="space-y-6">
          {/* Company card */}
          <Card>
            <CardHeader>
              <CardTitle>Opdrachtgever</CardTitle>
            </CardHeader>
            <CardContent>
              {project.company ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <Link
                        href={`/companies/${project.company._id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {project.company.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {project.company.type}
                      </p>
                    </div>
                  </div>
                  {project.company.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${project.company.email}`}
                        className="text-sm hover:underline"
                      >
                        {project.company.email}
                      </a>
                    </div>
                  )}
                  {project.company.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${project.company.phone}`}
                        className="text-sm hover:underline"
                      >
                        {project.company.phone}
                      </a>
                    </div>
                  )}
                  {(project.company.address || project.company.city) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        {project.company.address && <div>{project.company.address}</div>}
                        {(project.company.postcode || project.company.city) && (
                          <div>
                            {[project.company.postcode, project.company.city]
                              .filter(Boolean)
                              .join(" ")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Geen bedrijf gekoppeld
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contact card */}
          <Card>
            <CardHeader>
              <CardTitle>Contactpersoon</CardTitle>
            </CardHeader>
            <CardContent>
              {project.contact ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {[project.contact.firstName, project.contact.lastName]
                          .filter(Boolean)
                          .join(" ") || "\u2014"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {project.contact.role}
                      </p>
                    </div>
                  </div>
                  {project.contact.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${project.contact.email}`}
                        className="text-sm hover:underline"
                      >
                        {project.contact.email}
                      </a>
                    </div>
                  )}
                  {project.contact.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${project.contact.phone}`}
                        className="text-sm hover:underline"
                      >
                        {project.contact.phone}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Geen contactpersoon gekoppeld
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Orders table */}
      <div>
        <h2 className="text-lg font-medium mb-3">
          Opdrachten ({project.orders.length})
        </h2>
        {project.orders.length > 0 ? (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referentie</TableHead>
                  <TableHead>Adres</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Ingepland</TableHead>
                  <TableHead className="hidden lg:table-cell">Afgerond</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.orders.map((order) => (
                  <TableRow key={order._id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/orders/${order._id}`}
                        className="font-medium text-foreground hover:text-[var(--color-vv-green)] transition-colors"
                      >
                        {order.referenceCode}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/orders/${order._id}`} className="block">
                        <span className="text-foreground">{order.address}</span>
                        {order.city && (
                          <span className="block text-xs text-muted-foreground">
                            {order.postcode ? `${order.postcode} ` : ""}
                            {order.city}
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={ORDER_STATUS_COLORS[order.status] || ""}
                      >
                        {orderStatusLabels[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {order.scheduledDate
                        ? formatDate(order.scheduledDate)
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {order.completedAt
                        ? formatDate(order.completedAt)
                        : "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card/50 py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <InboxIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-medium text-foreground">
                Nog geen opdrachten
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Er zijn nog geen opdrachten aan dit project gekoppeld
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Detail row helper
// ============================================================================

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className={icon ? "" : "w-full"}>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="text-sm">{value}</dd>
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4 md:p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4 md:p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="rounded-lg border bg-card p-4 md:p-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
      </div>
    </div>
  );
}
