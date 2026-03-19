"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ScrollFadeWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** Gap classes for the inner flex container. Default: "gap-3 sm:gap-5" */
  gap?: string;
  /** Ref callback to access the scrollable element */
  scrollRef?: React.Ref<HTMLDivElement>;
}

export function ScrollFadeWrapper({
  children,
  className,
  gap = "gap-3 sm:gap-5",
  scrollRef: externalRef,
}: ScrollFadeWrapperProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = internalRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = internalRef.current;
    if (!el) return;

    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkScroll]);

  // Merge refs
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (typeof externalRef === "function") {
        externalRef(node);
      } else if (externalRef) {
        (externalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [externalRef]
  );

  return (
    <div className={cn("relative min-w-0", className)}>
      {/* Left fade */}
      <div
        className={cn(
          "pointer-events-none absolute -left-px top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-background to-transparent transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Scrollable content */}
      <div
        ref={setRef}
        onScroll={checkScroll}
        className={cn("flex overflow-x-auto no-scrollbar", gap)}
      >
        {children}
      </div>

      {/* Right fade */}
      <div
        className={cn(
          "pointer-events-none absolute -right-px top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-background to-transparent transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
