"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Search, HardHat, InboxIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================================
// Constants
// ============================================================================

const PROJECT_STATUS_LABELS: Record<string, string> = {
  CONCEPT: "Concept",
  OFFERTE: "Offerte",
  ACTIEF: "Actief",
  AFGEROND: "Afgerond",
  GEANNULEERD: "Geannuleerd",
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  CONCEPT: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
  OFFERTE: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  ACTIEF: "bg-green-500/15 text-green-600 dark:text-green-400",
  AFGEROND: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  GEANNULEERD: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const STATUS_FILTERS: { label: string; value: string | "ALL" }[] = [
  { label: "Alle", value: "ALL" },
  { label: "Actief", value: "ACTIEF" },
  { label: "Concept", value: "CONCEPT" },
  { label: "Afgerond", value: "AFGEROND" },
];

// ============================================================================
// Component
// ============================================================================

export default function NieuwbouwPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const projects = useQuery(api.nieuwbouw.list, {});
  const isLoading = projects === undefined;

  type NieuwbouwProject = NonNullable<typeof projects>[number];

  const filteredProjects = useMemo((): NieuwbouwProject[] => {
    if (!projects) return [];
    let result: NieuwbouwProject[] = [...projects];

    if (statusFilter !== "ALL") {
      result = result.filter((p: NieuwbouwProject) => p.projectStatus === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p: NieuwbouwProject) =>
          p.projectName.toLowerCase().includes(q) ||
          p.aannemerName.toLowerCase().includes(q) ||
          (p.woningType && p.woningType.toLowerCase().includes(q))
      );
    }

    return result;
  }, [projects, searchQuery, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Nieuwbouw</h1>
          <p className="text-sm text-muted-foreground">
            Beheer nieuwbouwprojecten en dossiervorming
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op projectnaam, aannemer of woningtype..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
              className="shrink-0"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <NieuwbouwTableSkeleton />
      ) : filteredProjects.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projectnaam</TableHead>
                <TableHead>Aannemer</TableHead>
                <TableHead className="hidden md:table-cell">Woningtype</TableHead>
                <TableHead className="hidden lg:table-cell">Woningen</TableHead>
                <TableHead>Compleetheid</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project: NieuwbouwProject) => (
                <TableRow key={project._id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/nieuwbouw/${project._id}`}
                      className="font-medium text-foreground hover:text-[var(--color-vv-green)] transition-colors"
                    >
                      {project.projectName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.aannemerName}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {project.woningType ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {project.aantalWoningen ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#14AF52] transition-all"
                          style={{ width: `${project.completenessPercentage ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {project.completenessPercentage ?? 0}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant="secondary"
                      className={PROJECT_STATUS_COLORS[project.projectStatus] ?? PROJECT_STATUS_COLORS.CONCEPT}
                    >
                      {PROJECT_STATUS_LABELS[project.projectStatus] ?? project.projectStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState hasFilter={statusFilter !== "ALL" || !!searchQuery} />
      )}
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function NieuwbouwTableSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Projectnaam</TableHead>
            <TableHead>Aannemer</TableHead>
            <TableHead className="hidden md:table-cell">Woningtype</TableHead>
            <TableHead className="hidden lg:table-cell">Woningen</TableHead>
            <TableHead>Compleetheid</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
              <TableCell><Skeleton className="h-2 w-16 rounded-full" /></TableCell>
              <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
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
        {hasFilter ? (
          <InboxIcon className="h-6 w-6 text-muted-foreground" />
        ) : (
          <HardHat className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="text-center">
        <h3 className="text-sm font-medium text-foreground">
          {hasFilter ? "Geen projecten gevonden" : "Nog geen nieuwbouwprojecten"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilter
            ? "Probeer een andere filter of zoekterm"
            : "Nieuwbouwprojecten verschijnen hier zodra ze worden aangemaakt"}
        </p>
      </div>
    </div>
  );
}
