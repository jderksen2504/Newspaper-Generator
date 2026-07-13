import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  UnifrakturMaguntia,
  UnifrakturCook,
  EB_Garamond,
  Pirata_One,
} from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fraktur (Haupt-Schrift für Titel, wird für "Fraktur"-Stil verwendet)
const fraktur = UnifrakturMaguntia({
  variable: "--font-fraktur",
  weight: "400",
  subsets: ["latin"],
});

// Blackletter (etwas schwerer, kräftiger als UnifrakturMaguntia)
const blackletter = UnifrakturCook({
  variable: "--font-blackletter",
  weight: "700",
  subsets: ["latin"],
});

// Pirata One — alternative Gotisch-Schrift, falls UnifrakturCook nicht lädt
const pirata = Pirata_One({
  variable: "--font-pirata",
  weight: "400",
  subsets: ["latin"],
});

// Serif-Body-Schrift (für "Serif" und "Italic"-Stile + Artikeltext)
const oldSerif = EB_Garamond({
  variable: "--font-old-serif",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Newspaper Generator — D&D Setting",
  description: "Erstelle historische Zeitungsartikel für deine D&D-Kampagne. Export als PNG oder JSON.",
  keywords: ["D&D", "DND", "Newspaper", "Generator", "Industrialisierungszeit", "TTRPG"],
  authors: [{ name: "D&D Newspaper Generator" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraktur.variable} ${blackletter.variable} ${pirata.variable} ${oldSerif.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
