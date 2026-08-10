// PROTOTYPE — throwaway. See ../README.md.
//
// scast's question is not the one the current table answers.
//
// The live table shows a generation x host grid of 7-character digests and
// leaves you to compare hex across columns.
//
// WHAT THE SYSTEM ACTUALLY DOES. The three copies reconcile in a sync step
// every generation, and the data structure GUARANTEES they converge - failing
// to do so within the same cycle is a known defect of the algorithm, not a
// fault to detect. So "are they converged?" was never the interesting
// question; convergence is assured. The reason to watch this at all is HOW
// MANY CYCLES a split can last. So:
//
//   1. Are the copies agreed right now?
//   2. When they last split, how long did it take to come back?
//   3. Which copy is slow, and by how much?
//
// AND CONVERGENCE IS ALL-OR-NOTHING. Two copies agreeing are not thereby more
// right than the third: the odd one out may be the one holding the piece the
// others are missing. So there is no consensus, no majority and no dissenter
// anywhere in this module - two-agreeing is not different in kind from
// none-agreeing.
//
// Two signals the production path discards make (3) answerable, and they are
// already on the wire: `stamp` (publish time, so stamp - generation is the
// copy's reporting lag) and `elapsed` (how long that copy's scrape took).
// parseDigestMessage drops both because the cross-tab doesn't need them.
//
// NOT nines. A 48h window holds ~288 generations, so a single divergence is
// already 2.46 nines and two is 2.16 - a scale too coarse and too jumpy to
// carry meaning. scast reports in cycles instead. See ./nines.ts.

/** Generations are 10-minute scrape cycles. */
export const GENERATION_MS = 10 * 60 * 1000;

/**
 * A split past this many cycles is worth looking at. Six generations at ten
 * minutes each is ONE HOUR - a bound stated in time rather than in cycles, so
 * it keeps its meaning if the cycle length ever changes.
 *
 * Fixed, not derived from the data, for the same reason ted1k's gap threshold
 * is fixed: a moving bar means "critical" quietly means something different
 * this month than last.
 */
export const CRITICAL_GENERATIONS = 6;

export type Scope = "item" | "history";

export interface DigestRecord {
  /** When the copy published - not when the cycle began. */
  stamp: Date;
  /** Which scrape cycle this belongs to. The message's own authority. */
  generation: Date;
  host: string;
  digest: string;
  scope: Scope;
  /** Seconds the scrape itself took. Unused by the production view. */
  elapsed: number | null;
}

interface RawMessage {
  stamp?: unknown;
  generation?: unknown;
  host?: unknown;
  digest?: unknown;
  scope?: unknown;
  elapsed?: unknown;
}

/**
 * Like ../../scast/generation.ts's parseDigestMessage, but keeps `stamp`,
 * `elapsed` and both scopes. Deliberately a separate function rather than a
 * change to the production one: that module's narrow shape is correct for
 * what it does, and a prototype should not widen it.
 */
export function parseRich(raw: unknown): DigestRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { stamp, generation, host, digest, scope, elapsed } = raw as RawMessage;
  if (
    typeof generation !== "string" ||
    typeof host !== "string" ||
    typeof digest !== "string" ||
    (scope !== "item" && scope !== "history")
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
    scope,
    elapsed:
      typeof elapsed === "number" && Number.isFinite(elapsed) ? elapsed : null,
  };
}

export type GenerationState =
  /** Every known copy reported, and all hold the same digest. */
  | "agreed"
  /** Every known copy reported, and they do not all match. */
  | "split"
  /** Not every copy has reported yet - too early to say. Never "bad". */
  | "pending";

export interface HostReport {
  host: string;
  digest: string;
  stamp: Date;
  /** stamp - generation: how late this copy was to report. */
  lagMs: number;
  elapsed: number | null;
}

