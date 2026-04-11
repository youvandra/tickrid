import { Suspense } from "react";
import { PairClient } from "../pair/pair-client";
import { GlobalNav } from "@/components/GlobalNav";
import { GlobalFooter } from "@/components/GlobalFooter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pair device",
  description:
    "Pair tickr.id dengan QR atau device ID, lalu atur tickers, interval, brightness, dan display mode lewat web dashboard.",
  alternates: { canonical: "/setup" },
};

export default function SetupPage() {
  return (
    <div className="knob-body">
      <GlobalNav activePage="setup" />
      <main className="flex-1 mt-20 min-h-screen">
        <Suspense
          fallback={
            <main className="flex-1 mx-auto flex w-full max-w-xl flex-col gap-4 px-5 py-32">
              <div className="h-12 w-44 animate-pulse rounded-xl bg-white/5" />
              <div className="h-6 w-72 animate-pulse rounded-xl bg-white/5" />
              <div className="mt-8 space-y-6">
                <div className="h-40 w-full animate-pulse rounded-[32px] bg-white/5" />
                <div className="h-40 w-full animate-pulse rounded-[32px] bg-white/5" />
              </div>
            </main>
          }
        >
          <PairClient />
        </Suspense>
      </main>
      <GlobalFooter />
    </div>
  );
}
