// PROTOTYPE — throwaway. See ../../README.md.
//
// Hosts and network — identity, tailnet, bus and endpoints. This is the
// surface the old /prototype/qcic path pointed at; renamed because QCIC is the
// whole project, not this one slice of it.
//
// Where the three directions finally get a real
// dependency stack to argue about. On /tedcheck and /scast the hierarchy is
// shallow (one producer, one bus); here there are three genuine rungs, and the
// difference between the variants stops being cosmetic:
//
//   STRATA   reads downward into the substrate, and degrades honestly — an
//            upper layer whose substrate is down goes UNVERIFIABLE, not red.
//   CIRCUIT  puts the health on the links between layers, because "is the
//            tailnet up" matters far less than "can this host reach that one,
//            and directly or through a relay".
//   SHEET    flattens everything to one comparable line per subject, ordered
//            by dependency.

import { useState } from "react";
import { NETWORK_FIXTURE, summariseFabric } from "../../fixtures/network";
import { Byline, Eyebrow, LivenessDot, Masthead } from "../../ui/primitives";
import {
  BusPanel,
  FabricSummaryLine,
  FixtureNote,
  HealthNote,
  layerHealth,
  PeerTable,
  ProbeSummaryLine,
  ProbeTable,
  SimControl,
  type LayerId,
  type Simulated,
} from "./shared";

const F = NETWORK_FIXTURE;

