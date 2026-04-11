import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="px-6 py-12 md:px-12 border-t border-secondary-light/10 bg-white/50 mt-auto backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-secondary-dark shadow-lg shadow-primary/20">
            <Image src="/logo/Logogram.png" alt="tickr.id" width={20} height={20} />
          </div>
          <span className="text-xl font-black tracking-tight text-secondary-dark uppercase">tickr.id</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-[11px] font-black uppercase tracking-widest text-secondary-medium/60">
          <Link href="/display-options" className="hover:text-primary transition-colors">Display</Link>
          <Link href="/supported-tickers" className="hover:text-primary transition-colors">Tickers</Link>
          <Link href="/instructions" className="hover:text-primary transition-colors">Instructions</Link>
          <Link href="/buy" className="hover:text-primary transition-colors">Buy</Link>
          <Link href="/faqs" className="hover:text-primary transition-colors">FAQs</Link>
          <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-medium/30">
          © 2026 tickr.id. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
