import { NATS_MONITOR_URL } from "../config";
import { Stratum } from "../components/Stratum";
import { isRelayed, summariseFabric, summariseProbes } from "./derive";
import { useDirectNatsMonitoring } from "./direct-monitoring-source";
import { NETWORK_FIXTURE } from "./fixture";
import type { BusStats, HttpProbe, Peer } from "./types";

const fixture = NETWORK_FIXTURE;

export function NetworkPage() {
  const bus = useDirectNatsMonitoring(NATS_MONITOR_URL);

  return (
    <main className="min-h-[calc(100vh-3rem)] overflow-x-clip bg-paper">
      <header className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-2">
          hosts &amp; network
        </p>
        <h1 className="mt-1 text-3xl font-light tracking-tight text-ink">
          What reaches what
        </h1>
        <FixtureNote />
      </header>

      <Stratum
        index={1}
        name="services"
        role="The things that do the work"
        tone="paper"
        health={bus.status === "live" ? "live" : "unverifiable"}
      >
        <ProbeSummaryLine probes={fixture.probes} />
        <div className="mt-4">
          <ProbeTable probes={fixture.probes} />
        </div>
        <Byline>curl</Byline>
        <div className="mt-6 border-t border-rule pt-4 text-sm text-ink-2">
          Heartbeat —{" "}
          <span className="qc-num text-ink">{fixture.heartbeat.hosts}</span>{" "}
          hosts broadcasting, delay{" "}
          <span className="qc-num text-ink">
            {fixture.heartbeat.delaySeconds}s
          </span>
          . Last message from{" "}
          <span className="qc-digest text-ink">
            {fixture.heartbeat.lastHost}
          </span>
          : <span className="qc-digest">{fixture.heartbeat.lastText}</span>
        </div>
        <Byline>im.qcic.heartbeat</Byline>
      </Stratum>

      <Stratum
        index={2}
        name="bus"
        role="NATS — how state gets anywhere"
        tone="sunken"
        health={bus.status === "live" ? "live" : "unverifiable"}
      >
        {bus.status === "live" ? (
          <BusPanel bus={bus.stats} />
        ) : (
          <UnavailableBus loading={bus.status === "loading"} />
        )}
        <Byline>{NATS_MONITOR_URL}/varz · /connz</Byline>
      </Stratum>

      <Stratum
        index={3}
        name="fabric"
        role="The tailnet every other reading travels over"
        tone="deep"
      >
        <p className="mb-4 text-sm text-ink-2">
          <span className="qc-digest text-ink">
            {fixture.identity.hostnameFqdn}
          </span>{" "}
          · {fixture.identity.lanIp} · {fixture.identity.tailscaleIp}
        </p>
        <FabricSummaryLine peers={fixture.peers} />
        <div className="mt-4">
          <PeerTable peers={fixture.peers} />
        </div>
        <Byline>tailscale status · tailscale ping</Byline>
      </Stratum>
    </main>
  );
}

function FixtureNote() {
  return (
    <p className="mt-4 max-w-2xl text-xs leading-relaxed text-ink-2">
      <strong className="font-medium text-ink">Fabric and services</strong>{" "}
      readings are fixtures. The bus reading is live from NATS monitoring.
    </p>
  );
}

function FabricSummaryLine({ peers }: { peers: Peer[] }) {
  const summary = summariseFabric(peers);

  return (
    <p className="text-sm leading-relaxed text-ink-2">
      <span className="qc-num text-ink">{summary.online}</span> of{" "}
      <span className="qc-num">{summary.total}</span> peers online,{" "}
      <span className="qc-num text-ink">{summary.direct}</span> direct and{" "}
      <span className="qc-num text-ink">{summary.relayed}</span> relayed through
      DERP. Median delay{" "}
      <span className="qc-num text-ink">
        {summary.medianDelayMs === null ? "—" : `${summary.medianDelayMs} ms`}
      </span>
      {summary.worst && (
        <>
          , worst{" "}
          <span className="qc-digest text-ink">{summary.worst.hostName}</span>{" "}
          at <span className="qc-num text-ink">{summary.worst.delayMs} ms</span>
        </>
      )}
      .
    </p>
  );
}

