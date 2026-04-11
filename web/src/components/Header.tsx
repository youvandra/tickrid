"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, QrCode, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: "/display-options", label: "Display" },
    { href: "/supported-tickers", label: "Tickers" },
    { href: "/instructions", label: "Instructions" },
    { href: "/buy", label: "Buy" },
    { href: "/faqs", label: "FAQs" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="flex items-center justify-between px-6 py-5 md:px-12 border-b border-secondary-light/10 sticky top-0 bg-brand-bg/70 backdrop-blur-xl z-50 transition-all">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-secondary-dark shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <Image src="/logo/Logogram.png" alt="tickr.id" width={24} height={24} priority />
          </div>
          <span className="text-2xl font-bold tracking-tight text-secondary-dark uppercase">tickr.id</span>
        </Link>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-10">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[13px] font-black uppercase tracking-widest text-secondary-medium/60 hover:text-secondary-dark transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-primary after:transition-all hover:after:w-full"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <Link href="/setup">
          <button className="knob-btn-order" style={{ padding: '8px 24px', fontSize: '11px' }}>
            <QrCode aria-hidden="true" />
            Pair device
          </button>
        </Link>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden p-2 text-secondary-medium"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-secondary-light/10 p-6 flex flex-col gap-4 md:hidden shadow-lg animate-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-black uppercase tracking-widest text-secondary-medium hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
