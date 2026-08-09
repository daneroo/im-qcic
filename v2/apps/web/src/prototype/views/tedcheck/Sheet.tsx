// PROTOTYPE — throwaway. See ../../README.md.
//
// SHEET: hierarchy as one shared vocabulary.
//
// Every subject in QCIC, however different underneath, is reduced to the same
// line: WHAT IT IS · HOW CONTINUOUS · WHEN IT LAST BROKE · FOR HOW LONG · THE
// SHAPE OF THE WINDOW. Heterogeneous things become directly comparable, which
// is the whole job of a page that watches everything at once.
//
// The vocabulary is deliberately NOT "everything gets nines". A nines figure
// needs sample density to mean anything: 86400 samples/day earns one, but
// scast's ~288 generations per 48h does not (one divergence there is already
// 2.46 nines and two is 2.16 — too coarse and too jumpy to read). So the
// universal half is the second half — last excursion, and its duration — and
// nines is an *optional column*, filled only where the data can carry it.
// That asymmetry is a finding, not a compromise.
//
// Rows are ordered by dependency: the bus is last because everything above
// rests on it.

import { useState } from "react";
import { formatAbsence, formatNines } from "../../derive/nines";
import { since, type TedcheckView } from "../../derive/tedcheck";
import {
  Byline,
  CoverageStrip,
  LivenessDot,
  Masthead,
  type Liveness,
} from "../../ui/primitives";
import { BucketTable } from "./BucketTable";
import type { TedcheckFeed } from "./data";

interface Line {
  key: string;
  subject: string;
  qualifier: string;
  status: Liveness;
  /** Optional — only where sample density earns it. */
  nines: number | null;
  ceiling: number | null;
  perfect: boolean;
  lastBreak: string;
  duration: string;
  broken: boolean;
  strip: TedcheckView | null;
  record: TedcheckView | null;
}

function toLine(
  key: string,
  subject: string,
  qualifier: string,
  status: Liveness,
  view: TedcheckView | null,
  now: Date,
  opts: { strip?: boolean } = {},
): Line {
  if (!view) {
    return {
      key,
      subject,
      qualifier,
      status,
      nines: null,
      ceiling: null,
      perfect: false,
      lastBreak: "—",
      duration: "—",
      broken: false,
      strip: null,
      record: null,
    };
  }
  const last = view.lastExcursion;
  return {
    key,
    subject,
    qualifier,
    status,
    nines: view.total.nines,
    ceiling: view.total.ceiling,
    perfect: view.total.nines === null,
    lastBreak: last ? since(last.start, now) : "none in window",
    duration: last ? formatAbsence(last.missing) : "—",
    broken: Boolean(last),
    strip: opts.strip ? view : null,
    record: view,
  };
}

function Row({ line }: { line: Line }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className={`border-b border-rule/70 ${line.record ? "cursor-pointer hover:bg-surface-2/60" : ""}`}
        onClick={() => line.record && setOpen((v) => !v)}
      >
        <td className="py-2.5 pr-3 align-middle">
          <div className="flex items-center gap-2">
            <LivenessDot status={line.status} />
            <span className="text-sm text-ink">{line.subject}</span>
            <span className="text-[11px] text-ink-3">{line.qualifier}</span>
          </div>
        </td>

        <td className="qc-num px-3 py-2.5 text-right align-middle">
          {line.nines === null && !line.perfect ? (
            <span className="text-ink-3">—</span>
          ) : line.perfect ? (
            <span className="text-live">clean</span>
          ) : (
            <span className="text-ink">{formatNines(line.nines)}</span>
          )}
          {line.ceiling !== null && !line.perfect && line.nines !== null && (
            <span className="ml-1 text-[10px] text-ink-3">
              /{line.ceiling.toFixed(1)}
            </span>
          )}
        </td>

        <td
          className={`qc-num px-3 py-2.5 text-right align-middle text-[13px] ${
            line.broken ? "text-ink-2" : "text-ink-3"
          }`}
        >
          {line.lastBreak}
        </td>

        <td
          className={`qc-num px-3 py-2.5 text-right align-middle text-[13px] ${
            line.broken ? "font-medium text-excursion" : "text-ink-3"
          }`}
        >
          {line.duration}
        </td>

        <td className="w-[34%] py-2.5 pl-3 align-middle">
          {line.strip ? (
            <CoverageStrip
              buckets={line.strip.buckets}
              height={22}
              scale={false}
            />
          ) : (
            <span className="block h-[22px]" />
          )}
        </td>
      </tr>

      {open && line.record && (
        <tr className="border-b border-rule/70 bg-surface-2/40">
          <td colSpan={5} className="px-3 py-4">
            <BucketTable view={line.record} />
          </td>
        </tr>
      )}
    </>
  );
}

export function TedcheckSheet({ feed }: { feed: TedcheckFeed }) {
  const headline = feed.lastDay.view;
  const today = feed.dayByHour.view;
  const month = feed.weekByDay.view;
  const now = headline?.stamp ?? new Date();

  const lines: Line[] = [
    toLine("day", "ted1k", "Last Day", feed.lastDay.status, headline, now, {}),
    toLine(
      "hour",
      "ted1k",
      "Last Day by hour",
      feed.dayByHour.status,
      today,
      now,
      {
        strip: true,
      },
    ),
    toLine(
      "month",
      "ted1k",
      "Last Month by day",
      feed.weekByDay.status,
      month,
      now,
      {
        strip: true,
      },
    ),
  ];

  return (
    <div className="min-h-screen bg-paper pb-28">
      <Masthead running={<>continuity sheet</>} />

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse">
            <thead>
              <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.14em] text-ink-3">
                <th className="py-2 pr-3 text-left font-semibold">subject</th>
                <th className="py-2 px-3 text-right font-semibold">nines</th>
                <th className="py-2 px-3 text-right font-semibold">
                  last excursion
                </th>
                <th className="py-2 px-3 text-right font-semibold">lasted</th>
                <th className="py-2 pl-3 text-left font-semibold">window</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <Row key={line.key} line={line} />
              ))}

              {/* The substrate is a row like any other — same five columns,
                  and honest about which of them it can fill. A browser cannot
                  know the bus's history, only its state right now, so the
                  continuity columns stay empty rather than being invented. */}
              <tr className="border-b border-rule/70">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <LivenessDot status={feed.busStatus} />
                    <span className="text-sm text-ink">nats</span>
                    <span className="text-[11px] text-ink-3">
                      bus · 3 kv watches
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-ink-3">—</td>
                <td className="px-3 py-2.5 text-right text-[13px] text-ink-3">
                  not observable
                </td>
                <td className="px-3 py-2.5 text-right text-ink-3">—</td>
                <td className="py-2.5 pl-3 text-[11px] text-ink-3">
                  state only, no history
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 max-w-prose text-xs text-ink-3">
          One line per subject, ordered by what depends on what. Click a row for
          its record. Rows that cannot honestly fill a column leave it empty —
          the sheet never invents a figure to keep the grid tidy.
        </p>

        {headline && (
          <p className="mt-6 text-sm text-ink-2">
            ted1k has sampled once a second without interruption for{" "}
            <span className="text-ink">{month?.whole.length ?? 0}</span> whole
            days in this window, losing a typical{" "}
            <span className="qc-num text-ink">
              {formatAbsence(month?.baseline ?? 0)}
            </span>{" "}
            a day.
          </p>
        )}

        <Byline>im.ted1k · kv:ted1k-derive</Byline>
      </main>
    </div>
  );
}
