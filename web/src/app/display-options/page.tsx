import { GlobalNav } from "@/components/GlobalNav";
import { GlobalFooter } from "@/components/GlobalFooter";
import { PageHeader } from "@/components/PageHeader";
import type { Metadata } from "next";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";

export const metadata: Metadata = {
  title: "Display options",
  description:
    "Pilih mode display tickr.id: Single, Dual, atau Multiple Rotation. Semua mode bisa diganti kapan saja lewat web dashboard setelah pairing.",
  alternates: { canonical: "/display-options" },
};

export default function DisplayOptionsPage() {
  const modes = [
    {
      title: "Single Ticker",
      desc: "Maximum focus. One asset, full-screen—price, change, and a clean trend line.",
      features: ["Live price", "Trend line", "Percentage change", "Clean layout"],
      color: "var(--lime)",
      mediaType: "image" as const,
      mediaSrc: "/images/display/one_ticker.jpg",
      mediaAlt: "Single ticker display preview"
    },
    {
      title: "Dual Ticker",
      desc: "The perfect balance. Track two assets side-by-side—ideal for pairs you watch together.",
      features: ["Split view", "Synchronized updates", "Mini trends", "At-a-glance compare"],
      color: "var(--sapphire)",
      mediaType: "image" as const,
      mediaSrc: "/images/display/two_ticker.jpg",
      mediaAlt: "Dual ticker display preview"
    },
    {
      title: "Multiple Rotation",
      desc: "Your personal market dashboard. Rotate through up to 8 tickers with custom intervals (15s to 10m).",
      features: ["Auto rotation", "Custom intervals", "Up to 8 tickers", "Set-and-forget"],
      color: "var(--violet)",
      mediaType: "video" as const,
      mediaSrc: "/images/display/multi_ticker.mp4",
      mediaAlt: "Multiple rotation display preview"
    }
  ];

  return (
    <div className="knob-body">
      <GlobalNav activePage="display" />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pt-24 pb-24 md:pt-32 md:pb-32">
        <PageHeader
          title="Display options"
          subtitle="Choose how you want to see the market—built for glanceability."
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {modes.map((mode, i) => (
            <div key={i} className="flex flex-col p-8 md:p-10 rounded-[32px] md:rounded-[48px] bg-[#0a0a0a] border border-white/5 hover:border-white/10 transition-all group">
              <div className="h-40 md:h-48 rounded-[24px] md:rounded-[32px] mb-8 md:mb-10 relative overflow-hidden bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent">
                {mode.mediaType === "image" ? (
                  <Image
                    src={mode.mediaSrc}
                    alt={mode.mediaAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300"
                    priority={i === 0}
                  />
                ) : (
                  <video
                    className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    aria-label={mode.mediaAlt}
                  >
                    <source src={mode.mediaSrc} type="video/mp4" />
                  </video>
                )}
                <div className="absolute inset-0 opacity-60">
                  <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[70px]" style={{ background: mode.color + "18" }} />
                  <div className="absolute -bottom-28 -left-28 w-72 h-72 rounded-full blur-[90px]" style={{ background: mode.color + "10" }} />
                </div>
              </div>
              
              <div className="flex-1 space-y-4 md:space-y-6 text-center">
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">{mode.title}</h2>
                <p className="text-white/60 text-base md:text-lg leading-relaxed font-medium">
                  {mode.desc}
                </p>
                
                <ul className="space-y-2 md:space-y-3 pt-2 md:pt-4 flex flex-col items-start text-left">
                  {mode.features.map((f) => (
                    <li
                      key={f}
                      className="w-full flex items-center justify-start gap-3 text-white/40 text-[10px] md:text-sm font-black uppercase tracking-widest"
                    >
                      <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full" style={{ background: mode.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-24 md:mt-32 text-center space-y-8 md:space-y-10">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">Everything included.</h2>
            <p className="text-white/40 text-lg md:text-xl font-medium max-w-2xl mx-auto">
              Every tickr.id comes with all display modes. Switch instantly from your web dashboard after pairing.
            </p>
          </div>
          <a href="/buy" className="inline-block w-full md:w-auto">
            <button className="knob-btn-order knob-btn-large w-full md:w-auto">
              <ShoppingCart aria-hidden="true" />
              Buy now
            </button>
          </a>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
