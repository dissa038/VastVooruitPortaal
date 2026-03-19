"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import type { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  FileText,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyForm } from "@/components/companies/company-form";

const typeLabels: Record<string, string> = {
  CORPORATIE: "Corporatie",
  BELEGGER: "Belegger",
  MAKELAARSKANTOOR: "Makelaarskantoor",
  AANNEMER: "Aannemer",
  BOUWBEDRIJF: "Bouwbedrijf",
  BANK: "Bank",
  MONUMENTENSTICHTING: "Monumentenstichting",
  VASTGOEDBEHEERDER: "Vastgoedbeheerder",
  PARTNER: "Partner",
  OVERIG: "Overig",
};

const roleLabels: Record<string, string> = {
  EIGENAAR: "Eigenaar",
  HUURDER: "Huurder",
  OPDRACHTGEVER: "Opdrachtgever",
  BEWONER: "Bewoner",
  CONTACTPERSOON: "Contactpersoon",
  MAKELAAR: "Makelaar",
  AANNEMER_CONTACT: "Aannemer contact",
  OVERIG: "Overig",
};

const projectStatusLabels: Record<string, string> = {
  CONCEPT: "Concept",
  OFFERTE: "Offerte",
  ACTIEF: "Actief",
  AFGEROND: "Afgerond",
  GEANNULEERD: "Geannuleerd",
};

