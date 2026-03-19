"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function DashboardPage() {
  const user = useQuery(api.users.getAuthUser);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welkom{user ? `, ${user.firstName}` : ""}. Overzicht van alle
          lopende opdrachten.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Nieuwe opdrachten" value="—" />
        <StatCard label="In uitwerking" value="—" />
        <StatCard label="Openstaande facturen" value="—" />
        <StatCard label="Vandaag ingepland" value="—" />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
