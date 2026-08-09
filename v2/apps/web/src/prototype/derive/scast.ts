// PROTOTYPE — throwaway. See ../README.md.
//
// scast's question is not the one the current table answers.
//
// The live table shows a generation x host grid of 7-character digests and
// leaves you to compare hex across columns. But three copies agreeing is the
// expected, healthy state; divergence happens routinely and reconverges within
// a cycle or two. So the useful questions are:
//
//   1. Are the copies converged RIGHT NOW?
//   2. When they last diverged, did they come back within a cycle or two?
//   3. Which copy is slow, and by how much?
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
 * How long a divergence may last before it stops being routine. Daniel's
 * own description of the system: divergence "is short lived and reconverges
 * in one or 2 cycles". Past that, the copies are not healing on their own.
 */
export const SELF_HEALING_CYCLES = 2;

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
  /** Every known copy reported, and all agree. The resting state. */
  | "converged"
  /** Every known copy reported, and they disagree. */
  | "diverged"
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
  /** The digest the majority agreed on, when there is one. */
  consensus: string | null;
  /** Copies that agreed with consensus / that didn't. */
  dissenting: string[];
  missing: string[];
  /**
   * This generation belongs to a divergence that ran longer than the copies
   * normally take to reconcile. Only these are drawn in the alarm colour -
   * a one- or two-cycle split is the system working as described, and
   * painting all 31% of them red would drown the 7 runs that actually got
   * stuck. Set after the excursion runs are known.
   */
  stuckRun: boolean;
}

export interface Excursion {
  from: Date;
  to: Date;
  cycles: number;
  /** Still diverged as of the newest settled generation. */
  ongoing: boolean;
  /** Longer than the copies normally take to reconcile themselves. */
  stuck: boolean;
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
  /** Generations where this copy was the odd one out. */
  dissented: number;
}

export interface ScastState {
  hosts: string[];
  generations: GenerationRow[];
  settled: GenerationRow[];
  latestSettled: GenerationRow | null;
  latest: GenerationRow | null;
  converged: boolean;
  excursions: Excursion[];
  lastExcursion: Excursion | null;
  /** Fraction of settled generations that were converged. */
  convergenceRate: number | null;
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
      // diverged. The copies report at genuinely different lags (minutes
      // apart), so the newest row is almost always incomplete - calling that
      // a disagreement would make the page cry wolf every ten minutes.
      const state: GenerationState =
        missing.length > 0
          ? "pending"
          : distinct.length === 1
            ? "converged"
            : "diverged";

      // Consensus = the digest the most copies share; ties leave it null.
      let consensus: string | null = null;
      if (reports.length > 0) {
        const counts = new Map<string, number>();
        for (const r of reports)
          counts.set(r.digest, (counts.get(r.digest) ?? 0) + 1);
        const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
        const top = ranked[0];
        if (top && (ranked.length === 1 || top[1] > (ranked[1]?.[1] ?? 0))) {
          consensus = top[0];
        }
      }

      return {
        generation: new Date(time),
        reports,
        distinct,
        state,
        consensus,
        dissenting: consensus
          ? reports.filter((r) => r.digest !== consensus).map((r) => r.host)
          : [],
        missing,
        stuckRun: false,
      };
    });

  const settled = generations.filter((g) => g.state !== "pending");

  // Excursions: runs of consecutive settled generations that disagreed.
  const excursions: Excursion[] = [];
  let run: GenerationRow[] = [];
  const flush = (ongoing: boolean) => {
    if (run.length === 0) return;
    const first = run[0]!;
    const last = run[run.length - 1]!;
    excursions.push({
      from: first.generation,
      to: last.generation,
      cycles: run.length,
      ongoing,
      stuck: run.length > SELF_HEALING_CYCLES,
    });
    run = [];
  };
  settled.forEach((g, i) => {
    if (g.state === "diverged") {
      run.push(g);
      if (i === settled.length - 1) flush(true);
    } else {
      flush(false);
    }
  });

  // Second pass: tag the generations inside a run that outlasted the copies'
  // normal reconciliation, so the view can keep the alarm colour for those
  // alone.
  for (const e of excursions) {
    if (!e.stuck) continue;
    for (const g of settled) {
      if (g.generation >= e.from && g.generation <= e.to) g.stuckRun = true;
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
      dissented: settled.filter((g) => g.dissenting.includes(host)).length,
    };
  });

  const latestSettled = settled.length ? settled[settled.length - 1]! : null;
  const convergedCount = settled.filter((g) => g.state === "converged").length;

  return {
    hosts,
    generations,
    settled,
    latestSettled,
    latest: generations.length ? generations[generations.length - 1]! : null,
    converged: latestSettled?.state === "converged",
    excursions,
    lastExcursion: excursions.length
      ? excursions[excursions.length - 1]!
      : null,
    convergenceRate: settled.length ? convergedCount / settled.length : null,
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
