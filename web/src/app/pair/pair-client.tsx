"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type React from "react";
import { fetchAssets, fetchDevice, saveConfig, searchSymbols, type SymbolRow } from "@/lib/api";
import { type TickerItem } from "@/components/SortableTickers";
import { ChevronDown, RefreshCw, Save, Search, Sun, X } from "lucide-react";

function SymbolPicker({
  value,
  type,
  onChange,
  onExchangeOptions
}: {
  value: string;
  type: string;
  onChange: (symbol: string) => void;
  onExchangeOptions: (options: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SymbolRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const res = await searchSymbols({ q: search, type, limit: 50 });
        if (!cancelled) {
          setResults(res.data || []);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timer = setTimeout(run, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, type, open]);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[color:var(--lime-30)] focus:ring-4 focus:ring-[color:var(--lime-10)] transition-all"
      >
        <span className={value ? "text-white font-bold" : "text-white/40"}>
          {value || "Select Symbol"}
        </span>
        <ChevronDown size={14} className="text-white/40" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 flex w-full flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] p-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
          <div className="relative mb-2 flex items-center">
            <Search size={14} className="absolute left-3 text-white/40" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-[color:var(--lime-30)]"
            />
          </div>
          <div className="flex max-h-60 flex-col overflow-auto">
            {loading && results.length === 0 ? (
              <div className="py-4 text-center text-xs text-white/40">Loading...</div>
            ) : results.length === 0 ? (
              <div className="py-4 text-center text-xs text-white/40">No symbols found</div>
            ) : (
              results.map((r) => (
                <button
                  key={r.symbol}
                  type="button"
                  onClick={() => {
                    onChange(r.symbol);
                    onExchangeOptions(r.available_exchanges || []);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex flex-col items-start rounded-xl px-3 py-2.5 text-left hover:bg-[color:var(--lime-10)] transition-colors"
                >
                  <span className="text-sm font-bold text-white">{r.symbol}</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    {r.currency_base && r.currency_quote ? `${r.currency_base} / ${r.currency_quote}` : r.type}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditableTickerRow({
  item,
  index,
  isOptional,
  assetTypes,
  intervalOptions,
  onChange,
  onRemove
}: {
  item: TickerItem;
  index: number;
  isOptional: boolean;
  assetTypes: string[];
  intervalOptions: string[];
  onChange: (item: TickerItem) => void;
  onRemove?: () => void;
}) {
  const [exchanges, setExchanges] = useState<string[]>([]);

  useEffect(() => {
    if (item.symbol) {
      searchSymbols({ q: item.symbol, limit: 1 }).then((res) => {
        const found = res.data?.find((x) => x.symbol === item.symbol);
        if (found) setExchanges(found.available_exchanges || []);
      });
    }
  }, [item.symbol]);

  return (
    <div className="flex flex-col gap-5 rounded-[32px] border border-white/5 bg-white/5 p-6 transition-all hover:bg-white/[0.08] hover:shadow-2xl hover:border-[color:var(--lime-20)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--lime)] text-[10px] font-black text-black shadow-[0_10px_30px_-15px_rgba(24,217,141,0.35)]">
            {index + 1}
          </span>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            {isOptional ? "Optional Ticker" : "Required Ticker"}
          </h3>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-white/20 hover:text-rose-500 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Type</span>
          <select
            value={item.type}
            onChange={(e) => onChange({ ...item, type: e.target.value, symbol: "", exchange: "" })}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[color:var(--lime-30)] focus:ring-4 focus:ring-[color:var(--lime-10)] transition-all appearance-none"
          >
            {assetTypes.map((t) => (
              <option key={t} value={t} className="bg-[#0a0a0a]">{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Interval</span>
          <select
            value={item.interval}
            onChange={(e) => onChange({ ...item, interval: e.target.value })}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[color:var(--lime-30)] focus:ring-4 focus:ring-[color:var(--lime-10)] transition-all appearance-none"
          >
            {intervalOptions.map((i) => (
              <option key={i} value={i} className="bg-[#0a0a0a]">{i}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Symbol</span>
          <SymbolPicker
            type={item.type}
            value={item.symbol}
            onChange={(sym) => onChange({ ...item, symbol: sym, exchange: "" })}
            onExchangeOptions={setExchanges}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Exchange</span>
          <select
            value={item.exchange || ""}
            disabled={exchanges.length === 0}
            onChange={(e) => onChange({ ...item, exchange: e.target.value })}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[color:var(--lime-30)] focus:ring-4 focus:ring-[color:var(--lime-10)] transition-all disabled:opacity-30 appearance-none"
          >
            <option value="" disabled className="bg-[#0a0a0a]">Select Exchange</option>
            {exchanges.map((ex) => (
              <option key={ex} value={ex} className="bg-[#0a0a0a]">{ex}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function Badge(props: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/40 font-black uppercase tracking-widest">
      {props.children}
    </span>
  );
}

export function PairClient() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get("device_id") ?? "";

  const [assetTypes, setAssetTypes] = useState<string[]>(["crypto", "stock", "etf", "forex", "commodity"]);
  const [intervalOptions, setIntervalOptions] = useState<string[]>([
    "1min", "5min", "15min", "30min", "45min", "1h", "2h", "4h", "1week", "1month"
  ]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [online, setOnline] = useState<boolean>(false);
  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const [rotateSeconds, setRotateSeconds] = useState<number>(60);
  const [brightness, setBrightness] = useState<number>(100);
  const [modeTab, setModeTab] = useState<"one" | "two" | "multiple">("multiple");
  const [multipleLayout, setMultipleLayout] = useState<"one" | "two">("one");

  const maxTickers = modeTab === "one" ? 1 : modeTab === "two" ? 2 : 16;
  const minTickers = modeTab === "multiple" 
    ? (multipleLayout === "one" ? 2 : 4) 
    : maxTickers;

  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "ok" | "err">("idle");

  function makeTickerId(input: { type: string; symbol: string; interval: string; exchange?: string }): string {
    return `${input.type}:${input.symbol}:${input.interval}:${input.exchange ?? ""}`;
  }

  function displayModeToSend(): string {
    if (modeTab === "one") return "one";
    if (modeTab === "two") return "two";
    return multipleLayout === "one" ? "multi_one" : "multi_two";
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!deviceId) {
        setLoading(false);
        setLoadError("missing_device_id");
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const [assetsRes, deviceRes] = await Promise.all([fetchAssets(), fetchDevice(deviceId)]);
        if (cancelled) return;
        if (Array.isArray(assetsRes.types) && assetsRes.types.length > 0) {
          setAssetTypes(assetsRes.types);
        }
        if (assetsRes.intervals) {
          const nextIntervals: string[] = [];
          for (const m of assetsRes.intervals.m ?? []) nextIntervals.push(`${m}min`);
          for (const h of assetsRes.intervals.h ?? []) nextIntervals.push(`${h}h`);
          for (const d of assetsRes.intervals.d ?? []) nextIntervals.push(`${d}day`);
          for (const w of assetsRes.intervals.w ?? []) nextIntervals.push(`${w}week`);
          for (const mo of assetsRes.intervals.mo ?? []) nextIntervals.push(`${mo}month`);
          if (nextIntervals.length > 0) setIntervalOptions(nextIntervals);
        }
        setOnline(Boolean(deviceRes.online));
        const cfg = deviceRes.configuration;
        if (cfg) {
          const rawTickers = Array.isArray(cfg.tickers) ? cfg.tickers : [];
          const parsed: TickerItem[] = [];
          for (const t of rawTickers) {
            if (!t || typeof t !== "object") continue;
            const type = typeof (t as { type?: unknown }).type === "string" ? String((t as { type?: unknown }).type) : "crypto";
            const symbol = typeof (t as { symbol?: unknown }).symbol === "string" ? String((t as { symbol?: unknown }).symbol) : "";
            const interval = typeof (t as { interval?: unknown }).interval === "string" ? String((t as { interval?: unknown }).interval) : "1min";
            const exchange = typeof (t as { exchange?: unknown }).exchange === "string" ? String((t as { exchange?: unknown }).exchange) : "";
            if (!symbol) continue;
            parsed.push({ id: makeTickerId({ type, symbol, interval, exchange }), type, symbol, interval, exchange: exchange || undefined });
          }
          if (parsed.length > 0) {
            setTickers(parsed);
          }
          setRotateSeconds(typeof cfg.rotate_seconds === "number" ? cfg.rotate_seconds : 60);
          setBrightness(typeof cfg.brightness === "number" ? cfg.brightness : 100);
          const dm = typeof cfg.display_mode === "string" ? cfg.display_mode : "auto";
          if (dm === "one") setModeTab("one");
          else if (dm === "two") setModeTab("two");
          else if (dm === "multi_two") {
            setModeTab("multiple");
            setMultipleLayout("two");
          } else if (dm === "multi_one") {
            setModeTab("multiple");
            setMultipleLayout("one");
          } else {
            if (parsed.length <= 1) setModeTab("one");
            else if (parsed.length === 2) setModeTab("two");
            else setModeTab("multiple");
          }
        }
      } catch {
        if (cancelled) return;
        setLoadError("load_failed");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  // Adjust tickers array when mode changes
  useEffect(() => {
    setTickers((prev) => {
      const next = [...prev];
      if (next.length > maxTickers) {
        return next.slice(0, maxTickers);
      }
      while (next.length < minTickers) {
        next.push({
          id: Math.random().toString(36).substring(2, 9),
          type: "crypto",
          symbol: "",
          interval: "1min",
          exchange: ""
        });
      }
      return next;
    });
  }, [modeTab, maxTickers, minTickers]);

  const isCountValid = tickers.slice(0, minTickers).every((t) => !!t.symbol);

  async function onSave() {
    if (!deviceId) return;
    setSaving(true);
    setSaveState("idle");
    try {
      const rotateToSend = modeTab === "multiple" ? rotateSeconds : 0;
      const validTickers = tickers.filter((t) => !!t.symbol);
      await saveConfig({
        deviceId,
        pairs: validTickers.map((t) => t.symbol),
        rotationInterval: rotateToSend,
        tickers: validTickers.map((t) => ({ type: t.type, symbol: t.symbol, interval: t.interval, exchange: t.exchange })),
        rotateSeconds: rotateToSend,
        displayMode: displayModeToSend(),
        brightness: brightness
      });
      setSaveState("ok");
    } catch {
      setSaveState("err");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveState("idle"), 1500);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 mx-auto flex w-full max-w-xl flex-col gap-4 px-5 py-32">
        <div className="h-12 w-44 animate-pulse rounded-xl bg-white/5" />
        <div className="h-6 w-72 animate-pulse rounded-xl bg-white/5" />
        <div className="mt-8 space-y-6">
          <div className="h-40 w-full animate-pulse rounded-[32px] bg-white/5" />
          <div className="h-40 w-full animate-pulse rounded-[32px] bg-white/5" />
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex-1 mx-auto flex w-full max-w-xl flex-col gap-6 px-5 py-32 text-center text-white">
        <div className="w-20 h-20 rounded-[32px] bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <X size={40} />
        </div>
        <h1 className="text-3xl font-black tracking-tighter uppercase">Connection Error</h1>
        <p className="text-white/60 font-medium">Unable to load device pairing interface. Please check your connection or device ID.</p>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 font-mono text-xs text-white/40">
          Error Code: {loadError}
        </div>
        <button onClick={() => window.location.reload()} className="knob-btn-order mt-4 mx-auto">
          <RefreshCw aria-hidden="true" />
          Try Again
        </button>
      </main>
    );
  }

  return (
    <main className="flex-1 mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-16 pb-40 text-white">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="knob-page-title knob-page-title--compact !text-left !mx-0 !mb-2">Device setup</h1>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20 font-mono">ID: {deviceId}</span>
              <Badge>{online ? "Online" : "Offline"}</Badge>
            </div>
          </div>
        </header>

        <div className="grid gap-12">
          {/* Brightness Section */}
          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Brightness</h2>
            </div>
            <div className="flex items-center gap-6 rounded-[32px] border border-white/5 bg-white/5 px-6 sm:px-8 py-6 transition-all hover:bg-white/[0.08] hover:shadow-2xl hover:border-[color:var(--lime-10)] group">
              <Sun size={24} className="shrink-0 text-white/20 group-hover:text-[color:var(--lime)] transition-colors" />
              <input
                type="range"
                min="1"
                max="255"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-[color:var(--lime)]"
              />
              <span className="w-12 shrink-0 text-right text-sm font-black tabular-nums text-white">
                {Math.round((brightness / 255) * 100)}%
              </span>
            </div>
          </section>

          {/* Display Mode Section */}
          <section className="space-y-5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Display Mode</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-[24px] border border-white/5 bg-white/5 p-2 text-sm font-bold">
              {[
                { id: "one", label: "One" },
                { id: "two", label: "Two" },
                { id: "multiple", label: "Multi" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setModeTab(tab.id as "one" | "two" | "multiple")}
                  className={[
                    "rounded-2xl px-3 py-3.5 transition-all font-black uppercase tracking-widest text-[11px]",
                    modeTab === tab.id 
                      ? "bg-white/10 text-white shadow-xl border border-white/10 scale-[1.02]" 
                      : "text-white/20 hover:text-white/60 hover:bg-white/5"
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {modeTab === "multiple" && (
              <div className="flex items-center justify-between rounded-[32px] border border-white/5 bg-white/5 px-8 py-6 animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-tight text-white">Layout</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Tickers per screen</span>
                </div>
                <div className="flex gap-2 p-1.5 rounded-2xl bg-[#0a0a0a] border border-white/5">
                  <button
                    type="button"
                    onClick={() => setMultipleLayout("one")}
                    className={[
                      "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                      multipleLayout === "one" ? "bg-[color:var(--lime)] text-black shadow-[0_10px_30px_-15px_rgba(24,217,141,0.35)]" : "text-white/20 hover:text-white"
                    ].join(" ")}
                  >
                    1
                  </button>
                  <button
                    type="button"
                    onClick={() => setMultipleLayout("two")}
                    className={[
                      "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                      multipleLayout === "two" ? "bg-[color:var(--lime)] text-black shadow-[0_10px_30px_-15px_rgba(24,217,141,0.35)]" : "text-white/20 hover:text-white"
                    ].join(" ")}
                  >
                    2
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Order Configuration Section */}
          <section className="space-y-5">
            <div className="flex items-center justify-between ml-1">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Order Configuration</h2>
              <Badge>{tickers.filter(t => t.symbol).length} / {maxTickers}</Badge>
            </div>
            
            <div className="grid gap-6">
              {tickers.map((ticker, idx) => (
                <EditableTickerRow
                  key={ticker.id}
                  item={ticker}
                  index={idx}
                  isOptional={idx >= minTickers}
                  assetTypes={assetTypes}
                  intervalOptions={intervalOptions}
                  onChange={(updated) => {
                    const next = [...tickers];
                    next[idx] = updated;
                    setTickers(next);
                  }}
                  onRemove={idx >= minTickers ? () => {
                    setTickers(tickers.filter((_, i) => i !== idx));
                  } : undefined}
                />
              ))}

              {modeTab === "multiple" && tickers.length < maxTickers && (
                <button
                  type="button"
                  onClick={() => {
                    setTickers([...tickers, {
                      id: Math.random().toString(36).substring(2, 9),
                      type: "crypto",
                      symbol: "",
                      interval: "1min",
                      exchange: ""
                    }]);
                  }}
                  className="flex items-center justify-center gap-3 rounded-[32px] border-2 border-dashed border-white/5 py-10 text-[11px] font-black uppercase tracking-[0.2em] text-white/20 hover:border-[color:var(--lime-30)] hover:text-[color:var(--lime)] hover:bg-[color:var(--lime-05)] transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[color:var(--lime-10)]">
                    <span className="text-lg leading-none mb-0.5">+</span>
                  </div>
                  Add Optional Ticker
                </button>
              )}
            </div>
          </section>

          {/* Multiple Settings Section */}
          {modeTab === "multiple" && (
            <section className="space-y-5 animate-in fade-in slide-in-from-top-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Rotation Settings</h2>
              <div className="flex items-center justify-between rounded-[32px] border border-white/5 bg-white/5 px-8 py-6">
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-tight text-white">Interval</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Switch assets automatically</span>
                </div>
                <select
                  value={rotateSeconds}
                  onChange={(e) => setRotateSeconds(Number(e.target.value))}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white outline-none focus:border-[color:var(--lime-30)] focus:ring-4 focus:ring-[color:var(--lime-10)] transition-all shadow-sm appearance-none"
                >
                  <option value={15} className="bg-[#0a0a0a]">15s</option>
                  <option value={30} className="bg-[#0a0a0a]">30s</option>
                  <option value={60} className="bg-[#0a0a0a]">1m</option>
                  <option value={120} className="bg-[#0a0a0a]">2m</option>
                  <option value={300} className="bg-[#0a0a0a]">5m</option>
                  <option value={600} className="bg-[#0a0a0a]">10m</option>
                </select>
              </div>
            </section>
          )}
        </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-white/5 z-40">
        <div className="mx-auto max-w-2xl flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:flex flex-col shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Configuration</span>
            <span className="text-sm font-bold text-white">{tickers.filter(t => t.symbol).length} Tickers Active</span>
          </div>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || !deviceId || !isCountValid}
            className={[
              "knob-btn-order knob-btn-large flex-1",
              saving || !isCountValid 
                ? "opacity-20 cursor-not-allowed grayscale" 
                : "hover:scale-[1.02] active:scale-95"
            ].join(" ")}
          >
            <Save aria-hidden="true" />
            {saving ? "Saving..." : "Apply Changes"}
          </button>
          
          <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
            {saveState === "ok" && (
              <div className="px-6 py-2 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl animate-in fade-in slide-in-from-bottom-4">
                Saved Successfully
              </div>
            )}
            {saveState === "err" && (
              <div className="px-6 py-2 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl animate-in fade-in slide-in-from-bottom-4">
                Update Failed
              </div>
            )}
          </div>
        </div>
      </div>

    </main>
  );
}
