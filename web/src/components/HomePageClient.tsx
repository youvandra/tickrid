"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { GlobalNav } from "@/components/GlobalNav";
import { GlobalFooter } from "@/components/GlobalFooter";
import { QrCode, ShoppingCart } from "lucide-react";

export function HomePageClient() {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll(".reveal");
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="knob-body">
      <GlobalNav activePage="home" />

      <section className="knob-hero">
        <video
          src="/video_hero/hero_video.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="knob-hero-content">
          <h1 className="knob-hero-headline">MARKETS, AT A GLANCE.</h1>
          <p className="knob-hero-sub">
            A premium LED market display for live crypto, stocks, and more—built for home and office.
          </p>
          <p className="knob-hero-batch">
            <strong>Early Adopter Price: Rp 1.499.000</strong>
          </p>
          <div className="flex gap-6">
            <Link className="knob-btn-order" href="/buy">
              <ShoppingCart aria-hidden="true" />
              Buy now
            </Link>
            <Link className="knob-btn-buy" href="/instructions">
              <QrCode aria-hidden="true" />
              Pair device
            </Link>
          </div>
        </div>
      </section>

      <section className="knob-description reveal">
        <div className="knob-description-inner">
          <p className="knob-description-text">
            Simply elegant. Designed to feel at home in your workspace,{" "}
            <Link className="lime" href="/">
              tickr.id
            </Link>{" "}
            gives you instant visibility into the market—without pulling you into another app or tab.
          </p>
        </div>
      </section>

      <section className="knob-specs-row reveal">
        <div className="knob-specs-inner">
          <div className="knob-spec-item">
            <div className="knob-spec-title">Effortless setup</div>
            <div className="knob-spec-desc">
              Set up Wi‑Fi, scan the QR sticker (or enter your device ID), and choose your markets. No app required.
            </div>
          </div>
          <div className="knob-spec-item">
            <div className="knob-spec-title">Glanceable by design</div>
            <div className="knob-spec-desc">
              A high-contrast LED matrix shows price, change, and trends—readable at a glance across your workspace.
            </div>
          </div>
        </div>
      </section>

      <section className="knob-materials-section reveal">
        <div className="knob-materials-inner">
          <div className="knob-mat-col">
            <div className="knob-mat-title">Hardware Excellence</div>
            <div className="knob-mat-row">
              <span>Enclosure</span>
              <span className="knob-mat-val">Wood enclosure / rear housing (~4cm depth)</span>
            </div>
            <div className="knob-mat-row">
              <span>Display</span>
              <span className="knob-mat-val">P5 HUB75 LED matrix / 32×16cm display</span>
            </div>
            <div className="knob-mat-row">
              <span>Connectivity</span>
              <span className="knob-mat-val">Wi‑Fi (2.4GHz)</span>
            </div>
            <div className="knob-mat-row">
              <span>Power</span>
              <span className="knob-mat-val">USB‑C / 5V 3–5A (adapter not included)</span>
            </div>
          </div>
          <div className="knob-mat-col">
            <div className="knob-mat-title">Software Intelligence</div>
            <div className="knob-mat-row">
              <span>Markets</span>
              <span className="knob-mat-val">Crypto, Stocks, Commodities, and more</span>
            </div>
            <div className="knob-mat-row">
              <span>Refresh</span>
              <span className="knob-mat-val">Live updates / Custom intervals</span>
            </div>
            <div className="knob-mat-row">
              <span>Control</span>
              <span className="knob-mat-val">Web dashboard via QR pairing</span>
            </div>
          </div>
        </div>
      </section>

      <section className="knob-photo-grid-section reveal">
        <div className="knob-photo-grid">
          <div className="knob-grid-item knob-grid-item-1">
            <Image
              src="/images/landing/gallery.jpg"
              alt="tickr.id product detail in a workspace"
              width={1200}
              height={1200}
              className="w-full h-full object-cover"
            />
            <div className="knob-caption">Made to look at home on your desk—or wall.</div>
          </div>

          <div className="knob-grid-item knob-grid-item-2">
            <Image
              src="/images/landing/gallery2.jpg"
              alt="tickr.id device hero shot"
              width={1600}
              height={1200}
              className="w-full h-full object-cover"
            />
            <div className="knob-caption">A clean, glanceable market display.</div>
          </div>

          <div className="knob-grid-item knob-grid-item-3">
            <Image
              src="/images/landing/gallery3.jpg"
              alt="tickr.id close-up detail"
              width={1200}
              height={1200}
              className="w-full h-full object-cover"
            />
            <div className="knob-caption">Minimal hardware. Premium feel.</div>
          </div>

          <div className="knob-grid-item knob-grid-item-4">
            <Image
              src="/images/landing/gallery4.jpg"
              alt="tickr.id LED matrix display"
              width={1200}
              height={1600}
              className="w-full h-full object-cover"
            />
            <div className="knob-caption">High-contrast LED matrix, readable at a glance.</div>
          </div>
        </div>
      </section>

      <GlobalFooter />
    </div>
  );
}
