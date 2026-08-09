// PROTOTYPE — throwaway. See ../../README.md.
//
// Same stream, same connection/retry plumbing (subscribe + natsMessageSource,
// both untouched) - only the decoding is wider, keeping `stamp`, `elapsed` and
// the history scope that the production parser drops. Mirrors useScastFeed's
// structure, including its StrictMode `cancelled` guard, so the two behave
// identically where they overlap.

import { useEffect, useRef, useState } from "react";
import { NATS_WS_URL } from "../../../config";
import { subscribe, type FeedStatus } from "../../../scast/feed";
import { natsMessageSource } from "../../../scast/nats-source";
import {
  deriveScast,
  parseRich,
  type DigestRecord,
  type ScastState,
} from "../../derive/scast";
import type { Liveness } from "../../ui/primitives";

const RETENTION_MS = 48 * 60 * 60 * 1000;

export interface ScastFeed {
  status: Liveness;
  state: ScastState;
  /** Records held in memory - shown so the window is never a mystery. */
  count: number;
}

export function useRichScastFeed(): ScastFeed {
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [state, setState] = useState<ScastState>(() => deriveScast([]));
  const [count, setCount] = useState(0);
  const recordsRef = useRef(new Map<string, DigestRecord>());

  useEffect(() => {
    const decoder = new TextDecoder();
    const records = recordsRef.current;
    records.clear();
    setState(deriveScast([]));
    setCount(0);
    let cancelled = false;

    function handleMessage(data: Uint8Array): void {
      if (cancelled) return;
      let raw: unknown;
      try {
        raw = JSON.parse(decoder.decode(data));
      } catch {
        return;
      }
      const record = parseRich(raw);
      if (!record) return;

      records.set(
        `${record.generation.toISOString()}|${record.host}|${record.scope}`,
        record,
      );
      const cutoff = Date.now() - RETENTION_MS;
      for (const [key, r] of records) {
        if (r.generation.getTime() < cutoff) records.delete(key);
      }

      const all = Array.from(records.values());
      setState(deriveScast(all));
      setCount(all.length);
    }

    const feed = subscribe(
      { servers: NATS_WS_URL },
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
  }, []);

  return { status: status as Liveness, state, count };
}
