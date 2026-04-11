"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, Upload, Check, AlertCircle, ChevronLeft, ChevronRight, List, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/app/am-dashboard/_components/PageHeader";

function apiBaseUrl(): string {
  return "";
}

type SymbolRow = {
  symbol: string;
  type: string;
  available_exchanges: string[];
  currency_base: string | null;
  currency_quote: string | null;
  updated_at: string;
};

type UploadRow = {
  symbol: string;
  type: string;
  baseQuote: string; // format: "Base / Quote"
  exchanges: string; // comma-separated
};

export default function TickrPage() {
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([
    { symbol: "", type: "stocks", baseQuote: "", exchanges: "Yahoo Finance" },
  ]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>("");
  const [fetchError, setFetchError] = useState<string>("");

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [rows, setRows] = useState<SymbolRow[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const limit = 50;

  // Mobile-only: toggle between Symbols and Upload to avoid overwhelming screens.
  const [mobileView, setMobileView] = useState<"symbols" | "upload">("symbols");

  const refresh = useCallback(async (currentOffset: number = 0) => {
    setLoading(true);
    setFetchError("");
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (q) params.set("q", q);
      params.set("limit", String(limit));
      params.set("offset", String(currentOffset));
      
      const base = apiBaseUrl();
      const res = await fetch(`${base}/api/admin/symbols?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        setFetchError(`Request failed (${res.status})`);
        setRows([]);
        return;
      }
      const data = (await res.json()) as { data: SymbolRow[]; has_more: boolean };
      setRows(data.data);
      setHasMore(data.has_more);
      setOffset(currentOffset);
    } catch {
      setFetchError("Failed to fetch. Make sure backend HTTP is running and reachable.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, typeFilter]);

  function addUploadRow() {
    setUploadRows((prev) => [
      ...prev,
      { symbol: "", type: "stocks", baseQuote: "", exchanges: "Yahoo Finance" },
    ]);
  }

  function removeUploadRow(index: number) {
    setUploadRows((prev) => prev.filter((_, i) => i !== index));
  }

  function parseBaseQuote(input: string): { currency_base?: string; currency_quote?: string } {
    const raw = input.trim();
    if (!raw) return {};
    const parts = raw.split("/");
    if (parts.length === 1) return { currency_base: raw };
    const base = parts[0]?.trim();
    const quote = parts.slice(1).join("/").trim();
    return { currency_base: base || undefined, currency_quote: quote || undefined };
  }

  async function upload() {
    setUploading(true);
    setUploadResult("");
    setUploadError(null);
    try {
      const cleaned = uploadRows
        .map((r) => ({
          symbol: r.symbol.trim(),
          type: r.type.trim(),
          ...parseBaseQuote(r.baseQuote),
          available_exchanges: r.exchanges
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }))
        .filter((r) => r.symbol.length > 0);

      if (cleaned.length === 0) {
        setUploadError("Masukkan minimal 1 Symbol.");
        return;
      }

      const invalid = cleaned.find((r) => !r.type);
      if (invalid) {
        setUploadError("Type wajib diisi untuk semua row.");
        return;
      }

      const res = await fetch(`${apiBaseUrl()}/api/admin/symbols/upload`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: cleaned })
      });
      if (!res.ok) throw new Error("upload_failed");
      const r = await res.json();
      setUploadResult(`Upserted: ${r.upserted}`);
      void refresh(0);
    } catch {
      setUploadResult("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    void refresh(0);
  }, [refresh]);

  const handlePrevPage = () => {
    const nextOffset = Math.max(0, offset - limit);
    void refresh(nextOffset);
  };

  const handleNextPage = () => {
    const nextOffset = offset + limit;
    void refresh(nextOffset);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickers"
        description="Manage the global list of supported market symbols."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium">
              Limit {limit}
            </Badge>
            <Badge variant="outline" className="text-xs font-medium">
              Showing {offset + 1}–{offset + rows.length}
            </Badge>
          </div>
        }
      />

      {/* Mobile view switch */}
      <div className="lg:hidden">
        <div className="inline-flex rounded-md border border-border bg-muted/20 p-1">
          <Button
            type="button"
            variant={mobileView === "symbols" ? "secondary" : "ghost"}
            className="h-8 rounded-md px-3 text-sm font-medium"
            onClick={() => setMobileView("symbols")}
          >
            <List size={14} />
            Symbols
          </Button>
          <Button
            type="button"
            variant={mobileView === "upload" ? "secondary" : "ghost"}
            className="h-8 rounded-md px-3 text-sm font-medium"
            onClick={() => setMobileView("upload")}
          >
            <Upload size={14} />
            Upload
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Upload Section */}
        <div className={["lg:col-span-1 space-y-6", mobileView === "symbols" ? "hidden lg:block" : ""].join(" ")}>
          <Card className="rounded-lg border border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-foreground">Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground ml-1">
                  Format: Symbol, Type, Base/Quote, Exchanges
                </span>
                <div className="space-y-3">
                  {uploadRows.map((row, idx) => (
                    <div key={idx} className="rounded-md border border-border bg-background p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold text-muted-foreground">Row {idx + 1}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-md"
                          onClick={() => removeUploadRow(idx)}
                          disabled={uploadRows.length === 1}
                          aria-label="Remove row"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold text-muted-foreground">Symbol</div>
                          <Input
                            value={row.symbol}
                            onChange={(e) => {
                              const v = e.target.value;
                              setUploadRows((prev) => prev.map((r, i) => (i === idx ? { ...r, symbol: v } : r)));
                            }}
                            placeholder="NVDA / BBCA.JK"
                            className="h-9"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold text-muted-foreground">Type</div>
                          <select
                            value={row.type}
                            onChange={(e) => {
                              const v = e.target.value;
                              setUploadRows((prev) => prev.map((r, i) => (i === idx ? { ...r, type: v } : r)));
                            }}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring/60 transition-all"
                          >
                            <option value="stocks">Stocks</option>
                            <option value="crypto">Crypto</option>
                            <option value="commodity">Commodity</option>
                            <option value="forex">Forex</option>
                            <option value="etfs">ETFs</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold text-muted-foreground">Base/Quote</div>
                          <Input
                            value={row.baseQuote}
                            onChange={(e) => {
                              const v = e.target.value;
                              setUploadRows((prev) => prev.map((r, i) => (i === idx ? { ...r, baseQuote: v } : r)));
                            }}
                            placeholder="NVIDIA Corporation / US DOLLAR"
                            className="h-9"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold text-muted-foreground">Exchanges</div>
                          <Input
                            value={row.exchanges}
                            onChange={(e) => {
                              const v = e.target.value;
                              setUploadRows((prev) => prev.map((r, i) => (i === idx ? { ...r, exchanges: v } : r)));
                            }}
                            placeholder="Yahoo Finance"
                            className="h-9"
                          />
                          <div className="text-[10px] text-muted-foreground">
                            Pisahkan pakai koma, contoh: <span className="font-mono">Yahoo Finance, IDX</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" className="w-full rounded-md h-9" onClick={addUploadRow}>
                    <Plus size={16} className="mr-2" />
                    Add row
                  </Button>
                </div>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 text-destructive text-xs font-medium ml-1">
                  <AlertCircle size={14} />
                  {uploadError}
                </div>
              )}

              <Button
                disabled={uploading}
                onClick={() => void upload()}
                className="w-full rounded-md h-9 text-sm font-medium bg-primary hover:opacity-90"
              >
                {uploading ? (
                  <RefreshCw size={18} className="animate-spin mr-2" />
                ) : (
                  <Upload size={18} className="mr-2" />
                )}
                {uploading ? "Uploading..." : "Apply Upload"}
              </Button>

              {uploadResult && (
                <div className="flex items-center justify-center gap-2 text-emerald-700 text-xs font-medium">
                  <Check size={14} />
                  {uploadResult}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Symbol List */}
        <div className={["lg:col-span-2 space-y-6", mobileView === "upload" ? "hidden lg:block" : ""].join(" ")}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOffset(0);
                }}
                placeholder="Search symbol..."
                className="pl-10 rounded-md bg-background"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setOffset(0);
              }}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring/60 transition-all"
            >
              <option value="">All Types</option>
              <option value="crypto">Crypto</option>
              <option value="stocks">Stocks</option>
              <option value="etfs">ETFs</option>
              <option value="forex">Forex</option>
              <option value="commodity">Commodity</option>
            </select>
            <Button
              onClick={() => void refresh(0)}
              disabled={loading}
              variant="outline"
              className="rounded-md h-9 px-4 text-sm font-medium"
            >
              <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {fetchError && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive text-sm font-medium">
              {fetchError}
            </div>
          )}

          <Card className="rounded-lg border border-border shadow-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/60 border-b border-border backdrop-blur">
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Symbol</th>
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Base/Quote</th>
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground">Exchanges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.symbol} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-foreground">{r.symbol}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-xs font-medium">
                          {r.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">{r.currency_base ?? "-"}</span>
                          <span className="text-xs text-muted-foreground">{r.currency_quote ?? "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {r.available_exchanges.slice(0, 3).map((ex) => (
                            <Badge key={ex} variant="outline" className="text-xs font-medium text-muted-foreground">
                              {ex}
                            </Badge>
                          ))}
                          {r.available_exchanges.length > 3 && (
                            <span className="text-xs font-medium text-muted-foreground ml-1">
                              +{r.available_exchanges.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-medium italic">
                        No symbols found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
              <div className="text-xs text-muted-foreground">
                Showing {offset + 1} - {offset + rows.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrevPage}
                  disabled={offset === 0 || loading}
                  variant="outline"
                  className="w-9 h-9 rounded-md p-0"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  onClick={handleNextPage}
                  disabled={!hasMore || loading}
                  variant="outline"
                  className="w-9 h-9 rounded-md p-0"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
