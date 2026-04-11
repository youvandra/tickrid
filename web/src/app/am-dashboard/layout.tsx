"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Smartphone, Database, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }
  return (
    <Button
      type="button"
      onClick={() => void logout()}
      variant="outline"
      className="w-full justify-start rounded-md px-3 py-2 text-sm font-medium"
    >
      <LogOut size={16} />
      Logout
    </Button>
  );
}

function NavItem(props: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === props.href || pathname.startsWith(`${props.href}/`);
  return (
    <Link
      href={props.href}
      className={[
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
      ].join(" ")}
    >
      {props.icon}
      {props.label}
    </Link>
  );
}

function useSectionTitle() {
  const pathname = usePathname();
  return useMemo(() => {
    if (!pathname) return "Dashboard";
    if (pathname.startsWith("/am-dashboard/tickr")) return "Tickers";
    if (pathname.startsWith("/am-dashboard/devices")) return "Devices";
    return "Dashboard";
  }, [pathname]);
}

function SidebarContent() {
  return (
    <div className="flex h-full flex-col gap-10">
      <div className="flex items-center gap-3 px-2">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
            <Image src="/logo/Logogram.png" alt="tickr.id" width={18} height={18} />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">tickr.id</span>
        </Link>
      </div>

      <nav className="flex flex-col gap-2">
        <div className="px-2 text-xs font-medium text-muted-foreground">Management</div>
        <NavItem href="/am-dashboard/tickr" label="Tickers" icon={<Database size={18} />} />
        <NavItem href="/am-dashboard/devices" label="Devices" icon={<Smartphone size={18} />} />
      </nav>

      <div className="mt-auto pt-6 border-t border-border">
        <div className="mb-3 text-xs text-muted-foreground">Admin</div>
        <LogoutButton />
      </div>
    </div>
  );
}

export default function DashboardLayout(props: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/am-dashboard/login");
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = useSectionTitle();

  useEffect(() => {
    if (isLogin) return;
    setMobileOpen(false);
  }, [pathname, isLogin]);

  useEffect(() => {
    if (isLogin) return;
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen, isLogin]);

  // Login page uses the same global theme but doesn't need the dashboard chrome.
  if (isLogin) {
    return (
      <div className="notion-theme min-h-screen bg-background text-foreground">
        {props.children}
      </div>
    );
  }

  return (
    <div className="notion-theme flex min-h-screen bg-background text-foreground">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-md"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Image src="/logo/Logogram.png" alt="tickr.id" width={14} height={14} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium text-muted-foreground">Admin</span>
              <span className="text-sm font-semibold tracking-tight text-foreground">{title}</span>
            </div>
          </div>
          <div className="w-9" />
        </div>
      </div>

      {/* Mobile Drawer */}
      <div
        className={[
          "md:hidden fixed inset-0 z-30 transition-opacity",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard navigation"
      >
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={[
            "absolute left-0 top-0 h-full w-[85%] max-w-xs border-r border-border bg-background px-4 pb-6 pt-20",
            "transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <SidebarContent />
        </aside>
      </div>

      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background px-4 py-6 md:flex flex-col gap-10">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-background md:overflow-y-auto md:h-screen">
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-20 md:px-10 md:pt-8">
          {props.children}
        </div>
      </main>
    </div>
  );
}
