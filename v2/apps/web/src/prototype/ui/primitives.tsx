// PROTOTYPE — throwaway. See ../README.md.
//
// The shared marks. Every variant draws from these so the comparison is about
// structure, not about one of them having nicer widgets.

import type { ReactNode } from "react";
import { formatAbsence, formatNines, type NinesQuality } from "../derive/nines";
import { utcISO } from "../derive/time";

/** Compact enough to sit as an axis label without wrapping. */
function formatAbsenceShort(seconds: number): string {
  return formatAbsence(seconds);
}

export const QUALITY_INK: Record<NinesQuality, string> = {
  perfect: "text-live",
  high: "text-ink",
  fair: "text-ink-2",
  poor: "text-excursion",
  unknown: "text-partial",
};

/* ------------------------------------------------------------------ *
 * The nines scale — this prototype's signature mark.
 *
 * A big number over a log axis whose MAXIMUM IS SET BY THE DATA, not by a
 * designer: the finest non-perfect figure 86400 samples can resolve is one
 * missing sample, i.e. 4.94 nines. A month resolves 6.44, a single hour 3.56.
 * Drawing the same bar against an arbitrary "5" would quietly lie about how
 * much precision the measurement actually has, which is the exact failure a
 * page called "who watches the watchers" should not commit.
 *
 * So the ceiling is drawn, labelled, and different per window. That honesty
 * IS the visual idea.
 * ------------------------------------------------------------------ */
