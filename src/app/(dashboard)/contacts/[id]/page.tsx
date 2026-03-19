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
  Mail,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactForm } from "@/components/contacts/contact-form";

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

const statusLabels: Record<string, string> = {
  NIEUW: "Nieuw",
  OFFERTE_VERSTUURD: "Offerte verstuurd",
  GEACCEPTEERD: "Geaccepteerd",
  INGEPLAND: "Ingepland",
  OPNAME_GEDAAN: "Opname gedaan",
  IN_UITWERKING: "In uitwerking",
  CONCEPT_GEREED: "Concept gereed",
  CONTROLE: "Controle",
  GEREGISTREERD: "Geregistreerd",
  VERZONDEN: "Verzonden",
  AFGEROND: "Afgerond",
  ON_HOLD: "On hold",
  GEANNULEERD: "Geannuleerd",
  NO_SHOW: "No-show",
};

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const rawId = params.id as string;
  const isValidId = typeof rawId === "string" && rawId.length > 10 && !rawId.includes(" ");
  const contactId = rawId as Id<"contacts">;

  const contact = useQuery(api.contacts.getById, isValidId ? { id: contactId } : "skip");

  if (isValidId && contact === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-lg border bg-card p-4 md:p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-44" />
          </div>
          <div className="space-y-4 rounded-lg border bg-card p-4 md:p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!isValidId || !contact) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">Contact niet gevonden</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/contacts")}
        >
          Terug naar contacten
        </Button>
      </div>
    );
  }

  const fullName =
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
    "Naamloos contact";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/contacts")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{fullName}</h1>
            <Badge variant="secondary" className="mt-1">
              {roleLabels[contact.role] || contact.role}
            </Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" data-icon="inline-start" />
          Bewerken
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Contact info */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4 md:p-6">
            <h2 className="text-lg font-medium mb-4">Contactgegevens</h2>
            <dl className="space-y-3">
              {contact.email && (
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <dt className="text-sm text-muted-foreground">Email</dt>
                    <dd className="text-sm">
                      <a
                        href={`mailto:${contact.email}`}
                        className="hover:underline"
                      >
                        {contact.email}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <dt className="text-sm text-muted-foreground">Telefoon</dt>
                    <dd className="text-sm">
                      <a
                        href={`tel:${contact.phone}`}
                        className="hover:underline"
                      >
                        {contact.phone}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {(contact.address || contact.postcode || contact.city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <dt className="text-sm text-muted-foreground">Adres</dt>
                    <dd className="text-sm">
                      {contact.address && <div>{contact.address}</div>}
                      {(contact.postcode || contact.city) && (
                        <div>
                          {[contact.postcode, contact.city]
                            .filter(Boolean)
                            .join(" ")}
                        </div>
                      )}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
            {contact.notes && (
              <div className="mt-4 rounded-md bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                  {contact.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Company + Orders */}
        <div className="space-y-6">
          {/* Company */}
          {contact.company && (
            <div className="rounded-lg border bg-card p-4 md:p-6">
              <h2 className="text-lg font-medium mb-4">Bedrijf</h2>
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Link
                    href={`/companies/${contact.company._id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {contact.company.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {contact.company.type}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Linked orders */}
          <div className="rounded-lg border bg-card p-4 md:p-6">
            <h2 className="text-lg font-medium mb-4">Gekoppelde opdrachten</h2>
            {contact.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Geen opdrachten gekoppeld aan dit contact
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referentie</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contact.orders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell>
                        <Link
                          href={`/orders/${order._id}`}
                          className="font-medium hover:underline"
                        >
                          {order.referenceCode}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <ContactForm
        open={editOpen}
        onOpenChange={setEditOpen}
        contact={contact}
      />
    </div>
  );
}
