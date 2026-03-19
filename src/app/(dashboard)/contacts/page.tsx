"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
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
import { ContactForm } from "@/components/contacts/contact-form";

const ROLE_OPTIONS = [
  { value: "EIGENAAR", label: "Eigenaar" },
  { value: "HUURDER", label: "Huurder" },
  { value: "OPDRACHTGEVER", label: "Opdrachtgever" },
  { value: "BEWONER", label: "Bewoner" },
  { value: "CONTACTPERSOON", label: "Contactpersoon" },
  { value: "MAKELAAR", label: "Makelaar" },
  { value: "AANNEMER_CONTACT", label: "Aannemer contact" },
  { value: "OVERIG", label: "Overig" },
] as const;

const roleLabels: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label])
);

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);

  const contacts = useQuery(api.contacts.list, {
    searchLastName: search.length > 0 ? search : undefined,
    role: roleFilter,
  });

  const isLoading = contacts === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contacten</h1>
          <p className="text-sm text-muted-foreground">
            Beheer al je contactpersonen op een plek
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" data-icon="inline-start" />
          Nieuw contact
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op achternaam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={roleFilter ?? ""}
          onValueChange={(val) =>
            setRoleFilter(!val || val === "" ? undefined : val)
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Alle rollen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle rollen</SelectItem>
            {ROLE_OPTIONS.map((opt) => (
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
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden sm:table-cell">Telefoon</TableHead>
              <TableHead className="hidden lg:table-cell">Bedrijf</TableHead>
              <TableHead>Rol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                </TableRow>
              ))
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-3 text-sm font-medium">Geen contacten gevonden</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {search || roleFilter
                        ? "Pas je zoekopdracht of filters aan"
                        : "Voeg je eerste contact toe om te beginnen"}
                    </p>
                    {!search && !roleFilter && (
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setFormOpen(true)}>
                        <Plus className="h-4 w-4" data-icon="inline-start" />
                        Contact toevoegen
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact._id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/contacts/${contact._id}`} className="font-medium hover:underline">
                      {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "\u2014"}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {contact.email || "\u2014"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {contact.phone || "\u2014"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {contact.companyName || "\u2014"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleLabels[contact.role] || contact.role}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ContactForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