export interface GenerationRow {
  generation: Date;
  reports: HostReport[];
  /** Distinct digests among the copies that reported. */
  distinct: string[];
  state: GenerationState;
  /**
   * NO CONSENSUS FIELD, deliberately. Convergence here is all-or-nothing: if
   * two copies of three agree they are not thereby more right, because the odd
   * one out may be the copy holding the piece the others are missing. A
   * "majority digest" would assert a correctness ranking the algorithm does
   * not support, so two-agreeing is not treated as different in kind from
   * none-agreeing.
   *
   * What IS worth knowing is which copies hold the same value, because that is
   * what tells you where a manual resync could be aimed. Hence groups of equal
   * digests, and no winner among them.
   */
  /** Marker index per host, assigned only to groups with >1 member. */
  matchGroup: Record<string, number>;
  /** How many distinct digests the reporting copies hold. */
  ways: number;
  missing: string[];
  /**
   * Belongs to a split that ran past CRITICAL_GENERATIONS. Only these are drawn in
   * the alarm colour - a short split is the reconciliation working as designed,
   * and painting every one of them red would drown the few that ran long.
   * Set after the runs are known.
   */
  critical: boolean;
}

export interface Divergence {
  from: Date;
  to: Date;
  generations: number;
  /** Still split as of the newest settled generation. */
  ongoing: boolean;
  /** Ran past CRITICAL_GENERATIONS - about an hour. */
  critical: boolean;
}

export interface HostSummary {
  host: string;
  reports: number;
  lastSeen: Date | null;
  /** Median lag, in ms - a stable figure for a jittery quantity. */
  medianLagMs: number | null;
  medianElapsed: number | null;
  /** Generations this copy missed entirely, among settled ones. */
  missed: number;
}

export interface ScastState {
  hosts: string[];
  generations: GenerationRow[];
  settled: GenerationRow[];
  latestSettled: GenerationRow | null;
  latest: GenerationRow | null;
  agreed: boolean;
  divergences: Divergence[];
  lastDivergence: Divergence | null;
  /**
   * Fraction of settled generations that agreed. Kept, but NOT the headline:
   * convergence is guaranteed by the reconciliation, so "whether" was never
   * the question - "how long" is. See longestSplit / typicalSplit.
   */
  agreedRate: number | null;
  perHost: HostSummary[];
  /** The second digest series the cross-tab ignores, counted only. */
  historyRecords: number;
  windowFrom: Date | null;
  windowTo: Date | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? null;
}

