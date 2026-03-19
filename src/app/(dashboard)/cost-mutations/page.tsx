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
  costMutationStatusVariants,
  costMutationTypeVariants,
} from "@/components/shared/status-badge";
import { formatCurrency } from "@/components/shared/currency";
import { Check, X } from "lucide-react";

// TODO: Replace with useQuery(api.costMutations.list)
type CostMutation = {
  _id: string;
  orderReferenceCode: string;
  type: string;
  description: string;
  amountExVat: number;
  isApproved: boolean;
  approvedAt?: string;
  adviseurName: string;
  status: string; // derived: PENDING | APPROVED | REJECTED
};

const MOCK_MUTATIONS: CostMutation[] = [
  {
    _id: "1",
    orderReferenceCode: "VV-2026-0234",
    type: "MEERWERK",
    description: "Extra kamers (6 i.p.v. 4)",
    amountExVat: 7500,
    isApproved: false,
    adviseurName: "Jan de Vries",
    status: "PENDING",
  },
  {
    _id: "2",
    orderReferenceCode: "VV-2026-0230",
    type: "NO_SHOW",
    description: "Bewoner niet aanwezig bij opname",
    amountExVat: 5000,
    isApproved: false,
    adviseurName: "Pieter Jansen",
    status: "PENDING",
  },
  {
    _id: "3",
    orderReferenceCode: "VV-2026-0228",
    type: "DESTRUCTIEF_ONDERZOEK",
    description: "Isolatie gevel controleren",
    amountExVat: 12500,
    isApproved: true,
    approvedAt: "2026-03-14",
    adviseurName: "Jan de Vries",
    status: "APPROVED",
  },
  {
    _id: "4",
    orderReferenceCode: "VV-2026-0225",
    type: "HERBEZOEK",
    description: "Meterkast niet toegankelijk, herbezoek nodig",
    amountExVat: 7500,
    isApproved: true,
    approvedAt: "2026-03-10",
    adviseurName: "Mark Visser",
    status: "APPROVED",
  },
  {
    _id: "5",
    orderReferenceCode: "VV-2026-0220",
    type: "MINDERWERK",
    description: "WWS niet nodig, alleen label",
    amountExVat: -5000,
    isApproved: true,
    approvedAt: "2026-03-08",
    adviseurName: "Pieter Jansen",
    status: "APPROVED",
  },
  {
    _id: "6",
    orderReferenceCode: "VV-2026-0218",
    type: "TYPE_WIJZIGING",
    description: "Appartement -> twee-onder-een-kap",
    amountExVat: 3500,
    isApproved: false,
    adviseurName: "Mark Visser",
    status: "PENDING",
  },
];

const STATUS_FILTERS = [
  { value: "ALLE", label: "Alle" },
  { value: "PENDING", label: "Te beoordelen" },
  { value: "APPROVED", label: "Goedgekeurd" },
] as const;

export default function CostMutationsPage() {
  const [statusFilter, setStatusFilter] = useState("ALLE");

  // TODO: const mutations = useQuery(api.costMutations.list, { ... });
  const mutations = MOCK_MUTATIONS;

  const filtered =
    statusFilter === "ALLE"
      ? mutations
      : mutations.filter((m) => m.status === statusFilter);

  function handleApprove(id: string) {
    // TODO: useMutation(api.costMutations.approve)
    console.log("Approve", id);
  }

  function handleReject(id: string) {
    // TODO: useMutation(api.costMutations.reject)
    console.log("Reject", id);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Kostenmutaties</h1>
        <p className="text-sm text-muted-foreground">
          Meerwerk, minderwerk en overige kostenmutaties per opdracht
        </p>
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
                {filter.value === "PENDING" && (
                  <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-amber-500/10 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {mutations.filter((m) => m.status === "PENDING").length}
                  </span>
                )}
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
                <TableHead>Opdracht</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Beschrijving</TableHead>
                <TableHead className="text-right">Bedrag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Adviseur</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Geen kostenmutaties gevonden
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((mutation) => (
                  <TableRow key={mutation._id}>
                    <TableCell className="font-medium">
                      {mutation.orderReferenceCode}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={mutation.type}
                        variants={costMutationTypeVariants}
                      />
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {mutation.description}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${mutation.amountExVat < 0 ? "text-destructive" : ""}`}
                    >
                      {mutation.amountExVat < 0 ? "- " : "+ "}
                      {formatCurrency(Math.abs(mutation.amountExVat))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={mutation.status}
                        variants={costMutationStatusVariants}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {mutation.adviseurName}
                    </TableCell>
                    <TableCell className="text-right">
                      {mutation.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleApprove(mutation._id)}
                            title="Goedkeuren"
                          >
                            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleReject(mutation._id)}
                            title="Afwijzen"
                          >
                            <X className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
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
