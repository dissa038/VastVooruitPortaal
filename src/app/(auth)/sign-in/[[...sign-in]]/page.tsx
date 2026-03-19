"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function SignInPage() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const isSubmitting = fetchStatus === "fetching";

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      await signIn.sso({ strategy: "oauth_google", redirectCallbackUrl: "/sso-callback", redirectUrl: "/" });
    } catch (err: unknown) {
      setError("Er ging iets mis met Google inloggen.");
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { error: signInError } = await signIn.password({
      emailAddress: email,
      password,
    });

    if (signInError) {
      const code = signInError.code || "";
      if (code.includes("invalid") || code.includes("identifier")) {
        setError("Ongeldig e-mailadres.");
      } else if (code.includes("password") || code.includes("incorrect")) {
        setError("Onjuist wachtwoord. Probeer het opnieuw.");
      } else if (code.includes("not_found")) {
        setError("Account niet gevonden. Controleer je e-mailadres.");
      } else {
        setError(signInError.message || "Inloggen mislukt.");
      }
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
    }
  };

  return (
    <div className="w-full max-w-[420px] px-4">
      <div className="rounded-[0.25rem] border border-[#2a5a5a] bg-[#163838] p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="VastVooruit"
            width={48}
            height={48}
            className="h-12 w-auto"
          />
          <h1 className="text-xl font-semibold text-[#EAE3DF]">Inloggen</h1>
          <p className="text-sm text-[#EAE3DF]/60">
            om verder te gaan naar VastVooruit Portaal
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-[0.25rem] border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Google OAuth */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[0.25rem] border border-[#14AF52]/30 bg-[#14AF52]/10 text-sm font-medium text-[#14AF52] transition-colors hover:bg-[#14AF52]/20 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <svg className="size-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Doorgaan met Google
            </>
          )}
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#2a5a5a]" />
          <span className="text-xs text-[#EAE3DF]/40">of</span>
          <div className="h-px flex-1 bg-[#2a5a5a]" />
        </div>

        {/* Email + Password Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#EAE3DF]">
              E-mailadres
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@bedrijf.nl"
              required
              className="h-10 w-full rounded-[0.25rem] border border-[#2a5a5a] bg-[#1a3a3a] px-3 text-sm text-[#EAE3DF] placeholder:text-[#EAE3DF]/30 focus:border-[#14AF52] focus:outline-none focus:ring-1 focus:ring-[#14AF52]/50"
            />
            {errors?.fields?.identifier && (
              <p className="text-xs text-red-400">{errors.fields.identifier.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#EAE3DF]">
              Wachtwoord
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-10 w-full rounded-[0.25rem] border border-[#2a5a5a] bg-[#1a3a3a] px-3 pr-10 text-sm text-[#EAE3DF] placeholder:text-[#EAE3DF]/30 focus:border-[#14AF52] focus:outline-none focus:ring-1 focus:ring-[#14AF52]/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#EAE3DF]/40 transition-colors hover:text-[#EAE3DF]/70"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors?.fields?.password && (
              <p className="text-xs text-red-400">{errors.fields.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-10 w-full items-center justify-center rounded-[0.25rem] bg-[#14AF52] text-sm font-medium text-white transition-colors hover:bg-[#12994a] disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Doorgaan"
            )}
          </button>
        </form>

        {/* Sign up link */}
        <p className="mt-5 text-center text-sm text-[#EAE3DF]/60">
          Nog geen account?{" "}
          <Link href="/sign-up" className="text-[#14AF52] transition-colors hover:text-[#14AF52]/80">
            Registreren
          </Link>
        </p>
      </div>
    </div>
  );
}
