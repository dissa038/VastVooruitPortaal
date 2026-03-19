"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Building2,
  FileText,
  Receipt,
  Clock,
  CalendarDays,
  BarChart3,
  Settings,
  Package,
  UserCheck,
  Send,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";

const mainNav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Opdrachten", href: "/orders", icon: FolderOpen },
  { label: "Projecten", href: "/projects", icon: Package },
  { label: "Contacten", href: "/contacts", icon: Users },
  { label: "Bedrijven", href: "/companies", icon: Building2 },
  { label: "Tussenpersonen", href: "/intermediaries", icon: UserCheck },
];

const commercialNav = [
  { label: "Offertes", href: "/quotes", icon: FileText },
  { label: "Facturen", href: "/invoices", icon: Receipt },
  { label: "Kostenmutaties", href: "/cost-mutations", icon: BarChart3 },
];

const planningNav = [
  { label: "Planning", href: "/planning", icon: CalendarDays },
  { label: "Uurregistratie", href: "/time-entries", icon: Clock },
  { label: "Communicatie", href: "/communications", icon: Send },
];

function NavSection({
  items,
  pathname,
}: {
  items: typeof mainNav;
  pathname: string;
}) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            render={<Link href={item.href} />}
            isActive={
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="VastVooruit"
            width={32}
            height={32}
            className="rounded-sm"
          />
          <span className="text-lg font-semibold tracking-tight">
            VastVooruit
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overzicht</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavSection items={mainNav} pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Commercieel</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavSection items={commercialNav} pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Planning & Uitvoering</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavSection items={planningNav} pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={pathname.startsWith("/settings")}
            >
              <Settings className="h-4 w-4" />
              <span>Instellingen</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-1.5">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-7 w-7",
                  },
                }}
              />
              <span className="text-sm text-muted-foreground">Account</span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
