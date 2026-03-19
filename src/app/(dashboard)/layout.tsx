"use client";

import { useState } from "react";
import { AppSidebar, MobileSidebarTrigger } from "@/components/layout/app-sidebar";
import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();

  const initials = user
    ? `${(user.firstName?.[0] ?? "").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}`
    : "";

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

          {/* Right side — custom user avatar on mobile */}
          <div className="flex items-center gap-2 lg:hidden">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.firstName ?? ""}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : initials ? (
              <div className="h-8 w-8 rounded-full bg-[#14AF52] flex items-center justify-center text-xs font-semibold text-white">
                {initials}
              </div>
            ) : null}
            <button
              onClick={() => signOut({ redirectUrl: "/sign-in" })}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors text-muted-foreground"
              aria-label="Uitloggen"
            >
              <LogOut className="h-4 w-4" />
            </button>
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
