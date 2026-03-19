"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileTextIcon,
  ExternalLinkIcon,
  TrashIcon,
  ImageIcon,
  FileIcon,
} from "lucide-react";
import type { Id, Doc } from "../../../convex/_generated/dataModel";

// ============================================================================
// Category labels + colors
// ============================================================================

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  FOTO_BUITEN: { label: "Foto (buiten)", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  FOTO_BINNEN: { label: "Foto (binnen)", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  OPNAMEFORMULIER: { label: "Opnameformulier", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  ENERGIELABEL_PDF: { label: "Energielabel", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  VERDUURZAMINGSADVIES_PDF: { label: "Verduurzamingsadvies", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  NEN2580_RAPPORT: { label: "NEN2580", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  WWS_RAPPORT: { label: "WWS Rapport", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  BENG_BEREKENING: { label: "BENG", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  BLOWERDOORTEST_RAPPORT: { label: "Blowerdoortest", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  BOUWTEKENING: { label: "Bouwtekening", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  RC_BEREKENING: { label: "RC Berekening", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  ISOLATIE_CERTIFICAAT: { label: "Isolatie Cert.", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  VERKLARING: { label: "Verklaring", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  PLATTEGROND: { label: "Plattegrond", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  OFFERTE_PDF: { label: "Offerte", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  FACTUUR_PDF: { label: "Factuur", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  CONTRACT: { label: "Contract", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  CORRESPONDENTIE: { label: "Correspondentie", color: "text-muted-foreground border-muted" },
  OVERIG: { label: "Overig", color: "text-muted-foreground border-muted" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return ImageIcon;
  if (fileType === "application/pdf") return FileTextIcon;
  return FileIcon;
}

// ============================================================================
// Document row with preview URL
// ============================================================================

function DocumentRow({
  doc,
  onArchive,
}: {
  doc: Doc<"documents">;
  onArchive: (id: Id<"documents">) => void;
}) {
  const url = useQuery(api.documents.getUrl, { storageId: doc.storageId });
  const Icon = getFileIcon(doc.fileType);
  const catConfig = CATEGORY_CONFIG[doc.category] ?? CATEGORY_CONFIG.OVERIG;

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
      <Icon className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-sm font-medium truncate">{doc.fileName}</span>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={catConfig.color}>
            {catConfig.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(doc.uploadedAt)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatFileSize(doc.fileSizeBytes)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon-xs">
              <ExternalLinkIcon className="size-3.5" />
            </Button>
          </a>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onArchive(doc._id)}
        >
          <TrashIcon className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main document list
// ============================================================================

interface DocumentListProps {
  orderId: Id<"orders">;
  groupByCategory?: boolean;
}

export function DocumentList({ orderId, groupByCategory = true }: DocumentListProps) {
  const documents = useQuery(api.documents.listByOrder, { orderId });
  const archiveDocument = useMutation(api.documents.archive);

  if (documents === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/30" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <FileTextIcon className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nog geen documenten</p>
      </div>
    );
  }

  const handleArchive = async (id: Id<"documents">) => {
    await archiveDocument({ id });
  };

  if (!groupByCategory) {
    return (
      <div className="flex flex-col gap-2">
        {documents.map((doc) => (
          <DocumentRow key={doc._id} doc={doc} onArchive={handleArchive} />
        ))}
      </div>
    );
  }

  // Group by category
  const grouped = new Map<string, Doc<"documents">[]>();
  for (const doc of documents) {
    const existing = grouped.get(doc.category) ?? [];
    existing.push(doc);
    grouped.set(doc.category, existing);
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([cat, docs]) => {
        const catConfig = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.OVERIG;
        return (
          <div key={cat} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {catConfig.label} ({docs.length})
            </p>
            {docs.map((doc) => (
              <DocumentRow key={doc._id} doc={doc} onArchive={handleArchive} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
