import { GlobalNav } from "@/components/GlobalNav";
import { GlobalFooter } from "@/components/GlobalFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader } from "@/components/PageHeader";
import type { Metadata } from "next";
import { LifeBuoy } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Jawaban cepat seputar pembelian, setup, shipping, garansi, dan penggunaan tickr.id.",
  alternates: { canonical: "/faqs" },
};

export default function FaqsPage() {
  const faqs = [
    { 
      q: "Is there a monthly subscription?", 
      a: "No subscription required. Your device works out of the box—pay once for the hardware." 
    },
    { 
      q: "What data sources do you use?", 
      a: "We connect to trusted market data providers (depending on the asset type) to keep prices reliable and up to date." 
    },
    { 
      q: "Can I show my own custom text?", 
      a: "Not yet. tickr.id is currently focused on financial markets. We’re exploring custom messages and notifications for a future update." 
    },
    { 
      q: "What power source is required?", 
      a: "Any standard 5V USB power source works (e.g., a phone charger or USB port). We recommend a stable adapter for best performance." 
    },
    {
      q: "How many tickers can I add?",
      a: "You can add up to 8 tickers in the rotation mode. In single or dual mode, you can select which of those 8 you want to pin to the screen."
    },
    {
      q: "Do you ship internationally?",
      a: "At the moment, we ship within Indonesia. International shipping will be announced in a future release."
    },
    {
      q: "What warranty do I get?",
      a: "tickr.id includes a 3-month warranty for hardware issues under normal use. If something isn’t right, contact support and we’ll help."
    },
    {
      q: "Do you offer returns?",
      a: "We accept a 7-day return for device damage or product mismatch upon arrival (subject to inspection). Please contact support within 7 days of delivery."
    }
  ];

  return (
    <div className="knob-body">
      <GlobalNav activePage="faqs" />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 pt-24 pb-24 md:pt-32 md:pb-32">
        <PageHeader title="FAQs" subtitle="Quick answers for buying, setup, and daily use." />
        
        <Accordion className="w-full space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border border-white/5 rounded-[20px] md:rounded-[24px] px-4 md:px-6 bg-[#0a0a0a] overflow-hidden">
              <AccordionTrigger className="text-center text-lg md:text-xl font-bold py-5 md:py-6 hover:no-underline hover:text-[color:var(--lime)] transition-colors text-white">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-left text-base md:text-lg text-white/60 leading-relaxed pb-5 md:pb-6">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-16 md:mt-24 p-8 md:p-10 rounded-[32px] md:rounded-[40px] bg-[color:var(--lime-05)] border border-[color:var(--lime-10)] text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">STILL HAVE QUESTIONS?</h2>
          <p className="text-white/60 text-base md:text-lg font-medium max-w-md mx-auto">
            Can’t find what you’re looking for? Our team is happy to help.
          </p>
          <a href="/contact" className="inline-block w-full md:w-auto">
            <button className="knob-btn-order w-full md:w-auto">
              <LifeBuoy aria-hidden="true" />
              Contact support
            </button>
          </a>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
