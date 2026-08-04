import { useEffect, useState } from "react";
import { watchKey, type WatchStatus } from "./watch";
import { natsKvSource } from "./kv-source";

export interface DerivedState<T> {
  status: WatchStatus;
  value: T | null;
}

// The seam between watch.ts's connection/retry plumbing and the component
// that renders it: owns decoding + tracking the latest value, but never
// reaches into watch.ts's or kv-source.ts's internals - it only calls
// watchKey() with plain callbacks. Takes the server address directly (not
// a {servers} credentials object) so it's a stable primitive in the
// effect's dependency array, not a new object identity every render - same
// reasoning as scast/useScastFeed.ts.
export function useDerivedState<T>(
  servers: string,
  bucket: string,
  key: string,
): DerivedState<T> {
  const [status, setStatus] = useState<WatchStatus>("connecting");
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    setValue(null);
    // React (StrictMode, in dev) mounts every effect twice: mount ->
    // cleanup -> mount again. The first watch's close() is async, so its
    // eventual onStatus("closed") can arrive after the second watch has
    // already reported "connected" - without this guard, that stale
    // callback clobbers live status with a false "closed".
    let cancelled = false;

    const watch = watchKey(
      { servers },
      bucket,
      key,
      {
        onEntry: (entry) => {
          if (cancelled) return;
          try {
            setValue(entry.json<T>());
          } catch (err) {
            console.error("useDerivedState: failed to decode entry", err);
          }
        },
        onStatus: (s) => {
          if (!cancelled) setStatus(s);
        },
      },
      natsKvSource,
    );

    return () => {
      cancelled = true;
      void watch.close();
    };
  }, [servers, bucket, key]);

  return { status, value };
}
