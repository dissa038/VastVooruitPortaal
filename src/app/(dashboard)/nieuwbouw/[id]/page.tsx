"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  ExternalLink,
  KeyRound,
  Copy,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

// ============================================================================
// Constants
// ============================================================================

const ELEMENT_LABELS: Record<string, string> = {
  VLOER: "Vloer",
  GEVEL: "Gevel",
  DAK: "Dak",
  KOZIJN: "Kozijn",
  INSTALLATIE: "Installatie",
  ALGEMEEN: "Algemeen",
};

const ELEMENT_ORDER = ["VLOER", "GEVEL", "DAK", "KOZIJN", "INSTALLATIE", "ALGEMEEN"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  NIET_AANGELEVERD: {
    label: "Niet aangeleverd",
    color: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
    icon: Clock,
  },
  AANGELEVERD: {
    label: "Aangeleverd",
    color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
    icon: Upload,
  },
  GOEDGEKEURD: {
    label: "Goedgekeurd",
    color: "bg-green-500/15 text-green-600 dark:text-green-400",
    icon: CheckCircle2,
  },
  AFGEKEURD: {
    label: "Afgekeurd",
    color: "bg-red-500/15 text-red-600 dark:text-red-400",
    icon: XCircle,
  },
};

// ============================================================================
// Component
// ============================================================================

export default function NieuwbouwDetailPage() {
  const params = useParams();
  const rawId = params.id as string;
  const isValidId = typeof rawId === "string" && rawId.length > 10 && !rawId.includes(" ");
  const id = rawId as Id<"nieuwbouwProjects">;
  const data = useQuery(api.nieuwbouw.getById, isValidId ? { id } : "skip");
  const updateStatus = useMutation(api.nieuwbouw.updateRequirementStatus);
  const generateToken = useMutation(api.nieuwbouw.generateAccessToken);

  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [rejectionReasonMap, setRejectionReasonMap] = useState<Record<string, string>>({});
  const [copiedToken, setCopiedToken] = useState(false);

  if (isValidId && data === undefined) {
    return <DetailSkeleton />;
  }

  if (!isValidId || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <h2 className="text-lg font-medium">Project niet gevonden</h2>
        <Link
          href="/nieuwbouw"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Terug naar overzicht
        </Link>
      </div>
    );
  }

  const completeness = data.completenessPercentage ?? 0;

  // Group requirements by element
  type Requirement = (typeof data.requirements)[number];
  const grouped: Record<string, Requirement[]> = {};
  for (const req of data.requirements) {
    if (!grouped[req.element]) grouped[req.element] = [];
    grouped[req.element].push(req);
  }

  async function handleApprove(reqId: Id<"nieuwbouwDocumentRequirements">) {
    await updateStatus({ id: reqId, status: "GOEDGEKEURD" });
  }

  async function handleReject(reqId: Id<"nieuwbouwDocumentRequirements">) {
    const reason = rejectionReasonMap[reqId] || undefined;
    await updateStatus({ id: reqId, status: "AFGEKEURD", rejectionReason: reason });
  }

  async function handleGenerateToken() {
    const token = await generateToken({ id });
    setGeneratedToken(token);
  }

  function copyTokenUrl() {
    const token = generatedToken || data?.accessToken;
    if (!token) return;
    const url = `${window.location.origin}/aannemer/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/nieuwbouw"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar overzicht
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{data.project?.name ?? "—"}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {data.aannemer && <span>Aannemer: {data.aannemer.name}</span>}
            {data.woningType && <span>Type: {data.woningType}</span>}
            {data.aantalWoningen && <span>{data.aantalWoningen} woningen</span>}
          </div>
        </div>
      </div>

      {/* Completeness bar */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Dossier compleetheid</span>
          <span className="text-sm text-muted-foreground">{completeness}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[#14AF52] transition-all duration-500"
            style={{ width: `${completeness}%` }}
          />
        </div>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span>{data.fulfilledRequirements ?? 0} goedgekeurd</span>
          <span>{(data.totalRequirements ?? 0) - (data.fulfilledRequirements ?? 0)} openstaand</span>
        </div>
      </div>

      {/* Access token */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Aannemer portaal toegang</span>
        </div>
        {(generatedToken || data.accessToken) ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 rounded border bg-muted px-3 py-1.5 text-sm font-mono">
              {window.location.origin}/aannemer/{generatedToken || data.accessToken}
            </code>
            <Button variant="outline" size="sm" onClick={copyTokenUrl}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {copiedToken ? "Gekopieerd!" : "Kopieer link"}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleGenerateToken}>
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Toegangslink genereren
          </Button>
        )}
        {data.accessTokenExpiresAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            Verloopt op: {new Date(data.accessTokenExpiresAt).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Document requirements per element */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Documentvereisten</h2>

        {ELEMENT_ORDER.map((element) => {
          const reqs = grouped[element];
          if (!reqs || reqs.length === 0) return null;

          return (
            <div key={element} className="rounded-lg border bg-card">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-medium">{ELEMENT_LABELS[element] ?? element}</h3>
              </div>
              <div className="divide-y">
                {reqs.map((req) => {
                  const statusConfig = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.NIET_AANGELEVERD;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div key={req._id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4 shrink-0" style={{
                            color: req.status === "GOEDGEKEURD" ? "#14AF52"
                              : req.status === "AFGEKEURD" ? "#ef4444"
                              : req.status === "AANGELEVERD" ? "#eab308"
                              : "#6b7280"
                          }} />
                          <span className="text-sm font-medium truncate">{req.description}</span>
                          {req.isRequired && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">Verplicht</Badge>
                          )}
                        </div>
                        {req.documentName && (
                          <div className="mt-1 flex items-center gap-1.5 ml-6">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            {req.documentUrl ? (
                              <a
                                href={req.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                              >
                                {req.documentName}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">{req.documentName}</span>
                            )}
                          </div>
                        )}
                        {req.rejectionReason && req.status === "AFGEKEURD" && (
                          <p className="mt-1 ml-6 text-xs text-red-500">
                            Reden: {req.rejectionReason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-6 sm:ml-0">
                        <Badge variant="secondary" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>

                        {(req.status === "AANGELEVERD" || req.status === "AFGEKEURD") && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950"
                              onClick={() => handleApprove(req._id)}
                            >
                              Goedkeuren
                            </Button>
                            {req.status === "AANGELEVERD" && (
                              <div className="flex items-center gap-1">
                                <Input
                                  placeholder="Reden..."
                                  className="h-7 w-28 text-xs"
                                  value={rejectionReasonMap[req._id] ?? ""}
                                  onChange={(e) =>
                                    setRejectionReasonMap((prev) => ({
                                      ...prev,
                                      [req._id]: e.target.value,
                                    }))
                                  }
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950"
                                  onClick={() => handleReject(req._id)}
                                >
                                  Afkeuren
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {data.requirements.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card/50 py-12">
            <p className="text-sm text-muted-foreground">
              Nog geen documentvereisten. Voeg vereisten toe om het dossier op te bouwen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-40" />
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="h-3 w-full rounded-full" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
