"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { InboxIcon } from "lucide-react";

// ============================================================================
// Constants
// ============================================================================

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_COLORS: Record<string, string> = {
  NIEUW: "#6b7280",
  OFFERTE_VERSTUURD: "#3b82f6",
  GEACCEPTEERD: "#14AF52",
  INGEPLAND: "#6366f1",
  OPNAME_GEDAAN: "#8b5cf6",
  IN_UITWERKING: "#eab308",
  CONCEPT_GEREED: "#f97316",
  CONTROLE: "#f59e0b",
  GEREGISTREERD: "#14AF52",
  VERZONDEN: "#10b981",
  AFGEROND: "#14AF52",
  ON_HOLD: "#ef4444",
  GEANNULEERD: "#6b7280",
  NO_SHOW: "#ef4444",
};

// ============================================================================
// Component
// ============================================================================

export default function MakelaarPortalPage() {
  const params = useParams();
  const code = params.code as string;
  const data = useQuery(api.makelaarPortal.getByCode, { code });

  if (data === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0E2D2D]">
        <div className="animate-pulse text-[#EAE3DF]">Laden...</div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0E2D2D] px-4 text-center">
        <Image src="/logo.png" alt="VastVooruit" width={48} height={48} className="mb-6" />
        <h1 className="text-xl font-semibold text-[#EAE3DF]">Portaal niet gevonden</h1>
        <p className="mt-2 text-sm text-[#EAE3DF]/60">
          Deze link is ongeldig. Neem contact op met VastVooruit.
        </p>
      </div>
    );
  }

  // Stats
  const totalOrders = data.orders.length;
  const activeOrders = data.orders.filter(
    (o) => !["AFGEROND", "GEANNULEERD"].includes(o.status)
  ).length;
  const completedOrders = data.orders.filter(
    (o) => o.status === "AFGEROND"
  ).length;

  return (
    <div className="min-h-dvh bg-[#0E2D2D] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="VastVooruit"
            width={40}
            height={40}
            className="mx-auto mb-4"
          />
          <h1 className="text-lg font-semibold text-[#EAE3DF]">
            Makelaar Portaal
          </h1>
          <p className="mt-1 text-sm text-[#EAE3DF]/60">{data.intermediaryName}</p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-sm border border-[#EAE3DF]/10 p-3 text-center">
            <p className="text-2xl font-semibold text-[#EAE3DF]">{totalOrders}</p>
            <p className="text-xs text-[#EAE3DF]/50">Totaal</p>
          </div>
          <div className="rounded-sm border border-[#14AF52]/30 bg-[#14AF52]/10 p-3 text-center">
            <p className="text-2xl font-semibold text-[#14AF52]">{activeOrders}</p>
            <p className="text-xs text-[#EAE3DF]/50">Actief</p>
          </div>
          <div className="rounded-sm border border-[#EAE3DF]/10 p-3 text-center">
            <p className="text-2xl font-semibold text-[#EAE3DF]">{completedOrders}</p>
            <p className="text-xs text-[#EAE3DF]/50">Afgerond</p>
          </div>
        </div>

        {/* Orders table */}
        {data.orders.length > 0 ? (
          <div className="rounded-sm border border-[#EAE3DF]/10 overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_1.5fr_auto_auto] gap-2 border-b border-[#EAE3DF]/10 bg-[#EAE3DF]/5 px-4 py-2">
              <span className="text-xs font-medium text-[#EAE3DF]/50">Referentie</span>
              <span className="text-xs font-medium text-[#EAE3DF]/50">Adres</span>
              <span className="text-xs font-medium text-[#EAE3DF]/50">Status</span>
              <span className="text-xs font-medium text-[#EAE3DF]/50">Ingepland</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[#EAE3DF]/5">
              {data.orders.map((order) => {
                const statusColor = STATUS_COLORS[order.status] ?? "#6b7280";
                const statusLabel = STATUS_LABELS[order.status] ?? order.status;

                return (
                  <div
                    key={order._id}
                    className="flex flex-col gap-1 px-4 py-3 sm:grid sm:grid-cols-[1fr_1.5fr_auto_auto] sm:items-center sm:gap-2"
                  >
                    <span className="text-sm font-mono text-[#EAE3DF]">
                      {order.referenceCode}
                    </span>
                    <div>
                      <span className="text-sm text-[#EAE3DF]">{order.address}</span>
                      {order.city && (
                        <span className="block text-xs text-[#EAE3DF]/40">
                          {order.postcode} {order.city}
                        </span>
                      )}
                    </div>
                    <span
                      className="inline-flex w-fit rounded px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${statusColor}20`,
                        color: statusColor,
                      }}
                    >
                      {statusLabel}
                    </span>
                    <span className="text-xs text-[#EAE3DF]/50">
                      {order.scheduledDate
                        ? new Date(order.scheduledDate).toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-sm border border-dashed border-[#EAE3DF]/10 py-16">
            <InboxIcon className="h-8 w-8 text-[#EAE3DF]/20" />
            <p className="text-sm text-[#EAE3DF]/40">
              Nog geen aanvragen. Neem contact op om orders te plaatsen.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#EAE3DF]/30">
            Vragen? Neem contact op met VastVooruit
          </p>
        </div>
      </div>
    </div>
  );
}
