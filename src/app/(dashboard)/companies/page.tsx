"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { Plus, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { CompanyForm } from "@/components/companies/company-form";

const TYPE_OPTIONS = [
  { value: "CORPORATIE", label: "Corporatie" },
  { value: "BELEGGER", label: "Belegger" },
  { value: "MAKELAARSKANTOOR", label: "Makelaarskantoor" },
  { value: "AANNEMER", label: "Aannemer" },
  { value: "BOUWBEDRIJF", label: "Bouwbedrijf" },
  { value: "BANK", label: "Bank" },
  { value: "MONUMENTENSTICHTING", label: "Monumentenstichting" },
  { value: "VASTGOEDBEHEERDER", label: "Vastgoedbeheerder" },
  { value: "PARTNER", label: "Partner" },
  { value: "OVERIG", label: "Overig" },
] as const;

const typeLabels: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((t) => [t.value, t.label])
);

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);

  const companies = useQuery(api.companies.list, {
    searchName: search.length > 0 ? search : undefined,
    type: typeFilter,
  });

  const isLoading = companies === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bedrijven</h1>
          <p className="text-sm text-muted-foreground">
            Corporaties, makelaars, aannemers en andere bedrijven
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" data-icon="inline-start" />
          Nieuw bedrijf
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op bedrijfsnaam..."
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
              <TableHead className="hidden md:table-cell">KvK</TableHead>
              <TableHead className="hidden sm:table-cell">Telefoon</TableHead>
              <TableHead className="hidden lg:table-cell">Contactpersonen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Building2 className="h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-3 text-sm font-medium">Geen bedrijven gevonden</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {search || typeFilter
                        ? "Pas je zoekopdracht of filters aan"
                        : "Voeg je eerste bedrijf toe om te beginnen"}
                    </p>
                    {!search && !typeFilter && (
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setFormOpen(true)}>
                        <Plus className="h-4 w-4" data-icon="inline-start" />
                        Bedrijf toevoegen
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company._id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/companies/${company._id}`} className="font-medium hover:underline">
                      {company.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{typeLabels[company.type] || company.type}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {company.kvkNumber || "\u2014"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {company.phone || "\u2014"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {company.contactCount}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CompanyForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
