// PROTOTYPE — throwaway. See ../../README.md.
//
// QCIC — the project's own page. Not a summary of two things but the whole
// picture, concisely: every subject QCIC watches, at one reading each, with
// its own page a click away.
//
// The overview is the fairest test of the three directions, because the
// content is identical and only the arrangement differs:
//
//   STRATA   tiles grouped into dependency bands, deepest at the bottom.
//   CIRCUIT  one figure of the whole system — subjects hanging off the bus,
//            the bus off the fabric, with the connectors carrying the health.
//   SHEET    one dense line per subject, ordered by what depends on what.
//
// The tile revives /design/html-react's metric card (watermark, hero,
// secondaries, subject byline) minus its decoration — see ui/primitives.tsx.

import { Link } from "@tanstack/react-router";
import {
  Byline,
  Eyebrow,
  LivenessDot,
  Masthead,
  Tile,
} from "../../ui/primitives";
import type { PrototypeSearch } from "../../variants";
import type { ScastFeed } from "../scast/data";
import type { TedcheckFeed } from "../tedcheck/data";
import {
  buildSubjects,
  LAYER_TITLE,
  type Layer,
  type Subject,
} from "./subjects";

export interface HomeProps {
  ted: TedcheckFeed;
  scast: ScastFeed;
  search: PrototypeSearch;
}

const LAYER_ORDER: Layer[] = ["services", "bus", "fabric"];

function SubjectLink({ s, search }: { s: Subject; search: PrototypeSearch }) {
  if (!s.to) return <>{s.label}</>;
  return (
    <Link to={s.to} search={search} className="hover:underline">
      {s.label}
    </Link>
  );
}

function FixtureFootnote() {
  return (
    <p className="mt-6 max-w-prose text-[11px] leading-relaxed text-ink-3">
      Subjects marked <span className="text-partial">fixture</span> are shapes,
      not readings — a browser cannot observe a tailnet, a{" "}
      <span className="qc-digest">nats-top</span> table or an HTTP probe. Their
      fields come from{" "}
      <span className="qc-digest">scripts/bash/qcic-sh.sh</span>; only the
      numbers are invented. ted1k, scrobblecast and the bus connection are live.
    </p>
  );
}

/* ---------------------------------------------------------------- STRATA */

