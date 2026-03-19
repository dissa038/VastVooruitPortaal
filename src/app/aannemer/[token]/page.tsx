"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  FileText,
  Loader2,
} from "lucide-react";

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

const STATUS_COLORS: Record<string, string> = {
  NIET_AANGELEVERD: "#6b7280",
  AANGELEVERD: "#eab308",
  GOEDGEKEURD: "#14AF52",
  AFGEKEURD: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  NIET_AANGELEVERD: "Niet aangeleverd",
  AANGELEVERD: "Aangeleverd",
  GOEDGEKEURD: "Goedgekeurd",
  AFGEKEURD: "Afgekeurd",
};

// ============================================================================
// Component
// ============================================================================

export default function AannemerPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const data = useQuery(api.nieuwbouw.getByAccessToken, { token });

  if (data === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0E2D2D]">
        <div className="animate-pulse text-[#EAE3DF]">Laden...</div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0E2D2D] px-4 text-center">
        <Image src="/logo.png" alt="VastVooruit" width={48} height={48} className="mb-6" />
        <h1 className="text-xl font-semibold text-[#EAE3DF]">Toegang geweigerd</h1>
        <p className="mt-2 text-sm text-[#EAE3DF]/60">
          Deze link is ongeldig of verlopen. Neem contact op met VastVooruit.
        </p>
      </div>
    );
  }

  // Group requirements by element
  type AannemerRequirement = (typeof data.requirements)[number];
  const grouped: Record<string, AannemerRequirement[]> = {};
  for (const req of data.requirements) {
    if (!grouped[req.element]) grouped[req.element] = [];
    grouped[req.element].push(req);
  }

  const completeness = data.completenessPercentage ?? 0;

  return (
    <div className="min-h-dvh bg-[#0E2D2D] px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="VastVooruit"
            width={40}
            height={40}
            className="mx-auto mb-4"
          />
          <h1 className="text-lg font-semibold text-[#EAE3DF]">
            Aannemer Portaal
          </h1>
          <p className="mt-1 text-sm text-[#EAE3DF]/60">{data.projectName}</p>
        </div>

        {/* Completeness */}
        <div className="mb-6 rounded-sm border border-[#EAE3DF]/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#EAE3DF]">Dossier voortgang</span>
            <span className="text-sm text-[#EAE3DF]/60">{completeness}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#EAE3DF]/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#14AF52] transition-all duration-500"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        {/* Project info */}
        <div className="mb-6 flex flex-wrap gap-4 text-sm text-[#EAE3DF]/60">
          {data.woningType && <span>Type: {data.woningType}</span>}
          {data.aantalWoningen && <span>{data.aantalWoningen} woningen</span>}
        </div>

        {/* Requirements per element */}
        <div className="space-y-4">
          {ELEMENT_ORDER.map((element) => {
            const reqs = grouped[element];
            if (!reqs || reqs.length === 0) return null;

            return (
              <div key={element} className="rounded-sm border border-[#EAE3DF]/10 overflow-hidden">
                <div className="border-b border-[#EAE3DF]/10 px-4 py-3 bg-[#EAE3DF]/5">
                  <h3 className="text-sm font-medium text-[#EAE3DF]">
                    {ELEMENT_LABELS[element] ?? element}
                  </h3>
                </div>
                <div className="divide-y divide-[#EAE3DF]/5">
                  {reqs.map((req) => (
                    <RequirementRow key={req._id} req={req} token={token} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[key] }}
              />
              <span className="text-xs text-[#EAE3DF]/40">{label}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#EAE3DF]/30">
            Vragen? Neem contact op met VastVooruit
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Requirement Row with upload
// ============================================================================

type Requirement = {
  _id: Id<"nieuwbouwDocumentRequirements">;
  element: string;
  documentType: string;
  description: string;
  isRequired: boolean;
  status: string;
  rejectionReason?: string | null;
  documentUrl: string | null;
  documentName: string | null;
  sortOrder: number;
};

function RequirementRow({ req, token }: { req: Requirement; token: string }) {
  const generateUploadUrl = useMutation(api.nieuwbouw.generatePublicUploadUrl);
  const uploadDocument = useMutation(api.nieuwbouw.uploadDocument);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusColor = STATUS_COLORS[req.status] ?? STATUS_COLORS.NIET_AANGELEVERD;

  const StatusIcon =
    req.status === "GOEDGEKEURD" ? CheckCircle2
    : req.status === "AFGEKEURD" ? XCircle
    : req.status === "AANGELEVERD" ? FileText
    : Clock;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({ token });
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      await uploadDocument({
        token,
        requirementId: req._id,
        storageId,
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: file.size,
      });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const canUpload = req.status === "NIET_AANGELEVERD" || req.status === "AFGEKEURD";

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: statusColor }}
          />
          <StatusIcon className="h-4 w-4 shrink-0" style={{ color: statusColor }} />
          <span className="text-sm text-[#EAE3DF] truncate">{req.description}</span>
          {req.isRequired && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EAE3DF]/10 text-[#EAE3DF]/50 shrink-0">
              Verplicht
            </span>
          )}
        </div>

        {req.documentName && req.documentUrl && (
          <a
            href={req.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 ml-[18px] flex items-center gap-1 text-xs text-[#14AF52] hover:underline"
          >
            <FileText className="h-3 w-3" />
            {req.documentName}
          </a>
        )}

        {req.rejectionReason && req.status === "AFGEKEURD" && (
          <p className="mt-1 ml-[18px] text-xs text-red-400">
            Reden afkeuring: {req.rejectionReason}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-[18px] sm:ml-0">
        <span
          className="text-xs px-2 py-1 rounded"
          style={{
            backgroundColor: `${statusColor}20`,
            color: statusColor,
          }}
        >
          {STATUS_LABELS[req.status]}
        </span>

        {canUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium bg-[#14AF52] text-white hover:bg-[#14AF52]/90 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading ? "Uploaden..." : "Upload"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
