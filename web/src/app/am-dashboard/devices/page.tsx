"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, Settings } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/app/am-dashboard/_components/PageHeader";

type DeviceRow = {
  device_id: string;
  created_at: string;
  last_seen: string | null;
  config_updated_at: string | null;
  rotate_seconds: number | null;
  display_mode: string | null;
  ticker_count: number | null;
};

export default function DevicesPage() {
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/devices?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        setErr(`Request failed (${res.status})`);
        setRows([]);
        return;
      }
      const data = (await res.json()) as { data: DeviceRow[] };
      setRows(data.data ?? []);
    } catch {
      setErr("Failed to fetch. Make sure backend HTTP is running and reachable.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onlineCount = useMemo(() => {
    return rows.filter((r) => r.last_seen && Date.now() - new Date(r.last_seen).getTime() < 60000).length;
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        description="Manage and monitor all connected tickr.id devices."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium">
              {rows.length} Total
            </Badge>
            <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
              {onlineCount} Online
            </Badge>
          </div>
        }
        actions={
          <>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search device_id..."
                className="pl-10 rounded-md bg-background"
              />
            </div>
            <Button
              onClick={() => void refresh()}
              disabled={loading}
              variant="outline"
              className="rounded-md h-9 px-4 text-sm font-medium"
            >
              <RefreshCw size={14} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </>
        }
      />

      {err && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive text-sm font-medium">
          {err}
        </div>
      )}

      {/* Mobile: Card List */}
      <div className="md:hidden space-y-3">
        {rows.map((r) => {
          const isOnline = r.last_seen && Date.now() - new Date(r.last_seen).getTime() < 60000;
          return (
            <Card key={r.device_id} className="rounded-lg border border-border shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs font-bold text-foreground">{r.device_id}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        isOnline
                          ? "bg-primary shadow-[0_0_8px_rgba(24,217,141,0.45)]"
                          : "bg-white/20",
                      ].join(" ")}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Last seen</div>
                    <div className="font-medium text-muted-foreground">
                      {r.last_seen ? new Date(r.last_seen).toLocaleString() : "Never"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Mode</div>
                    <Badge variant="outline" className="mt-1 text-xs font-medium">
                      {r.display_mode ?? "Auto"}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Tickers</div>
                    <Badge variant="outline" className="mt-1 w-fit text-xs font-medium">
                      {r.ticker_count ?? 0}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Rotation</div>
                    <div className="mt-1 text-xs font-medium text-muted-foreground">
                      {r.rotate_seconds ? `${r.rotate_seconds}s` : "—"}
                    </div>
                  </div>
                </div>

                <Link href={`/setup?device_id=${encodeURIComponent(r.device_id)}`} className="block">
                  <Button
                    variant="outline"
                    className="w-full rounded-md text-sm font-medium h-9"
                  >
                    <Settings size={14} className="mr-2" />
                    Configure
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}

        {rows.length === 0 && !loading && (
          <Card className="rounded-lg border border-border bg-muted/20">
            <CardContent className="py-10 text-center text-sm text-muted-foreground font-medium italic">
              No devices found matching your search.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop: Table */}
      <Card className="hidden md:block rounded-lg border border-border shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/60 border-b border-border backdrop-blur">
                <th className="px-6 py-3 text-xs font-medium text-muted-foreground">
                  Device ID
                </th>
                <th className="px-6 py-3 text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-medium text-muted-foreground">
                  Last Seen
                </th>
                <th className="px-6 py-3 text-xs font-medium text-muted-foreground">
                  Config
                </th>
                <th className="px-6 py-3 text-xs font-medium text-muted-foreground">
                  Mode
                </th>
                <th className="px-6 py-3 text-xs font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const isOnline = r.last_seen && Date.now() - new Date(r.last_seen).getTime() < 60000;
                return (
                  <tr key={r.device_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-foreground">{r.device_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "h-2 w-2 rounded-full",
                            isOnline
                              ? "bg-primary shadow-[0_0_8px_rgba(24,217,141,0.45)]"
                              : "bg-white/20",
                          ].join(" ")}
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          {isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs font-medium">
                      {r.last_seen ? new Date(r.last_seen).toLocaleString() : "Never"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit text-[10px] font-black uppercase tracking-widest">
                          {r.ticker_count ?? 0} Tickers
                        </Badge>
                        {r.rotate_seconds && (
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                            {r.rotate_seconds}s Rotation
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-xs font-medium">
                        {r.display_mode ?? "Auto"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/setup?device_id=${encodeURIComponent(r.device_id)}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-md h-8 px-3 text-sm font-medium"
                        >
                          <Settings size={14} className="mr-2" />
                          Configure
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium italic">
                    No devices found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
