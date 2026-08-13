import { useEffect, useRef, useState } from "react";
import { deriveScast, type ScastReading } from "./derive";
import { subscribe, type FeedStatus } from "./feed";
import { natsMessageSource } from "./nats-source";
import { parseDigestMessage, type DigestRecord } from "./generation";

// Bounds memory on a tab left open for days: without this, an ever-growing
// backlog of {generation,host} records would accumulate for as long as the
// tab stays connected. 48h comfortably covers scast-bridge's own 24h replay
// window plus live updates since.
const RETENTION_MS = 48 * 60 * 60 * 1000;

export interface ScastFeedState {
  status: FeedStatus;
  reading: ScastReading;
}

// The seam between feed.ts's connection/retry plumbing and the component
// that renders it: owns decoding + accumulating records + re-deriving the
// table, but never reaches into feed.ts's or nats-source.ts's internals -
// it only calls subscribe() with plain callbacks. Takes the server address
// directly (not a {servers} credentials object) so it's a stable primitive
// in the effect's dependency array, not a new object identity every render.
export function useScastFeed(servers: string): ScastFeedState {
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [reading, setReading] = useState<ScastReading>(() => deriveScast([]));
  const recordsRef = useRef(new Map<string, DigestRecord>());

  useEffect(() => {
    const decoder = new TextDecoder();
    const records = recordsRef.current;
    records.clear();
    setReading(deriveScast([]));
    // React (StrictMode, in dev) mounts every effect twice: mount ->
    // cleanup -> mount again. The first feed's close() is async, so its
    // eventual onStatus("closed") can arrive after the second feed has
    // already reported "connected" - without this guard, that stale
    // callback clobbers live status with a false "closed".
    let cancelled = false;

    function handleMessage(data: Uint8Array): void {
      if (cancelled) return;
      let raw: unknown;
      try {
        raw = JSON.parse(decoder.decode(data));
      } catch {
        return; // malformed payload - skip, not fatal to the feed
      }
      const record = parseDigestMessage(raw);
      if (!record) return;

      records.set(`${record.generation.toISOString()}|${record.host}`, record);
      const cutoff = Date.now() - RETENTION_MS;
      for (const [key, r] of records) {
        if (r.generation.getTime() < cutoff) records.delete(key);
      }

      setReading(deriveScast(Array.from(records.values())));
    }

    const feed = subscribe(
      { servers },
      {
        onMessage: handleMessage,
        onStatus: (s) => {
          if (!cancelled) setStatus(s);
        },
      },
      natsMessageSource,
    );

    return () => {
      cancelled = true;
      void feed.close();
    };
  }, [servers]);

  return { status, reading };
}
