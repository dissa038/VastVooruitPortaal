"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Loader2,
} from "lucide-react";

// ============================================================================
// Dutch currency formatter (cents -> euros)
// ============================================================================

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ============================================================================
// Signature Canvas Component
// ============================================================================

function SignatureCanvas({
  onSignatureChange,
}: {
  onSignatureChange: (hasSignature: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      isDrawing.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    },
    [getPos]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#EAE3DF";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    },
    [getPos]
  );

  const endDraw = useCallback(() => {
    isDrawing.current = false;
    onSignatureChange(true);
  }, [onSignatureChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={200}
      className="w-full rounded-sm border border-[#EAE3DF]/20 bg-[#0E2D2D] touch-none cursor-crosshair"
      style={{ height: "120px" }}
      onMouseDown={startDraw}
      onMouseMove={draw}
      onMouseUp={endDraw}
      onMouseLeave={endDraw}
      onTouchStart={startDraw}
      onTouchMove={draw}
      onTouchEnd={endDraw}
    />
  );
}

function clearCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// ============================================================================
// Main Page
// ============================================================================

export default function OffertePage() {
  const params = useParams();
  const rawId = params.id as string;

  // Validate Convex ID format before querying
  const isValidId = rawId && rawId.length > 10 && !rawId.includes(" ");
  const quoteId = rawId as Id<"quotes">;

  const quote = useQuery(
    api.quotes.getPublicById,
    isValidId ? { id: quoteId } : "skip"
  );
  const acceptQuote = useMutation(api.quotes.acceptQuote);
  const rejectQuote = useMutation(api.quotes.rejectQuote);
  const generateUploadUrl = useMutation(api.quotes.generateSignatureUploadUrl);

  const [signedByName, setSignedByName] = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [acceptResult, setAcceptResult] = useState<{
    referenceCode: string;
  } | null>(null);
  const [rejected, setRejected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Loading state
  if (isValidId && quote === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0E2D2D]">
        <div className="animate-pulse text-[#EAE3DF]">Laden...</div>
      </div>
    );
  }

  // Not found or invalid ID
  if (!isValidId || quote === null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0E2D2D] px-4 text-center">
        <Image
          src="/logo.png"
          alt="VastVooruit"
          width={48}
          height={48}
          className="mb-6"
        />
        <h1 className="text-xl font-semibold text-[#EAE3DF]">
          Offerte niet gevonden
        </h1>
        <p className="mt-2 text-sm text-[#EAE3DF]/60">
          Deze offerte bestaat niet of is verwijderd.
        </p>
      </div>
    );
  }

  // At this point quote is guaranteed to be defined (early returns above handle undefined/null)
  const q = quote!;
  const isAccepted = q.status === "GEACCEPTEERD" || acceptResult !== null;
  const isRejected = q.status === "AFGEWEZEN" || rejected;
  const isExpired = q.status === "VERLOPEN";
  const canRespond =
    !isAccepted && !isRejected && !isExpired && q.status !== "CONCEPT";
  const needsSignature = q.totalInclVat > 100000; // > 1000 EUR in cents

  const sortedLineItems = [...q.lineItems].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  async function handleAccept() {
    if (!signedByName.trim()) {
      setError("Vul uw naam in om te ondertekenen");
      return;
    }
    if (needsSignature && !hasSignature) {
      setError("Plaats uw handtekening in het tekenveld");
      return;
    }

    setError(null);
    setIsAccepting(true);

    try {
      let signatureStorageId: Id<"_storage"> | undefined;

      // Upload signature if canvas has content
      if (needsSignature) {
        const canvas = document.querySelector(
          "canvas"
        ) as HTMLCanvasElement | null;
        if (canvas) {
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png")
          );
          if (blob) {
            const uploadUrl = await generateUploadUrl();
            const result = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": "image/png" },
              body: blob,
            });
            const { storageId } = await result.json();
            signatureStorageId = storageId;
          }
        }
      }

      const result = await acceptQuote({
        id: quoteId,
        signedByName: signedByName.trim(),
        signatureStorageId,
      });

      setAcceptResult(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er ging iets mis bij het accepteren"
      );
    } finally {
      setIsAccepting(false);
    }
  }

  async function handleReject() {
    setError(null);
    setIsRejecting(true);

    try {
      await rejectQuote({
        id: quoteId,
        reason: rejectReason.trim() || undefined,
      });
      setRejected(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er ging iets mis bij het afwijzen"
      );
    } finally {
      setIsRejecting(false);
    }
  }

  // Success screen after acceptance
  if (acceptResult) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0E2D2D] px-4 text-center">
        <Image
          src="/logo.png"
          alt="VastVooruit"
          width={48}
          height={48}
          className="mb-6"
        />
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#14AF52]/20 mb-4">
          <CheckCircle2 className="h-8 w-8 text-[#14AF52]" />
        </div>
        <h1 className="text-xl font-semibold text-[#EAE3DF]">
          Offerte geaccepteerd
        </h1>
        <p className="mt-2 text-sm text-[#EAE3DF]/60">
          Bedankt! Uw offerte {q.referenceCode} is geaccepteerd.
        </p>
        <p className="mt-1 text-sm text-[#EAE3DF]/60">
          Projectreferentie: <span className="font-mono text-[#14AF52]">{acceptResult.referenceCode}</span>
        </p>
        <p className="mt-4 text-xs text-[#EAE3DF]/40">
          Wij nemen zo spoedig mogelijk contact met u op.
        </p>
      </div>
    );
  }

  // Rejection confirmation screen
  if (rejected) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0E2D2D] px-4 text-center">
        <Image
          src="/logo.png"
          alt="VastVooruit"
          width={48}
          height={48}
          className="mb-6"
        />
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 mb-4">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-[#EAE3DF]">
          Offerte afgewezen
        </h1>
        <p className="mt-2 text-sm text-[#EAE3DF]/60">
          De offerte {q.referenceCode} is afgewezen.
        </p>
        <p className="mt-4 text-xs text-[#EAE3DF]/40">
          Heeft u vragen? Neem gerust contact met ons op.
        </p>
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold text-[#EAE3DF]">Offerte</h1>
          <p className="mt-1 font-mono text-sm text-[#EAE3DF]/60">
            {q.referenceCode}
          </p>
        </div>

        {/* Status banner for already resolved quotes */}
        {isAccepted && (
          <div className="mb-6 rounded-sm border border-[#14AF52]/30 bg-[#14AF52]/10 p-4 text-center">
            <CheckCircle2 className="mx-auto h-6 w-6 text-[#14AF52] mb-2" />
            <p className="text-sm font-medium text-[#14AF52]">
              Deze offerte is geaccepteerd
            </p>
            {q.acceptedAt && (
              <p className="mt-1 text-xs text-[#EAE3DF]/40">
                op {formatDate(q.acceptedAt)}
                {q.signedByName && ` door ${q.signedByName}`}
              </p>
            )}
          </div>
        )}

        {isRejected && (
          <div className="mb-6 rounded-sm border border-red-500/30 bg-red-500/10 p-4 text-center">
            <XCircle className="mx-auto h-6 w-6 text-red-400 mb-2" />
            <p className="text-sm font-medium text-red-400">
              Deze offerte is afgewezen
            </p>
            {q.rejectedAt && (
              <p className="mt-1 text-xs text-[#EAE3DF]/40">
                op {formatDate(q.rejectedAt)}
              </p>
            )}
          </div>
        )}

        {isExpired && (
          <div className="mb-6 rounded-sm border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
            <p className="text-sm font-medium text-yellow-400">
              Deze offerte is verlopen
            </p>
            {q.validUntil && (
              <p className="mt-1 text-xs text-[#EAE3DF]/40">
                Geldig tot {formatDate(q.validUntil)}
              </p>
            )}
          </div>
        )}

        {/* Quote details card */}
        <div className="rounded-sm border border-[#EAE3DF]/10 bg-[#EAE3DF]/5 p-4 md:p-6">
          {/* Meta info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
            {q.companyName && (
              <div>
                <p className="text-xs text-[#EAE3DF]/40">Bedrijf</p>
                <p className="text-sm text-[#EAE3DF]">{q.companyName}</p>
              </div>
            )}
            {q.contactName && (
              <div>
                <p className="text-xs text-[#EAE3DF]/40">Contactpersoon</p>
                <p className="text-sm text-[#EAE3DF]">{q.contactName}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[#EAE3DF]/40">Referentie</p>
              <p className="text-sm font-mono text-[#EAE3DF]">
                {q.referenceCode}
              </p>
            </div>
            {q.sentAt && (
              <div>
                <p className="text-xs text-[#EAE3DF]/40">Datum</p>
                <p className="text-sm text-[#EAE3DF]">
                  {formatDate(q.sentAt)}
                </p>
              </div>
            )}
            {q.validUntil && (
              <div>
                <p className="text-xs text-[#EAE3DF]/40">Geldig tot</p>
                <p className="text-sm text-[#EAE3DF]">
                  {formatDate(q.validUntil)}
                </p>
              </div>
            )}
          </div>

          {/* Title */}
          {q.title && (
            <h2 className="mb-4 text-base font-medium text-[#EAE3DF]">
              {q.title}
            </h2>
          )}

          {/* Intro text */}
          {q.introText && (
            <p className="mb-6 text-sm text-[#EAE3DF]/70 whitespace-pre-line">
              {q.introText}
            </p>
          )}

          {/* Line items table */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EAE3DF]/10">
                  <th className="pb-2 text-left text-xs font-medium text-[#EAE3DF]/40">
                    Omschrijving
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-[#EAE3DF]/40">
                    Aantal
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-[#EAE3DF]/40">
                    Stukprijs
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-[#EAE3DF]/40">
                    Totaal
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLineItems.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-[#EAE3DF]/5"
                  >
                    <td className="py-2 text-[#EAE3DF]">{item.description}</td>
                    <td className="py-2 text-right text-[#EAE3DF]/70">
                      {item.quantity}
                    </td>
                    <td className="py-2 text-right text-[#EAE3DF]/70">
                      {formatEuro(item.unitPriceExVat)}
                    </td>
                    <td className="py-2 text-right text-[#EAE3DF]">
                      {formatEuro(item.totalExVat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-1 border-t border-[#EAE3DF]/10 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-[#EAE3DF]/60">Subtotaal excl. BTW</span>
              <span className="text-[#EAE3DF]">
                {formatEuro(q.totalExVat)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#EAE3DF]/60">BTW (21%)</span>
              <span className="text-[#EAE3DF]">
                {formatEuro(q.vatAmount)}
              </span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-[#EAE3DF]/10">
              <span className="text-[#EAE3DF]">Totaal incl. BTW</span>
              <span className="text-[#14AF52]">
                {formatEuro(q.totalInclVat)}
              </span>
            </div>
          </div>
        </div>

        {/* Conditions */}
        {q.conditions && (
          <div className="mt-6 rounded-sm border border-[#EAE3DF]/10 bg-[#EAE3DF]/5 p-4 md:p-6">
            <h3 className="mb-2 text-sm font-medium text-[#EAE3DF]">
              Voorwaarden
            </h3>
            <p className="text-xs text-[#EAE3DF]/60 whitespace-pre-line leading-relaxed">
              {q.conditions}
            </p>
          </div>
        )}

        {/* PDF Download */}
        <div className="mt-4 flex justify-center">
          <a
            href={`/api/quotes/${quoteId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[#EAE3DF]/40 hover:text-[#EAE3DF]/70 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
        </div>

        {/* Accept / Reject actions */}
        {canRespond && (
          <div className="mt-8 space-y-6">
            {/* Accept section */}
            <div className="rounded-sm border border-[#14AF52]/20 bg-[#14AF52]/5 p-4 md:p-6">
              <h3 className="mb-4 text-sm font-medium text-[#EAE3DF]">
                Offerte accepteren
              </h3>

              {/* Name input */}
              <div className="mb-4">
                <label className="mb-1 block text-xs text-[#EAE3DF]/60">
                  Uw naam (verplicht)
                </label>
                <input
                  type="text"
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                  placeholder="Naam ondertekenaar"
                  className="w-full rounded-sm border border-[#EAE3DF]/20 bg-[#0E2D2D] px-3 py-2 text-sm text-[#EAE3DF] placeholder:text-[#EAE3DF]/30 focus:border-[#14AF52] focus:outline-none"
                />
              </div>

              {/* Signature canvas (only for > 1000 EUR) */}
              {needsSignature && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-[#EAE3DF]/60">
                      Digitale handtekening (verplicht bij bedragen boven
                      {" "}{formatEuro(100000)})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const canvas = document.querySelector("canvas");
                        if (canvas) {
                          clearCanvas(canvas);
                          setHasSignature(false);
                        }
                      }}
                      className="text-xs text-[#EAE3DF]/40 hover:text-[#EAE3DF]/70"
                    >
                      Wissen
                    </button>
                  </div>
                  <SignatureCanvas onSignatureChange={setHasSignature} />
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="mb-3 text-xs text-red-400">{error}</p>
              )}

              {/* Accept button */}
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full rounded-sm bg-[#14AF52] px-4 py-3 text-sm font-medium text-white hover:bg-[#14AF52]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Bezig met accepteren...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Offerte accepteren
                  </>
                )}
              </button>
            </div>

            {/* Reject section */}
            <div className="rounded-sm border border-[#EAE3DF]/10 bg-[#EAE3DF]/5 p-4 md:p-6">
              {!showRejectForm ? (
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="w-full text-sm text-[#EAE3DF]/40 hover:text-[#EAE3DF]/70 transition-colors"
                >
                  Offerte afwijzen
                </button>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[#EAE3DF]">
                    Offerte afwijzen
                  </h3>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reden voor afwijzing (optioneel)"
                    rows={3}
                    className="w-full rounded-sm border border-[#EAE3DF]/20 bg-[#0E2D2D] px-3 py-2 text-sm text-[#EAE3DF] placeholder:text-[#EAE3DF]/30 focus:border-red-400 focus:outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={isRejecting}
                      className="flex-1 rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                    >
                      {isRejecting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Bezig...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          Bevestig afwijzing
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason("");
                      }}
                      className="rounded-sm border border-[#EAE3DF]/20 px-4 py-2 text-sm text-[#EAE3DF]/60 hover:text-[#EAE3DF] transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#EAE3DF]/30">
            Vragen over deze offerte? Neem contact op met VastVooruit
          </p>
        </div>
      </div>
    </div>
  );
}
