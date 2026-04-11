import { GlobalNav } from "@/components/GlobalNav";
import { GlobalFooter } from "@/components/GlobalFooter";
import { Mail, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Kontak tickr.id untuk pertanyaan order, shipping, setup, atau support device.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="knob-body">
      <GlobalNav />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pt-24 pb-24 md:pt-32 md:pb-32">
        <PageHeader
          title="Contact"
          subtitle="Questions about your order, setup, or device support? We’ll get back to you as soon as possible."
        />

        <div className="grid lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-5 space-y-12">
            <div className="space-y-8">
              <div className="flex gap-6 items-start group">
                <div className="w-16 h-16 rounded-[24px] bg-[color:var(--lime-10)] text-[color:var(--lime)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Mail size={32} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Email Us</h2>
                  <p className="text-[color:var(--lime)] text-lg font-bold">youvandra@tickr.id</p>
                  <p className="text-sm text-white/40 font-medium">Typical response time: within 24 hours (business days).</p>
                </div>
              </div>
            </div>

            <div className="p-10 rounded-[40px] bg-[#0a0a0a] border border-white/5 text-white space-y-4">
              <h3 className="text-xl font-black uppercase tracking-widest text-[color:var(--lime)]">Office Hours</h3>
              <div className="space-y-2 text-white/60 font-bold">
                <p>Monday - Friday</p>
                <p className="text-2xl text-white">9:00 AM - 6:00 PM</p>
                <p className="text-[10px] uppercase tracking-widest mt-4">GMT +7</p>
              </div>
            </div>
          </div>

          <form className="lg:col-span-7 p-12 rounded-[60px] bg-[#0a0a0a] border border-white/5 space-y-8 shadow-xl">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Name</label>
                <input placeholder="Your name" className="w-full h-14 bg-white/5 rounded-2xl border border-white/10 px-6 font-bold text-white focus:outline-none focus:border-[color:var(--lime-30)] transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Email</label>
                <input type="email" placeholder="you@company.com" className="w-full h-14 bg-white/5 rounded-2xl border border-white/10 px-6 font-bold text-white focus:outline-none focus:border-[color:var(--lime-30)] transition-all" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Subject</label>
              <input placeholder="Order, shipping, setup, or support" className="w-full h-14 bg-white/5 rounded-2xl border border-white/10 px-6 font-bold text-white focus:outline-none focus:border-[color:var(--lime-30)] transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Message</label>
              <textarea 
                className="w-full min-h-[200px] p-6 bg-white/5 rounded-[32px] border border-white/10 font-bold text-white focus:outline-none focus:ring-4 focus:ring-[color:var(--lime-10)] focus:border-[color:var(--lime-30)] transition-all resize-none"
                placeholder="Tell us what you need help with, and include your order number (if you have one)."
              />
            </div>
            <button className="knob-btn-order knob-btn-large w-full">
              <Send aria-hidden="true" />
              Send Message
            </button>
          </form>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
