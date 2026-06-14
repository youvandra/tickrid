function normalizeSymbol(symbol: string): string {
  if (symbol.includes("/")) {
    const [base, quote] = symbol.split("/");
    if (!base || !quote) throw new Error(`Invalid symbol: ${symbol}`);
    return `${base.toUpperCase()}/${quote.toUpperCase()}`;
  }
  return symbol.toUpperCase();
}

export async function fetchTwelveSeries(
  symbolInput: string,
  apikeys: string[],
  interval: string,
  points: number,
  opts?: { exchange?: string; timezone?: string },
): Promise<{
  closes: number[];
  latest: number;
}> {
  if (apikeys.length === 0) throw new Error("missing_twelve_data_api_key");
  const symbol = normalizeSymbol(symbolInput);

  for (let i = 0; i < apikeys.length; i++) {
    const apikey = apikeys[i];
    const url = new URL("https://api.twelvedata.com/time_series");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("format", "json");
    url.searchParams.set("outputsize", String(points));
    if (opts?.exchange && opts.exchange.trim().length > 0) {
      url.searchParams.set("exchange", opts.exchange);
    }
    if (opts?.timezone) url.searchParams.set("timezone", opts.timezone);
    url.searchParams.set("apikey", apikey);

    const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`TwelveData fetch failed (key ${i + 1}/${apikeys.length}). URL: ${url.toString().replace(apikey, "REDACTED")}. Response: ${txt}`);
      if (i < apikeys.length - 1) continue;
      throw new Error(`TwelveData error ${res.status}`);
    }

    const data = (await res.json()) as { values?: Array<{ close: string }>; status?: string; message?: string; code?: number };
    if (data.status === "error") {
      if (data.code === 429) {
        if (i < apikeys.length - 1) {
          console.warn(`TwelveData rate limit on key ${i + 1}, switching to key ${i + 2}`);
          continue;
        }
        throw new Error("twelve_data_rate_limit");
      }
      console.error(`TwelveData API error. URL: ${url.toString().replace(apikey, "REDACTED")}. Error: ${data.message}`);
      throw new Error(`TwelveData error: ${data.message || "Unknown error"}`);
    }

    const values = Array.isArray(data.values) ? data.values : [];
    if (values.length === 0) {
      if (i < apikeys.length - 1) continue;
      throw new Error("No data values returned");
    }
    const latest = Number(values[0].close);
    const closes = values.map((v) => Number(v.close)).filter((n) => Number.isFinite(n));
    return { closes: closes.reverse(), latest };
  }

  throw new Error("twelve_data_rate_limit");
}