function Stratum({
  index,
  name,
  role,
  tone,
  health,
  grow,
  children,
}: {
  index: number;
  name: string;
  role: string;
  tone: "paper" | "sunken" | "deep";
  health: "ok" | "down" | "unverifiable";
  grow?: boolean;
  children: React.ReactNode;
}) {
  const bg =
    tone === "paper" ? "bg-paper" : tone === "sunken" ? "bg-sunken" : "bg-deep";
  return (
    <section className={`${bg} border-t border-rule ${grow ? "flex-1" : ""}`}>
      <div className="mx-auto flex max-w-5xl gap-5 px-5 py-8 sm:gap-8 sm:px-8">
        <div className="flex w-7 shrink-0 flex-col items-center gap-2 sm:w-9">
          <span className="qc-num text-[11px] font-medium text-ink-2">
            {String(index).padStart(2, "0")}
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-3"
            style={{ writingMode: "vertical-rl" }}
          >
            {name}
          </span>
          <div className="w-px flex-1 bg-rule" />
        </div>
        {/* A layer that is DOWN is dimmed too, not just badged. Its numbers are
            the last successful reading, and rendering them at full strength
            next to a "down" badge is the contradiction the forced-state control
            exposed: "tailnet down" over a crisp "12 of 15 peers online" is two
            claims that cannot both be current. */}
        <div
          className={`min-w-0 flex-1 ${health !== "ok" ? "opacity-45" : ""}`}
        >
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <Eyebrow>{role}</Eyebrow>
            <HealthNote health={health} />
          </div>
          {health === "down" && (
            <p className="mb-3 text-[11px] text-partial">
              Everything below is the last reading that succeeded, not the
              current state.
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- STRATA */

export function NetworkStrata({
  sim,
  setSim,
}: {
  sim: Simulated;
  setSim(v: Simulated): void;
}) {
  const health = (l: LayerId) => layerHealth(l, sim);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Masthead running={<>hosts &amp; network</>} />

      <div className="mx-auto w-full max-w-5xl px-5 pt-6 sm:px-8">
        <SimControl value={sim} onChange={setSim} />
        <FixtureNote />
      </div>

      {/* Read top-down: services first because that is what you came for, then
          down through the things they depend on. The token elevation ladder
          carries the depth — no shadows, no cards. */}
      <Stratum
        index={1}
        name="services"
        role="The things that do the work"
        tone="paper"
        health={health("services")}
      >
        <ProbeSummaryLine probes={F.probes} />
        <div className="mt-4">
          <ProbeTable probes={F.probes} />
        </div>
        <div className="mt-6 border-t border-rule pt-4">
          <p className="text-sm text-ink-2">
            Heartbeat —{" "}
            <span className="qc-num text-ink">{F.heartbeat.hosts}</span> hosts
            broadcasting, delay{" "}
            <span className="qc-num text-ink">{F.heartbeat.delaySeconds}s</span>
            . Last message from{" "}
            <span className="qc-digest text-ink">{F.heartbeat.lastHost}</span>:{" "}
            <span className="qc-digest">{F.heartbeat.lastText}</span>
          </p>
        </div>
        <Byline>im.qcic.heartbeat</Byline>
      </Stratum>

      <Stratum
        index={2}
        name="bus"
        role="NATS — how state gets anywhere"
        tone="sunken"
        health={health("bus")}
      >
        <BusPanel bus={F.bus} />
      </Stratum>

      <Stratum
        index={3}
        name="fabric"
        role="The tailnet every other reading travels over"
        tone="deep"
        health={health("fabric")}
        grow
      >
        <FabricSummaryLine peers={F.peers} />
        <div className="mt-4">
          <PeerTable peers={F.peers} />
        </div>
      </Stratum>
    </div>
  );
}

/* --------------------------------------------------------------- CIRCUIT */

export function NetworkCircuit({
  sim,
  setSim,
}: {
  sim: Simulated;
  setSim(v: Simulated): void;
}) {
  const fabric = summariseFabric(F.peers);
  const health = (l: LayerId) => layerHealth(l, sim);

  return (
    <div className="min-h-screen bg-paper pb-28">
      <Masthead running={<>network &middot; connectedness</>} />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <SimControl value={sim} onChange={setSim} />
        <FixtureNote />

        <div className="mt-8">
          <Eyebrow>what reaches what, and whether it goes directly</Eyebrow>
        </div>

        {/* The claim this variant makes: for a homelab the interesting failure
            is almost never "a box is down" — it is a LINK degrading while both
            ends stay perfectly healthy. A relayed tailscale path is exactly
            that, and no amount of per-host status badges will ever show it. */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "direct paths",
              value: fabric.direct,
              note: "peer to peer, on the LAN",
              tone: "text-ink",
            },
            {
              label: "relayed paths",
              value: fabric.relayed,
              note: "through DERP — a different kind of link, not a slower one",
              tone: fabric.relayed > 0 ? "text-ink" : "text-ink-3",
            },
            {
              label: "unreachable",
              value: fabric.offline,
              note: "listed by the tailnet, not answering",
              tone: fabric.offline > 0 ? "text-excursion" : "text-ink-3",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-rule bg-surface p-4"
            >
              <div className={`qc-num text-3xl font-light ${s.tone}`}>
                {s.value}
              </div>
              <div className="mt-1 text-[12px] text-ink">{s.label}</div>
              <div className="mt-1 text-[11px] leading-snug text-ink-3">
                {s.note}
              </div>
            </div>
          ))}
        </div>

        {/* The chain, with each hop's health on the connector rather than on
            the boxes at either end. */}
        <div className="mt-8 overflow-x-auto">
          <div className="flex min-w-[38rem] items-center gap-2">
            {(
              [
                ["this page", null],
                ["tailnet", "fabric"],
                ["nats", "bus"],
                ["services", "services"],
              ] as [string, LayerId | null][]
            ).map(([label, layer], i) => {
              const h = layer ? health(layer) : "ok";
              return (
                <div key={label} className="flex flex-1 items-center gap-2">
                  {i > 0 && (
                    <span
                      className={`h-px flex-1 ${
                        h === "down"
                          ? "bg-excursion"
                          : h === "unverifiable"
                            ? "bg-partial"
                            : "bg-rule-strong"
                      }`}
                    />
                  )}
                  <span
                    className={`shrink-0 rounded-md border px-3 py-1.5 text-[13px] ${
                      h === "down"
                        ? "border-excursion text-excursion"
                        : h === "unverifiable"
                          ? "border-dashed border-partial text-partial"
                          : "border-rule-strong bg-surface text-ink"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <section className="mt-8">
          <FabricSummaryLine peers={F.peers} />
          <div className="mt-4">
            <PeerTable peers={F.peers} />
          </div>
        </section>

        <section className="mt-8 border-t border-rule pt-6">
          <BusPanel bus={F.bus} />
        </section>

        <section className="mt-8 border-t border-rule pt-6">
          <ProbeSummaryLine probes={F.probes} />
          <div className="mt-4">
            <ProbeTable probes={F.probes} />
          </div>
        </section>

        <Byline>im.qcic.heartbeat · tailscale · nats-top</Byline>
      </main>
    </div>
  );
}

/* ----------------------------------------------------------------- SHEET */

export function NetworkSheet({
  sim,
  setSim,
}: {
  sim: Simulated;
  setSim(v: Simulated): void;
}) {
  const fabric = summariseFabric(F.peers);
  const health = (l: LayerId) => layerHealth(l, sim);

  const rows: {
    key: string;
    subject: string;
    qualifier: string;
    up: boolean;
    figure: string;
    detail: string;
    layer: LayerId;
    indent?: boolean;
  }[] = [
    {
      key: "fabric",
      subject: "tailnet",
      qualifier: `${F.peers.length} peers`,
      up: health("fabric") === "ok",
      figure: `${fabric.online}/${fabric.total}`,
      detail: `${fabric.direct} direct · ${fabric.relayed} relayed · median ${fabric.medianDelayMs} ms`,
      layer: "fabric",
    },
    {
      key: "bus",
      subject: "nats",
      qualifier: F.bus.server,
      up: health("bus") === "ok",
      figure: `${F.bus.connections} conns`,
      detail: `${F.bus.subscriptions} subs · ${F.bus.msgsPerSecOut.toFixed(1)} msg/s out · ${F.bus.slowConsumers} slow`,
      layer: "bus",
    },
    ...F.probes.map((p) => ({
      key: p.url,
      subject: new URL(p.url).hostname,
      qualifier: new URL(p.url).pathname,
      up: health("services") === "ok" && p.status !== null && p.status < 300,
      figure: p.status === null ? "—" : String(p.status),
      detail: p.ms === null ? "no answer" : `${p.ms} ms`,
      layer: "services" as LayerId,
      indent: true,
    })),
    {
      key: "heartbeat",
      subject: "heartbeat",
      qualifier: "im.qcic.heartbeat",
      up: health("services") === "ok",
      figure: `${F.heartbeat.hosts} hosts`,
      detail: `delay ${F.heartbeat.delaySeconds}s · last ${F.heartbeat.lastHost}`,
      layer: "services",
      indent: true,
    },
  ];

  return (
    <div className="min-h-screen bg-paper pb-28">
      <Masthead running={<>network sheet</>} />
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <SimControl value={sim} onChange={setSim} />
        <FixtureNote />

        <div className="mt-7 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse">
            <thead>
              <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.14em] text-ink-3">
                <th className="py-2 pr-3 text-left font-semibold">subject</th>
                <th className="py-2 px-3 text-right font-semibold">reading</th>
                <th className="py-2 pl-3 text-left font-semibold">detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const h = health(r.layer);
                return (
                  <tr
                    key={r.key}
                    className={`border-b border-rule/70 ${h === "unverifiable" ? "opacity-50" : ""}`}
                  >
                    <td className={`py-2.5 pr-3 ${r.indent ? "pl-6" : ""}`}>
                      <span className="flex items-center gap-2">
                        <LivenessDot
                          status={
                            h === "unverifiable"
                              ? "connecting"
                              : r.up
                                ? "connected"
                                : "closed"
                          }
                        />
                        <span className="text-sm text-ink">{r.subject}</span>
                        <span className="qc-digest text-[11px] text-ink-3">
                          {r.qualifier}
                        </span>
                      </span>
                    </td>
                    <td className="qc-num px-3 py-2.5 text-right text-ink">
                      {h === "unverifiable" ? "—" : r.figure}
                    </td>
                    <td className="py-2.5 pl-3 text-[12px] text-ink-3">
                      {h === "unverifiable"
                        ? "substrate down — cannot be vouched for"
                        : r.detail}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 max-w-prose text-xs text-ink-3">
          Ordered by dependency, not alphabetically: everything below a row
          depends on it. A row whose substrate is down reports{" "}
          <span className="text-ink-2">nothing</span> rather than reporting a
          stale figure as if it were current.
        </p>

        <div className="mt-8 border-t border-rule pt-6">
          <PeerTable peers={F.peers} />
        </div>

        <Byline>tailscale · nats-top · curl</Byline>
      </main>
    </div>
  );
}

/** Shared state holder so the sim control survives a variant switch. */
export function useSimulated(): [Simulated, (v: Simulated) => void] {
  const [sim, setSim] = useState<Simulated>("healthy");
  return [sim, setSim];
}
