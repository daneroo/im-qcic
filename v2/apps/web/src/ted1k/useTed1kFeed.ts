import type { ConnectionState } from "../components/marks";
import { NATS_WS_URL } from "../config";
import { KV_BUCKET_NAME } from "./config";
import { deriveView, type Ted1kReading } from "./derive";
import type { Ted1kViewPayload } from "./types";
import { useDerivedState } from "./useDerivedState";

export interface WatchedReading {
  status: ConnectionState;
  reading: Ted1kReading | null;
}

export interface Ted1kFeed {
  lastDay: WatchedReading;
  dayByHour: WatchedReading;
  weekByDay: WatchedReading;
  busStatus: ConnectionState;
  producer: string | null;
}

export function useTed1kFeed(): Ted1kFeed {
  const lastDay = useDerivedState<Ted1kViewPayload>(
    NATS_WS_URL,
    KV_BUCKET_NAME,
    "missingLastDay",
  );
  const dayByHour = useDerivedState<Ted1kViewPayload>(
    NATS_WS_URL,
    KV_BUCKET_NAME,
    "missingDayByHour",
  );
  const weekByDay = useDerivedState<Ted1kViewPayload>(
    NATS_WS_URL,
    KV_BUCKET_NAME,
    "missingWeekByDay",
  );
  const statuses = [lastDay.status, dayByHour.status, weekByDay.status];
  const busStatus: ConnectionState = statuses.every(
    (status) => status === "connected",
  )
    ? "connected"
    : statuses.some((status) => status === "connected")
      ? "reconnecting"
      : (statuses[0] ?? "connecting");

  return {
    lastDay: {
      status: lastDay.status,
      reading: deriveView("missingLastDay", lastDay.value),
    },
    dayByHour: {
      status: dayByHour.status,
      reading: deriveView("missingDayByHour", dayByHour.value),
    },
    weekByDay: {
      status: weekByDay.status,
      reading: deriveView("missingWeekByDay", weekByDay.value),
    },
    busStatus,
    producer:
      lastDay.value?.meta.hostname ??
      dayByHour.value?.meta.hostname ??
      weekByDay.value?.meta.hostname ??
      null,
  };
}
