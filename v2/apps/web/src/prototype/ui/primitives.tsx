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

/* ------------------------------------------------------------------ *
 * Power over the window, in kW. Columns, not a line, and deliberately built
 * from the same flex-of-divs as CoverageStrip so the two charts align
 * STRUCTURALLY rather than by eye — same count, same widths, same 2px gaps.
 * That alignment is the point: stacked under the missing chart you can read a
 * column vertically and get "that hour lost 34s AND drew 4.1 kW".
 *
 * WHY NOT A LINE. Every value here is a bucketed average — mean power over an
 * hour, or over a day. A line interpolates between bucket centres and so
 * implies the value glided smoothly from one to the next; it didn't, it was
 * constant across the bucket by construction. A column says "this value held
 * for this interval", which is what an average over a bucket actually means.
 *
 * WHY FILLED TO ZERO. Beyond the y-scale rule, the area under a power curve
 * *is* energy — so the filled area is literally the quantity the kWh/d figure
 * above it reports, rather than decoration.
 *
 * NO CONDITIONAL COLOUR. There is no such thing as a bad wattage; a 4 kW hour
 * is not a fault, it is a kettle. Power is a measurement and gets one flat
 * quiet ink. The only state a column inherits is PARTIAL — a bucket clipped by
 * the window, whose average is computed over fewer samples and is therefore
 * less trustworthy — drawn outlined, exactly as the missing chart draws it.
 * ------------------------------------------------------------------ */
export function PowerStrip({
  buckets,
  height = 44,
  label,
}: {
  buckets: { start: Date; watt: number | null; partial: boolean }[];
  height?: number;
  label?: ReactNode;
}) {
  const values = buckets
    .map((b) => b.watt)
    .filter((w): w is number => w !== null);
  if (values.length === 0) return null;

  const max = Math.max(...values);
  const top = max * 1.08 || 1;
  const kw = (watt: number) => `${(watt / 1000).toFixed(2)} kW`;

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[11px] text-ink-3">{label}</span>
        <span className="qc-num text-[10px] text-ink-3">peak {kw(max)}</span>
      </div>
      <div
        className="flex w-full items-end gap-[2px] border-b border-rule-strong"
        style={{ height }}
        role="img"
        aria-label={`power by bucket, from 0 to a peak of ${kw(max)}`}
      >
        {buckets.map((b) => {
          const key = b.start.toISOString();
          const when = utcISO(b.start);
          if (b.watt === null) {
            return <div key={key} className="min-w-0 flex-1" />;
          }
          const share = Math.max(0.02, b.watt / top);
          if (b.partial) {
            return (
              <div
                key={key}
                title={`${when} — ${kw(b.watt)}, averaged over a partial bucket`}
                className="min-w-0 flex-1 rounded-t-[2px] border border-b-0 border-dashed border-partial"
                style={{ height: `${share * 100}%` }}
              />
            );
          }
          return (
            <div
              key={key}
              title={`${when} — ${kw(b.watt)}`}
              className="min-w-0 flex-1 rounded-t-[2px] bg-current opacity-45"
              style={{ height: `${share * 100}%` }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-3">
        <span className="qc-num">0 kW</span>
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
