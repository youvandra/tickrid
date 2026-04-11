"use client";

import { useState, useEffect, useCallback } from "react";
import { GlobalNav } from "@/components/GlobalNav";
import { GlobalFooter } from "@/components/GlobalFooter";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { IconChartUp, IconCoin, IconGem, IconGlobe, IconLayers, IconPulse } from "@/components/icons/tickr";

type SymbolRow = {
  symbol: string;
  type: string;
  available_exchanges: string[];
  currency_base: string | null;
  currency_quote: string | null;
};

type SymbolStatsResponse = {
  total: number;
  by_type: Record<string, number>;
};

const PAGE_LIMIT = 200;

export function SupportedTickersClient() {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [rows, setRows] = useState<SymbolRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const categories = [
    { id: "stocks", label: "Stocks", icon: <IconChartUp size={28} />, count: "160,000+ symbols", enabled: true },
    { id: "forex", label: "Forex", icon: <IconGlobe size={28} />, count: "2,000+ pairs", enabled: false },
    { id: "crypto", label: "Crypto", icon: <IconCoin size={28} />, count: "4,800+ pairs", enabled: true },
    { id: "etfs", label: "ETFs", icon: <IconLayers size={28} />, count: "25,000+ symbols", enabled: false },
    { id: "commodity", label: "Commodities", icon: <IconGem size={28} />, count: "60+ symbols", enabled: true },
  ];

  function formatCount(n: number | undefined): string {
    const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
    return `${v.toLocaleString()} symbols`;
  }

  useEffect(() => {
    // Load real counts from backend (no mock strings).
    fetch("/api/symbols/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (!data || typeof data !== "object") return;
        const d = data as Partial<SymbolStatsResponse>;
        if (!d.by_type || typeof d.by_type !== "object") return;
        setCounts(d.by_type as Record<string, number>);
      })
      .catch(() => {
        // keep default UI; counts will show 0
      });
  }, []);

  const searchSymbols = useCallback(
    async (searchQuery: string, type: string, opts: { offset?: number; append?: boolean } = {}) => {
      const append = Boolean(opts.append);
      const nextOffset = opts.offset ?? 0;

      if (!searchQuery && !type) {
        setRows([]);
        setHasSearched(false);
        setOffset(0);
        setHasMore(false);
        return;
      }

      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setHasSearched(true);
      }

      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set("q", searchQuery);
        if (type) params.set("type", type);
        params.set("limit", String(PAGE_LIMIT));
        params.set("offset", String(nextOffset));

        const res = await fetch(`/api/admin/symbols?${params.toString()}`);
        if (!res.ok) throw new Error("Fetch failed");
        const data = (await res.json()) as {
          data?: SymbolRow[];
          has_more?: boolean;
          limit?: number;
          offset?: number;
        };

        const batch = Array.isArray(data.data) ? data.data : [];
        setRows((prev) => (append ? [...prev, ...batch] : batch));
        setOffset(nextOffset + batch.length);
        setHasMore(Boolean(data.has_more));
      } catch (err) {
        console.error(err);
        if (!append) setRows([]);
        setHasMore(false);
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      searchSymbols(q, typeFilter, { offset: 0, append: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [q, typeFilter, searchSymbols]);

  const clearSearch = () => {
    setQ("");
    setTypeFilter("");
    setRows([]);
    setHasSearched(false);
    setOffset(0);
    setHasMore(false);
  };

  return (
    <div className="knob-body">
      <GlobalNav activePage="supported-ticker" />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-24 pb-24 md:pt-32 md:pb-32">
        <PageHeader
          title="Supported markets"
          subtitle="Currently supported: stocks, crypto, and commodities. Forex & ETFs: coming soon."
        />

        <div className="relative max-w-4xl mx-auto mb-12 md:mb-16 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[color:var(--lime)] via-[color:var(--sapphire)] to-[color:var(--lime)] rounded-[20px] md:rounded-[28px] blur opacity-10 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex items-center bg-[#0a0a0a] border border-white/5 rounded-[18px] md:rounded-[24px] px-4 md:px-6 py-3 md:py-4 shadow-xl shadow-black/50">
            <Search className="text-white/20 mr-3 md:mr-4" size={20} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search symbols..."
              className="flex-1 text-base md:text-xl font-medium text-white placeholder:text-white/10 outline-none bg-transparent"
            />
            {loading ? (
              <Loader2 className="animate-spin text-[color:var(--lime)]" size={20} />
            ) : hasSearched ? (
              <button onClick={clearSearch} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="text-white/20" size={20} />
              </button>
            ) : null}
          </div>
        </div>

        {!hasSearched ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 mb-16 md:mb-20">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                disabled={!cat.enabled}
                onClick={() => cat.enabled && setTypeFilter(cat.id)}
                className={[
                  "flex flex-col items-center p-6 md:p-8 rounded-[24px] md:rounded-[32px] bg-[#0a0a0a] border border-white/5 transition-all duration-500 group",
                  cat.enabled
                    ? "hover:border-[color:var(--lime-20)] hover:-translate-y-1 md:hover:-translate-y-2"
                    : "opacity-40 cursor-not-allowed",
                ].join(" ")}
              >
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-[18px] md:rounded-[24px] bg-white/5 flex items-center justify-center mb-4 md:mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500 text-[color:var(--lime)]">
                  {cat.icon}
                </div>
                <h3 className="text-sm md:text-xl font-black text-white mb-1 md:mb-2 uppercase tracking-tight">{cat.label}</h3>
                <p className="text-[8px] md:text-[10px] font-bold text-white/20 uppercase tracking-widest">
                  {cat.enabled ? formatCount(counts[cat.id]) : "Coming soon"}
                </p>
                {!cat.enabled && (
                  <span className="mt-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40">
                    Coming soon
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2 sm:mb-0">
                {loading ? "Searching..." : `${rows.length}${hasMore ? "+" : ""} Results for "${q || typeFilter}"`}
              </h2>
              {typeFilter && (
                <Badge className="bg-[color:var(--lime-10)] text-[color:var(--lime)] border-none px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {typeFilter}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rows.map((row) => (
                <div
                  key={row.symbol}
                  className="p-8 rounded-[32px] bg-[#0a0a0a] border border-white/5 hover:border-[color:var(--lime-20)] transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="font-mono text-xl font-black text-white tracking-tighter group-hover:text-[color:var(--lime)] transition-colors">
                      {row.symbol}
                    </div>
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-white/5 text-white/20">
                      {row.type}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white/60 truncate">{row.currency_base || "Asset"}</p>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest truncate">
                      {row.available_exchanges.join(", ") || "Global Markets"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {!loading && rows.length > 0 && hasMore && (
              <div className="flex justify-center pt-6">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => searchSymbols(q, typeFilter, { offset, append: true })}
                  className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/10 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="animate-spin text-[color:var(--lime)]" size={16} />
                      Loading…
                    </>
                  ) : (
                    "Load more"
                  )}
                </button>
              </div>
            )}

            {!loading && rows.length === 0 && (
              <div className="text-center py-20 space-y-4 bg-[#0a0a0a] rounded-[48px] border border-dashed border-white/10">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                  <Search size={32} className="text-white/10" />
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-black text-white uppercase tracking-tight">No symbols found</p>
                  <p className="text-white/40 font-medium">Try searching for a different keyword or asset type.</p>
                </div>
                <button
                  onClick={clearSearch}
                  className="text-[color:var(--lime)] font-black uppercase tracking-widest text-[10px] hover:underline pt-4"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}

        {!hasSearched && (
          <div className="mt-20 p-12 rounded-[60px] bg-[#0a0a0a] border border-white/5 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[color:var(--lime-05)] rounded-full blur-[80px] -mr-32 -mt-32" />
            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center text-center md:text-left">
              <div className="space-y-6">
                <h2 className="text-4xl font-black tracking-tighter uppercase">Built for reliability</h2>
                <p className="text-white/40 text-lg font-medium leading-relaxed max-w-md mx-auto md:mx-0">
                  tickr.id connects to trusted market data sources and delivers updates to your device through our backend services.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[color:var(--lime)]">
                    <IconPulse size={22} />
                  </div>
                  <div className="text-left">
                    <div className="text-2xl sm:text-3xl leading-none tracking-tight font-black text-white whitespace-nowrap">Live prices</div>
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Real-time updates</div>
                  </div>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[color:var(--lime)]">
                    <IconLayers size={22} />
                  </div>
                  <div className="text-left">
                    <div className="text-2xl sm:text-3xl leading-none tracking-tight font-black text-white whitespace-nowrap">Multi markets</div>
                  <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Crypto, stocks, commodities</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <GlobalFooter />
    </div>
  );
}
