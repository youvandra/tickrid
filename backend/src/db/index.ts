import pg from "pg";

export type DeviceRow = {
  device_id: string;
  created_at: Date;
  last_seen: Date | null;
};

export type ConfigurationRow = {
  device_id: string;
  pairs: string[];
  rotation_interval: number;
  tickers: unknown;
  rotate_seconds: number;
  display_mode: string;
  brightness: number;
  updated_at: Date;
};

export type SymbolRow = {
  symbol: string;
  type: string;
  available_exchanges: string[];
  currency_base: string | null;
  currency_quote: string | null;
  updated_at: Date;
};

export type DeviceAdminRow = {
  device_id: string;
  created_at: Date;
  last_seen: Date | null;
  config_updated_at: Date | null;
  rotate_seconds: number | null;
  display_mode: string | null;
  ticker_count: number | null;
};

export function createPool(postgresUrl: string): pg.Pool {
  return new pg.Pool({ connectionString: postgresUrl });
}

export async function ensureSchema(pool: pg.Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS configurations (
      device_id TEXT PRIMARY KEY REFERENCES devices(device_id) ON DELETE CASCADE,
      pairs TEXT[] NOT NULL DEFAULT '{}',
      rotation_interval INTEGER NOT NULL DEFAULT 10,
      tickers JSONB NOT NULL DEFAULT '[]'::jsonb,
      rotate_seconds INTEGER NOT NULL DEFAULT 60,
      display_mode TEXT NOT NULL DEFAULT 'auto',
      brightness INTEGER NOT NULL DEFAULT 100,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE configurations ADD COLUMN IF NOT EXISTS tickers JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE configurations ADD COLUMN IF NOT EXISTS rotate_seconds INTEGER NOT NULL DEFAULT 60`);
  await pool.query(`ALTER TABLE configurations ADD COLUMN IF NOT EXISTS display_mode TEXT NOT NULL DEFAULT 'auto'`);
  await pool.query(`ALTER TABLE configurations ADD COLUMN IF NOT EXISTS brightness INTEGER NOT NULL DEFAULT 100`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS symbols (
      symbol TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'crypto',
      available_exchanges TEXT[] NOT NULL DEFAULT '{}',
      currency_base TEXT,
      currency_quote TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function upsertDevice(pool: pg.Pool, deviceId: string): Promise<void> {
  await pool.query(
    `
    INSERT INTO devices (device_id, last_seen)
    VALUES ($1, NOW())
    ON CONFLICT (device_id) DO UPDATE SET last_seen = NOW()
    `,
    [deviceId],
  );
}

export async function touchLastSeen(pool: pg.Pool, deviceId: string): Promise<void> {
  await pool.query(`UPDATE devices SET last_seen = NOW() WHERE device_id = $1`, [deviceId]);
}

export async function getDevice(pool: pg.Pool, deviceId: string): Promise<DeviceRow | null> {
  const result = await pool.query<DeviceRow>(`SELECT * FROM devices WHERE device_id = $1`, [
    deviceId,
  ]);
  return result.rows[0] ?? null;
}

export async function getConfiguration(
  pool: pg.Pool,
  deviceId: string,
): Promise<ConfigurationRow | null> {
  const result = await pool.query<ConfigurationRow>(
    `SELECT * FROM configurations WHERE device_id = $1`,
    [deviceId],
  );
  return result.rows[0] ?? null;
}

export async function upsertConfiguration(
  pool: pg.Pool,
  input: {
    deviceId: string;
    pairs: string[];
    rotationInterval: number;
    tickers: unknown;
    rotateSeconds: number;
    displayMode: string;
    brightness: number;
  },
): Promise<void> {
  const tickersJson = JSON.stringify(Array.isArray(input.tickers) ? input.tickers : []);
  await pool.query(
    `
    INSERT INTO configurations (device_id, pairs, rotation_interval, tickers, rotate_seconds, display_mode, brightness, updated_at)
    VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, NOW())
    ON CONFLICT (device_id) DO UPDATE SET
      pairs = EXCLUDED.pairs,
      rotation_interval = EXCLUDED.rotation_interval,
      tickers = EXCLUDED.tickers,
      rotate_seconds = EXCLUDED.rotate_seconds,
      display_mode = EXCLUDED.display_mode,
      brightness = EXCLUDED.brightness,
      updated_at = NOW()
    `,
    [input.deviceId, input.pairs, input.rotationInterval, tickersJson, input.rotateSeconds, input.displayMode, input.brightness],
  );
}

export async function getAllConfigurations(pool: pg.Pool): Promise<ConfigurationRow[]> {
  const result = await pool.query<ConfigurationRow>(`SELECT * FROM configurations`);
  return result.rows;
}

export async function upsertSymbols(
  pool: pg.Pool,
  items: Array<{ symbol: string; type?: string; available_exchanges?: string[]; currency_base?: string; currency_quote?: string }>,
): Promise<number> {
  if (items.length === 0) return 0;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const it of items) {
      await client.query(
        `
        INSERT INTO symbols (symbol, type, available_exchanges, currency_base, currency_quote, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (symbol) DO UPDATE SET
          type = EXCLUDED.type,
          available_exchanges = EXCLUDED.available_exchanges,
          currency_base = EXCLUDED.currency_base,
          currency_quote = EXCLUDED.currency_quote,
          updated_at = NOW()
        `,
        [it.symbol, it.type ?? "crypto", it.available_exchanges ?? [], it.currency_base ?? null, it.currency_quote ?? null],
      );
    }
    await client.query("COMMIT");
    return items.length;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getSymbols(
  pool: pg.Pool,
  opts: { type?: string; search?: string; limit?: number; offset?: number } = {},
): Promise<SymbolRow[]> {
  const where: string[] = [];
  const params: any[] = [];
  if (opts.type) {
    params.push(opts.type);
    where.push(`type = $${params.length}`);
  }
  if (opts.search) {
    params.push(`%${opts.search.toLowerCase()}%`);
    where.push(`lower(symbol) LIKE $${params.length}`);
  }
  const limit = Math.max(1, Math.min(500, opts.limit ?? 200));
  const offset = Math.max(0, Math.min(10000, opts.offset ?? 0));
  const sql = `
    SELECT symbol, type, available_exchanges, currency_base, currency_quote, updated_at
    FROM symbols
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY symbol ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
  const result = await pool.query<SymbolRow>(sql, params);
  return result.rows;
}

export async function getDevicesAdmin(
  pool: pg.Pool,
  opts: { search?: string; limit?: number } = {},
): Promise<DeviceAdminRow[]> {
  const params: any[] = [];
  const where: string[] = [];
  if (opts.search) {
    params.push(`%${opts.search.toLowerCase()}%`);
    where.push(`lower(d.device_id) LIKE $${params.length}`);
  }
  const limit = Math.max(1, Math.min(500, opts.limit ?? 200));
  const sql = `
    SELECT
      d.device_id,
      d.created_at,
      d.last_seen,
      c.updated_at AS config_updated_at,
      c.rotate_seconds,
      c.display_mode,
      CASE WHEN c.tickers IS NULL THEN NULL ELSE jsonb_array_length(c.tickers) END AS ticker_count
    FROM devices d
    LEFT JOIN configurations c ON c.device_id = d.device_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY d.last_seen DESC NULLS LAST, d.created_at DESC
    LIMIT ${limit}
  `;
  const result = await pool.query<DeviceAdminRow>(sql, params);
  return result.rows;
}
