import { GlobalNav } from "@/components/GlobalNav";
import { GlobalFooter } from "@/components/GlobalFooter";
import { PageHeader } from "@/components/PageHeader";
import { IconBolt, IconPhoneQr, IconSliders, IconSync, IconWifi } from "@/components/icons/tickr";
import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Getting started",
  description:
    "Panduan setup tickr.id: sambungkan power, set Wi‑Fi, buka dashboard pairing via QR/device ID, atur tickers, lalu Apply Changes.",
  alternates: { canonical: "/instructions" },
};

export default function InstructionsPage() {
  const steps = [
    {
      title: "Connect Power",
      desc: "Plug tickr.id into any 5V USB power source. The display will turn on and show you the pairing prompt.",
      icon: <IconBolt size={28} />
    },
    {
      title: "Set Up Wi‑Fi",
      desc: "Connect tickr.id to your home/office Wi‑Fi so it can fetch market prices in real time.",
      icon: <IconWifi size={28} />
    },
    {
      title: "Open Setup Dashboard",
      desc: "Scan the QR sticker on the back of your device, or enter your device ID on our website to open the setup page.",
      icon: <IconPhoneQr size={28} />
    },
    {
      title: "Configure Tickers",
      desc: "Choose what you want to track—crypto, stocks, commodities, and more—then pick your layout and refresh interval.",
      icon: <IconSliders size={28} />
    },
    {
      title: "Save & Sync",
      desc: "Tap “Apply Changes”. tickr.id will sync instantly and start showing live market data.",
      icon: <IconSync size={28} />
    }
  ];

  return (
    <div className="knob-body">
      <GlobalNav activePage="instruction" />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-24 pb-24 md:pt-32 md:pb-32">
        <PageHeader title="Getting started" subtitle="Set up tickr.id in under 2 minutes." />

        <div className="grid gap-6 md:gap-8">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col md:flex-row items-start gap-6 md:gap-8 p-6 md:p-8 rounded-[32px] md:rounded-[40px] bg-[#0a0a0a] border border-white/5 group hover:border-[color:var(--lime-20)] transition-all">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-white/5 text-[color:var(--lime)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                {step.icon}
              </div>
              <div className="space-y-3 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-center md:justify-start gap-3">
                  <span className="text-[color:var(--lime)] font-black text-[10px] md:text-sm uppercase tracking-widest">Step 0{i + 1}</span>
                  <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">{step.title}</h2>
                </div>
                <p className="text-white/60 text-base md:text-lg leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Video instructions placeholder */}
        <section className="mt-16 md:mt-20">
          <div className="w-full overflow-hidden rounded-[32px] md:rounded-[48px] border border-white/5 bg-[#0a0a0a]">
            <div className="aspect-video w-full bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent flex items-center justify-center">
              <div className="text-center px-6">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  Video instructions
                </div>
                <div className="mt-2 text-lg md:text-2xl font-black uppercase tracking-tight text-white/80">
                  Coming soon
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-16 md:mt-20 p-8 md:p-12 rounded-[32px] md:rounded-[50px] bg-[#0a0a0a] border border-white/5 text-center overflow-hidden space-y-6">
          <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">Need a hand?</h3>
          <p className="text-white/60 text-base md:text-lg font-medium max-w-2xl mx-auto">
            Open the pairing dashboard from the QR code and you’re ready. If you’re stuck, reach out and we’ll help you get set up.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/contact" className="inline-block w-full sm:w-auto">
              <button className="knob-btn-order knob-btn-large w-full sm:w-auto">
                <MessageCircle aria-hidden="true" />
                Contact support
              </button>
            </a>
          </div>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