export function deriveScast(records: DigestRecord[]): ScastState {
  const items = records.filter((r) => r.scope === "item");
  const historyRecords = records.length - items.length;

  const hosts = Array.from(new Set(items.map((r) => r.host))).sort();

  // Group by generation, keeping the latest report per host.
  const byGeneration = new Map<number, Map<string, HostReport>>();
  for (const r of items) {
    const key = r.generation.getTime();
    let group = byGeneration.get(key);
    if (!group) {
      group = new Map();
      byGeneration.set(key, group);
    }
    const existing = group.get(r.host);
    if (!existing || r.stamp > existing.stamp) {
      group.set(r.host, {
        host: r.host,
        digest: r.digest,
        stamp: r.stamp,
        lagMs: r.stamp.getTime() - r.generation.getTime(),
        elapsed: r.elapsed,
      });
    }
  }

  const generations: GenerationRow[] = Array.from(byGeneration.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([time, group]) => {
      const reports = Array.from(group.values()).sort((a, b) =>
        a.host.localeCompare(b.host),
      );
      const distinct = Array.from(new Set(reports.map((r) => r.digest)));
      const missing = hosts.filter((h) => !group.has(h));

      // A generation nobody has finished reporting yet is PENDING, never
      // split. The copies report at genuinely different lags (minutes
      // apart), so the newest row is almost always incomplete - calling that
      // a disagreement would make the page cry wolf every ten minutes.
      const state: GenerationState =
        missing.length > 0
          ? "pending"
          : distinct.length === 1
            ? "agreed"
            : "split";

      // EQUALITY GROUPS, not a ranking. Only groups with more than one member
      // get a marker index, assigned in order of first appearance left to
      // right: a three-way split therefore carries NO markers at all, which is
      // the correct answer - nothing matches, so there is nothing to point at
      // and no eager resync to aim anywhere.
      //
      // Markers are only ever rendered inside a split row. A row where every
      // copy agrees is a single group, which by the ">1 member" rule would
      // earn a marker - but that row is drawn as one merged cell, so the
      // marker would be labelling a group of one cell. The calmest case gets
      // no ink at all.
      const matchGroup: Record<string, number> = {};
      if (state === "split") {
        const byDigest = new Map<string, string[]>();
        for (const r of reports) {
          const held = byDigest.get(r.digest);
          if (held) held.push(r.host);
          else byDigest.set(r.digest, [r.host]);
        }
        let next = 0;
        for (const [, holders] of byDigest) {
          if (holders.length < 2) continue;
          const index = next++;
          for (const host of holders) matchGroup[host] = index;
        }
      }

      return {
        generation: new Date(time),
        reports,
        distinct,
        state,
        matchGroup,
        ways: distinct.length,
        missing,
        critical: false,
      };
    });

  const settled = generations.filter((g) => g.state !== "pending");

  // Excursions: runs of consecutive settled generations that disagreed.
  const divergences: Divergence[] = [];
  let run: GenerationRow[] = [];
  const flush = (ongoing: boolean) => {
    if (run.length === 0) return;
    const first = run[0]!;
    const last = run[run.length - 1]!;
    divergences.push({
      from: first.generation,
      to: last.generation,
      generations: run.length,
      ongoing,
      critical: run.length > CRITICAL_GENERATIONS,
    });
    run = [];
  };
  settled.forEach((g, i) => {
    if (g.state === "split") {
      run.push(g);
      if (i === settled.length - 1) flush(true);
    } else {
      flush(false);
    }
  });

  // Second pass: tag the generations inside a run that outlasted the copies'
  // normal reconciliation, so the view can keep the alarm colour for those
  // alone.
  for (const e of divergences) {
    if (!e.critical) continue;
    for (const g of settled) {
      if (g.generation >= e.from && g.generation <= e.to) g.critical = true;
    }
  }

  const perHost: HostSummary[] = hosts.map((host) => {
    const mine = items.filter((r) => r.host === host);
    const lags = generations
      .flatMap((g) => g.reports.filter((r) => r.host === host))
      .map((r) => r.lagMs);
    const elapsed = mine
      .map((r) => r.elapsed)
      .filter((e): e is number => e !== null);
    return {
      host,
      reports: mine.length,
      lastSeen: mine.reduce<Date | null>(
        (acc, r) => (acc === null || r.stamp > acc ? r.stamp : acc),
        null,
      ),
      medianLagMs: median(lags),
      medianElapsed: median(elapsed),
      missed: settled.filter((g) => g.missing.includes(host)).length,
    };
  });

  const latestSettled = settled.length ? settled[settled.length - 1]! : null;
  const agreedCount = settled.filter((g) => g.state === "agreed").length;

  return {
    hosts,
    generations,
    settled,
    latestSettled,
    latest: generations.length ? generations[generations.length - 1]! : null,
    agreed: latestSettled?.state === "agreed",
    divergences,
    lastDivergence: divergences.length
      ? divergences[divergences.length - 1]!
      : null,
    agreedRate: settled.length ? agreedCount / settled.length : null,
    perHost,
    historyRecords,
    windowFrom: generations[0]?.generation ?? null,
    windowTo: generations[generations.length - 1]?.generation ?? null,
  };
}

/** "3m48s" — lag and scrape durations are minutes-and-seconds quantities. */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m${String(s).padStart(2, "0")}s` : `${m}m`;
}

export function formatSeconds(value: number): string {
  return value < 10 ? `${value.toFixed(1)}s` : `${Math.round(value)}s`;
}
