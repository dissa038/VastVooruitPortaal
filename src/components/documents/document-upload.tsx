"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadIcon, FileIcon, XIcon, CheckCircleIcon, LoaderIcon } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

const DOCUMENT_CATEGORIES = [
  { value: "FOTO_BUITEN", label: "Foto (buiten)" },
  { value: "FOTO_BINNEN", label: "Foto (binnen)" },
  { value: "OPNAMEFORMULIER", label: "Opnameformulier" },
  { value: "ENERGIELABEL_PDF", label: "Energielabel PDF" },
  { value: "VERDUURZAMINGSADVIES_PDF", label: "Verduurzamingsadvies PDF" },
  { value: "NEN2580_RAPPORT", label: "NEN2580 Rapport" },
  { value: "WWS_RAPPORT", label: "WWS Rapport" },
  { value: "BENG_BEREKENING", label: "BENG Berekening" },
  { value: "BLOWERDOORTEST_RAPPORT", label: "Blowerdoortest Rapport" },
  { value: "BOUWTEKENING", label: "Bouwtekening" },
  { value: "RC_BEREKENING", label: "RC Berekening" },
  { value: "ISOLATIE_CERTIFICAAT", label: "Isolatie Certificaat" },
  { value: "VERKLARING", label: "Verklaring" },
  { value: "PLATTEGROND", label: "Plattegrond" },
  { value: "OFFERTE_PDF", label: "Offerte PDF" },
  { value: "FACTUUR_PDF", label: "Factuur PDF" },
  { value: "CONTRACT", label: "Contract" },
  { value: "CORRESPONDENTIE", label: "Correspondentie" },
  { value: "OVERIG", label: "Overig" },
] as const;

type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["value"];

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentUploadProps {
  orderId?: Id<"orders">;
  dossierId?: Id<"dossiers">;
  projectId?: Id<"projects">;
  onUploadComplete?: () => void;
}

export function DocumentUpload({
  orderId,
  dossierId,
  projectId,
  onUploadComplete,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("OVERIG");
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return "Ongeldig bestandstype. Upload een PDF, afbeelding of document.";
    }
    if (file.size > 50 * 1024 * 1024) {
      return "Bestand is te groot (max 50MB).";
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setSelectedFile(file);
      setUploadComplete(false);

      // Auto-detect category from filename
      const lower = file.name.toLowerCase();
      if (lower.includes("opname") || lower.includes("formulier")) {
        setCategory("OPNAMEFORMULIER");
      } else if (lower.includes("label") || lower.includes("energielabel")) {
        setCategory("ENERGIELABEL_PDF");
      } else if (lower.includes("offerte")) {
        setCategory("OFFERTE_PDF");
      } else if (lower.includes("factuur")) {
        setCategory("FACTUUR_PDF");
      } else if (file.type.startsWith("image/")) {
        setCategory("FOTO_BUITEN");
      }
    },
    [validateFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      // Step 1: Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!result.ok) {
        throw new Error("Upload naar storage mislukt.");
      }

      const { storageId } = await result.json();

      // Step 3: Create document record
      await createDocument({
        storageId,
        orderId,
        dossierId,
        projectId,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSizeBytes: selectedFile.size,
        category,
      });

      setUploadComplete(true);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploadComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload mislukt. Probeer opnieuw.");
    } finally {
      setUploading(false);
    }
  }, [selectedFile, category, orderId, dossierId, projectId, generateUploadUrl, createDocument, onUploadComplete]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setUploadComplete(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? "border-[var(--color-vv-green)] bg-[var(--color-vv-green)]/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <UploadIcon className="size-8 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-medium">
            Sleep een bestand hierheen
          </p>
          <p className="text-xs text-muted-foreground">
            of klik om te selecteren (PDF, afbeeldingen, documenten)
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* Selected file info */}
      {selectedFile && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <FileIcon className="size-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}

      {/* Category selector + upload button */}
      {selectedFile && (
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>Categorie</Label>
            <Select
              value={category}
              onValueChange={(val) => setCategory(val as DocumentCategory)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Uploaden...
              </>
            ) : (
              <>
                <UploadIcon className="size-4" />
                Uploaden
              </>
            )}
          </Button>
        </div>
      )}

      {/* Success message */}
      {uploadComplete && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          <CheckCircleIcon className="size-4 shrink-0" />
          Document succesvol geupload
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <XIcon className="size-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
