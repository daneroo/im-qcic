import { createFileRoute, Link } from "@tanstack/react-router";
import { ConnectionDot } from "../components/marks";
import { Stratum } from "../components/Stratum";
import { NATS_MONITOR_URL, NATS_WS_URL } from "../config";
import {
  buildHomeSubjects,
  type HomeLayer,
  type HomeSubject,
} from "../home/subjects";
import { useDirectNatsMonitoring } from "../network/direct-monitoring-source";
import { useScastFeed } from "../scast/useScastFeed";
import { useTed1kFeed } from "../ted1k/useTed1kFeed";
import { useCurrentTime } from "../useCurrentTime";

export const Route = createFileRoute("/")({
  component: Home,
});

const LAYERS: {
  layer: HomeLayer;
  name: string;
  role: string;
  tone: "paper" | "sunken" | "deep";
}[] = [
  {
    layer: "services",
    name: "services",
    role: "The things that do the work",
    tone: "paper",
  },
  {
    layer: "bus",
    name: "bus",
    role: "NATS — how state gets anywhere",
    tone: "sunken",
  },
  {
    layer: "fabric",
    name: "fabric",
    role: "The tailnet every other reading travels over",
    tone: "deep",
  },
];

function Tile({ subject }: { subject: HomeSubject }) {
  const unavailable = subject.verifiability === "unverifiable";
  const marker = (
    <span className="flex items-center gap-1.5">
      {subject.source === "fixture" && (
        <span
          className="rounded-full border border-dashed border-partial px-1.5 py-0.5 text-[9px] tracking-wide text-partial"
          title="Recorded shape — not observed live by this browser"
        >
          fixture
        </span>
      )}
      {unavailable ? (
        <span className="rounded-full border border-dashed border-partial px-1.5 py-0.5 text-[9px] tracking-wide text-ink-2">
          unverifiable
        </span>
      ) : subject.source === "live" ? (
        <ConnectionDot status={subject.status ?? "connected"} />
      ) : null}
    </span>
  );

  return (
    <Link
      to={subject.to}
      className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label={`Open ${subject.label}`}
    >
      <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-rule bg-surface p-5 group-hover:border-rule-strong">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1.5 left-0 max-w-full truncate px-4 text-4xl font-bold text-ink opacity-[0.04] select-none"
        >
          {subject.label}
        </span>

        <div className="relative flex items-baseline justify-between gap-2">
          <h3 className="text-[12px] font-medium text-ink">{subject.label}</h3>
          {marker}
        </div>

        <div className="relative mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className={`qc-num text-3xl leading-none font-light tracking-tight ${subject.tone === "alarm" ? "text-alarm" : "text-ink"}`}
          >
            {subject.value}
          </span>
          {subject.unit && (
            <span className="text-[11px] text-ink-3">{subject.unit}</span>
          )}
        </div>

        {subject.secondary.length > 0 && (
          <dl className="relative mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {subject.secondary.map((reading) => (
              <div key={reading.label} className="flex items-baseline gap-1.5">
                <dt className="text-[10px] text-ink-3">{reading.label}</dt>
                <dd className="qc-num text-[12px] text-ink-2">
                  {reading.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {unavailable && subject.age && (
          <p className="relative mt-2 text-[10px] text-ink-3">
            last known <span className="qc-num">{subject.age}</span>
          </p>
        )}

        <div className="relative mt-auto flex items-center gap-2 pt-4">
          <span className="h-px flex-1 bg-rule" />
          <p className="qc-digest text-[9px] lowercase text-ink-3">
            {subject.byline}
          </p>
        </div>
      </article>
    </Link>
  );
}

function Home() {
  const ted = useTed1kFeed();
  const scast = useScastFeed(NATS_WS_URL);
  const bus = useDirectNatsMonitoring(NATS_MONITOR_URL);
  const now = useCurrentTime();
  const subjects = buildHomeSubjects({ ted, scast, bus, now });

  return (
    <main className="flex min-h-[calc(100vh-3rem)] flex-col bg-paper">
      {LAYERS.map(({ layer, name, role, tone }, index) => {
        const readings = subjects.filter((subject) => subject.layer === layer);
        const unavailable =
          layer === "bus"
            ? bus.status !== "live"
            : layer === "services" && bus.status !== "live";

        return (
          <Stratum
            key={layer}
            index={index + 1}
            name={name}
            role={role}
            tone={tone}
            health={unavailable ? "unverifiable" : "live"}
            grow={layer === "fabric"}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {readings.map((subject) => (
                <Tile key={subject.id} subject={subject} />
              ))}
            </div>

            {layer === "fabric" && (
              <p className="mt-6 max-w-prose text-[11px] leading-relaxed text-ink-3">
                Subjects marked <span className="text-partial">fixture</span>{" "}
                are shapes, not readings — this browser cannot observe the
                tailnet or run HTTP probes. ted1k, scast, and NATS use live
                sources when connected.
              </p>
            )}
          </Stratum>
        );
      })}
    </main>
  );
}
