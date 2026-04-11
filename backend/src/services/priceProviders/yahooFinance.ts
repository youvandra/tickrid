type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        currency?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: { code?: string; description?: string };
  };
};

export async function fetchYahooSeries(
  symbol: string,
  opts?: { interval?: string; range?: string },
): Promise<{ closes: number[]; latest: number }> {
  const interval = opts?.interval ?? "1m";
  const range = opts?.range ?? "1d";

  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);
  url.searchParams.set("includePrePost", "false");

  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      // Yahoo blocks some default UAs; keep it browser-like.
      "user-agent": "Mozilla/5.0 (compatible; tickr/1.0)",
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`yahoo_http_${res.status}:${txt.slice(0, 200)}`);
  }

  const data = (await res.json()) as YahooChartResponse;
  if (data.chart?.error) {
    throw new Error(`yahoo_error:${data.chart.error.code ?? "unknown"}:${data.chart.error.description ?? ""}`);
  }

  const result = data.chart?.result?.[0];
  const closesRaw = result?.indicators?.quote?.[0]?.close ?? [];
  const closes = closesRaw.filter((x): x is number => typeof x === "number" && Number.isFinite(x));

  if (closes.length === 0) {
    const metaPrice = result?.meta?.regularMarketPrice;
    if (typeof metaPrice === "number" && Number.isFinite(metaPrice)) {
      return { closes: [metaPrice], latest: metaPrice };
    }
    throw new Error("yahoo_no_data");
  }

  const latest = closes[closes.length - 1]!;
  return { closes, latest };
}

