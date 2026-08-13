import type { DigestRecord } from "./generation";

/** Generations are ten-minute scrape cycles. */
export const GENERATION_MS = 10 * 60 * 1000;

/** An open divergence older than one hour is an active anomaly. */
export const CRITICAL_GENERATIONS = 6;

export interface HostReport {
  host: string;
  digest: string;
  stamp: Date;
  lagMs: number;
  elapsed: number | null;
}

export interface GenerationReading {
  generation: Date;
  reports: HostReport[];
  missing: string[];
  distinct: string[];
  settlement: "settled" | "pending";
  agreement: "converged" | "diverged" | null;
  matchGroup: Record<string, number>;
  /** True only when this row belongs to an overlong run that is still open. */
  critical: boolean;
}

export interface Divergence {
  from: Date;
  to: Date;
  generations: number;
  ongoing: boolean;
  /** Active critical state, never a label for a healed historical run. */
  critical: boolean;
}

export interface HostReading {
  host: string;
  reports: number;
  medianLagMs: number | null;
  medianElapsed: number | null;
  missed: number;
}

export interface ScastReading {
  hosts: string[];
  generations: GenerationReading[];
  settled: GenerationReading[];
  latest: GenerationReading | null;
  latestSettled: GenerationReading | null;
  converged: boolean;
  divergences: Divergence[];
  latestDivergence: Divergence | null;
  latestDivergenceRows: GenerationReading[];
  longestDivergence: number | null;
  perHost: HostReading[];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? null;
}

function matchingGroups(
  reports: HostReport[],
  agreement: GenerationReading["agreement"],
): Record<string, number> {
  if (agreement !== "diverged") return {};
  const byDigest = new Map<string, string[]>();
  for (const report of reports) {
    const hosts = byDigest.get(report.digest) ?? [];
    hosts.push(report.host);
    byDigest.set(report.digest, hosts);
  }

  const result: Record<string, number> = {};
  let nextGroup = 0;
  for (const hosts of byDigest.values()) {
    if (hosts.length < 2) continue;
    for (const host of hosts) result[host] = nextGroup;
    nextGroup += 1;
  }
  return result;
}

function divergenceSlice(
  generations: GenerationReading[],
  divergence: Divergence | null,
): GenerationReading[] {
  if (!divergence) return generations.slice(-8);
  const indexOf = (date: Date) =>
    generations.findIndex((row) => row.generation.getTime() === date.getTime());
  const start = Math.max(0, indexOf(divergence.from) - 1);
  const end = divergence.ongoing
    ? generations.length
    : Math.min(generations.length, indexOf(divergence.to) + 2);
  return generations.slice(start, end);
}

export function deriveScast(records: DigestRecord[]): ScastReading {
  const hosts = Array.from(
    new Set(records.map((record) => record.host)),
  ).sort();
  const byGeneration = new Map<number, Map<string, HostReport>>();

  for (const record of records) {
    const key = record.generation.getTime();
    const reports = byGeneration.get(key) ?? new Map<string, HostReport>();
    const current = reports.get(record.host);
    if (!current || record.stamp > current.stamp) {
      reports.set(record.host, {
        host: record.host,
        digest: record.digest,
        stamp: record.stamp,
        lagMs: record.stamp.getTime() - record.generation.getTime(),
        elapsed: record.elapsed,
      });
    }
    byGeneration.set(key, reports);
  }

  const generations: GenerationReading[] = Array.from(byGeneration.entries())
    .sort(([left], [right]) => left - right)
    .map(([time, reportsByHost]) => {
      const reports = Array.from(reportsByHost.values()).sort((left, right) =>
        left.host.localeCompare(right.host),
      );
      const missing = hosts.filter((host) => !reportsByHost.has(host));
      const distinct = Array.from(
        new Set(reports.map((report) => report.digest)),
      );
      const settlement = missing.length === 0 ? "settled" : "pending";
      const agreement =
        settlement === "pending"
          ? null
          : distinct.length === 1
            ? "converged"
            : "diverged";
      return {
        generation: new Date(time),
        reports,
        missing,
        distinct,
        settlement,
        agreement,
        matchGroup: matchingGroups(reports, agreement),
        critical: false,
      };
    });

  const settled = generations.filter(
    (generation) => generation.settlement === "settled",
  );
  const divergences: Divergence[] = [];
  let run: GenerationReading[] = [];
  const closeRun = (ongoing: boolean) => {
    if (run.length === 0) return;
    divergences.push({
      from: run[0]!.generation,
      to: run.at(-1)!.generation,
      generations: run.length,
      ongoing,
      critical: ongoing && run.length > CRITICAL_GENERATIONS,
    });
    run = [];
  };

  settled.forEach((generation, index) => {
    if (generation.agreement === "diverged") {
      run.push(generation);
      if (index === settled.length - 1) closeRun(true);
    } else {
      closeRun(false);
    }
  });

  for (const divergence of divergences) {
    if (!divergence.critical) continue;
    for (const generation of settled) {
      if (
        generation.generation >= divergence.from &&
        generation.generation <= divergence.to
      ) {
        generation.critical = true;
      }
    }
  }

  const perHost = hosts.map((host): HostReading => {
    const reports = generations.flatMap((generation) =>
      generation.reports.filter((report) => report.host === host),
    );
    return {
      host,
      reports: reports.length,
      medianLagMs: median(reports.map((report) => report.lagMs)),
      medianElapsed: median(
        reports.flatMap((report) =>
          report.elapsed === null ? [] : [report.elapsed],
        ),
      ),
      missed: settled.filter((generation) => generation.missing.includes(host))
        .length,
    };
  });

  const latestSettled = settled.at(-1) ?? null;
  const latestDivergence = divergences.at(-1) ?? null;

  return {
    hosts,
    generations,
    settled,
    latest: generations.at(-1) ?? null,
    latestSettled,
    converged: latestSettled?.agreement === "converged",
    divergences,
    latestDivergence,
    latestDivergenceRows: divergenceSlice(generations, latestDivergence),
    longestDivergence:
      divergences.length === 0
        ? null
        : Math.max(...divergences.map((divergence) => divergence.generations)),
    perHost,
  };
}