function PeerTable({ peers }: { peers: Peer[] }) {
  const sorted = [...peers].sort((left, right) => {
    if (left.online !== right.online) return left.online ? -1 : 1;
    if (isRelayed(left) !== isRelayed(right)) return isRelayed(left) ? 1 : -1;
    return (
      (left.delayMs ?? Number.POSITIVE_INFINITY) -
      (right.delayMs ?? Number.POSITIVE_INFINITY)
    );
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-2">
            <th className="py-1.5 pr-3 text-left font-semibold">peer</th>
            <th className="px-3 py-1.5 text-left font-semibold">
              tailscale ip
            </th>
            <th className="px-3 py-1.5 text-left font-semibold">path</th>
            <th className="py-1.5 pl-3 text-right font-semibold">delay</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((peer) => (
            <tr
              key={peer.hostName}
              className="border-b border-rule/60 last:border-0"
            >
              <td className="py-1.5 pr-3">
                <span className="flex items-center gap-2">
                  <ConnectionDot connected={peer.online} />
                  <span className={peer.online ? "text-ink" : "text-ink-3"}>
                    {peer.hostName}
                  </span>
                </span>
              </td>
              <td className="qc-digest px-3 py-1.5 text-[12px] text-ink-2">
                {peer.tailscaleIp}
              </td>
              <td className="px-3 py-1.5 text-[12px]">
                {!peer.online ? (
                  <span className="text-ink-3">—</span>
                ) : isRelayed(peer) ? (
                  <span className="flex items-center gap-1.5 text-ink-2">
                    <span className="inline-block h-px w-3 bg-partial" />
                    <span className="inline-block size-1.5 rotate-45 border border-partial" />
                    <span className="inline-block h-px w-3 bg-partial" />
                    <span className="qc-digest">{peer.via}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-ink-2">
                    <span className="inline-block h-px w-9 bg-rule-strong" />
                    <span className="qc-digest">direct</span>
                  </span>
                )}
              </td>
              <td className="qc-num py-1.5 pl-3 text-right text-ink-2">
                {peer.delayMs === null ? "—" : `${peer.delayMs} ms`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BusPanel({ bus }: { bus: BusStats }) {
  const stats = [
    ["connections", String(bus.connections)],
    ["subscriptions", String(bus.subscriptions)],
    ["msgs/s in", bus.msgsPerSecIn.toFixed(1)],
    ["msgs/s out", bus.msgsPerSecOut.toFixed(1)],
    ["slow consumers", String(bus.slowConsumers)],
  ] as const;

  return (
    <div aria-live="polite">
      <p className="mb-3 flex items-center gap-2 text-sm text-ink-2">
        <ConnectionDot connected />
        <span className="qc-digest text-ink">{bus.server}</span>
        <span className="text-[11px] uppercase tracking-wide text-ink-2">
          live
        </span>
      </p>
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] text-ink-2">{label}</dt>
            <dd
              className={`qc-num text-lg ${
                label === "slow consumers" && value !== "0"
                  ? "text-alarm"
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

function UnavailableBus({ loading }: { loading: boolean }) {
  return (
    <div
      aria-live="polite"
      className="border-l border-dashed border-partial pl-4"
    >
      <p className="text-sm text-ink-2">
        {loading ? "Reading NATS monitoring…" : "Bus reading unavailable."}
      </p>
      {!loading && (
        <p className="mt-1 text-xs text-ink-2">
          Services are unverifiable while their substrate cannot be read.
        </p>
      )}
    </div>
  );
}

function ProbeSummaryLine({ probes }: { probes: HttpProbe[] }) {
  const summary = summariseProbes(probes);
  return (
    <p className="text-sm text-ink-2">
      <span className="qc-num text-ink">{summary.ok}</span> of{" "}
      <span className="qc-num">{summary.total}</span> endpoints answering
      {summary.failing.length > 0 && (
        <>
          {" "}
          — <span className="text-ink-2">{summary.failing.length} not</span>
        </>
      )}
      .
    </p>
  );
}

function ProbeTable({ probes }: { probes: HttpProbe[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-2">
            <th className="py-1.5 pr-3 text-left font-semibold">endpoint</th>
            <th className="px-3 py-1.5 text-right font-semibold">status</th>
            <th className="py-1.5 pl-3 text-right font-semibold">time</th>
          </tr>
        </thead>
        <tbody>
          {probes.map((probe) => {
            const ok =
              probe.status !== null &&
              probe.status >= 200 &&
              probe.status <= 299;
            return (
              <tr
                key={probe.url}
                className="border-b border-rule/60 last:border-0"
              >
                <td className="qc-digest py-1.5 pr-3 text-[12px] text-ink-2">
                  {probe.url}
                </td>
                <td
                  className={`qc-num px-3 py-1.5 text-right ${ok ? "text-ink-2" : "font-medium text-ink"}`}
                >
                  {probe.status ?? "no answer"}
                </td>
                <td className="qc-num py-1.5 pl-3 text-right text-ink-2">
                  {probe.ms === null ? "—" : `${probe.ms} ms`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-block size-2 shrink-0 rounded-full ${
        connected ? "bg-live" : "border border-ink-3"
      }`}
      aria-hidden="true"
    />
  );
}

function Byline({ children }: { children: React.ReactNode }) {
  return (
    <p className="qc-digest mt-5 text-[10px] tracking-wide text-ink-2">
      {children}
    </p>
  );
}
