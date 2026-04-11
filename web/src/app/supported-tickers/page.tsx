import type { Metadata } from "next";
import { SupportedTickersClient } from "@/components/SupportedTickersClient";

export const metadata: Metadata = {
  title: "Supported markets — tickr.id",
  description:
    "Cari daftar market yang didukung tickr.id. Saat ini: stocks, crypto, dan commodities. Forex & ETFs: coming soon.",
  alternates: { canonical: "/supported-tickers" },
  openGraph: {
    title: "Supported markets — tickr.id",
    description:
      "Cari daftar market yang didukung tickr.id. Saat ini: stocks, crypto, dan commodities. Forex & ETFs: coming soon.",
    url: "/supported-tickers",
    type: "website",
    images: [{ url: "/logo/Logogram.png", width: 512, height: 512, alt: "tickr.id" }],
  },
  twitter: {
    card: "summary",
    title: "Supported markets — tickr.id",
    description:
      "Saat ini tickr.id mendukung: stocks, crypto, dan commodities. Forex & ETFs: coming soon.",
    images: ["/logo/Logogram.png"],
  },
};

export default function SupportedTickersPage() {
  return <SupportedTickersClient />;
}
