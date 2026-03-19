"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Database, Calendar, FileText, CreditCard, Building2 } from "lucide-react";

const integrations = [
  {
    name: "Moneybird",
    description: "Facturatie & boekhouding",
    icon: CreditCard,
    status: "not_connected" as const,
  },
  {
    name: "Microsoft Outlook",
    description: "Agenda & email synchronisatie",
    icon: Calendar,
    status: "not_connected" as const,
  },
  {
    name: "BAG API (Kadaster)",
    description: "Adres & gebouwgegevens",
    icon: Building2,
    status: "not_connected" as const,
  },
  {
    name: "Convex",
    description: "Realtime database",
    icon: Database,
    status: "connected" as const,
  },
  {
    name: "Clerk",
    description: "Authenticatie & gebruikersbeheer",
    icon: Settings,
    status: "connected" as const,
  },
];

function StatusBadge({ status }: { status: "connected" | "not_connected" }) {
  if (status === "connected") {
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Verbonden</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">Niet verbonden</Badge>;
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Instellingen</h1>
        <p className="text-sm text-muted-foreground">
          Beheer integraties, producten en organisatie-instellingen.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Integraties</CardTitle>
            <CardDescription>
              Externe koppelingen voor facturatie, planning en adresgegevens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between rounded-sm border p-3"
              >
                <div className="flex items-center gap-3">
                  <integration.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{integration.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {integration.description}
                    </p>
                  </div>
                </div>
                <StatusBadge status={integration.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Producten & Prijzen</CardTitle>
            <CardDescription>
              Beheer het productaanbod en de prijsregels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2">
              <FileText className="h-4 w-4" />
              Productcatalogus beheren
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <CreditCard className="h-4 w-4" />
              Prijsregels beheren
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <FileText className="h-4 w-4" />
              Email-templates beheren
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <FileText className="h-4 w-4" />
              Checklist-templates beheren
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Organisatie</CardTitle>
            <CardDescription>
              Algemene instellingen voor VastVooruit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-sm border p-3">
              <div>
                <p className="text-sm font-medium">Standaard betalingstermijn</p>
                <p className="text-xs text-muted-foreground">Dagen na factuurdatum</p>
              </div>
              <span className="text-sm font-mono">30 dagen</span>
            </div>
            <div className="flex items-center justify-between rounded-sm border p-3">
              <div>
                <p className="text-sm font-medium">BTW-percentage</p>
                <p className="text-xs text-muted-foreground">Standaard voor alle producten</p>
              </div>
              <span className="text-sm font-mono">21%</span>
            </div>
            <div className="flex items-center justify-between rounded-sm border p-3">
              <div>
                <p className="text-sm font-medium">Referentiecode prefix</p>
                <p className="text-xs text-muted-foreground">Voor opdrachten, offertes, facturen</p>
              </div>
              <span className="text-sm font-mono">VV-2026-</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gebruikers</CardTitle>
            <CardDescription>
              Teamleden en hun rollen binnen het portaal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gebruikers worden automatisch gesynchroniseerd vanuit Clerk.
              Roltoewijzing kan via het Clerk-dashboard.
            </p>
            <Button variant="outline" className="mt-3 w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              Clerk Dashboard openen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
