import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Montserrat } from "next/font/google";
import localFont from "next/font/local";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const gtWalsheim = localFont({
  src: [
    {
      path: "../../public/fonts/PPEditorialNew-Ultralight.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/PPEditorialNew-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/PPEditorialNew-Ultrabold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-gt-walsheim",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://tickr.id"),
  title: {
    default: "tickr.id — LED market display untuk crypto & saham",
    template: "%s — tickr.id",
  },
  description:
    "tickr.id adalah premium LED market display untuk home & office. Pair via QR, track market real-time, dan lihat harga di glance—tanpa buka app.",
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: "/logo/Logogram.png" }],
    apple: [{ url: "/logo/Logogram.png" }],
  },
  openGraph: {
    title: "tickr.id — LED market display untuk crypto & saham",
    description:
      "Premium LED market display untuk home & office. Pair via QR, track market real-time, dan lihat harga di glance—tanpa buka app.",
    url: "/",
    siteName: "tickr.id",
    type: "website",
    images: [{ url: "/logo/Logogram.png", width: 512, height: 512, alt: "tickr.id" }],
  },
  twitter: {
    card: "summary",
    title: "tickr.id — LED market display untuk crypto & saham",
    description:
      "Premium LED market display untuk home & office. Pair via QR, track market real-time, dan lihat harga di glance—tanpa buka app.",
    images: ["/logo/Logogram.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#18d98d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tickr.id";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "tickr.id",
    url: siteUrl,
    logo: `${siteUrl.replace(/\/$/, "")}/logo/Logogram.png`,
    email: "hello@tickr.id",
  };

  return (
    <html lang="en" className={`${montserrat.variable} ${gtWalsheim.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
