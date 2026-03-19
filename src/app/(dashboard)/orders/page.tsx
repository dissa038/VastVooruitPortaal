"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, type OrderStatus } from "@/components/orders/status-badge";
import { OrderFormSheet } from "@/components/orders/order-form";
import {
  SearchIcon,
  InboxIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// ============================================================================
// Status filter tabs
// ============================================================================

const STATUS_FILTERS: { label: string; value: OrderStatus | "ALL" }[] = [
  { label: "Alle", value: "ALL" },
  { label: "Nieuw", value: "NIEUW" },
  { label: "Ingepland", value: "INGEPLAND" },
  { label: "Opname gedaan", value: "OPNAME_GEDAAN" },
  { label: "In uitwerking", value: "IN_UITWERKING" },
  { label: "Afgerond", value: "AFGEROND" },
];

// ============================================================================
// Mock data — will be replaced by Convex useQuery
// ============================================================================

type MockOrder = {
  _id: string;
  referenceCode: string;
  address: string;
  city: string;
  status: OrderStatus;
  adviseur: string;
  scheduledDate: string | null;
  product: string;
  companyName: string | null;
};

const MOCK_ORDERS: MockOrder[] = [
  {
    _id: "1",
    referenceCode: "VV-2601-A1B2",
    address: "Kerkstraat 15, Staphorst",
    city: "Staphorst",
    status: "NIEUW",
    adviseur: "-",
    scheduledDate: null,
    product: "Energielabel",
    companyName: null,
  },
  {
    _id: "2",
    referenceCode: "VV-2601-C3D4",
    address: "Hoofdweg 42, Zwolle",
    city: "Zwolle",
    status: "INGEPLAND",
    adviseur: "Jan de Vries",
    scheduledDate: "2026-03-22",
    product: "Energielabel",
    companyName: "Woonborg",
  },
  {
    _id: "3",
    referenceCode: "VV-2601-E5F6",
    address: "Dorpsstraat 8a, Meppel",
    city: "Meppel",
    status: "OPNAME_GEDAAN",
    adviseur: "Pieter Bakker",
    scheduledDate: "2026-03-18",
    product: "Verduurzamingsadvies",
    companyName: null,
  },
  {
    _id: "4",
    referenceCode: "VV-2602-G7H8",
    address: "Laan van Meerdervoort 200, Den Haag",
    city: "Den Haag",
    status: "IN_UITWERKING",
    adviseur: "Pieter Bakker",
    scheduledDate: "2026-03-15",
    product: "Energielabel",
    companyName: "Van Dijk Makelaars",
  },
  {
    _id: "5",
    referenceCode: "VV-2602-I9J0",
    address: "Brinklaan 3, Hardenberg",
    city: "Hardenberg",
    status: "AFGEROND",
    adviseur: "Jan de Vries",
    scheduledDate: "2026-03-10",
    product: "NEN2580 Meting",
    companyName: "Lefier",
  },
  {
    _id: "6",
    referenceCode: "VV-2602-K1L2",
    address: "Stationsweg 77, Kampen",
    city: "Kampen",
    status: "NIEUW",
    adviseur: "-",
    scheduledDate: null,
    product: "WWS Puntentelling",
    companyName: null,
  },
  {
    _id: "7",
    referenceCode: "VV-2603-M3N4",
    address: "Burgemeesterstraat 12, Ommen",
    city: "Ommen",
    status: "CONTROLE",
    adviseur: "Jan de Vries",
    scheduledDate: "2026-03-14",
    product: "Energielabel",
    companyName: "SallandWonen",
  },
];

// ============================================================================
// Component
// ============================================================================

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState<OrderStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Real Convex query — falls back to mock data while empty
  const convexOrders = useQuery(api.orders.list, {
    status: activeFilter === "ALL" ? undefined : activeFilter,
  });

  // Use real data if available, otherwise show mock data for demo
  const hasRealData = convexOrders && convexOrders.length > 0;
  const orders: MockOrder[] | undefined = hasRealData
    ? convexOrders.map((o) => ({
        _id: o._id,
        referenceCode: o.referenceCode,
        address: `${o.referenceCode}`, // Will be enriched with address data
        city: "",
        status: o.status as OrderStatus,
        adviseur: "-",
        scheduledDate: o.scheduledDate ?? null,
        product: "Energielabel",
        companyName: null,
      }))
    : MOCK_ORDERS;
  const isLoading = convexOrders === undefined;

  const filteredOrders = orders?.filter((order) => {
    const matchesFilter =
      activeFilter === "ALL" || order.status === activeFilter;
    const matchesSearch =
      !searchQuery ||
      order.referenceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.adviseur.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Opdrachten</h1>
          <p className="text-sm text-muted-foreground">
            Beheer en volg al je opdrachten
          </p>
        </div>
        <OrderFormSheet />
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3">
        {/* Search bar */}
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op referentie, adres of adviseur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={activeFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(filter.value)}
              className="shrink-0"
            >
              {filter.label}
              {filter.value !== "ALL" && orders && (
                <span className="ml-1 text-xs opacity-60">
                  {orders.filter((o) => o.status === filter.value).length}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <OrdersTableSkeleton />
      ) : filteredOrders && filteredOrders.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referentie</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Adviseur</TableHead>
                <TableHead className="hidden lg:table-cell">Datum</TableHead>
                <TableHead className="hidden sm:table-cell">Product</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order._id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/orders/${order._id}`}
                      className="font-medium text-foreground hover:text-[var(--color-vv-green)] transition-colors"
                    >
                      {order.referenceCode}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/orders/${order._id}`} className="block">
                      <span className="text-foreground">{order.address.split(",")[0]}</span>
                      <span className="block text-xs text-muted-foreground">{order.city}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {order.adviseur}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {order.scheduledDate
                      ? new Date(order.scheduledDate).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {order.product}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState hasFilter={activeFilter !== "ALL" || !!searchQuery} />
      )}
    </div>
  );
}

// ============================================================================
// Skeleton loading state
// ============================================================================

function OrdersTableSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referentie</TableHead>
            <TableHead>Adres</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Adviseur</TableHead>
            <TableHead className="hidden lg:table-cell">Datum</TableHead>
            <TableHead className="hidden sm:table-cell">Product</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-1 h-3 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-24 rounded-full" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
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
        <InboxIcon className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-medium text-foreground">
          {hasFilter ? "Geen opdrachten gevonden" : "Nog geen opdrachten"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasFilter
            ? "Probeer een andere filter of zoekterm"
            : "Maak je eerste opdracht aan om te beginnen"}
        </p>
      </div>
      {!hasFilter && <OrderFormSheet />}
    </div>
  );
}
