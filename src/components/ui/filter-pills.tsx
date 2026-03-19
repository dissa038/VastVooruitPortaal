"use client";

import { useEffect, useRef, useCallback } from "react";
import { Button } from "./button";
import { ScrollFadeWrapper } from "./scroll-fade";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string | null;
  label: string;
}

interface FilterPillsProps {
  options: readonly FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** localStorage key suffix for persisting selection & scroll */
  storageKey?: string;
  /** Optional label shown before the pills on desktop */
  label?: string;
  className?: string;
}

export function FilterPills({
  options,
  value,
  onChange,
  storageKey,
  label,
  className,
}: FilterPillsProps) {
  const scrollElRef = useRef<HTMLDivElement>(null);
  const hasRestoredScroll = useRef(false);

  const filterKey = storageKey ? `vv-filter-${storageKey}` : null;
  const scrollKey = storageKey ? `vv-scroll-${storageKey}` : null;

  // Restore filter from localStorage on mount
  useEffect(() => {
    if (!filterKey) return;
    const stored = localStorage.getItem(filterKey);
    if (stored !== null) {
      onChange(stored === "null" ? null : stored);
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Restore scroll position on mount
  useEffect(() => {
    if (!scrollKey || hasRestoredScroll.current) return;
    const stored = localStorage.getItem(scrollKey);
    if (stored && scrollElRef.current) {
      scrollElRef.current.scrollLeft = Number(stored);
    }
    hasRestoredScroll.current = true;
  }, [scrollKey]);

  // Persist filter selection
  const handleChange = useCallback(
    (newValue: string | null) => {
      onChange(newValue);
      if (filterKey) {
        localStorage.setItem(filterKey, String(newValue));
      }
    },
    [onChange, filterKey]
  );

  // Persist scroll position on scroll
  const handleScroll = useCallback(() => {
    if (!scrollKey || !scrollElRef.current) return;
    localStorage.setItem(scrollKey, String(scrollElRef.current.scrollLeft));
  }, [scrollKey]);

  // Attach scroll listener to the inner scrollable element
  useEffect(() => {
    const el = scrollElRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="text-xs font-medium text-muted-foreground shrink-0 hidden sm:inline">
          {label}
        </span>
      )}
      <ScrollFadeWrapper gap="gap-1.5" scrollRef={scrollElRef}>
        {options.map((option) => (
          <Button
            key={option.label}
            variant={value === option.value ? "default" : "outline"}
            size="sm"
            className="h-7 px-2.5 text-xs rounded-full shrink-0"
            onClick={() => handleChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </ScrollFadeWrapper>
    </div>
  );
}
