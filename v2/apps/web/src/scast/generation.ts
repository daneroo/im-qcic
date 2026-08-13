export interface DigestRecord {
  stamp: Date;
  generation: Date;
  host: string;
  digest: string;
  elapsed: number | null;
}

interface RawDigestMessage {
  stamp?: unknown;
  generation?: unknown;
  host?: unknown;
  digest?: unknown;
  scope?: unknown;
  elapsed?: unknown;
}

// The stream carries item and history digests. This reading compares the
// independently produced item digest for each copy, so history records do not
// belong in it. Publish time and scrape duration remain on the record because
// they explain the copies' different reporting cadence.
export function parseDigestMessage(raw: unknown): DigestRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { stamp, generation, host, digest, scope, elapsed } =
    raw as RawDigestMessage;
  if (scope !== "item") return null;
  if (
    typeof generation !== "string" ||
    typeof host !== "string" ||
    typeof digest !== "string"
  ) {
    return null;
  }
  const generationAt = new Date(generation);
  if (Number.isNaN(generationAt.getTime())) return null;
  const stampAt = typeof stamp === "string" ? new Date(stamp) : generationAt;

  return {
    stamp: Number.isNaN(stampAt.getTime()) ? generationAt : stampAt,
    generation: generationAt,
    host,
    digest,
    elapsed:
      typeof elapsed === "number" && Number.isFinite(elapsed) ? elapsed : null,
  };
}
