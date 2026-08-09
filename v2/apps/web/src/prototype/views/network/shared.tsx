// PROTOTYPE — throwaway. See ../../README.md.
//
// Hosts-and-network marks. Everything here reads fixture data (see
// ../../fixtures/network.ts) because a browser cannot observe a tailnet or run an
// HTTP probe — the shapes are real, the numbers are plausible.

import {
  isRelayed,
  summariseFabric,
  summariseProbes,
  type BusStats,
  type HttpProbe,
  type Peer,
} from "../../fixtures/network";
import { LivenessDot } from "../../ui/primitives";

/**
 * The three rungs everything else rests on. Order is the dependency order and
 * is never rearranged: if the fabric is down, the bus cannot be reached, and
 * if the bus is down, no service reading can be trusted.
 */
export type LayerId = "fabric" | "bus" | "services";

export const LAYERS: { id: LayerId; name: string; role: string }[] = [
  {
    id: "fabric",
    name: "fabric",
    role: "The tailnet every other reading travels over",
  },
  { id: "bus", name: "bus", role: "NATS — how state gets anywhere" },
  { id: "services", name: "services", role: "The things that do the work" },
];

/**
 * PROTOTYPE CONTROL, not a product feature. The "unverifiable" encoding only
 * appears when a lower layer is unhealthy, and on healthy data it is therefore
 * invisible — which makes it impossible to judge. This lets the reviewer force
 * the state. It is not a fault-injection tool and it changes nothing outside
 * this page's rendering.
 */
export type Simulated = "healthy" | "fabric-down" | "bus-down";

export function layerHealth(
  layer: LayerId,
  sim: Simulated,
): "ok" | "down" | "unverifiable" {
  if (sim === "fabric-down") {
    if (layer === "fabric") return "down";
    return "unverifiable";
  }
  if (sim === "bus-down") {
    if (layer === "fabric") return "ok";
    if (layer === "bus") return "down";
    return "unverifiable";
  }
  return "ok";
}

