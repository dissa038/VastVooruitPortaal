"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatStrip, StatStripSkeleton } from "@/components/ui/stat-strip";
import {
  FolderOpen,
  Plus,
  FileText,
  Users,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const user = useQuery(api.users.getAuthUser);
  const orderStats = useQuery(api.orders.getStats);

  const statsLoaded = orderStats !== undefined;

  const statItems = statsLoaded
    ? [
        {
          label: "Nieuwe opdrachten",
          value: String(orderStats?.["NIEUW"] ?? 0),
          valueColor: "text-blue-500",
        },
        {
          label: "In uitwerking",
          value: String(orderStats?.["IN_UITWERKING"] ?? 0),
          valueColor: "text-purple-500",
        },
        {
          label: "Openstaande facturen",
          value: "\u2014",
          valueColor: "text-orange-500",
        },
        {
          label: "Vandaag ingepland",
          value: String(orderStats?.["INGEPLAND"] ?? 0),
          valueColor: "text-emerald-500",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welkom{user ? `, ${user.firstName}` : ""}. Overzicht van alle
            lopende opdrachten.
          </p>
        </div>
        <Button render={<Link href="/orders" />} className="gap-2">
          <Plus className="h-4 w-4" />
          Nieuwe opdracht
        </Button>
      </div>

      {/* KPI Strip */}
      {statsLoaded ? <StatStrip items={statItems} /> : <StatStripSkeleton />}

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Snelle acties
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                render={<Link href="/orders" />}
                className="justify-start gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Opdrachten
              </Button>
              <Button
                variant="outline"
                render={<Link href="/quotes" />}
                className="justify-start gap-2"
              >
                <FileText className="h-4 w-4" />
                Offertes
              </Button>
              <Button
                variant="outline"
                render={<Link href="/contacts" />}
                className="justify-start gap-2"
              >
                <Users className="h-4 w-4" />
                Contacten
              </Button>
              <Button
                variant="outline"
                render={<Link href="/planning" />}
                className="justify-start gap-2"
              >
                <CalendarDays className="h-4 w-4" />
                Planning
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Recente activiteit
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Geen recente activiteit — begin met het aanmaken van
                  opdrachten.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
