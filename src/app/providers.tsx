"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { nlNL } from "@clerk/localizations";
import { TooltipProvider } from "@/components/ui/tooltip";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={nlNL}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <TooltipProvider>{children}</TooltipProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
