// Matches ted1k-derive's own constants (see
// v2/apps/ted1k-derive/src/config.ts) - copied, not imported, since the two
// are separate deployables agreeing on a bucket/key contract, not sharing
// TypeScript across a package boundary.

export const KV_BUCKET_NAME = "ted1k-derive";

export const VIEW_NAMES = [
  "missingLastDay",
  "missingWeekByDay",
  "missingDayByHour",
] as const;

export type ViewName = (typeof VIEW_NAMES)[number];
