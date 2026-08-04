import type { Row } from "./tedcheck";

export interface MysqlCredentials {
  host: string;
  user: string;
  password: string;
  database: string;
}

export interface TedcheckDataSource {
  query(sql: string): Promise<Row[]>;
}

// Real implementation, backed by Bun's native SQL client (mysql adapter).
// Lazily connects on first query - constructing this with null/absent
// credentials (e.g. local dev without the gitignored credentials file)
// is safe; only querying without credentials throws.
export function createMysqlDataSource(
  credentials: MysqlCredentials | null,
): TedcheckDataSource {
  let client: Bun.SQL | null = null;

  function getClient(): Bun.SQL {
    if (!credentials) {
      throw new Error("tedcheck: mysql credentials not configured");
    }
    if (!client) {
      client = new Bun.SQL({
        adapter: "mysql",
        hostname: credentials.host,
        username: credentials.user,
        password: credentials.password,
        database: credentials.database,
      });
    }
    return client;
  }

  return {
    async query(sql: string): Promise<Row[]> {
      const rows = (await getClient().unsafe(sql)) as Record<string, unknown>[];
      return rows.map(decodeDecimalBuffers);
    },
  };
}

// Bun's mysql client returns DECIMAL columns (e.g. round(avg(watt),0)) as
// raw Buffers rather than the string mysql2 (the original service's
// driver) returns by default - decode them to match. COUNT()-derived
// integer columns are unaffected and pass through as JS numbers.
export function decodeDecimalBuffers(row: Record<string, unknown>): Row {
  const decoded: Row = {};
  for (const [key, value] of Object.entries(row)) {
    decoded[key] = Buffer.isBuffer(value)
      ? value.toString()
      : (value as Row[string]);
  }
  return decoded;
}
