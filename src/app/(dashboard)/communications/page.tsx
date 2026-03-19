"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Phone, Send, SettingsIcon } from "lucide-react";

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
  const communications = useQuery(api.communications.list, {});
  const stats = useQuery(api.communications.stats);
  const templates = useQuery(api.emailTemplates.list);

  const activeTemplateCount = templates?.filter((t) => t.isActive).length ?? 0;

  const statCards = [
    {
      label: "Verzonden deze maand",
      value: stats?.sentThisMonth ?? 0,
      icon: Send,
      color: "bg-emerald-500/20 text-emerald-400",
    },
    {
      label: "Concepten",
      value: stats?.concepts ?? 0,
      icon: Mail,
      color: "bg-blue-500/20 text-blue-400",
    },
    {
      label: "Mislukt",
      value: stats?.failed ?? 0,
      icon: MessageSquare,
      color: "bg-orange-500/20 text-orange-400",
    },
    {
      label: "Templates actief",
      value: activeTemplateCount,
      icon: Mail,
      color: "bg-purple-500/20 text-purple-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Communicatie</h1>
          <p className="text-sm text-muted-foreground">
            Overzicht van verzonden emails en berichten.
          </p>
        </div>
        <Link href="/settings/email-templates">
          <Button variant="outline">
            <SettingsIcon className="size-4" />
            Email-templates
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-sm ${stat.color.split(" ")[0]}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color.split(" ")[1]}`} />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {stats === undefined ? "\u2014" : stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent communications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recente communicatie</CardTitle>
        </CardHeader>
        <CardContent>
          {communications === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-sm bg-muted/30" />
              ))}
            </div>
          ) : communications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Mail className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Nog geen communicatie verzonden.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {communications.map((comm) => {
                const Icon = typeIcons[comm.type] || Mail;
                return (
                  <div
                    key={comm._id}
                    className="flex items-center justify-between rounded-sm border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {comm.subject ?? "Geen onderwerp"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {comm.toEmail ? `Aan: ${comm.toEmail}` : comm.type}
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
                        {statusLabels[comm.status] ?? comm.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