export function HealthNote({
  health,
}: {
  health: "ok" | "down" | "unverifiable";
}) {
  if (health === "ok") return null;
  if (health === "down") {
    return (
      <span className="rounded-full border border-excursion px-2 py-0.5 text-[10px] tracking-wide text-excursion">
        down
      </span>
    );
  }
  return (
    <span className="rounded-full border border-dashed border-partial px-2 py-0.5 text-[10px] tracking-wide text-partial">
      unverifiable — substrate down
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Peers. Direct-vs-relayed is drawn as SHAPE, not as a latency number:
 * a relayed path is a different kind of connection, not a slower one, and
 * burying that distinction in a millisecond column loses it.
 * ------------------------------------------------------------------ */
export function PeerTable({ peers }: { peers: Peer[] }) {
  const sorted = [...peers].sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    if (isRelayed(a) !== isRelayed(b)) return isRelayed(a) ? 1 : -1;
    return (a.delayMs ?? 1e9) - (b.delayMs ?? 1e9);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
            <th className="py-1.5 pr-3 text-left font-semibold">peer</th>
            <th className="py-1.5 px-3 text-left font-semibold">
              tailscale ip
            </th>
            <th className="py-1.5 px-3 text-left font-semibold">path</th>
            <th className="py-1.5 pl-3 text-right font-semibold">delay</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr
              key={p.hostName}
              className="border-b border-rule/60 last:border-0 hover:bg-surface-2/60"
            >
              <td className="py-1.5 pr-3">
                <span className="flex items-center gap-2">
                  <LivenessDot status={p.online ? "connected" : "closed"} />
                  <span
                    className={`text-[13px] ${p.online ? "text-ink" : "text-ink-3"}`}
                  >
                    {p.hostName}
                  </span>
                </span>
              </td>
              <td className="qc-digest py-1.5 px-3 text-[12px] text-ink-3">
                {p.tailscaleIp}
              </td>
              <td className="py-1.5 px-3 text-[12px]">
                {!p.online ? (
                  <span className="text-ink-3/60">—</span>
                ) : isRelayed(p) ? (
                  // Relayed: drawn with a broken connector so it reads as a
                  // different kind of path even in the monochrome theme.
                  <span className="flex items-center gap-1.5 text-ink-2">
                    <span className="inline-block h-px w-3 bg-partial" />
                    <span className="inline-block h-1.5 w-1.5 rotate-45 border border-partial" />
                    <span className="inline-block h-px w-3 bg-partial" />
                    <span className="qc-digest">{p.via}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-ink-3">
                    <span className="inline-block h-px w-9 bg-rule-strong" />
                    <span className="qc-digest">direct</span>
                  </span>
                )}
              </td>
              <td className="qc-num py-1.5 pl-3 text-right text-ink-2">
                {p.delayMs === null ? "—" : `${p.delayMs} ms`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FabricSummaryLine({ peers }: { peers: Peer[] }) {
  const s = summariseFabric(peers);
  return (
    <p className="text-sm text-ink-2">
      <span className="qc-num text-ink">{s.online}</span> of{" "}
      <span className="qc-num">{s.total}</span> peers online,{" "}
      <span className="qc-num text-ink">{s.direct}</span> on a direct path and{" "}
      <span className="qc-num text-ink">{s.relayed}</span> relayed through DERP.
      Median delay <span className="qc-num text-ink">{s.medianDelayMs} ms</span>
      {s.worst && (
        <>
          , worst <span className="qc-digest text-ink">{s.worst.hostName}</span>{" "}
          at <span className="qc-num text-ink">{s.worst.delayMs} ms</span>
        </>
      )}
      .
    </p>
  );
}

export function BusPanel({ bus }: { bus: BusStats }) {
  const stats: [string, string][] = [
    ["connections", String(bus.connections)],
    ["subscriptions", String(bus.subscriptions)],
    ["msgs/s in", bus.msgsPerSecIn.toFixed(1)],
    ["msgs/s out", bus.msgsPerSecOut.toFixed(1)],
    ["slow consumers", String(bus.slowConsumers)],
  ];
  return (
    <div>
      <p className="mb-3 text-sm text-ink-2">
        <span className="qc-digest text-ink">{bus.server}</span>
      </p>
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] text-ink-3">{label}</dt>
            <dd
              className={`qc-num text-lg ${
                label === "slow consumers" && value !== "0"
                  ? "text-excursion"
                  : "text-ink"
              }`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ProbeTable({ probes }: { probes: HttpProbe[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
            <th className="py-1.5 pr-3 text-left font-semibold">endpoint</th>
            <th className="py-1.5 px-3 text-right font-semibold">status</th>
            <th className="py-1.5 pl-3 text-right font-semibold">time</th>
          </tr>
        </thead>
        <tbody>
          {probes.map((p) => {
            const ok = p.status !== null && p.status >= 200 && p.status <= 299;
            return (
              <tr
                key={p.url}
                className="border-b border-rule/60 last:border-0 hover:bg-surface-2/60"
              >
                <td className="qc-digest py-1.5 pr-3 text-[12px] text-ink-2">
                  {p.url}
                </td>
                <td
                  className={`qc-num py-1.5 px-3 text-right ${ok ? "text-ink-2" : "font-medium text-excursion"}`}
                >
                  {p.status ?? "no answer"}
                </td>
                <td className="qc-num py-1.5 pl-3 text-right text-ink-3">
                  {p.ms === null ? "—" : `${p.ms} ms`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ProbeSummaryLine({ probes }: { probes: HttpProbe[] }) {
  const s = summariseProbes(probes);
  return (
    <p className="text-sm text-ink-2">
      <span className="qc-num text-ink">{s.ok}</span> of{" "}
      <span className="qc-num">{s.total}</span> endpoints answering
      {s.failing.length > 0 && (
        <>
          {" "}
          — <span className="text-excursion">{s.failing.length} not</span>
        </>
      )}
      .
    </p>
  );
}

/** The prototype-only state forcer. Labelled as such, wherever it appears. */
export function SimControl({
  value,
  onChange,
}: {
  value: Simulated;
  onChange(v: Simulated): void;
}) {
  const options: [Simulated, string][] = [
    ["healthy", "healthy"],
    ["fabric-down", "tailnet down"],
    ["bus-down", "nats down"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-ink-3">
        force a state (prototype only):
      </span>
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
            value === id
              ? "border-ink bg-ink text-paper"
              : "border-rule text-ink-2 hover:bg-surface-2"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function FixtureNote() {
  return (
    <p className="mt-2 max-w-prose text-[11px] leading-relaxed text-ink-3">
      Tailnet, bus counters and HTTP probes are <strong>fixtures</strong> — a
      browser cannot observe any of them. Every field is one{" "}
      <span className="qc-digest">scripts/bash/qcic-sh.sh</span> actually
      prints, and every host is a real one from the roster; only the numbers are
      invented. ted1k and scrobblecast, on their own pages, are live.
    </p>
  );
}
