import { cn } from "@/lib/utils";

type StatusVariant = {
  label: string;
  className: string;
};

type StatusVariantMap = Record<string, StatusVariant>;

interface StatusBadgeProps {
  status: string;
  variants: StatusVariantMap;
  className?: string;
}

/**
 * Generic color-coded status badge.
 * Pass a variants map to define label + color per status.
 */
export function StatusBadge({ status, variants, className }: StatusBadgeProps) {
  const variant = variants[status];

  if (!variant) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground",
          className
        )}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium",
        variant.className,
        className
      )}
    >
      {variant.label}
    </span>
  );
}

// ============================================================================
// Pre-defined variant maps
// ============================================================================

export const quoteStatusVariants: StatusVariantMap = {
  CONCEPT: {
    label: "Concept",
    className: "bg-muted text-muted-foreground",
  },
  VERSTUURD: {
    label: "Verstuurd",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  GEACCEPTEERD: {
    label: "Geaccepteerd",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  VERLOPEN: {
    label: "Verlopen",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  AFGEWEZEN: {
    label: "Afgewezen",
    className: "bg-destructive/10 text-destructive",
  },
};

export const invoiceStatusVariants: StatusVariantMap = {
  CONCEPT: {
    label: "Concept",
    className: "bg-muted text-muted-foreground",
  },
  VERSTUURD: {
    label: "Verstuurd",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  BETAALD: {
    label: "Betaald",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  HERINNERING: {
    label: "Herinnering",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  ONINBAAR: {
    label: "Oninbaar",
    className: "bg-destructive/10 text-destructive",
  },
};

export const costMutationStatusVariants: StatusVariantMap = {
  PENDING: {
    label: "Te beoordelen",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  APPROVED: {
    label: "Goedgekeurd",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  REJECTED: {
    label: "Afgewezen",
    className: "bg-destructive/10 text-destructive",
  },
};

export const costMutationTypeVariants: StatusVariantMap = {
  MEERWERK: {
    label: "Meerwerk",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  MINDERWERK: {
    label: "Minderwerk",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  NO_SHOW: {
    label: "No-show",
    className: "bg-destructive/10 text-destructive",
  },
  HERBEZOEK: {
    label: "Herbezoek",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  DESTRUCTIEF_ONDERZOEK: {
    label: "Destructief onderzoek",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  TYPE_WIJZIGING: {
    label: "Type wijziging",
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  OVERIG: {
    label: "Overig",
    className: "bg-muted text-muted-foreground",
  },
};

export const appointmentStatusVariants: StatusVariantMap = {
  GEPLAND: {
    label: "Gepland",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  BEVESTIGD: {
    label: "Bevestigd",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  ONDERWEG: {
    label: "Onderweg",
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  VOLTOOID: {
    label: "Voltooid",
    className: "bg-muted text-muted-foreground",
  },
  NO_SHOW: {
    label: "No-show",
    className: "bg-destructive/10 text-destructive",
  },
  GEANNULEERD: {
    label: "Geannuleerd",
    className: "bg-destructive/10 text-destructive",
  },
  VERZET: {
    label: "Verzet",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};
