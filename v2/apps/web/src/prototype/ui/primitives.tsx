// PROTOTYPE — throwaway. See ../README.md.
//
// The shared marks. Every variant draws from these so the comparison is about
// structure, not about one of them having nicer widgets.

import type { ReactNode } from "react";
import { formatMissing } from "../derive/missing";
import { utcISO } from "../derive/time";

/** Compact enough to sit as an axis label without wrapping. */
function formatMissingShort(seconds: number): string {
  return formatMissing(seconds);
}

/* ------------------------------------------------------------------ *
 * A headline reading: one figure, its unit, and what it means.
 *
 * The nines figure used to be drawn on a log axis against its resolvable
 * ceiling. That is gone deliberately. Nines is a readable shorthand for "how
 * many samples went missing over a day or a month" — not a measurement in its
 * own right — and giving a shorthand an axis, tick marks and a "4.94
 * resolvable" label dressed it up as something more precise than it claims to
 * be. One decimal, no range.
 *
 * This is not in tension with the rule that plots must define their y-scale.
 * A plot makes a visual claim about magnitude and has to say what it is
 * measured against; a label does not.
 * ------------------------------------------------------------------ */
export function Figure({
  value,
  unit,
  label,
  size = "lg",
  tone = "normal",
  caption,
}: {
  value: ReactNode;
  unit?: string;
  label?: string;
  size?: "lg" | "sm";
  tone?: "normal" | "alarm" | "live" | "quiet";
  caption?: ReactNode;
}) {
  const big = size === "lg";
  const ink =
    tone === "alarm"
      ? "text-alarm"
      : tone === "live"
        ? "text-live"
        : tone === "quiet"
          ? "text-ink-3"
          : "text-ink";

  return (
    <div className="w-full">
      {label && <div className="mb-1 text-[11px] text-ink-3">{label}</div>}
      <div className="flex items-baseline gap-2">
        <span
          className={`qc-num leading-none ${ink} ${
            big ? "text-5xl font-light tracking-tight" : "text-2xl font-normal"
          }`}
        >
          {value}
        </span>
        {unit && (
          <span
            className={`font-medium text-ink-3 ${big ? "text-sm" : "text-[11px]"}`}
          >
            {unit}
          </span>
        )}
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
 *   significant — above this window's own baseline (see derive/tedcheck.ts).
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
    significant: boolean;
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
              peak {formatMissingShort(worst)}
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
              title={`${when} — ${b.missing}s missing${b.significant ? " (significant)" : ""}`}
              className={`min-w-0 flex-1 rounded-[2px] ${
                b.significant ? "bg-alarm" : "bg-ink-3/45"
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
 * Power over the window, in kW. A measurement, drawn as a line — never as an
 * alarm.
 *
 * ZERO IS ALWAYS ON THE AXIS. The y-range runs 0 → max and is never trimmed to
 * the data's own extremes. An auto-scaled sparkline exaggerates every wobble:
 * a house drifting between 1.8 and 2.1 kW looks identical to one swinging from
 * 0 to 4 kW, because both fill the same box. Baselining at zero makes the
 * *proportion* of the swing legible, which is the thing worth seeing. The only
 * reason to trim would be a signal whose interesting variation is genuinely
 * tiny next to its offset, and power is not that.
 *
 * kW rather than W: a four-digit number changes width as it moves and reads as
 * precision the average does not have.
 */
export function Sparkline({
  values,
  height = 40,
  label,
}: {
  /** Watts. Converted to kW for display. */
  values: (number | null)[];
  height?: number;
  label?: ReactNode;
}) {
  const points = values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v !== null);
  if (points.length < 2) return null;

  const max = Math.max(...points.map((p) => p.v));
  // Head-room so the peak does not sit on the top edge; still zero-based.
  const top = max * 1.08 || 1;
  const w = 100;
  const y = (watt: number) => height - (watt / top) * (height - 1) - 0.5;

  const line = points
    .map((p, k) => {
      const x = (p.i / Math.max(1, values.length - 1)) * w;
      return `${k === 0 ? "M" : "L"}${x.toFixed(2)},${y(p.v).toFixed(2)}`;
    })
    .join(" ");

  const kw = (watt: number) => `${(watt / 1000).toFixed(2)} kW`;

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[11px] text-ink-3">{label}</span>
          <span className="qc-num text-[10px] text-ink-3">peak {kw(max)}</span>
        </div>
      )}
      <div style={{ height }} className="w-full">
        <svg
          viewBox={`0 0 ${w} ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label={`power from 0 to a peak of ${kw(max)}`}
        >
          <path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      {/* The zero line, drawn and labelled, because it is the whole point. */}
      <div className="h-px w-full bg-rule-strong" />
      <div className="mt-1 flex justify-between text-[10px] text-ink-3">
        <span className="qc-num">0 kW</span>
        {!label && <span className="qc-num">peak {kw(max)}</span>}
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
  tone?: "normal" | "alarm" | "quiet";
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
            tone === "alarm"
              ? "text-alarm"
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
      <span className="inline-block h-2 w-2 shrink-0 rounded-full border border-alarm" />
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
