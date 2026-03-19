"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Clock, MapPin, User, CalendarDays } from "lucide-react";

const statusSteps = [
  { label: "Ontvangen", key: "ontvangen" },
  { label: "Ingepland", key: "ingepland" },
  { label: "Opname gedaan", key: "opname" },
  { label: "In uitwerking", key: "uitwerking" },
  { label: "Gereed", key: "gereed" },
];

function getStepIndex(status: string): number {
  const s = status.toLowerCase();
  if (s.includes("ontvangen") || s.includes("nieuw")) return 0;
  if (s.includes("ingepland")) return 1;
  if (s.includes("opname")) return 2;
  if (s.includes("uitwerking") || s.includes("controle") || s.includes("concept")) return 3;
  if (s.includes("gereed") || s.includes("afgerond") || s.includes("geregistreerd") || s.includes("verzonden")) return 4;
  return 0;
}

export default function TrackAndTracePage() {
  const params = useParams();
  const code = params.code as string;
  const data = useQuery(api.trackAndTrace.getByCode, { code });

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
        <h1 className="text-xl font-semibold text-[#EAE3DF]">Code niet gevonden</h1>
        <p className="mt-2 text-sm text-[#EAE3DF]/60">
          De track & trace code <span className="font-mono">{code}</span> is
          ongeldig of verlopen.
        </p>
      </div>
    );
  }

  const currentStep = getStepIndex(data.lastPublicStatus);

  return (
    <div className="min-h-dvh bg-[#0E2D2D] px-4 py-8">
      <div className="mx-auto max-w-lg">
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
            Track & Trace
          </h1>
          <p className="mt-1 font-mono text-sm text-[#EAE3DF]/60">{code}</p>
        </div>

        {/* Status */}
        <div className="rounded-sm border border-[#14AF52]/30 bg-[#14AF52]/10 p-4">
          <p className="text-sm text-[#EAE3DF]/60">Huidige status</p>
          <p className="mt-1 text-lg font-semibold text-[#14AF52]">
            {data.lastPublicStatus}
          </p>
          <p className="mt-1 text-xs text-[#EAE3DF]/40">
            Laatst bijgewerkt:{" "}
            {new Date(data.lastPublicStatusUpdatedAt).toLocaleDateString(
              "nl-NL",
              { day: "numeric", month: "long", year: "numeric" }
            )}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mt-6 space-y-0">
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentStep;
            const isCurrent = index === currentStep;
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      isCompleted
                        ? "bg-[#14AF52] text-white"
                        : "border border-[#EAE3DF]/20 text-[#EAE3DF]/30"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`h-8 w-0.5 ${
                        index < currentStep
                          ? "bg-[#14AF52]"
                          : "bg-[#EAE3DF]/10"
                      }`}
                    />
                  )}
                </div>
                <div className="pt-1">
                  <p
                    className={`text-sm font-medium ${
                      isCurrent
                        ? "text-[#14AF52]"
                        : isCompleted
                          ? "text-[#EAE3DF]"
                          : "text-[#EAE3DF]/30"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Appointment info */}
        {data.appointmentDate && (
          <div className="mt-6 rounded-sm border border-[#EAE3DF]/10 p-4">
            <h3 className="text-sm font-medium text-[#EAE3DF]">
              Afspraak details
            </h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-[#EAE3DF]/60">
                <CalendarDays className="h-4 w-4" />
                <span>
                  {new Date(data.appointmentDate).toLocaleDateString("nl-NL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              {data.adviseurFirstName && (
                <div className="flex items-center gap-2 text-sm text-[#EAE3DF]/60">
                  <User className="h-4 w-4" />
                  <span>Adviseur: {data.adviseurFirstName}</span>
                </div>
              )}
            </div>
          </div>
        )}

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
