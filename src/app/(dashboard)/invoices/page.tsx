"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  StatusBadge,
  invoiceStatusVariants,
} from "@/components/shared/status-badge";
import { formatCurrency } from "@/components/shared/currency";
import { Plus, AlertTriangle } from "lucide-react";

// TODO: Replace with useQuery(api.invoices.list) when Convex functions are ready
type Invoice = {
  _id: string;
  referenceCode: string;
  clientName: string;
  totalInclVat: number;
  status: string;
  invoiceDate: string;
  dueDate: string;
  paidAt?: string;
};

const MOCK_INVOICES: Invoice[] = [
  {
    _id: "1",
    referenceCode: "FAC-2026-0087",
    clientName: "Woonbron Corporatie",
    totalInclVat: 296450,
    status: "BETAALD",
    invoiceDate: "2026-02-15",
    dueDate: "2026-03-15",
    paidAt: "2026-03-12",
  },
  {
    _id: "2",
    referenceCode: "FAC-2026-0088",
    clientName: "De Hypotheker Zwolle",
    totalInclVat: 39325,
    status: "VERSTUURD",
    invoiceDate: "2026-03-01",
    dueDate: "2026-03-31",
  },
  {
    _id: "3",
    referenceCode: "FAC-2026-0089",
    clientName: "Familie Bakker",
    totalInclVat: 18150,
    status: "CONCEPT",
    invoiceDate: "2026-03-18",
    dueDate: "2026-04-18",
  },
  {
    _id: "4",
    referenceCode: "FAC-2026-0085",
    clientName: "Van Dijk Vastgoed",
    totalInclVat: 125400,
    status: "HERINNERING",
    invoiceDate: "2026-01-10",
    dueDate: "2026-02-10",
  },
  {
    _id: "5",
    referenceCode: "FAC-2025-0421",
    clientName: "Bouwgroep Oost",
    totalInclVat: 54000,
    status: "ONINBAAR",
    invoiceDate: "2025-09-01",
    dueDate: "2025-10-01",
  },
];

const STATUS_FILTERS = [
  { value: "ALLE", label: "Alle" },
  { value: "CONCEPT", label: "Concept" },
  { value: "VERSTUURD", label: "Verstuurd" },
  { value: "BETAALD", label: "Betaald" },
  { value: "HERINNERING", label: "Herinnering" },
  { value: "ONINBAAR", label: "Oninbaar" },
] as const;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.floor(
    (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

function AgingIndicator({
  dueDate,
  status,
}: {
  dueDate: string;
  status: string;
}) {
  // Only show for unpaid invoices
  if (status === "BETAALD" || status === "CONCEPT" || status === "ONINBAAR") {
    return null;
  }

  const daysOverdue = getDaysOverdue(dueDate);

  if (daysOverdue <= 0) {
    return (
      <span className="text-xs text-muted-foreground">
        nog {Math.abs(daysOverdue)}{" "}
        {Math.abs(daysOverdue) === 1 ? "dag" : "dagen"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
      <AlertTriangle className="size-3" />
      {daysOverdue} {daysOverdue === 1 ? "dag" : "dagen"} te laat
    </span>
  );
}

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState("ALLE");

  // TODO: const invoices = useQuery(api.invoices.list, { status: ... });
  const invoices = MOCK_INVOICES;

  const filtered =
    statusFilter === "ALLE"
      ? invoices
      : invoices.filter((i) => i.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Facturen</h1>
          <p className="text-sm text-muted-foreground">
            Beheer facturen en betalingen
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          Nieuwe factuur
        </Button>
      </div>

      {/* Status filters */}
      <Tabs
        defaultValue="ALLE"
        onValueChange={(value) => setStatusFilter(value as string)}
      >
        <TabsList variant="line">
          {STATUS_FILTERS.map((filter) => (
            <TabsTrigger key={filter.value} value={filter.value}>
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referentie</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead className="text-right">Bedrag (incl. BTW)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Factuurdatum</TableHead>
                <TableHead>Vervaldatum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Geen facturen gevonden
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((invoice) => (
                  <TableRow key={invoice._id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      {invoice.referenceCode}
                    </TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(invoice.totalInclVat)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={invoice.status}
                        variants={invoiceStatusVariants}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.invoiceDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground">
                          {formatDate(invoice.dueDate)}
                        </span>
                        <AgingIndicator
                          dueDate={invoice.dueDate}
                          status={invoice.status}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
