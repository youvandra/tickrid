import type { Metadata } from "next";
import { HomePageClient } from "@/components/HomePageClient";

export const metadata: Metadata = {
  title: "tickr.id — LED market display untuk crypto & saham",
  description:
    "tickr.id adalah premium LED market display untuk home & office. Lihat harga, perubahan, dan tren crypto/stocks secara real-time—tanpa buka app.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "tickr.id — LED market display untuk crypto & saham",
    description:
      "Premium LED market display untuk home & office. Lihat harga, perubahan, dan tren secara real-time—tanpa buka app.",
    url: "/",
    type: "website",
    images: [{ url: "/logo/Logogram.png", width: 512, height: 512, alt: "tickr.id" }],
  },
  twitter: {
    card: "summary",
    title: "tickr.id — LED market display untuk crypto & saham",
    description:
      "Premium LED market display untuk home & office. Lihat harga, perubahan, dan tren secara real-time—tanpa buka app.",
    images: ["/logo/Logogram.png"],
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
