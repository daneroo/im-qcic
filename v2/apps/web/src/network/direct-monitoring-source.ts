import { useEffect, useRef, useState } from "react";
import type { BusStats } from "./types";

interface Varz {
  server_name?: string;
  server_id: string;
  connections: number;
  subscriptions: number;
  in_msgs: number;
  out_msgs: number;
  slow_consumers: number;
}

interface Connz {
  num_connections: number;
}

interface CounterSample {
  at: number;
  inMessages: number;
  outMessages: number;
}

export type BusReading =
  | { status: "loading" | "unavailable"; stats: null }
  | { status: "live"; stats: BusStats };

/**
 * Temporary browser-to-monitoring adapter required by #267. The network
 * collector replaces this direct HTTP path; keep that architectural debt
 * visible in the name rather than hiding it in a generic data hook.
 */
export function useDirectNatsMonitoring(baseUrl: string): BusReading {
  const previous = useRef<CounterSample | null>(null);
  const [reading, setReading] = useState<BusReading>({
    status: "loading",
    stats: null,
  });

  useEffect(() => {
    let active = true;
    let nextRefresh: number | undefined;
    const controller = new AbortController();

    async function refresh() {
      try {
        const [varzResponse, connzResponse] = await Promise.all([
          fetch(`${baseUrl}/varz`, { signal: controller.signal }),
          fetch(`${baseUrl}/connz`, { signal: controller.signal }),
        ]);
        if (!varzResponse.ok || !connzResponse.ok) {
          throw new Error("NATS monitoring request failed");
        }

        const [varz, connz] = (await Promise.all([
          varzResponse.json(),
          connzResponse.json(),
        ])) as [Varz, Connz];
        const current = {
          at: performance.now(),
          inMessages: varz.in_msgs,
          outMessages: varz.out_msgs,
        };
        const prior = previous.current;
        const elapsedSeconds = prior ? (current.at - prior.at) / 1000 : 0;
        previous.current = current;

        // Rates are a difference between samples. Until the second sample,
        // zero would be an invented reading rather than a measured one.
        if (!prior) return;

        const rate = (currentValue: number, previousValue: number) =>
          elapsedSeconds > 0
            ? Math.max(0, (currentValue - previousValue) / elapsedSeconds)
            : 0;

        if (active) {
          setReading({
            status: "live",
            stats: {
              server: varz.server_name ?? varz.server_id,
              connections: connz.num_connections ?? varz.connections,
              // `/connz` is paginated; `/varz` is the server-wide total.
              subscriptions: varz.subscriptions,
              msgsPerSecIn: rate(varz.in_msgs, prior.inMessages),
              msgsPerSecOut: rate(varz.out_msgs, prior.outMessages),
              slowConsumers: varz.slow_consumers,
            },
          });
        }
      } catch (error) {
        if (
          active &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setReading({ status: "unavailable", stats: null });
        }
      } finally {
        if (active) {
          nextRefresh = window.setTimeout(() => void refresh(), 2_000);
        }
      }
    }

    void refresh();
    return () => {
      active = false;
      controller.abort();
      if (nextRefresh !== undefined) window.clearTimeout(nextRefresh);
    };
  }, [baseUrl]);

  return reading;
}
