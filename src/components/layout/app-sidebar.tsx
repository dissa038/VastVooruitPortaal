"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  FolderOpen,
  Package,
  Users,
  Building2,
  UserCheck,
  FileText,
  Receipt,
  BarChart3,
  CalendarDays,
  Clock,
  Send,
  Settings,
  ChevronRight,
  Menu,
  X,
  HardHat,
  LogOut,
  User,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// ============================================================
// ENTITY COLORS
// ============================================================

const entityColors = {
  dashboard: "#14AF52",
  orders: "#f59e0b",
  projects: "#8b5cf6",
  contacts: "#3b82f6",
  companies: "#a855f7",
  intermediaries: "#06b6d4",
  quotes: "#f97316",
  invoices: "#10b981",
  costMutations: "#ef4444",
  planning: "#6366f1",
  timeEntries: "#ec4899",
  communications: "#14b8a6",
  nieuwbouw: "#0ea5e9",
  settings: "#6b7280",
} as const;

// ============================================================
// NAV ITEMS
// ============================================================

interface NavItem {
  id: string;
  href: string;
  icon: React.ElementType;
  label: string;
  color?: string;
}

interface NavGroup {
  id: string;
  icon: React.ElementType;
  label: string;
  color: string;
  items: NavItem[];
}

// Primary nav — monochrome icons
const primaryNav: NavItem[] = [
  { id: "dashboard", href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { id: "orders", href: "/orders", icon: FolderOpen, label: "Opdrachten" },
  { id: "projects", href: "/projects", icon: Package, label: "Projecten" },
];

// CRM section — colored entity icons
const crmNav: NavItem[] = [
  { id: "contacts", href: "/contacts", icon: Users, label: "Contacten", color: entityColors.contacts },
  { id: "companies", href: "/companies", icon: Building2, label: "Bedrijven", color: entityColors.companies },
  { id: "intermediaries", href: "/intermediaries", icon: UserCheck, label: "Tussenpersonen", color: entityColors.intermediaries },
];

// Collapsible groups
const financienGroup: NavGroup = {
  id: "financien",
  icon: Receipt,
  label: "Financien",
  color: entityColors.invoices,
  items: [
    { id: "quotes", href: "/quotes", icon: FileText, label: "Offertes", color: entityColors.quotes },
    { id: "invoices", href: "/invoices", icon: Receipt, label: "Facturen", color: entityColors.invoices },
    { id: "cost-mutations", href: "/cost-mutations", icon: BarChart3, label: "Kostenmutaties", color: entityColors.costMutations },
  ],
};

const planningGroup: NavGroup = {
  id: "planning-group",
  icon: CalendarDays,
  label: "Planning & Uitvoering",
  color: entityColors.planning,
  items: [
    { id: "planning", href: "/planning", icon: CalendarDays, label: "Planning", color: entityColors.planning },
    { id: "adviseurs", href: "/planning/adviseurs", icon: UserCheck, label: "Adviseurs", color: entityColors.planning },
    { id: "nieuwbouw", href: "/nieuwbouw", icon: HardHat, label: "Nieuwbouw", color: entityColors.nieuwbouw },
    { id: "time-entries", href: "/time-entries", icon: Clock, label: "Uurregistratie", color: entityColors.timeEntries },
    { id: "communications", href: "/communications", icon: Send, label: "Communicatie", color: entityColors.communications },
  ],
};

// ============================================================
// STORAGE HELPERS
// ============================================================

const EXPANDED_KEY = "vv-sidebar-groups-expanded";

function getStoredExpanded(): Set<string> {
  if (typeof window === "undefined") return new Set(["financien", "planning-group"]);
  try {
    const stored = localStorage.getItem(EXPANDED_KEY);
    if (!stored) return new Set(["financien", "planning-group"]);
    return new Set(JSON.parse(stored));
  } catch {
    return new Set(["financien", "planning-group"]);
  }
}

function saveExpanded(expanded: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...expanded]));
  } catch {
    // Ignore
  }
}

// ============================================================
// HELPER: isActive
// ============================================================

function isRouteActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// ============================================================
// NAV LINK COMPONENT (monochrome — primary nav)
// ============================================================

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = isRouteActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-2.5 px-3 py-1.5 min-h-[44px] rounded-md text-[13px] transition-colors duration-150",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      {/* Active indicator — green left border */}
      {active && (
        <span
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full"
          style={{ backgroundColor: entityColors.dashboard }}
        />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

// ============================================================
// COLORED NAV LINK (CRM + sub-items)
// ============================================================

function ColoredNavLink({
  item,
  pathname,
  onNavigate,
  indented = false,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  indented?: boolean;
}) {
  const Icon = item.icon;
  const active = isRouteActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-2.5 py-1.5 min-h-[44px] rounded-md text-[13px] transition-colors duration-150",
        indented ? "px-3 ml-4" : "px-3",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full"
          style={{ backgroundColor: entityColors.dashboard }}
        />
      )}
      <span
        className="h-5 w-5 rounded flex items-center justify-center shrink-0"
        style={{ backgroundColor: item.color }}
      >
        <Icon className="h-3 w-3 text-white" />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

// ============================================================
// COLLAPSIBLE GROUP
// ============================================================

function CollapsibleGroup({
  group,
  pathname,
  isExpanded,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const Icon = group.icon;
  const hasActiveChild = group.items.some((item) =>
    isRouteActive(pathname, item.href)
  );

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "relative w-full flex items-center gap-2.5 px-3 py-1.5 min-h-[44px] rounded-md text-[13px] transition-colors duration-150",
          hasActiveChild
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        {hasActiveChild && (
          <span
            className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full"
            style={{ backgroundColor: entityColors.dashboard }}
          />
        )}
        <span
          className="h-5 w-5 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: group.color }}
        >
          <Icon className="h-3 w-3 text-white" />
        </span>
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            isExpanded && "rotate-90"
          )}
        />
      </button>
      {/* Animated collapsible content using grid-rows trick */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-0.5 space-y-0.5">
            {group.items.map((item) => (
              <ColoredNavLink
                key={item.id}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
                indented
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION LABEL
// ============================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-4 pb-1 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
      {children}
    </div>
  );
}

// ============================================================
// SIDEBAR CONTENT (shared between desktop & mobile)
// ============================================================

function SidebarNavContent({
  pathname,
  expandedGroups,
  toggleGroup,
  onNavigate,
}: {
  pathname: string;
  expandedGroups: Set<string>;
  toggleGroup: (id: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo + brand */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5" onClick={onNavigate}>
          <Image
            src="/logo.png"
            alt="VastVooruit"
            width={28}
            height={28}
            className="rounded-sm"
          />
          <span className="font-semibold text-base text-sidebar-foreground tracking-tight">
            VastVooruit
          </span>
        </Link>
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-3">
        {/* Primary navigation — monochrome */}
        <div className="space-y-0.5">
          {primaryNav.map((item) => (
            <NavLink
              key={item.id}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {/* CRM section */}
        <SectionLabel>CRM</SectionLabel>
        <div className="space-y-0.5">
          {crmNav.map((item) => (
            <ColoredNavLink
              key={item.id}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {/* Financien group */}
        <SectionLabel>Financieel</SectionLabel>
        <div className="space-y-0.5">
          <CollapsibleGroup
            group={financienGroup}
            pathname={pathname}
            isExpanded={expandedGroups.has(financienGroup.id)}
            onToggle={() => toggleGroup(financienGroup.id)}
            onNavigate={onNavigate}
          />
        </div>

        {/* Planning & Uitvoering group */}
        <SectionLabel>Uitvoering</SectionLabel>
        <div className="space-y-0.5">
          <CollapsibleGroup
            group={planningGroup}
            pathname={pathname}
            isExpanded={expandedGroups.has(planningGroup.id)}
            onToggle={() => toggleGroup(planningGroup.id)}
            onNavigate={onNavigate}
          />
        </div>

        {/* Organisation */}
        <div className="mt-4 pt-3 border-t border-sidebar-border">
          <SectionLabel>Organisatie</SectionLabel>
          <div className="space-y-0.5">
            <Link
              href="/settings"
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-2.5 px-3 py-1.5 min-h-[44px] rounded-md text-[13px] transition-colors duration-150",
                isRouteActive(pathname, "/settings")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              {isRouteActive(pathname, "/settings") && (
                <span
                  className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full"
                  style={{ backgroundColor: entityColors.dashboard }}
                />
              )}
              <span
                className="h-5 w-5 rounded flex items-center justify-center shrink-0"
                style={{ backgroundColor: entityColors.settings }}
              >
                <Settings className="h-3 w-3 text-white" />
              </span>
              <span>Instellingen</span>
            </Link>
          </div>
        </div>
      </div>

      {/* User section at bottom */}
      <UserSection onNavigate={onNavigate} />
    </div>
  );
}

// ============================================================
// USER SECTION — Custom (no Clerk UserButton)
// ============================================================

function UserSection({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const initials = user
    ? `${(user.firstName?.[0] ?? "").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}`
    : "??";
  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ")
    : "Laden...";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="p-3 border-t border-sidebar-border shrink-0 relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="w-full flex items-center gap-2.5 px-1 py-1 rounded-md hover:bg-sidebar-accent/50 transition-colors"
      >
        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={fullName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-[#14AF52] flex items-center justify-center text-xs font-semibold text-white">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[13px] font-medium text-sidebar-foreground truncate">
            {fullName}
          </p>
          <p className="text-[10px] text-sidebar-foreground/50 truncate">
            {email}
          </p>
        </div>
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute bottom-full left-3 right-3 mb-1 z-50 rounded-md border border-sidebar-border bg-sidebar shadow-lg">
            <div className="p-2 space-y-0.5">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate?.();
                  window.open("/settings", "_self");
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
              >
                <User className="h-4 w-4" />
                Account beheren
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut({ redirectUrl: "/sign-in" });
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Uitloggen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// MOBILE SIDEBAR TRIGGER (exported for layout header)
// ============================================================

export function MobileSidebarTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "lg:hidden flex items-center justify-center h-11 w-11 rounded-md hover:bg-accent transition-colors",
        className
      )}
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}

// ============================================================
// MAIN EXPORT: AppSidebar
// ============================================================

export function AppSidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    () => new Set(["financien", "planning-group"])
  );

  // Load stored expanded state on mount
  React.useEffect(() => {
    setExpandedGroups(getStoredExpanded());
  }, []);

  const toggleGroup = React.useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      saveExpanded(next);
      return next;
    });
  }, []);

  return (
    <>
      {/* Desktop sidebar — fixed, always visible on lg+ */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border">
        <SidebarNavContent
          pathname={pathname}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
        />
      </aside>

      {/* Mobile sidebar — Sheet overlay */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose()}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-72 p-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigatie</SheetTitle>
            <SheetDescription>Hoofdmenu navigatie</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col h-full">
            <SidebarNavContent
              pathname={pathname}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              onNavigate={onMobileClose}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
