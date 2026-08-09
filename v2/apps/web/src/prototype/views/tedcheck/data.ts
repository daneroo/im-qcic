// PROTOTYPE — throwaway. See ../../README.md.
//
// One hook feeding all three variants, so a comparison is never confounded by
// one of them having better data. Uses the production useDerivedState hook
// untouched - three independent KV watches, exactly as /tedcheck does today,
// each on its own cadence (60s / 10min / 5min).
//
// Keys are named literally rather than indexed out of VIEW_NAMES: the array's
// order is missingLastDay, missingWeekByDay, missingDayByHour, which is easy
// to mis-map onto a "day then week" reading.

import { NATS_WS_URL } from "../../../config";
import { KV_BUCKET_NAME } from "../../../tedcheck/config";
import type { TedcheckViewPayload } from "../../../tedcheck/types";
import { useDerivedState } from "../../../tedcheck/useDerivedState";
import { deriveView, type TedcheckView } from "../../derive/tedcheck";
import type { Liveness } from "../../ui/primitives";

export interface Watched {
  status: Liveness;
  view: TedcheckView | null;
}

export interface TedcheckFeed {
  /** Rolling 24h, single row - the headline figure. */
  lastDay: Watched;
  /** 24h grouped by hour - the shape of today. */
  dayByHour: Watched;
  /** 32 days grouped by day - the long record. */
  weekByDay: Watched;
  /** Worst of the three watches: the page's honest substrate state. */
  busStatus: Liveness;
  /** The ted1k-derive instance that published these. */
  producer: string | null;
}

export function useTedcheckFeed(): TedcheckFeed {
  const lastDayRaw = useDerivedState<TedcheckViewPayload>(
    NATS_WS_URL,
    KV_BUCKET_NAME,
    "missingLastDay",
  );
  const dayByHourRaw = useDerivedState<TedcheckViewPayload>(
    NATS_WS_URL,
    KV_BUCKET_NAME,
    "missingDayByHour",
  );
  const weekByDayRaw = useDerivedState<TedcheckViewPayload>(
    NATS_WS_URL,
    KV_BUCKET_NAME,
    "missingWeekByDay",
  );

  const statuses = [
    lastDayRaw.status,
    dayByHourRaw.status,
    weekByDayRaw.status,
  ];
  const busStatus: Liveness = statuses.every((s) => s === "connected")
    ? "connected"
    : statuses.some((s) => s === "connected")
      ? "reconnecting"
      : ((statuses[0] ?? "connecting") as Liveness);

  return {
    lastDay: {
      status: lastDayRaw.status as Liveness,
      view: deriveView("missingLastDay", lastDayRaw.value ?? null),
    },
    dayByHour: {
      status: dayByHourRaw.status as Liveness,
      view: deriveView("missingDayByHour", dayByHourRaw.value ?? null),
    },
    weekByDay: {
      status: weekByDayRaw.status as Liveness,
      view: deriveView("missingWeekByDay", weekByDayRaw.value ?? null),
    },
    busStatus,
    producer:
      lastDayRaw.value?.meta.hostname ??
      dayByHourRaw.value?.meta.hostname ??
      weekByDayRaw.value?.meta.hostname ??
      null,
  };
}
