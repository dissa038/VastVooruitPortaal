import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "VastVooruit Portaal",
    template: "%s | VastVooruit",
  },
  description:
    "Energielabel management platform voor VastVooruit — van intake tot registratie. Beheer opdrachten, offertes, facturen en meer.",
  metadataBase: new URL("https://vastvooruit-portaal.vercel.app"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "VastVooruit Portaal",
    description:
      "Energielabel management platform — opdrachten, offertes, facturen en planning in één portaal.",
    siteName: "VastVooruit",
    locale: "nl_NL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VastVooruit Portaal",
    description:
      "Energielabel management platform — opdrachten, offertes, facturen en planning in één portaal.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