const invoiceStatusLabels: Record<string, string> = {
  CONCEPT: "Concept",
  VERSTUURD: "Verstuurd",
  BETAALD: "Betaald",
  HERINNERING: "Herinnering",
  ONINBAAR: "Oninbaar",
};

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const rawId = params.id as string;
  const isValidId = typeof rawId === "string" && rawId.length > 10 && !rawId.includes(" ");
  const companyId = rawId as Id<"companies">;

  const company = useQuery(api.companies.getById, isValidId ? { id: companyId } : "skip");

  if (isValidId && company === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4 rounded-lg border bg-card p-4 md:p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  if (!isValidId || !company) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">Bedrijf niet gevonden</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/companies")}
        >
          Terug naar bedrijven
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/companies")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{company.name}</h1>
              <Badge variant="secondary">
                {typeLabels[company.type] || company.type}
              </Badge>
            </div>
            {company.hasContract && (
              <Badge variant="default" className="mt-1">
                Contract actief
              </Badge>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" data-icon="inline-start" />
          Bewerken
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overzicht">
        <TabsList>
          <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
          <TabsTrigger value="contacten">
            Contacten ({company.contacts.length})
          </TabsTrigger>
          <TabsTrigger value="projecten">
            Projecten ({company.projects.length})
          </TabsTrigger>
          <TabsTrigger value="facturen">
            Facturen ({company.invoices.length})
          </TabsTrigger>
        </TabsList>

        {/* Overzicht tab */}
        <TabsContent value="overzicht">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* General info */}
            <div className="rounded-lg border bg-card p-4 md:p-6">
              <h2 className="text-lg font-medium mb-4">Bedrijfsgegevens</h2>
              <dl className="space-y-3">
                {company.kvkNumber && (
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        KvK-nummer
                      </dt>
                      <dd className="text-sm">{company.kvkNumber}</dd>
                    </div>
                  </div>
                )}
                {company.vatNumber && (
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        BTW-nummer
                      </dt>
                      <dd className="text-sm">{company.vatNumber}</dd>
                    </div>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-sm text-muted-foreground">Email</dt>
                      <dd className="text-sm">
                        <a
                          href={`mailto:${company.email}`}
                          className="hover:underline"
                        >
                          {company.email}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        Telefoon
                      </dt>
                      <dd className="text-sm">
                        <a
                          href={`tel:${company.phone}`}
                          className="hover:underline"
                        >
                          {company.phone}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        Website
                      </dt>
                      <dd className="text-sm">
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {company.website}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
                {(company.address || company.postcode || company.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-sm text-muted-foreground">Adres</dt>
                      <dd className="text-sm">
                        {company.address && <div>{company.address}</div>}
                        {(company.postcode || company.city) && (
                          <div>
                            {[company.postcode, company.city]
                              .filter(Boolean)
                              .join(" ")}
                          </div>
                        )}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
              {company.notes && (
                <div className="mt-4 rounded-md bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    {company.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Billing info */}
            <div className="space-y-6">
              <div className="rounded-lg border bg-card p-4 md:p-6">
                <h2 className="text-lg font-medium mb-4">Facturatiegegevens</h2>
                <dl className="space-y-3">
                  {company.invoiceEmail && (
                    <div className="flex items-start gap-3">
                      <CreditCard className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div>
                        <dt className="text-sm text-muted-foreground">
                          Factuur email
                        </dt>
                        <dd className="text-sm">{company.invoiceEmail}</dd>
                      </div>
                    </div>
                  )}
                  {(company.invoiceAddress ||
                    company.invoicePostcode ||
                    company.invoiceCity) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div>
                        <dt className="text-sm text-muted-foreground">
                          Factuuradres
                        </dt>
                        <dd className="text-sm">
                          {company.invoiceAddress && (
                            <div>{company.invoiceAddress}</div>
                          )}
                          {(company.invoicePostcode || company.invoiceCity) && (
                            <div>
                              {[company.invoicePostcode, company.invoiceCity]
                                .filter(Boolean)
                                .join(" ")}
                            </div>
                          )}
                        </dd>
                      </div>
                    </div>
                  )}
                  {company.paymentTermDays && (
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        Betalingstermijn
                      </dt>
                      <dd className="text-sm">
                        {company.paymentTermDays} dagen
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Contract info */}
              <div className="rounded-lg border bg-card p-4 md:p-6">
                <h2 className="text-lg font-medium mb-4">Contract</h2>
                {company.hasContract ? (
                  <dl className="space-y-2">
                    {company.contractStartDate && (
                      <div>
                        <dt className="text-sm text-muted-foreground">
                          Startdatum
                        </dt>
                        <dd className="text-sm">
                          {company.contractStartDate}
                        </dd>
                      </div>
                    )}
                    {company.contractEndDate && (
                      <div>
                        <dt className="text-sm text-muted-foreground">
                          Einddatum
                        </dt>
                        <dd className="text-sm">{company.contractEndDate}</dd>
                      </div>
                    )}
                    {company.contractNotes && (
                      <div className="mt-2 rounded-md bg-muted p-3">
                        <p className="text-sm text-muted-foreground">
                          {company.contractNotes}
                        </p>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Geen actief contract
                  </p>
                )}
              </div>

              {/* Account manager */}
              {company.accountManager && (
                <div className="rounded-lg border bg-card p-4 md:p-6">
                  <h2 className="text-lg font-medium mb-4">Accountmanager</h2>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {company.accountManager.firstName}{" "}
                        {company.accountManager.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {company.accountManager.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Contacten tab */}
        <TabsContent value="contacten">
          <div className="rounded-lg border bg-card">
            {company.contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">
                  Geen contactpersonen
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Er zijn nog geen contactpersonen aan dit bedrijf gekoppeld
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Email
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Telefoon
                    </TableHead>
                    <TableHead>Rol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.contacts.map((contact) => (
                    <TableRow key={contact._id}>
                      <TableCell>
                        <Link
                          href={`/contacts/${contact._id}`}
                          className="font-medium hover:underline"
                        >
                          {[contact.firstName, contact.lastName]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {contact.email || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {contact.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {roleLabels[contact.role] || contact.role}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Projecten tab */}
        <TabsContent value="projecten">
          <div className="rounded-lg border bg-card">
            {company.projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">Geen projecten</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Er zijn nog geen projecten aan dit bedrijf gekoppeld
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Type
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Opdrachten
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.projects.map((project) => (
                    <TableRow key={project._id}>
                      <TableCell>
                        <Link
                          href={`/projects/${project._id}`}
                          className="font-medium hover:underline"
                        >
                          {project.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {projectStatusLabels[project.status] ||
                            project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {project.type}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {project.completedOrders ?? 0}/
                        {project.totalOrders ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Facturen tab */}
        <TabsContent value="facturen">
          <div className="rounded-lg border bg-card">
            {company.invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">Geen facturen</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Er zijn nog geen facturen voor dit bedrijf
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referentie</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Datum
                    </TableHead>
                    <TableHead className="hidden sm:table-cell text-right">
                      Bedrag incl. BTW
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.invoices.map((invoice) => (
                    <TableRow key={invoice._id}>
                      <TableCell>
                        <Link
                          href={`/invoices/${invoice._id}`}
                          className="font-medium hover:underline"
                        >
                          {invoice.referenceCode}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.status === "BETAALD"
                              ? "default"
                              : invoice.status === "ONINBAAR"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {invoiceStatusLabels[invoice.status] ||
                            invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {invoice.invoiceDate}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right text-muted-foreground">
                        {new Intl.NumberFormat("nl-NL", {
                          style: "currency",
                          currency: "EUR",
                        }).format(invoice.totalInclVat / 100)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit form */}
      <CompanyForm
        open={editOpen}
        onOpenChange={setEditOpen}
        company={company}
      />
    </div>
  );
}
