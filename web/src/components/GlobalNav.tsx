"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export function GlobalNav({ activePage }: { activePage?: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className={`knob-nav ${isMenuOpen ? 'menu-open' : ''}`}>
      <Link className="knob-logo" href="/">
        <div className="knob-logo-icon">
          <Image src="/logo/Logogram.png" alt="tickr.id" width={32} height={32} priority />
        </div>
        <span className="knob-logo-text">TICKR.ID</span>
      </Link>
      
      <div className={`knob-nav-links ${isMenuOpen ? 'active' : ''}`}>
        <Link href="/" className={activePage === 'home' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>HOME</Link>
        <Link href="/display-options" className={activePage === 'display' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>DISPLAY</Link>
        <Link href="/instructions" className={activePage === 'instruction' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>INSTRUCTIONS</Link>
        <Link href="/supported-tickers" className={activePage === 'supported-ticker' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>SUPPORTED TICKERS</Link>
        <Link href="/buy" className={activePage === 'buy' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>BUY <span className="new-badge">NEW</span></Link>
        <Link href="/faqs" className={activePage === 'faqs' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>FAQS</Link>
        <Link href="/contact" className={activePage === 'contact' ? 'active' : ''} onClick={() => setIsMenuOpen(false)}>CONTACT</Link>
      </div>

      <button 
        className="mobile-menu-toggle" 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle menu"
      >
          <div className={`hamburger ${isMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </nav>
  );
}