export function HomeStrata({ ted, scast, search }: HomeProps) {
  const subjects = buildSubjects(ted, scast);
  const busDown = ted.busStatus !== "connected";

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Masthead running={<>everything, at one reading each</>} />

      {LAYER_ORDER.map((layer, i) => {
        const items = subjects.filter((s) => s.layer === layer);
        // Only the layer *above* the bus becomes unverifiable when it drops:
        // the bus reports its own state, and the fabric below it is observed
        // by something else entirely.
        const unverifiable = busDown && layer === "services";
        const bg =
          layer === "services"
            ? "bg-paper"
            : layer === "bus"
              ? "bg-sunken"
              : "flex-1 bg-deep";

        return (
          <section key={layer} className={`border-t border-rule ${bg}`}>
            <div className="mx-auto flex max-w-5xl gap-5 px-5 py-8 sm:gap-8 sm:px-8">
              <div className="flex w-7 shrink-0 flex-col items-center gap-2 sm:w-9">
                <span className="qc-num text-[11px] font-medium text-ink-2">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-3"
                  style={{ writingMode: "vertical-rl" }}
                >
                  {layer}
                </span>
                <div className="w-px flex-1 bg-rule" />
              </div>

              <div
                className={`min-w-0 flex-1 ${unverifiable ? "opacity-45" : ""}`}
              >
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <Eyebrow>{LAYER_TITLE[layer]}</Eyebrow>
                  {unverifiable && (
                    <span className="rounded-full border border-dashed border-partial px-2 py-0.5 text-[10px] text-partial">
                      unverifiable — bus {ted.busStatus}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((s) => (
                    <Tile
                      key={s.id}
                      label={s.label}
                      href={<SubjectLink s={s} search={search} />}
                      value={s.value}
                      unit={s.unit}
                      secondary={s.secondary}
                      byline={s.byline}
                      status={s.status}
                      fixture={s.source === "fixture"}
                      tone={s.bad ? "excursion" : "normal"}
                    />
                  ))}
                </div>

                {layer === "fabric" && <FixtureFootnote />}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- CIRCUIT */

export function HomeCircuit({ ted, scast, search }: HomeProps) {
  const subjects = buildSubjects(ted, scast);
  const services = subjects.filter((s) => s.layer === "services");
  const bus = subjects.find((s) => s.layer === "bus")!;
  const fabric = subjects.find((s) => s.layer === "fabric")!;

  return (
    <div className="min-h-screen bg-paper pb-28">
      <Masthead running={<>what hangs off what</>} />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <Eyebrow>every subject, and the path its readings take here</Eyebrow>

        {/* One figure for the whole system. Services fan out from the bus, the
            bus sits on the fabric, and the connectors carry the health —
            because a homelab's real failure is almost always a link degrading
            while both ends stay perfectly fine. */}
        <div className="mt-6 overflow-x-auto">
          <div className="min-w-[40rem]">
            {services.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 border-b border-rule/60 py-3"
              >
                <span className="flex w-48 shrink-0 items-center gap-2">
                  {s.status ? (
                    <LivenessDot status={s.status} />
                  ) : (
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full border border-dashed border-partial" />
                  )}
                  <span className="text-[13px] text-ink">
                    <SubjectLink s={s} search={search} />
                  </span>
                </span>

                <span className="relative flex min-w-0 flex-1 items-center">
                  <span
                    className={`h-px w-full ${s.bad ? "bg-excursion" : "bg-rule-strong"}`}
                  />
                  <span className="absolute left-1/2 -translate-x-1/2 bg-paper px-2 text-[10px] text-ink-3">
                    <span className="qc-digest">{s.byline}</span>
                    {s.source === "fixture" && (
                      <span className="ml-1.5 text-partial">fixture</span>
                    )}
                  </span>
                </span>

                <span className="w-40 shrink-0 text-right">
                  <span
                    className={`qc-num text-sm ${s.bad ? "text-excursion" : "text-ink"}`}
                  >
                    {s.value}
                  </span>
                  {s.unit && (
                    <span className="ml-1 text-[10px] text-ink-3">
                      {s.unit}
                    </span>
                  )}
                </span>
              </div>
            ))}

            {/* The two rungs below, drawn as the trunk everything joins. */}
            <div className="mt-5 flex items-center gap-3">
              <span className="w-48 shrink-0" />
              <span className="min-w-0 flex-1 text-center">
                <span
                  className={`inline-block rounded-md border px-3 py-1.5 text-[13px] font-medium ${
                    bus.bad
                      ? "border-excursion text-excursion"
                      : "border-rule-strong bg-surface text-ink"
                  }`}
                >
                  {bus.label}
                </span>
              </span>
              <span className="w-40 shrink-0 text-right text-[11px] text-ink-3">
                {bus.value}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-48 shrink-0" />
              <span className="flex min-w-0 flex-1 justify-center">
                <span className="h-6 w-px bg-rule-strong" />
              </span>
              <span className="w-40 shrink-0" />
            </div>

            <div className="flex items-center gap-3">
              <span className="w-48 shrink-0" />
              <span className="min-w-0 flex-1 text-center">
                <Link
                  to="/prototype/network"
                  search={search}
                  className="inline-block rounded-md border border-dashed border-partial px-3 py-1.5 text-[13px] text-ink-2 hover:text-ink"
                >
                  {fabric.label}
                </Link>
              </span>
              <span className="w-40 shrink-0 text-right text-[11px] text-ink-3">
                {fabric.value} {fabric.unit}
              </span>
            </div>
          </div>
        </div>

        <FixtureFootnote />
        <Byline>qcic</Byline>
      </main>
    </div>
  );
}

/* ----------------------------------------------------------------- SHEET */

export function HomeSheet({ ted, scast, search }: HomeProps) {
  const subjects = buildSubjects(ted, scast);
  // Dependency order, bottom rung first: everything below a row rests on it.
  const ordered = [
    ...subjects.filter((s) => s.layer === "fabric"),
    ...subjects.filter((s) => s.layer === "bus"),
    ...subjects.filter((s) => s.layer === "services"),
  ];

  return (
    <div className="min-h-screen bg-paper pb-28">
      <Masthead running={<>one line each</>} />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse">
            <thead>
              <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.14em] text-ink-3">
                <th className="py-2 pr-3 text-left font-semibold">subject</th>
                <th className="py-2 px-3 text-right font-semibold">reading</th>
                <th className="py-2 pl-3 text-left font-semibold">and</th>
                <th className="py-2 pl-3 text-left font-semibold">from</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((s, i) => {
                const startsLayer =
                  i === 0 || ordered[i - 1]!.layer !== s.layer;
                return (
                  <tr key={s.id} className="border-b border-rule/70">
                    <td className="py-2.5 pr-3">
                      <span className="flex flex-wrap items-center gap-2">
                        {s.status ? (
                          <LivenessDot status={s.status} />
                        ) : (
                          <span className="inline-block h-2 w-2 shrink-0 rounded-full border border-dashed border-partial" />
                        )}
                        <span className="text-sm text-ink">
                          <SubjectLink s={s} search={search} />
                        </span>
                        <span className="text-[11px] text-ink-3">
                          {s.qualifier}
                        </span>
                        {startsLayer && (
                          <span className="text-[9px] uppercase tracking-[0.14em] text-ink-3/70">
                            {s.layer}
                          </span>
                        )}
                      </span>
                    </td>
                    <td
                      className={`qc-num px-3 py-2.5 text-right ${s.bad ? "text-excursion" : "text-ink"}`}
                    >
                      {s.value}
                      {s.unit && (
                        <span className="ml-1 text-[10px] text-ink-3">
                          {s.unit}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 text-[12px] text-ink-3">
                      {s.secondary
                        .map((x) => `${x.label} ${x.value}`)
                        .join(" · ")}
                    </td>
                    <td className="py-2.5 pl-3">
                      <span className="qc-digest text-[11px] text-ink-3">
                        {s.byline}
                      </span>
                      {s.source === "fixture" && (
                        <span className="ml-2 text-[10px] text-partial">
                          fixture
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 max-w-prose text-xs text-ink-3">
          Each subject reports in the unit it can honestly support — ted1k in
          nines, scrobblecast in cycles, the fabric in peers — rather than being
          forced into one shared score that would flatter some and libel others.
        </p>

        <FixtureFootnote />
        <Byline>qcic</Byline>
      </main>
    </div>
  );
}
