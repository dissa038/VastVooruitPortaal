"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Search, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TYPE_OPTIONS = [
  { value: "MAKELAAR", label: "Makelaar" },
  { value: "BANK", label: "Bank" },
  { value: "VASTGOEDBEHEERDER", label: "Vastgoedbeheerder" },
  { value: "BOUWBEDRIJF", label: "Bouwbedrijf" },
  { value: "HOMEVISUALS", label: "HomeVisuals" },
  { value: "TIMAX", label: "Timax" },
  { value: "OVERIG", label: "Overig" },
] as const;

const typeLabels: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, t.label])
);

export default function IntermediariesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  const intermediaries = useQuery(api.intermediaries.list, {
    search: search.length > 0 ? search : undefined,
    type: typeFilter as any,
  });

  const isLoading = intermediaries === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Tussenpersonen</h1>
        <p className="text-sm text-muted-foreground">
          Makelaars, banken en andere tussenpersonen die opdrachten doorverwijzen
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={typeFilter ?? ""}
          onValueChange={(val) =>
            setTypeFilter(!val || val === "" ? undefined : val)
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Alle types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle types</SelectItem>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden sm:table-cell">Doorverwijzingen</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                </TableRow>
              ))
            ) : intermediaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserCheck className="h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-3 text-sm font-medium">Geen tussenpersonen gevonden</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {search || typeFilter
                        ? "Pas je zoekopdracht of filters aan"
                        : "Er zijn nog geen tussenpersonen aangemaakt"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              intermediaries.map((intermediary) => (
                <TableRow key={intermediary._id}>
                  <TableCell className="font-medium">{intermediary.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{typeLabels[intermediary.type] || intermediary.type}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {intermediary.email || "\u2014"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {intermediary.totalOrdersReferred ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={intermediary.isActive ? "default" : "outline"}>
                      {intermediary.isActive ? "Actief" : "Inactief"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
