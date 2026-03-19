"use client";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import type { OrderStatus } from "./status-badge";

// Main pipeline flow (linear steps), excluding side-statuses
const PIPELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "NIEUW", label: "Nieuw" },
  { status: "INGEPLAND", label: "Ingepland" },
  { status: "OPNAME_GEDAAN", label: "Opname" },
  { status: "IN_UITWERKING", label: "Uitwerking" },
  { status: "CONCEPT_GEREED", label: "Concept" },
  { status: "CONTROLE", label: "Controle" },
  { status: "GEREGISTREERD", label: "Registratie" },
  { status: "AFGEROND", label: "Afgerond" },
];

// Map each status to its index in the pipeline for comparison
const STATUS_INDEX: Record<string, number> = {};
PIPELINE_STEPS.forEach((step, i) => {
  STATUS_INDEX[step.status] = i;
});

// Side statuses that don't appear in the pipeline
const SIDE_STATUSES: OrderStatus[] = ["ON_HOLD", "GEANNULEERD", "NO_SHOW"];

export function StatusPipeline({
  currentStatus,
  className,
}: {
  currentStatus: OrderStatus;
  className?: string;
}) {
  const isSideStatus = SIDE_STATUSES.includes(currentStatus);
  const currentIndex = STATUS_INDEX[currentStatus] ?? -1;

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: horizontal pipeline */}
      <div className="hidden md:flex items-center gap-0">
        {PIPELINE_STEPS.map((step, index) => {
          const isCompleted = !isSideStatus && currentIndex > index;
          const isCurrent = !isSideStatus && currentIndex === index;
          const isFuture = isSideStatus || currentIndex < index;

          return (
            <div key={step.status} className="flex items-center flex-1 min-w-0">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                    isCompleted &&
                      "border-[var(--color-vv-green)] bg-[var(--color-vv-green)] text-white",
                    isCurrent &&
                      "border-[var(--color-vv-green)] bg-[var(--color-vv-green)]/10 text-[var(--color-vv-green)]",
                    isFuture && "border-muted-foreground/30 text-muted-foreground/50"
                  )}
                >
                  {isCompleted ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs text-center truncate max-w-16",
                    isCurrent && "font-medium text-foreground",
                    isCompleted && "text-muted-foreground",
                    isFuture && "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < PIPELINE_STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 mt-[-1.25rem]",
                    isCompleted ? "bg-[var(--color-vv-green)]" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical compact list */}
      <div className="flex md:hidden flex-col gap-2">
        {PIPELINE_STEPS.map((step, index) => {
          const isCompleted = !isSideStatus && currentIndex > index;
          const isCurrent = !isSideStatus && currentIndex === index;
          const isFuture = isSideStatus || currentIndex < index;

          return (
            <div key={step.status} className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs",
                  isCompleted &&
                    "border-[var(--color-vv-green)] bg-[var(--color-vv-green)] text-white",
                  isCurrent &&
                    "border-[var(--color-vv-green)] bg-[var(--color-vv-green)]/10 text-[var(--color-vv-green)]",
                  isFuture && "border-muted-foreground/30 text-muted-foreground/50"
                )}
              >
                {isCompleted ? <CheckIcon className="size-3" /> : <span>{index + 1}</span>}
              </div>
              <span
                className={cn(
                  "text-sm",
                  isCurrent && "font-medium text-foreground",
                  isCompleted && "text-muted-foreground",
                  isFuture && "text-muted-foreground/50"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Side status indicator */}
      {isSideStatus && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {currentStatus === "ON_HOLD" && "Deze opdracht staat on hold"}
          {currentStatus === "GEANNULEERD" && "Deze opdracht is geannuleerd"}
          {currentStatus === "NO_SHOW" && "Bewoner was niet aanwezig (no-show)"}
        </div>
      )}
    </div>
  );
}

/** Returns the next logical status in the pipeline */
export function getNextStatus(current: OrderStatus): OrderStatus | null {
  const index = STATUS_INDEX[current];
  if (index === undefined || index >= PIPELINE_STEPS.length - 1) return null;
  return PIPELINE_STEPS[index + 1].status;
}

/** Returns the previous status in the pipeline */
export function getPreviousStatus(current: OrderStatus): OrderStatus | null {
  const index = STATUS_INDEX[current];
  if (index === undefined || index <= 0) return null;
  return PIPELINE_STEPS[index - 1].status;
}
