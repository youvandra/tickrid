import pg from "pg";
import { createPool, ensureSchema } from "../db/index.js";
import { requireEnv } from "../env.js";

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function readArg(prefix: string): string | null {
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (!arg) return null;
  return arg.slice(prefix.length);
}

async function main(): Promise<void> {
  const apply = hasFlag("--apply");
  const quotesRaw = readArg("--quotes=") ?? "USD,IDR";
  const allowedQuotes = quotesRaw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (allowedQuotes.length === 0) {
    throw new Error("allowed quotes empty (use --quotes=USD,IDR)");
  }

  const postgresUrl = requireEnv("POSTGRES_URL");
  const pool = createPool(postgresUrl);
  await ensureSchema(pool);

  const client = await pool.connect();
  try {
    // NOTE:
    // In our DB, `currency_quote` is often stored as a human-readable name
    // (e.g. "US DOLLAR", "INDONESIAN RUPIAH"), not ISO code ("USD", "IDR").
    // So we normalize a few common cases into ISO codes before filtering.
    const NORMALIZE_QUOTE_SQL = `
      CASE
        WHEN currency_quote IS NULL THEN NULL
        WHEN upper(trim(currency_quote)) IN ('USD', 'US DOLLAR', 'UNITED STATES DOLLAR', 'U.S. DOLLAR') THEN 'USD'
        WHEN upper(trim(currency_quote)) IN ('IDR', 'INDONESIAN RUPIAH', 'RUPIAH') THEN 'IDR'
        WHEN upper(trim(currency_quote)) ~ '^[A-Z]{3}$' THEN upper(trim(currency_quote))
        ELSE upper(trim(currency_quote))
      END
    `;

    // Find candidates first (dry-run friendly).
    const toDelete = await client.query<{ symbol: string; currency_quote: string | null }>(
      `
      SELECT symbol, currency_quote
      FROM (
        SELECT
          symbol,
          currency_quote,
          ${NORMALIZE_QUOTE_SQL} AS quote_norm
        FROM symbols
      ) s
      WHERE
        s.currency_quote IS NOT NULL
        AND s.quote_norm IS NOT NULL
        AND NOT (s.quote_norm = ANY($1::text[]))
      ORDER BY s.quote_norm ASC, s.symbol ASC
      `,
      [allowedQuotes],
    );

    const total = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM symbols`);
    const toDeleteCount = toDelete.rows.length;
    const totalCount = Number(total.rows[0]?.count ?? 0);

    const quoteBreakdown = await client.query<{ currency_quote: string; count: string }>(
      `
      SELECT quote_norm AS currency_quote, COUNT(*)::text AS count
      FROM (
        SELECT ${NORMALIZE_QUOTE_SQL} AS quote_norm
        FROM symbols
        WHERE currency_quote IS NOT NULL
      ) s
      WHERE
        s.quote_norm IS NOT NULL
        AND NOT (s.quote_norm = ANY($1::text[]))
      GROUP BY s.quote_norm
      ORDER BY COUNT(*) DESC, s.quote_norm ASC
      `,
      [allowedQuotes],
    );

    const affectedConfigs = await client.query<{ count: string }>(
      `
      WITH to_delete AS (
        SELECT symbol
        FROM symbols
        WHERE
          currency_quote IS NOT NULL
          AND (
            ${NORMALIZE_QUOTE_SQL}
          ) IS NOT NULL
          AND NOT ((
            ${NORMALIZE_QUOTE_SQL}
          ) = ANY($1::text[]))
      )
      SELECT COUNT(*)::text AS count
      FROM configurations c
      WHERE
        EXISTS (
          SELECT 1
          FROM unnest(c.pairs) p
          WHERE p IN (SELECT symbol FROM to_delete)
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(c.tickers) t
          WHERE (t->>'symbol') IN (SELECT symbol FROM to_delete)
        )
      `,
      [allowedQuotes],
    );

    console.log(`[prune] allowed quotes: ${allowedQuotes.join(", ")}`);
    console.log(`[prune] symbols total: ${totalCount}`);
    console.log(`[prune] symbols to delete (quote not allowed): ${toDeleteCount}`);
    console.log(`[prune] configurations affected: ${Number(affectedConfigs.rows[0]?.count ?? 0)}`);
    console.log("");
    console.log("[prune] top non-allowed quotes:");
    console.log(
      quoteBreakdown.rows
        .slice(0, 10)
        .map((r) => `  - ${r.currency_quote}: ${r.count}`)
        .join("\n") || "  (none)",
    );
    console.log("");
    console.log("[prune] sample symbols to delete:");
    console.log(
      toDelete.rows
        .slice(0, 20)
        .map((r) => `  - ${r.symbol} (${String(r.currency_quote).toUpperCase()})`)
        .join("\n") || "  (none)",
    );

    if (!apply) {
      console.log("");
      console.log("[prune] dry-run only. Re-run with --apply to execute deletion.");
      return;
    }

    console.log("");
    console.log("[prune] applying changes...");

    await client.query("BEGIN");

    // 1) Remove deleted symbols from device configurations (pairs + tickers JSONB).
    await client.query(
      `
      WITH to_delete AS (
        SELECT symbol
        FROM symbols
        WHERE
          currency_quote IS NOT NULL
          AND (
            ${NORMALIZE_QUOTE_SQL}
          ) IS NOT NULL
          AND NOT ((
            ${NORMALIZE_QUOTE_SQL}
          ) = ANY($1::text[]))
      )
      UPDATE configurations c
      SET
        pairs = COALESCE(
          (SELECT array_agg(p) FROM unnest(c.pairs) p WHERE p NOT IN (SELECT symbol FROM to_delete)),
          '{}'::text[]
        ),
        tickers = COALESCE(
          (SELECT jsonb_agg(t) FROM jsonb_array_elements(c.tickers) t WHERE (t->>'symbol') NOT IN (SELECT symbol FROM to_delete)),
          '[]'::jsonb
        ),
        updated_at = NOW()
      `,
      [allowedQuotes],
    );

    // 2) Delete symbols not in allowed quotes.
    const deleted = await client.query(
      `
      DELETE FROM symbols
      WHERE
        currency_quote IS NOT NULL
        AND (
          ${NORMALIZE_QUOTE_SQL}
        ) IS NOT NULL
        AND NOT ((
          ${NORMALIZE_QUOTE_SQL}
        ) = ANY($1::text[]))
      `,
      [allowedQuotes],
    );

    await client.query("COMMIT");

    console.log(`[prune] deleted rows from symbols: ${deleted.rowCount ?? 0}`);
    console.log(
      "[prune] NOTE: restart backend (or clear/rebuild Redis pair counts) so counts reflect updated pairs.",
    );
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
