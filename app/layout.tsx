import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { AuthProvider } from "@/components/auth-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trust-lens-omega.vercel.app"),
  title: "TrustLens — evidence-based blockchain trust analysis",
  description:
    "Review contract capabilities and wallet approvals using evidence from supported public blockchains.",
  openGraph: {
    type: "website",
    siteName: "TRUST Lens",
    title: "TRUST Lens — evidence-based blockchain trust analysis",
    description: "Review contract capabilities and wallet approvals using evidence from supported public blockchains.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "TRUST Lens — evidence-based blockchain trust analysis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TRUST Lens — evidence-based blockchain trust analysis",
    description: "Review contract capabilities and wallet approvals using evidence from supported public blockchains.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body><AuthProvider><LanguageProvider>{children}</LanguageProvider></AuthProvider></body>
    </html>
  );
}
