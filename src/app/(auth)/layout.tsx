import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

const features = [
  "Opdrachten van intake tot registratie",
  "Offertes, facturen & Moneybird-koppeling",
  "Slimme planning met Outlook-sync",
  "Digitale dossiervorming & 15-jaar bewaarplicht",
  "Track & trace voor opdrachtgevers",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-[#0E2D2D]">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16">
        {/* Top — logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="VastVooruit"
            width={36}
            height={36}
            className="rounded-sm"
          />
          <span className="text-lg font-semibold text-[#EAE3DF] tracking-tight">
            VastVooruit
          </span>
        </div>

        {/* Center — hero content */}
        <div className="max-w-md">
          <h1 className="text-3xl font-bold text-[#EAE3DF] leading-tight xl:text-4xl">
            Jouw partner in vastgoed verduurzaming
          </h1>
          <p className="mt-4 text-base text-[#EAE3DF]/60 leading-relaxed">
            Van energielabels tot strategisch verduurzamingsadvies. Beheer al je
            opdrachten, offertes en facturen in één portaal.
          </p>

          {/* Feature list */}
          <ul className="mt-8 space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#14AF52] mt-0.5" />
                <span className="text-sm text-[#EAE3DF]/80">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — stats */}
        <div className="flex gap-8">
          <div>
            <p className="text-2xl font-bold text-[#14AF52]">25+</p>
            <p className="text-xs text-[#EAE3DF]/40">EP-adviseurs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#14AF52]">1000+</p>
            <p className="text-xs text-[#EAE3DF]/40">Labels per jaar</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#14AF52]">NL</p>
            <p className="text-xs text-[#EAE3DF]/40">Heel Nederland</p>
          </div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex w-full items-center justify-center px-4 lg:w-1/2 lg:bg-[#0a2020]">
        {/* Mobile logo (only shown on small screens) */}
        <div className="absolute top-6 left-4 flex items-center gap-2 lg:hidden">
          <Image
            src="/logo.png"
            alt="VastVooruit"
            width={28}
            height={28}
            className="rounded-sm"
          />
          <span className="text-sm font-semibold text-[#EAE3DF] tracking-tight">
            VastVooruit
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
