import { describe, expect, test } from "bun:test";
import type { DigestRecord } from "./generation";
import { CRITICAL_GENERATIONS, deriveScast } from "./derive";

const HOSTS = ["darwin", "euler", "newton"];
const START = Date.parse("2026-08-13T12:00:00Z");

function record(
  generation: number,
  host: string,
  digest: string,
): DigestRecord {
  const generationAt = new Date(START + generation * 10 * 60 * 1000);
  return {
    generation: generationAt,
    stamp: new Date(generationAt.getTime() + 60_000),
    host,
    digest,
    elapsed: 4,
  };
}

function generation(index: number, digests: string[]): DigestRecord[] {
  return HOSTS.map((host, position) => record(index, host, digests[position]!));
}

describe("deriveScast", () => {
  test("distinguishes pending from settled and converged from diverged", () => {
    const reading = deriveScast([
      ...generation(0, ["a", "a", "a"]),
      ...generation(1, ["b", "c", "b"]),
      record(2, "darwin", "d"),
      record(2, "euler", "d"),
    ]);

    expect(
      reading.generations.map(({ settlement, agreement }) => ({
        settlement,
        agreement,
      })),
    ).toEqual([
      { settlement: "settled", agreement: "converged" },
      { settlement: "settled", agreement: "diverged" },
      { settlement: "pending", agreement: null },
    ]);
  });

  test("marks an overlong divergence critical only while it is open", () => {
    const split = Array.from({ length: CRITICAL_GENERATIONS + 1 }, (_, index) =>
      generation(index, ["a", "b", "a"]),
    ).flat();

    const open = deriveScast(split);
    expect(open.latestDivergence).toMatchObject({
      generations: CRITICAL_GENERATIONS + 1,
      ongoing: true,
      critical: true,
    });
    expect(open.generations.every((row) => row.critical)).toBe(true);

    const healed = deriveScast([
      ...split,
      ...generation(CRITICAL_GENERATIONS + 1, ["z", "z", "z"]),
    ]);
    expect(healed.latestDivergence).toMatchObject({
      generations: CRITICAL_GENERATIONS + 1,
      ongoing: false,
      critical: false,
    });
    expect(healed.generations.some((row) => row.critical)).toBe(false);
  });

  test("returns the latest divergence as one contiguous slice with context", () => {
    const reading = deriveScast([
      ...generation(0, ["a", "a", "a"]),
      ...generation(1, ["b", "b", "b"]),
      ...generation(2, ["c", "d", "c"]),
      ...generation(3, ["e", "f", "e"]),
      ...generation(4, ["g", "g", "g"]),
      ...generation(5, ["h", "h", "h"]),
    ]);

    expect(
      reading.latestDivergenceRows.map((row) => row.generation.getTime()),
    ).toEqual([1, 2, 3, 4].map((index) => START + index * 10 * 60 * 1000));
  });
});
