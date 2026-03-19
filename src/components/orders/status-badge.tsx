"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type OrderStatus =
  | "NIEUW"
  | "OFFERTE_VERSTUURD"
  | "GEACCEPTEERD"
  | "INGEPLAND"
  | "OPNAME_GEDAAN"
  | "IN_UITWERKING"
  | "CONCEPT_GEREED"
  | "CONTROLE"
  | "GEREGISTREERD"
  | "VERZONDEN"
  | "AFGEROND"
  | "ON_HOLD"
  | "GEANNULEERD"
  | "NO_SHOW";

const statusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  NIEUW: {
    label: "Nieuw",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  },
  OFFERTE_VERSTUURD: {
    label: "Offerte verstuurd",
    className: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  },
  GEACCEPTEERD: {
    label: "Geaccepteerd",
    className: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  },
  INGEPLAND: {
    label: "Ingepland",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  },
  OPNAME_GEDAAN: {
    label: "Opname gedaan",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  },
  IN_UITWERKING: {
    label: "In uitwerking",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  },
  CONCEPT_GEREED: {
    label: "Concept gereed",
    className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  },
  CONTROLE: {
    label: "Controle",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  },
  GEREGISTREERD: {
    label: "Geregistreerd",
    className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  },
  VERZONDEN: {
    label: "Verzonden",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  },
  AFGEROND: {
    label: "Afgerond",
    className: "bg-green-500/15 text-green-400 border-green-500/20",
  },
  ON_HOLD: {
    label: "On hold",
    className: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  },
  GEANNULEERD: {
    label: "Geannuleerd",
    className: "bg-red-500/15 text-red-400 border-red-500/20",
  },
  NO_SHOW: {
    label: "No-show",
    className: "bg-red-500/15 text-red-300 border-red-500/20",
  },
};

export function StatusBadge({
  status,
  className: extraClassName,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  if (!config) return null;

  return (
    <Badge
      variant="outline"
      className={cn(config.className, extraClassName)}
    >
      {config.label}
    </Badge>
  );
}

export function getStatusLabel(status: OrderStatus): string {
  return statusConfig[status]?.label ?? status;
}
