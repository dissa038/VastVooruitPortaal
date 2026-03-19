"use client";

import { useState } from "react";
import { AppSidebar, MobileSidebarTrigger } from "@/components/layout/app-sidebar";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-dvh bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <AppSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="flex flex-col h-full lg:pl-64">
        {/* Fixed header */}
        <header className="fixed top-0 left-0 right-0 lg:left-64 h-14 border-b bg-background/95 backdrop-blur-md flex items-center px-4 sm:px-6 z-30 shrink-0">
          {/* Mobile hamburger */}
          <MobileSidebarTrigger
            onClick={() => setMobileMenuOpen(true)}
            className="-ml-1 mr-2"
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side — user button on mobile (desktop has it in sidebar) */}
          <div className="flex items-center gap-2">
            <div className="lg:hidden">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 pt-14 overflow-y-auto">
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
