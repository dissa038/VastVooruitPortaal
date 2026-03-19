"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Phone, Send } from "lucide-react";

const recentCommunications = [
  {
    id: "1",
    type: "EMAIL" as const,
    subject: "Bevestiging opname - Kerkstraat 15",
    to: "j.devries@example.nl",
    status: "VERZONDEN" as const,
    sentAt: "2026-03-19T10:30:00",
  },
  {
    id: "2",
    type: "EMAIL" as const,
    subject: "Energielabel gereed - Dorpsstraat 42",
    to: "info@woningcorporatie.nl",
    status: "VERZONDEN" as const,
    sentAt: "2026-03-18T15:45:00",
  },
  {
    id: "3",
    type: "EMAIL" as const,
    subject: "Herinnering betaling FAC-2026-00089",
    to: "admin@belegger.nl",
    status: "CONCEPT" as const,
    sentAt: undefined,
  },
];

const typeIcons: Record<string, typeof Mail> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  WHATSAPP: Phone,
  BRIEF: Send,
};

const statusColors: Record<string, string> = {
  CONCEPT: "text-muted-foreground border-muted",
  VERZONDEN: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  MISLUKT: "bg-destructive/20 text-destructive border-destructive/30",
  GEOPEND: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const statusLabels: Record<string, string> = {
  CONCEPT: "Concept",
  VERZONDEN: "Verzonden",
  MISLUKT: "Mislukt",
  GEOPEND: "Geopend",
};

export default function CommunicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Communicatie</h1>
        <p className="text-sm text-muted-foreground">
          Overzicht van verzonden emails en berichten.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Verzonden deze maand", icon: Send, color: "bg-emerald-500/20 text-emerald-400" },
          { label: "Concepten", icon: Mail, color: "bg-blue-500/20 text-blue-400" },
          { label: "Mislukt", icon: MessageSquare, color: "bg-orange-500/20 text-orange-400" },
          { label: "Templates actief", icon: Mail, color: "bg-purple-500/20 text-purple-400" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${stat.color.split(" ")[0]}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color.split(" ")[1]}`} />
                </div>
                <div>
                  <p className="text-2xl font-semibold">—</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recente communicatie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentCommunications.map((comm) => {
              const Icon = typeIcons[comm.type] || Mail;
              return (
                <div
                  key={comm.id}
                  className="flex items-center justify-between rounded-sm border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{comm.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        Aan: {comm.to}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {comm.sentAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(comm.sentAt).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={statusColors[comm.status] || ""}
                    >
                      {statusLabels[comm.status]}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
