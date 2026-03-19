"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Plus, Search, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterPills } from "@/components/ui/filter-pills";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

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

const TYPE_FILTER_OPTIONS = [
  { value: null, label: "Alle" },
  { value: "CORPORATIE", label: "Corporatie" },
  { value: "BELEGGER", label: "Belegger" },
  { value: "NIEUWBOUW", label: "Nieuwbouw" },
  { value: "PARTICULIER", label: "Particulier" },
  { value: "MAKELAAR", label: "Makelaar" },
] as const;

const STATUS_FILTER_OPTIONS = [
  { value: null, label: "Alle" },
  { value: "CONCEPT", label: "Concept" },
  { value: "OFFERTE", label: "Offerte" },
  { value: "ACTIEF", label: "Actief" },
  { value: "AFGEROND", label: "Afgerond" },
] as const;

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

// ============================================================================
// Component
// ============================================================================

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const projects = useQuery(api.projects.list, {
    type: typeFilter ?? undefined,
    status: statusFilter ?? undefined,
  });

  const isLoading = projects === undefined;

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!searchQuery) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.referenceCode && p.referenceCode.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projecten</h1>
          <p className="text-sm text-muted-foreground">
            Beheer projecten voor corporaties, beleggers en meer
          </p>
        </div>
        <Button className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          Nieuw project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam of referentie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter pills */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <FilterPills
            options={TYPE_FILTER_OPTIONS}
            value={typeFilter}
            onChange={setTypeFilter}
            storageKey="projects-type"
            label="Type"
          />
          <FilterPills
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            storageKey="projects-status"
            label="Status"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <ProjectsTableSkeleton />
      ) : filteredProjects.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referentie</TableHead>
                <TableHead>Naam</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Opdrachten</TableHead>
                <TableHead className="hidden lg:table-cell">Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project._id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/projects/${project._id}`}
                      className="font-medium text-foreground hover:text-[var(--color-vv-green)] transition-colors"
                    >
                      {project.referenceCode || "\u2014"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/projects/${project._id}`} className="block">
                      <span className="text-foreground">{project.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={PROJECT_TYPE_COLORS[project.type as ProjectType] || PROJECT_TYPE_COLORS.OVERIG}
                    >
                      {PROJECT_TYPE_LABELS[project.type as ProjectType] || project.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge
                      variant="secondary"
                      className={PROJECT_STATUS_COLORS[project.status as ProjectStatus] || PROJECT_STATUS_COLORS.CONCEPT}
                    >
                      {PROJECT_STATUS_LABELS[project.status as ProjectStatus] || project.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {project.totalOrders ?? 0}
                    {project.completedOrders != null && project.totalOrders
                      ? ` (${project.completedOrders} klaar)`
                      : ""}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {project.deadline ? formatDate(project.deadline) : "\u2014"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState hasFilter={!!typeFilter || !!statusFilter || !!searchQuery} />
      )}
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function ProjectsTableSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referentie</TableHead>
            <TableHead>Naam</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="hidden lg:table-cell">Opdrachten</TableHead>
            <TableHead className="hidden lg:table-cell">Deadline</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-36" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
              <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Empty state
// ============================================================================

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card/50 py-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <FolderKanban className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-medium text-foreground">
          {hasFilter ? "Geen projecten gevonden" : "Nog geen projecten"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilter
            ? "Probeer een andere filter of zoekterm"
            : "Maak je eerste project aan om te beginnen"}
        </p>
      </div>
      {!hasFilter && (
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Project aanmaken
        </Button>
      )}
    </div>
  );
}
