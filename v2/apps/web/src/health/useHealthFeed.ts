import { useEffect, useState } from "react";
import type { ConnectionState } from "../components/marks";
import { followHealth, type HealthEvent } from "./feed";
import { natsHealthSource } from "./nats-source";
import { deriveHealthReading } from "./state";
import type {
  HealthFeedState,
  NatsHealth,
  PublicHealth,
  TailnetHealth,
} from "./types";

const HTTP_REFRESH_MS = 30_000;
const HTTP_TIMEOUT_MS = 5_000;
const HTTP_FRESHNESS_MS = HTTP_REFRESH_MS + HTTP_TIMEOUT_MS;
const STREAM_FRESHNESS_MS = 30_000;

export function useHealthFeed(
  servers: string,
  healthUrl: string,
): HealthFeedState {
  const [publicReading, setPublicReading] = useState<PublicHealth | null>(null);
  const [nats, setNats] = useState<NatsHealth | null>(null);
  const [tailnet, setTailnet] = useState<TailnetHealth | null>(null);
  const [httpCurrent, setHttpCurrent] = useState(false);
  const [streamCurrent, setStreamCurrent] = useState(false);
  const [transportStatus, setTransportStatus] =
    useState<ConnectionState>("connecting");

  useEffect(() => {
    if (streamCurrent) return;

    let active = true;
    let nextRefresh: number | undefined;
    let requestTimeout: number | undefined;
    let httpExpiry: number | undefined;
    let controller: AbortController | null = null;

    async function refresh(): Promise<void> {
      controller = new AbortController();
      requestTimeout = window.setTimeout(
        () => controller?.abort(),
        HTTP_TIMEOUT_MS,
      );
      try {
        const response = await fetch(healthUrl, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status !== 200 && response.status !== 503) {
          throw new Error(`health bootstrap returned ${response.status}`);
        }
        const reading = parsePublicHealth(await response.json());
        if (!reading) throw new Error("invalid public health payload");
        if (active) {
          setPublicReading(reading);
          setHttpCurrent(true);
          if (httpExpiry !== undefined) window.clearTimeout(httpExpiry);
          httpExpiry = window.setTimeout(
            () => setHttpCurrent(false),
            HTTP_FRESHNESS_MS,
          );
        }
      } catch {
        if (active) setHttpCurrent(false);
      } finally {
        if (requestTimeout !== undefined) window.clearTimeout(requestTimeout);
        if (active) {
          nextRefresh = window.setTimeout(
            () => void refresh(),
            HTTP_REFRESH_MS,
          );
        }
      }
    }

    void refresh();
    return () => {
      active = false;
      controller?.abort();
      if (requestTimeout !== undefined) window.clearTimeout(requestTimeout);
      if (httpExpiry !== undefined) window.clearTimeout(httpExpiry);
      if (nextRefresh !== undefined) window.clearTimeout(nextRefresh);
    };
  }, [healthUrl, streamCurrent]);

  useEffect(() => {
    const decoder = new TextDecoder();
    let cancelled = false;
    let streamExpiry: number | undefined;
    const feed = followHealth(
      { servers },
      {
        onEvent(event: HealthEvent) {
          if (cancelled) return;
          const decoded = decodeJson(decoder, event.data);
          if (event.kind === "public") {
            const reading = parsePublicHealth(decoded);
            if (reading) {
              setPublicReading(reading);
              setHttpCurrent(false);
              setStreamCurrent(true);
              if (streamExpiry !== undefined) {
                window.clearTimeout(streamExpiry);
              }
              streamExpiry = window.setTimeout(
                () => setStreamCurrent(false),
                STREAM_FRESHNESS_MS,
              );
            }
          } else if (event.key === "nats") {
            const reading = parseNatsHealth(decoded);
            if (reading) setNats(reading);
          } else {
            const reading = parseTailnetHealth(decoded);
            if (reading) setTailnet(reading);
          }
        },
        onStatus(status) {
          if (!cancelled) setTransportStatus(status);
        },
      },
      natsHealthSource,
    );

    return () => {
      cancelled = true;
      if (streamExpiry !== undefined) window.clearTimeout(streamExpiry);
      void feed.close();
    };
  }, [servers]);

  const coarseCurrent = httpCurrent || streamCurrent;

  return {
    publicReading,
    nats: deriveHealthReading({
      coarse: publicReading?.nats ?? null,
      coarseCurrent,
      transportStatus,
      value: nats,
    }),
    tailnet: deriveHealthReading({
      coarse: publicReading?.tailnet ?? null,
      coarseCurrent,
      transportStatus,
      value: tailnet,
    }),
  };
}

function decodeJson(decoder: TextDecoder, data: Uint8Array): unknown {
  try {
    return JSON.parse(decoder.decode(data));
  } catch {
    return null;
  }
}

function parsePublicHealth(value: unknown): PublicHealth | null {
  if (!isObject(value) || value.schema !== 1) return null;
  if (
    typeof value.observer !== "string" ||
    !isAvailability(value.nats) ||
    !isAvailability(value.tailnet)
  ) {
    return null;
  }
  return value as unknown as PublicHealth;
}

function parseNatsHealth(value: unknown): NatsHealth | null {
  return isObject(value) &&
    value.schema === 1 &&
    typeof value.observedAt === "string" &&
    typeof value.connections === "number"
    ? (value as unknown as NatsHealth)
    : null;
}

function parseTailnetHealth(value: unknown): TailnetHealth | null {
  return isObject(value) &&
    value.schema === 1 &&
    typeof value.observedAt === "string" &&
    Array.isArray(value.peers)
    ? (value as unknown as TailnetHealth)
    : null;
}

function isAvailability(
  value: unknown,
): value is { available: boolean; observedAt: string } {
  return (
    isObject(value) &&
    typeof value.available === "boolean" &&
    typeof value.observedAt === "string"
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
