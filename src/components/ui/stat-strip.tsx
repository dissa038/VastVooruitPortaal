"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { ScrollFadeWrapper } from "./scroll-fade";

// ============================================================
// STAT ITEM
// ============================================================

interface StatItem {
  label: string;
  value: React.ReactNode;
  /** Tailwind text color class for the value, e.g. "text-destructive" */
  valueColor?: string;
}

// ============================================================
// STAT STRIP
// ============================================================

interface StatStripProps {
  items: StatItem[];
  className?: string;
}

export function StatStrip({ items, className }: StatStripProps) {
  return (
    <ScrollFadeWrapper className={className} gap="gap-1.5">
      {items.map((item) => (
        <div
          key={item.label}
          className="shrink-0 rounded-lg bg-muted/60 px-3 py-1.5"
        >
          <span className="block text-[11px] text-muted-foreground">{item.label}</span>
          <p
            className={cn(
              "text-base font-bold leading-tight",
              item.valueColor
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </ScrollFadeWrapper>
  );
}

// ============================================================
// SKELETON
// ============================================================

interface StatStripSkeletonProps {
  count?: number;
  className?: string;
}

export function StatStripSkeleton({
  count = 4,
  className,
}: StatStripSkeletonProps) {
  return (
    <ScrollFadeWrapper className={className} gap="gap-1.5">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="shrink-0 rounded-lg bg-muted/60 px-3 py-1.5"
        >
          <Skeleton className="mb-1 h-3 w-14" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </ScrollFadeWrapper>
  );
}