export function NinesScale({
  value,
  ceiling,
  quality,
  size = "lg",
  label,
  caption,
}: {
  value: number | null;
  ceiling: number;
  quality: NinesQuality;
  size?: "lg" | "sm";
  label?: string;
  caption?: ReactNode;
}) {
  const ticks = Array.from({ length: Math.floor(ceiling) }, (_, i) => i + 1);
  const pct =
    value === null ? 100 : Math.max(0, Math.min(100, (value / ceiling) * 100));
  const big = size === "lg";

  return (
    <div className="w-full">
      {label && <div className="mb-1 text-[11px] text-ink-3">{label}</div>}
      <div className="flex items-baseline gap-2">
        <span
          className={`qc-num tabular-nums leading-none ${QUALITY_INK[quality]} ${
            big ? "text-6xl font-light tracking-tight" : "text-2xl font-normal"
          }`}
        >
          {value === null ? "clean" : formatNines(value)}
        </span>
        <span
          className={`font-medium text-ink-3 ${big ? "text-sm" : "text-[11px]"}`}
        >
          {value === null ? "no gaps" : "nines"}
        </span>
      </div>

      {/* The axis. Filled portion is the achieved figure; the remainder to the
          labelled ceiling is what this window is physically able to resolve. */}
      <div className={big ? "mt-3" : "mt-2"}>
        <div
          className="relative h-[6px] w-full overflow-hidden rounded-full bg-absent"
          role="img"
          aria-label={`${value === null ? "no gaps" : formatNines(value)} of a resolvable ${ceiling.toFixed(2)} nines`}
        >
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${
              quality === "poor"
                ? "bg-excursion"
                : quality === "perfect"
                  ? "bg-live"
                  : "bg-ink-2"
            }`}
            style={{ width: `${pct}%` }}
          />
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0 h-full w-px bg-paper/70"
              style={{ left: `${(t / ceiling) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-ink-3">
          <span className="qc-num">0</span>
          <span className="qc-num">{ceiling.toFixed(2)} resolvable</span>
        </div>
      </div>

      {caption && <div className="mt-2 text-xs text-ink-2">{caption}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Coverage strip: one cell per bucket, height proportional to absence.
 *
 * Three states, and the distinction between the last two is the whole point:
 *
 *   complete   — a floor tick at near-zero contrast. The calm case disappears,
 *                so scanning finds only what didn't.
 *   ordinary   — a real but unremarkable loss, drawn in neutral ink. ted1k
 *                drops a few samples most days; that is its resting state.
 *   excursion  — above this window's own baseline (see derive/tedcheck.ts).
 *                ONLY these get the chromatic token. On a healthy page the
 *                alarm colour therefore appears zero times, which is what
 *                keeps it meaning something when it does appear.
 *   partial    — outlined, never filled. UNKNOWN, not bad.
 * ------------------------------------------------------------------ */
export function CoverageStrip({
  buckets,
  height = 44,
  title,
  scale = true,
}: {
  buckets: {
    start: Date;
    missing: number;
    expected: number;
    partial: boolean;
    excursion: boolean;
  }[];
  height?: number;
  title?: string;
  /** Off only where the strip is a thumbnail inside a table row. */
  scale?: boolean;
}) {
  const worst = Math.max(1, ...buckets.map((b) => (b.partial ? 0 : b.missing)));

  return (
    <div className="w-full">
      {(title || scale) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {title ? (
            <span className="text-[11px] text-ink-3">{title}</span>
          ) : (
            <span />
          )}
          {/* THE VERTICAL SCALE. Bars are drawn relative to the window's own
              worst bucket, so without this label the height means nothing -
              a 2-second blip and a 39-minute outage would draw identically on
              two different pages. Naming the peak makes the axis real. */}
          {scale && (
            <span className="qc-num text-[10px] text-ink-3">
              peak {formatAbsenceShort(worst)}
            </span>
          )}
        </div>
      )}
      {/* Baseline the bars sit on, so "no bar" reads as a floor rather than as
          missing ink. */}
      <div
        className="flex w-full items-end gap-[2px] border-b border-rule"
        style={{ height }}
      >
        {buckets.map((b) => {
          const key = b.start.toISOString();
          const when = utcISO(b.start);
          if (b.partial) {
            return (
              <div
                key={key}
                title={`${when} — partial window, not comparable`}
                className="min-w-0 flex-1 rounded-[2px] border border-dashed border-partial"
                style={{ height: "100%" }}
              />
            );
          }
          if (b.missing === 0) {
            return (
              <div
                key={key}
                title={`${when} — complete`}
                className="min-w-0 flex-1 rounded-[2px] bg-absent/70"
                style={{ height: "14%" }}
              />
            );
          }
          const share = Math.max(0.18, Math.sqrt(b.missing / worst));
          return (
            <div
              key={key}
              title={`${when} — ${b.missing}s absent${b.excursion ? " (excursion)" : ""}`}
              className={`min-w-0 flex-1 rounded-[2px] ${
                b.excursion ? "bg-excursion" : "bg-ink-3/45"
              }`}
              style={{ height: `${share * 100}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Watts over the window. A measurement, drawn as a line — never as an alarm.
 *
 * Carries its own min/max labels rather than leaving them to the caller: a
 * sparkline is auto-scaled to its own extremes, so an unlabelled one shows
 * shape while silently hiding whether the swing is 40 W or 4000 W. Two pages
 * that forgot the labels is how that happened the first time.
 */
export function Sparkline({
  values,
  height = 34,
  unit = "W",
  label,
}: {
  values: (number | null)[];
  height?: number;
  unit?: string;
  label?: ReactNode;
}) {
  const points = values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v !== null);
  if (points.length < 2) return null;

  const min = Math.min(...points.map((p) => p.v));
  const max = Math.max(...points.map((p) => p.v));
  const span = max - min || 1;
  const w = 100;
  const d = points
    .map((p, k) => {
      const x = (p.i / Math.max(1, values.length - 1)) * w;
      const y = height - ((p.v - min) / span) * (height - 2) - 1;
      return `${k === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const fmt = (n: number) => `${Math.round(n).toLocaleString()} ${unit}`;

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[11px] text-ink-3">{label}</span>
          <span className="qc-num text-[10px] text-ink-3">{fmt(max)}</span>
        </div>
      )}
      <div style={{ height }} className="w-full">
        <svg
          viewBox={`0 0 ${w} ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label={`ranges from ${fmt(min)} to ${fmt(max)}`}
        >
          <path
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-3">
        <span className="qc-num">{fmt(min)}</span>
        {!label && <span className="qc-num">{fmt(max)}</span>}
      </div>
    </div>
  );
}

/* WHERE ALL-CAPS IS ALLOWED — the first draft had tracked capitals on the
   wordmark, the running head, every section label, every chart title and every
   column header, which is five different jobs wearing one uniform. The rule
   now: CAPS MARK THE STRUCTURE OF THE PAGE, NOTHING ELSE. That means exactly
   two places - a table's column headers, and a stratum's name in the margin.
   Section and chart labels are sentence case at small size, which is quieter
   and, at 10px, materially easier to read. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-[11px] text-ink-3">{children}</div>;
}

/** Reserved: structural labels only. See the note above. */
export function StructureLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
      {children}
    </span>
  );
}

/**
 * The wordmark. Serif, one place on the page, standing in for the drawn
 * monogram until it exists as an SVG.
 */
export function Masthead({ running }: { running?: ReactNode }) {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-2 px-5 py-4 sm:px-8">
        {/* EB Garamond at 600 — see theme.css for why this Garamond and not
            Cormorant. Modest tracking: a roman capital already carries its own
            sidebearings, and letterspacing a Garamond too far turns a wordmark
            into a caption. */}
        <div className="flex items-baseline gap-3">
          <span className="qc-mark text-[28px] leading-none font-semibold tracking-[0.045em] text-ink">
            QCIC
          </span>
          <span className="qc-mark text-[13.5px] italic text-ink-3">
            quis custodiet ipsos custodes
          </span>
        </div>
        {running && <div className="text-[11px] text-ink-2">{running}</div>}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * TILE — the one idea worth reviving from /design/html-react.
 *
 * That prototype's "metric card" had a real structure: a watermark label, a
 * hero value with its unit, secondary metrics, and the originating NATS
 * subject as a byline. The hierarchy was right. What is dropped here is
 * everything that was decoration — the hover lift, the scale transform, the
 * coloured glow, the 0.6s transition on every property — and the
 * container-query font-size gymnastics, which existed to make one fabricated
 * number enormous. Real QCIC values are comparative, so the hero is sized once
 * and the tiles line up with each other.
 *
 * A tile can be marked `fixture` — it then reads as a shape, not a reading.
 * ------------------------------------------------------------------ */
export function Tile({
  label,
  value,
  unit,
  secondary,
  byline,
  status,
  fixture,
  tone = "normal",
  href,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  secondary?: { label: string; value: ReactNode }[];
  byline?: string;
  status?: Liveness;
  fixture?: boolean;
  tone?: "normal" | "excursion" | "quiet";
  href?: ReactNode;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-rule bg-surface p-5">
      {/* Watermark: the subject's own name, set large and almost invisible.
          Sized at 36px rather than 60px because the original card's labels
          were short codes (HEART, CAST, TED) and these are real names —
          "scrobblecast" at display size clips mid-word, which reads as a bug
          rather than as a device. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-1.5 left-0 max-w-full truncate px-4 text-4xl font-bold text-ink opacity-[0.04] select-none"
      >
        {label}
      </span>

      <div className="relative flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium text-ink">
          {href ?? label}
        </span>
        {fixture ? (
          <span
            className="rounded-full border border-dashed border-partial px-1.5 py-0.5 text-[9px] tracking-wide text-partial"
            title="Shape only — a browser cannot observe this"
          >
            fixture
          </span>
        ) : status ? (
          <LivenessDot status={status} />
        ) : null}
      </div>

      <div className="relative mt-3 flex items-baseline gap-2">
        <span
          className={`qc-num text-3xl leading-none font-light tracking-tight ${
            tone === "excursion"
              ? "text-excursion"
              : tone === "quiet"
                ? "text-ink-3"
                : "text-ink"
          }`}
        >
          {value}
        </span>
        {unit && <span className="text-[11px] text-ink-3">{unit}</span>}
      </div>

      {secondary && secondary.length > 0 && (
        <dl className="relative mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {secondary.map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <dt className="text-[10px] text-ink-3">{s.label}</dt>
              <dd className="qc-num text-[12px] text-ink-2">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {byline && (
        <div className="relative mt-auto flex items-center gap-2 pt-4">
          <span className="h-px flex-1 bg-rule" />
          <span className="qc-digest text-[9px] lowercase text-ink-3">
            {byline}
          </span>
        </div>
      )}
    </div>
  );
}

/** Provenance, kept from /design/html-react — the subject IS the byline. */
export function Byline({ children }: { children: ReactNode }) {
  return (
    <div className="mt-auto flex items-center gap-3 pt-6">
      <div className="h-px flex-1 bg-rule" />
      <p className="qc-digest text-[10px] lowercase tracking-wide text-ink-3">
        {children}
      </p>
    </div>
  );
}

export type Liveness = "connected" | "connecting" | "reconnecting" | "closed";

/**
 * Liveness, carried by SHAPE first so it survives the monochrome theme and
 * colour-blindness: filled = live, ring = negotiating, hollow = down.
 */
export function LivenessDot({ status }: { status: Liveness }) {
  if (status === "connected") {
    return (
      <span className="relative inline-flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
      </span>
    );
  }
  if (status === "closed") {
    return (
      <span className="inline-block h-2 w-2 shrink-0 rounded-full border border-excursion" />
    );
  }
  return (
    <span className="inline-block h-2 w-2 shrink-0 rounded-full border-2 border-partial" />
  );
}

export function LivenessLabel({ status }: { status: Liveness }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-2">
      <LivenessDot status={status} />
      {status === "connected" ? "live" : status}
    </span>
  );
}
