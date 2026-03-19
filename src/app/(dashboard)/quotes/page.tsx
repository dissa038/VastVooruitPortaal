"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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
  quoteStatusVariants,
} from "@/components/shared/status-badge";
import { formatCurrencyExVat } from "@/components/shared/currency";
import { Plus } from "lucide-react";

// TODO: Replace with useQuery(api.quotes.list) when Convex functions are ready
type Quote = {
  _id: string;
  referenceCode: string;
  clientName: string;
  totalExVat: number;
  status: string;
  sentAt?: string;
  validUntil?: string;
  _creationTime: number;
};

const MOCK_QUOTES: Quote[] = [
  {
    _id: "1",
    referenceCode: "OFF-2026-0042",
    clientName: "Woonbron Corporatie",
    totalExVat: 245000,
    status: "VERSTUURD",
    sentAt: "2026-03-15",
    validUntil: "2026-04-15",
    _creationTime: Date.now(),
  },
  {
    _id: "2",
    referenceCode: "OFF-2026-0041",
    clientName: "De Hypotheker Zwolle",
    totalExVat: 32500,
    status: "GEACCEPTEERD",
    sentAt: "2026-03-10",
    validUntil: "2026-04-10",
    _creationTime: Date.now(),
  },
  {
    _id: "3",
    referenceCode: "OFF-2026-0040",
    clientName: "Familie Bakker",
    totalExVat: 15000,
    status: "CONCEPT",
    _creationTime: Date.now(),
  },
  {
    _id: "4",
    referenceCode: "OFF-2026-0039",
    clientName: "Vestia",
    totalExVat: 1850000,
    status: "VERLOPEN",
    sentAt: "2026-01-05",
    validUntil: "2026-02-05",
    _creationTime: Date.now(),
  },
  {
    _id: "5",
    referenceCode: "OFF-2026-0038",
    clientName: "Van der Berg Makelaars",
    totalExVat: 67500,
    status: "AFGEWEZEN",
    sentAt: "2026-02-20",
    validUntil: "2026-03-20",
    _creationTime: Date.now(),
  },
];

const STATUS_FILTERS = [
  { value: "ALLE", label: "Alle" },
  { value: "CONCEPT", label: "Concept" },
  { value: "VERSTUURD", label: "Verstuurd" },
  { value: "GEACCEPTEERD", label: "Geaccepteerd" },
  { value: "VERLOPEN", label: "Verlopen" },
  { value: "AFGEWEZEN", label: "Afgewezen" },
] as const;

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function QuotesPage() {
  const [statusFilter, setStatusFilter] = useState("ALLE");

  // TODO: const quotes = useQuery(api.quotes.list, { status: statusFilter === "ALLE" ? undefined : statusFilter });
  const quotes = MOCK_QUOTES;

  const filtered =
    statusFilter === "ALLE"
      ? quotes
      : quotes.filter((q) => q.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Offertes</h1>
          <p className="text-sm text-muted-foreground">
            Beheer offertes en volg de status
          </p>
        </div>
        <Button className="shrink-0">
          <Plus className="size-4" />
          Nieuwe offerte
        </Button>
      </div>

      {/* Status filters */}
      <Tabs
        defaultValue="ALLE"
        onValueChange={(value) => setStatusFilter(value as string)}
      >
        <div className="overflow-x-auto no-scrollbar">
          <TabsList variant="line">
            {STATUS_FILTERS.map((filter) => (
              <TabsTrigger key={filter.value} value={filter.value}>
                {filter.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referentie</TableHead>
                <TableHead>Klant</TableHead>
                <TableHead className="text-right">Bedrag (excl. BTW)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verstuurd</TableHead>
                <TableHead>Geldig tot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Geen offertes gevonden
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((quote) => (
                  <TableRow key={quote._id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      {quote.referenceCode}
                    </TableCell>
                    <TableCell>{quote.clientName}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrencyExVat(quote.totalExVat)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={quote.status}
                        variants={quoteStatusVariants}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(quote.sentAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(quote.validUntil)}
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
