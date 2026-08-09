// PROTOTYPE — throwaway. See ../README.md.
//
// TIME PRESENTATION. The backend is UTC everywhere and stays that way: every
// stamp on the wire is ISO 8601 with a Z, and every bucket boundary is a UTC
// boundary. This module only changes how those instants are *shown*.
//
// The rule, and the reason for it:
//
//   HOUR/MINUTE labels are localised.  "17:40" is a time of day, and a time of
//   day is only meaningful in the timezone the reader is standing in. An hour
//   bucket is still a UTC hour - we relabel the instant, we do not re-bucket.
//
//   DAY labels stay UTC.  A day bucket genuinely *is* a UTC day: ted1k's query
//   groups by the UTC calendar date, so calling 2026-08-03T00:00Z "Aug 2" in
//   Montreal would name a different 24 hours than the one being measured.
//   Re-bucketing along local midnight is a real change to the data and belongs
//   in the query, not the view. So days keep their UTC date and say so.
//
//   TOOLTIPS are always full UTC ISO. When you are cross-referencing against a
//   log, a NATS message or a SQL row, you want the canonical instant, not a
//   convenience rendering.
//
// Every surface that localises must label which zone it is showing - an
// unlabelled "17:40" next to a UTC date is exactly the ambiguity this is
// supposed to remove.

/** "17:40" in the reader's zone. For hour- and minute-resolution labels. */
export function localHM(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "Aug 8, 17:40" — local, for when the day is ambiguous at a glance. */
export function localDayHM(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "2026-08-03" — the bucket's own UTC calendar date. Never localised. */
export function utcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "2026-08-08T21:40:00Z" — canonical, for tooltips and cross-referencing. */
export function utcISO(d: Date): string {
  return `${d.toISOString().slice(0, 19)}Z`;
}

/**
 * "EDT", or "UTC-04:00" where no short name is available. Rendered next to
 * anything localised so the zone is never implied.
 */
export function tzLabel(): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZoneName: "short",
    }).formatToParts(new Date());
    const name = parts.find((p) => p.type === "timeZoneName")?.value;
    if (name) return name;
  } catch {
    // fall through to the offset form
  }
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}
