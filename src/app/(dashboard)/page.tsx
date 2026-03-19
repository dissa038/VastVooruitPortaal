"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Plus,
  Clock,
  Receipt,
  CalendarDays,
  TrendingUp,
  FileText,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const user = useQuery(api.users.getAuthUser);
  const orderStats = useQuery(api.orders.getStats);

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Nieuwe opdrachten"
          value={orderStats ? String(orderStats["NIEUW"] ?? 0) : "—"}
          icon={FolderOpen}
          color="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          label="In uitwerking"
          value={orderStats ? String(orderStats["IN_UITWERKING"] ?? 0) : "—"}
          icon={Clock}
          color="bg-purple-500/20 text-purple-400"
        />
        <StatCard
          label="Openstaande facturen"
          value="—"
          icon={Receipt}
          color="bg-orange-500/20 text-orange-400"
        />
        <StatCard
          label="Vandaag ingepland"
          value={orderStats ? String(orderStats["INGEPLAND"] ?? 0) : "—"}
          icon={CalendarDays}
          color="bg-emerald-500/20 text-emerald-400"
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Snelle acties
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" render={<Link href="/orders" />} className="justify-start gap-2">
                <FolderOpen className="h-4 w-4" />
                Opdrachten
              </Button>
              <Button variant="outline" render={<Link href="/quotes" />} className="justify-start gap-2">
                <FileText className="h-4 w-4" />
                Offertes
              </Button>
              <Button variant="outline" render={<Link href="/contacts" />} className="justify-start gap-2">
                <Users className="h-4 w-4" />
                Contacten
              </Button>
              <Button variant="outline" render={<Link href="/planning" />} className="justify-start gap-2">
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
                  Geen recente activiteit — begin met het aanmaken van opdrachten.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: typeof FolderOpen;
  color: string;
}) {
  const [bgColor, textColor] = color.split(" ");
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-sm ${bgColor}`}
          >
            <Icon className={`h-5 w-5 ${textColor}`} />
          </div>
          <div>
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
