import { GlobalNav } from "@/components/GlobalNav";
import { GlobalFooter } from "@/components/GlobalFooter";
import { PageHeader } from "@/components/PageHeader";
import Image from "next/image";
import type { Metadata } from "next";
import { IconCheck } from "@/components/icons/tickr";
import { ShoppingCart } from "lucide-react";

export const metadata: Metadata = {
  title: "Buy tickr.id Standard",
  description:
    "tickr.id Standard adalah premium LED market display untuk home & office. Early Adopter price, pengiriman dalam Indonesia, garansi 3 bulan.",
  alternates: { canonical: "/buy" },
};

export default function BuyPage() {
  return (
    <div className="knob-body min-h-screen flex flex-col">
      <GlobalNav activePage="buy" />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pt-24 pb-24 md:pt-32 md:pb-32">
        <PageHeader
          title={
            <>
              Bring the <span style={{ color: "var(--lime)", fontStyle: "italic" }}>market</span>
              <br />
              home & office.
            </>
          }
          subtitle="tickr.id Standard is a premium LED market display built for focus and glanceability. Ships within Indonesia."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-start md:items-stretch">
          {/* Gallery */}
          <section className="space-y-4 md:h-full" aria-label="Product gallery">
            {/* On desktop, make the gallery column match the buy card height */}
            <div className="grid grid-cols-2 gap-4 auto-rows-[90px] sm:auto-rows-[110px] md:auto-rows-fr md:grid-rows-8 md:h-full">
              <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a] row-span-4 col-span-2 aspect-[4/3] md:aspect-auto md:h-full">
                <Image
                  src="/images/buy/gallery-1.jpg"
                  alt="tickr.id device in a modern workspace"
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 50vw, 100vw"
                  priority
                />
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a] row-span-2 col-span-1 aspect-[4/3] md:aspect-auto md:h-full">
                <Image
                  src="/images/buy/gallery-2.jpg"
                  alt="Close-up of LED matrix pixels"
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 25vw, 50vw"
                />
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a] row-span-2 col-span-1 aspect-[4/3] md:aspect-auto md:h-full">
                <Image
                  src="/images/buy/gallery-3.jpg"
                  alt="Minimal product shot on dark surface"
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 25vw, 50vw"
                />
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a] row-span-2 col-span-2 aspect-[4/3] md:aspect-auto md:h-full">
                <Image
                  src="/images/buy/gallery-4.jpg"
                  alt="Lifestyle workspace scene with device"
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              </div>
            </div>
          </section>

          {/* Buy option */}
          <section
            className="p-8 md:p-12 rounded-[32px] md:rounded-[40px] bg-[#0a0a0a] border border-white/5 space-y-8 md:space-y-10 shadow-2xl text-center md:h-full"
            aria-labelledby="buy-title"
          >
            <div className="space-y-4">
              <div className="inline-block px-4 py-1 rounded-full bg-[color:var(--lime-10)] text-[color:var(--lime)] text-[10px] font-black uppercase tracking-widest mb-2">Early Adopter</div>
              <h2 id="buy-title" className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">
                tickr.id Standard
              </h2>
              <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-1 tabular-nums">
                <span className="text-4xl sm:text-5xl md:text-6xl leading-none font-black text-[color:var(--lime)] whitespace-nowrap">
                  Rp 1.499.000
                </span>
                <span className="text-white/30 font-bold line-through text-lg sm:text-xl md:text-2xl whitespace-nowrap">
                  Rp 2.499.000
                </span>
              </div>
            </div>

            <ul className="space-y-4 md:space-y-5 flex flex-col items-start text-left w-full">
              {[
                "32×16 cm display (LED matrix)",
                "Wood enclosure with rear housing (~4cm depth)",
                "5V 3–5A power (USB‑C cable included)",
                "Web dashboard (no app required)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-4 text-white/80 font-medium text-sm md:text-base">
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[color:var(--lime-20)] text-[color:var(--lime)] flex items-center justify-center shrink-0">
                    <IconCheck size={14} />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <a
              href="#"
              className="knob-btn-order knob-btn-large w-full"
              aria-label="Beli tickr.id Standard di Shopee"
            >
              <ShoppingCart aria-hidden="true" />
              Buy on Shopee
            </a>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
              Shopee link coming soon
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 items-center px-2">
              <p className="text-[9px] md:text-[10px] text-white/30 font-bold uppercase tracking-widest">
                7-day return (damage/mismatch)
              </p>
              <p className="text-[9px] md:text-[10px] text-white/30 font-bold uppercase tracking-widest">
                Indonesia shipping
              </p>
              <p className="text-[9px] md:text-[10px] text-white/30 font-bold uppercase tracking-widest">
                3-month warranty
              </p>
            </div>
          </section>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}
