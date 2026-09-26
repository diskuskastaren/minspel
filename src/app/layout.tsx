import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, DM_Mono } from "next/font/google";
import { PREFERENCES_SCRIPT } from "@/lib/preferences";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
});
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Klurig – dagens spel", template: "%s · Klurig" },
  description: "Dagliga minispel på svenska.",
  robots: { index: false, follow: false }, // lokalt tills vidare
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3ede2" },
    { media: "(prefers-color-scheme: dark)", color: "#12152a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="sv"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      data-theme="light"
      data-motion="full"
      suppressHydrationWarning
    >
      <head>
        {/* Tema, rörelse och färgblindläge sätts innan sidan ritas (se lib/preferences.ts). */}
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
