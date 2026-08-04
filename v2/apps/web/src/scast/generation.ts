// The cross-tab transform: reshapes scast-bridge's raw copied digest
// messages into a per-generation, per-host sync-state table. Framework-free
// and NATS-free on purpose - a strong candidate for future extraction (see
// issue #250) - so it only knows about plain records, never a connection.

export interface GenerationRecord {
  generation: string;
  host: string;
  digest: string;
}

export type DigestTable = (string | null)[][];

interface RawDigestMessage {
  generation?: unknown;
  host?: unknown;
  digest?: unknown;
  scope?: unknown;
}

// scast-bridge copies Scrobblecast's digest messages byte-for-byte onto the
// new server - this is the same raw shape scrobbleCast/js/lib/logcheck.js's
// getCheckpointRecordsNats parses server-side (that function predates
// Scrobblecast's own "checkpoint" -> "generation" terminology shift),
// reached here directly from the browser instead. `generation` (which
// scrape cycle a digest belongs to) is the message's own authoritative
// field - not reconstructed by rounding `stamp`, the way the old
// Loggly-sourced path had to (Loggly's flattened events didn't preserve
// it). The stream carries both scope:"item" and scope:"history" digests;
// only "item" belongs in the sync-state view.
export function parseDigestMessage(raw: unknown): GenerationRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { generation, host, digest, scope } = raw as RawDigestMessage;
  if (scope !== "item") return null;
  if (
    typeof generation !== "string" ||
    typeof host !== "string" ||
    typeof digest !== "string"
  ) {
    return null;
  }
  return { generation, host, digest };
}

export function shortDate(stampStr: string): string {
  return stampStr.substr(11, 9);
}

export function shortHash(hash: string): string {
  return hash.substr(0, 7);
}

export function shorten(long: DigestTable): DigestTable {
  const short: DigestTable = [long[0]!]; // dont touch titles
  for (const digests of long.slice(1)) {
    const row: (string | null)[] = [shortDate(digests[0]!)]; // which is a generation
    for (const d of digests.slice(1)) {
      row.push(shortHash(d!));
    }
    short.push(row);
  }
  return short;
}

export function aggregate(data: GenerationRecord[]): DigestTable {
  // pre-sort in ascending generation order
  const sorted = data
    .slice()
    .sort((a, b) => a.generation.localeCompare(b.generation));

  // reduce set of {generation,host,digest} -> generation->{[host]=>digest}
  const digestByGenerationByHost = sorted.reduce<
    Record<string, Record<string, string>>
  >((map, entry) => {
    const { generation, host, digest } = entry;
    map[generation] = { ...(map[generation] || {}), [host]: digest };
    return map;
  }, {});

  const hosts = Array.from(
    Object.values(digestByGenerationByHost).reduce((set, digestByHost) => {
      Object.keys(digestByHost).reduce((set, host) => set.add(host), set);
      return set;
    }, new Set<string>()),
  );
  hosts.sort();

  const generations = Object.keys(digestByGenerationByHost).sort().reverse();

  const result: DigestTable = [["generation", ...hosts]];

  for (const generation of generations) {
    const ds: (string | null)[] = [generation];
    for (const host of hosts) {
      ds.push(digestByGenerationByHost[generation]![host] || "");
    }
    result.push(ds);
  }

  return result;
}
