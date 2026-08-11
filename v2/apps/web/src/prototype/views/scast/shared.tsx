// PROTOTYPE — throwaway. See ../../README.md.
//
// The scast marks, shared by all three variants.

import { useState } from "react";
import {
  formatDuration,
  formatSeconds,
  CRITICAL_GENERATIONS,
  type GenerationRow,
  type ScastState,
} from "../../derive/scast";
import { LivenessDot, type Liveness } from "../../ui/primitives";
import { localHM, tzLabel, utcISO } from "../../derive/time";

/** Generations are ten minutes apart - an hour/minute label, so localised. */
export function genLabel(d: Date): string {
  return localHM(d);
}

export function shortDigest(d: string): string {
  return d.slice(0, 7);
}

/**
 * The digest at two lengths, picked by CSS rather than by measuring the
 * viewport in JS - no resize listener, and nothing that can differ between the
 * server's first paint and the client's.
 *
 * Four hex characters is 65536 buckets, which is ample for the only question
 * asked of these strings on a phone: do the copies match. The full digest is
 * still on the cell's title, and the seven-character form returns at `sm`.
 */
function Digest({ value }: { value: string }) {
  return (
    <>
      <span className="sm:hidden">{value.slice(0, 4)}</span>
      <span className="hidden sm:inline">{value.slice(0, 7)}</span>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Convergence strip — one tick per generation.
 *
 * BOOLEAN, NOT A MAGNITUDE. Agreement is nominal: a generation agrees or it
 * does not. The earlier version drew four heights - agreed 14%, split 48%,
 * critical 100%, pending 100% - which asserts that a split is 3.4x an
 * agreement and critical is 2x a split. Those ratios mean nothing, and `ways`
 * cannot rescue them, since two copies agreeing are not more right than the
 * third. So there are two heights and the rest is tone.
 *
 * IT HANGS DOWN FROM THE BASELINE. Agreement is the unbroken rule along the
 * top; a split is a notch falling out of it. That matches the domain - a split
 * is a fall FROM consensus, not a spike of something - and it is how the strip
 * DEGRADES that settles it. Convergence is scrobblecast's job to make prompt,
 * and when it does, every one of these disappears: this strip then becomes a
 * single clean hairline, which is the correct picture of a healthy system. A
 * bottom-baseline version would degrade to an empty box instead.
 *
 * This deliberately no longer rhymes with the tedcheck coverage strip. That
 * was a mistake worth naming: tedcheck's missing-time IS a magnitude, in
 * seconds, so height-as-magnitude is right there and wrong here. The shared
 * grammar was importing a quantitative encoding into a nominal domain.
 *
 * NOW IS ON THE LEFT, and time reads backwards to the right. Two reasons, and
 * neither is convention - charts usually run the other way.
 *
 *   The table is newest-first, so a page with now on the strip's right had
 *   time running in two directions at once. One of them had to move.
 *   In Strata the strip sits immediately right of the headline, so now on the
 *   left puts the live edge against the live statement - "split", and the
 *   run that says so, adjacent rather than a strip's width apart.
 *
 * The direction is stated by labels at the two ends rather than an axis or an
 * arrow glyph: labels do not need an axis, and an arrow would be one more
 * character to go missing from a font.
 *
 *   agreed     nothing. The calm case has no ink of its own - it IS the
 *              baseline - so the resting state costs zero marks rather than
 *              the ~110 stubs it used to draw.
 *   pending    the baseline itself, dashed. The copies report minutes apart,
 *              so the newest generation is nearly always incomplete; drawing
 *              it full height would put a permanent event at the live edge.
 *              It is not an event, it is not counted yet.
 *   split      full notch, neutral ink - the reconciliation working as
 *              designed.
 *   alarm      the one chromatic token, and only for a critical run that is
 *              STILL OPEN. A healed divergence is history, not a fault.
 * ------------------------------------------------------------------ */
export function ConvergenceStrip({
  generations,
  height = 44,
  title,
  chrome = true,
}: {
  generations: GenerationRow[];
  height?: number;
  title?: string;
  /** Off when the strip is a thumbnail inside a table row - the label row
      would otherwise add its own height and break the cell's rhythm. */
  chrome?: boolean;
}) {
  // Newest first, to match the table. Copied, never reversed in place - this
  // array is the derived state and other readings depend on its order.
  const ticks = [...generations].reverse();

  const oldest = generations[0]?.generation;
  const newest = generations[generations.length - 1]?.generation;
  const spanHours =
    oldest && newest
      ? Math.round((newest.getTime() - oldest.getTime()) / 3_600_000)
      : null;

  return (
    <div className="w-full">
      {chrome && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[11px] text-ink-3">{title}</span>
          <span className="qc-num text-[10px] text-ink-3">
            {generations.length} generations
          </span>
        </div>
      )}
      {/* NO GAP between ticks, and the baseline is rule-strong.
          The window is 24h - scast-bridge replays 24h, whatever the client's
          buffer holds - so it carries ~144 generations, and in 450px each tick
          is about 3px. With the old 2px gap the marks were 1.14px and the GAPS were
          wider than them, which broke the one thing the strip is for: a run of
          seven consecutive splits read as seven separate hairlines instead of
          a bar seven wide. Butted together, adjacent splits merge and duration
          reads without counting - which is the point, since counting ticks is
          exactly what nobody should have to do. Agreed generations draw
          nothing, so removing the gap costs the calm case nothing at all.
          The baseline carries the resting state now, so it has to be visible:
          `rule` was too faint to read as a line. */}
      <div
        className="flex w-full items-start border-t border-rule-strong"
        style={{ height }}
      >
        {ticks.map((g) => {
          const key = g.generation.toISOString();
          if (g.state === "agreed") {
            return (
              <div
                key={key}
                title={`${utcISO(g.generation)} — all ${g.reports.length} copies agree`}
                className="min-w-0 flex-1"
              />
            );
          }
          if (g.state === "pending") {
            // A zero-height element carrying only a top border: it replaces
            // the baseline under this generation rather than standing off it.
            return (
              <div
                key={key}
                title={`${utcISO(g.generation)} — ${g.reports.length}/${g.reports.length + g.missing.length} copies in; waiting on ${g.missing.join(", ")}`}
                className="h-0 min-w-0 flex-1 border-t border-dashed border-partial"
              />
            );
          }
          return (
            <div
              key={key}
              title={`${utcISO(g.generation)} — ${g.ways} distinct digests${g.critical ? ", split over an hour" : ""}`}
              className={`min-w-0 flex-1 ${g.alarm ? "bg-alarm" : "bg-ink-3/70"}`}
              style={{ height: "100%" }}
            />
          );
        })}
      </div>
      {chrome && (
        <div className="mt-1 flex items-baseline justify-between gap-3 text-[10px] text-ink-3">
          <span>now</span>
          {spanHours !== null && (
            <span className="qc-num">{spanHours}h ago</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * GENERATION TABLE — three visual layers, one job each, no overlap.
 *
 *   COLLAPSE    agreed vs split. Three identical digests are replaced by ONE,
 *               in a merged cell spanning the host columns. Centring alone is
 *               not enough - the centre of three equal columns IS the middle
 *               one, so a bare centred digest reads as that copy's value. The
 *               span is therefore stated by a dimension line whose width is
 *               chosen to cross the column boundaries: wider than any single
 *               column, narrower than the table. See the note at the cell.
 *
 *               The fallback, if this fails on the page, is to give up the
 *               collapse and carry agreement by ink alone - an agreed row
 *               dimmed, a split row not - which is where this started.
 *
 *   MARKER       which digests are identical, for aiming a manual resync.
 *                Only groups with more than one member get one, so a
 *                three-way split shows NO markers - the correct answer, since
 *                nothing matches. Shape, not colour or weight: shape is a
 *                nominal channel, so no group can look weightier than another
 *                and the majority reading cannot creep back in through the
 *                visual system. Also survives the monochrome theme.
 *
 *   ROW BAND     this split has run past CRITICAL_GENERATIONS. Consecutive rows
 *                form a contiguous block, so the DURATION of a divergence
 *                reads as a bar without counting - which is the thing this
 *                page is watched for.
 *
 * What is gone: consensus, majority, dissenter, ditto marks pointing at a
 * privileged value. Two copies agreeing are not more right than the third.
 * ------------------------------------------------------------------ */

/** Nominal, ordered by first appearance. Shapes, never letters - a-f are hex
    digits and would be read as part of the digest. */
const MATCH_MARKS = ["\u25CF", "\u25C6", "\u25A0", "\u25B2"];

/**
 * One arrow, pointing left; the right-hand one is the same element flipped
 * with scaleX(-1). Head and shaft live in one coordinate system.
 *
 * The geometry is lucide's `move-horizontal`, which is precisely this mark:
 *
 *   viewBox 0 0 24 24, fill none, stroke-width 2, linecap+linejoin round
 *   m6 8-4 4 4 4    head, a chevron
 *   M2 12h20        shaft, running tip to tip
 *
 * Three properties of that are what make an arrow look drawn rather than
 * assembled, and an earlier version here had none of them:
 *
 *   STROKED HEAD, SAME WEIGHT AS THE SHAFT. A filled triangle on a hairline is
 *   two different pen weights in one mark, so the head reads as a blob with a
 *   wire attached. lucide's head is fill:none and inherits the shaft's stroke.
 *   ROUND JOIN AND CAP. The chevron vertex and the shaft ends are rounded.
 *   TIP TO TIP. The shaft starts AT the vertex (x=2 in both paths), it is not
 *   butted against the head, and there is no opacity fade along it.
 *
 * Proportions are lucide's: arms at 45 degrees, shaft collinear with the
 * vertex. Only the scale differs - 12px tall against 12px digits - and the
 * shaft is fluid. There is no viewBox, so user units are CSS pixels and the
 * shaft can run to `100%` of whatever width flex hands the element; path data
 * cannot take a percentage, which is why the shaft is a <line>. The vertex
 * sits at half a stroke from the edge so the round cap's outer extremity falls
 * exactly on x=0 - the tip is the element's edge, which is what the 2/3
 * alignment below is measured against.
 *
 * WEIGHT AND TONE, because the balance was inverted. The digest is the datum;
 * the arrow only says the datum is shared. But a 1.5px stroke run across two
 * ~180px spans lays down far more ink than the seven glyphs it annotates, so
 * on 106 of 147 rows the annotation shouted over the value - and those are the
 * CALM rows, the ones that are supposed to recede.
 *
 * The fix is tonal, not geometric. `rule-strong`, not `ink-3`: this mark is
 * structural furniture like the row dividers, not text, and the token is
 * lighter than ink-3 in the light themes and darker in the dark ones, so it
 * recedes in both without a per-theme rule. Weight drops to 1.25 to sit in the
 * same register as the rules themselves.
 *
 * The head then has to work harder, since a rule-coloured hairline is exactly
 * what could be mistaken for a stray row divider - so the arms go to 4.5,
 * still at 45 degrees. Bigger head, quieter line: the mark stays unmistakably
 * an arrow while spending less ink than the digest it points at.
 */
function SpanArrow({ flip = false }: { flip?: boolean }) {
  return (
    <span className={`min-w-0 flex-1 ${flip ? "-scale-x-100" : ""}`}>
      <svg
        className="block h-3 w-full text-rule-strong"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M5.125 1.5 L0.625 6 L5.125 10.5" />
        <line x1="0.625" y1="6" x2="100%" y2="6" />
      </svg>
    </span>
  );
}

/** Nothing has ever gone wrong in this window - show a little of the record. */
const RESTING_ROWS = 8;

/**
 * The default view: the latest divergence, with one agreed generation of
 * context on each side.
 *
 * WHY NOT "NOTABLE ONLY", WHICH THIS REPLACES. That filter kept every
 * non-agreed generation and silently dropped the rest, so 48 split generations
 * belonging to 17 SEPARATE runs arrived as one flat list and two adjacent rows
 * could be hours apart. It destroyed the only thing the table is watched for -
 * how long a split lasted - and it made the critical row band lie, since that
 * band was designed so consecutive rows form a block and consecutive-in-view
 * was no longer consecutive-in-time.
 *
 * A CONTIGUOUS SLICE CANNOT LIE THAT WAY. Everything between the two ends is
 * present, so run length is exactly what it looks like.
 *
 * "Since the last agreement" was the other candidate and is the same thing when
 * the copies are split right now. It was rejected for what it does the rest of
 * the time: the newest generation is agreed roughly three quarters of the time,
 * so that filter would show an empty table on most visits. Anchoring on the
 * divergence instead means the view always holds the most recent thing that
 * actually happened, whether it is still happening or not.
 *
 * The context rows are the point of the "+1 each side": the agreed row after a
 * run is what the copies converged ON, and the one before is what they left.
 * Neither is visible in a list of splits.
 */
function latestDivergenceRows(state: ScastState): GenerationRow[] {
  const asc = state.generations;
  const d = state.lastDivergence;
  if (!d) return asc.slice(-RESTING_ROWS);

  const at = (t: Date) =>
    asc.findIndex((g) => g.generation.getTime() === t.getTime());
  const start = Math.max(0, at(d.from) - 1);
  // Still open: run to the live edge, so the pending generations show as the
  // context they are. Closed: one agreed generation past the end.
  const end = d.ongoing ? asc.length : Math.min(asc.length, at(d.to) + 2);
  return asc.slice(start, end);
}

export function GenerationTable({ state }: { state: ScastState }) {
  const [showAll, setShowAll] = useState(false);

  const ordered = [...state.generations].reverse();
  const latest = [...latestDivergenceRows(state)].reverse();
  const rows = showAll ? ordered : latest;
  const d = state.lastDivergence;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        {/* The caption states which slice is on screen and how long the run
            was. It does not restate whether that is good - the verdict above
            the strip already says that, and saying it twice is how a page
            starts explaining itself. */}
        <p className="text-xs text-ink-2">
          {showAll
            ? `Full record — ${ordered.length} generations`
            : !d
              ? `No divergence in the window — the most recent ${Math.min(RESTING_ROWS, ordered.length)}`
              : d.ongoing
                ? `Split for ${d.generations} generation${d.generations === 1 ? "" : "s"}, still open`
                : `Latest divergence — ${d.generations} generation${d.generations === 1 ? "" : "s"}, healed`}
        </p>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="rounded-full border border-rule px-2.5 py-0.5 text-[11px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {showAll ? "Latest divergence" : `Full record (${ordered.length})`}
        </button>
      </div>

      {/* The timezone is a constant for the whole table, so it is stated once
          here rather than living in the generation header - where it was the
          widest thing on the narrowest screen, costing 36px of a column whose
          data needs 38. */}
      <p className="mb-3 text-[11px] text-ink-3">
        <span className="text-ink-2">●</span> same digest as another copy ·
        times in {tzLabel()}
      </p>

      <div className="overflow-x-auto">
        {/* The 34rem floor is a desktop figure. On a phone the table sits in a
            283px column, and what was setting the width there was never the
            data - it was the headers: `SCAST-HILBERT` wants 95px where a
            digest wants 64. Below `sm` the labels give way instead, and the
            hyphenated hostnames wrap at their own hyphens. */}
        <table className="w-full min-w-[17rem] table-fixed border-collapse text-sm sm:min-w-[34rem]">
          <thead>
            <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
              {/* table-fixed with EQUAL host columns is now LOAD-BEARING, not a
                  nicety. The agreed row's 2/3 span is exact only because the
                  outer digests sit at 1/6 and 5/6 of the merged cell, and that
                  is true only when the columns are equal. Content-sized columns
                  would shift those centres and the arrow tips would quietly
                  stop landing on the digests. */}
              <th className="w-[26%] py-1.5 pr-2 text-left font-semibold sm:pr-3">
                <span className="sm:hidden">gen</span>
                <span className="hidden sm:inline">generation</span>
              </th>
              {state.hosts.map((h) => (
                <th
                  key={h}
                  className="py-1.5 px-2 text-center font-semibold sm:px-3"
                  style={{ width: `${74 / state.hosts.length}%` }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => {
              const agreed = g.state === "agreed";
              return (
                <tr
                  key={g.generation.toISOString()}
                  className={`border-b border-rule/60 last:border-0 ${
                    g.alarm ? "bg-alarm/10" : "hover:bg-surface-2/60"
                  }`}
                >
                  <td
                    className="qc-num py-1.5 pr-2 text-ink-2 sm:pr-3"
                    title={utcISO(g.generation)}
                  >
                    {genLabel(g.generation)}
                    {g.state === "pending" && (
                      <span
                        className="ml-2 rounded-sm border border-dashed border-partial px-1 text-[9px] uppercase tracking-wider text-partial"
                        title="Not every copy has reported yet"
                      >
                        pending
                      </span>
                    )}
                  </td>

                  {agreed ? (
                    /* THE WIDTH IS 2/3, AND THAT NUMBER IS EXACT. The host
                       columns are centred, so with n equal columns the two
                       OUTER digests sit at 1/(2n) and 1-1/(2n) of the merged
                       cell - 1/6 and 5/6 for three. A mark spanning exactly
                       the middle 2/3 therefore lands its arrow TIPS on those
                       two digest positions: it reaches from where one copy's
                       value would be printed to where the other's would. Both
                       are fractions of the same cell, so it holds at any table
                       width. No cell padding here - px-3 would shrink the
                       content box and the 2/3 would stop being 2/3.

                       Centring the COLUMNS is what makes a centred collapse
                       legible. While they were left-aligned the digests sat at
                       471/684/898 against a cell centred at 779, so no centred
                       mark could point at anything, and the arrows were never
                       going to rescue it. */
                    <td
                      colSpan={state.hosts.length}
                      className="py-1.5 text-center"
                      title={`all ${g.reports.length} copies hold ${g.reports[0]?.digest}`}
                    >
                      <span className="mx-auto flex w-2/3 items-center gap-3">
                        <SpanArrow />
                        <span className="qc-digest shrink-0 text-[12px] text-ink-2">
                          <Digest value={g.reports[0]?.digest ?? ""} />
                        </span>
                        <SpanArrow flip />
                      </span>
                    </td>
                  ) : (
                    state.hosts.map((h) => {
                      const report = g.reports.find((r) => r.host === h);
                      if (!report) {
                        return (
                          <td
                            key={h}
                            className="py-1.5 px-2 text-center text-ink-3/50 sm:px-3"
                            title="no report for this generation"
                          >
                            —
                          </td>
                        );
                      }
                      const mark = g.matchGroup[h];
                      return (
                        <td
                          key={h}
                          className={`qc-digest py-1.5 px-2 text-center text-[12px] sm:px-3 ${
                            g.alarm ? "text-alarm" : "text-ink-2"
                          }`}
                          title={`${report.digest} · reported ${formatDuration(report.lagMs)} after the cycle`}
                        >
                          {/* The digest is centred in its column; the marker
                              hangs OUT of the flow beside it. In flow it added
                              ~14px to the right of every digest, so the whole
                              grid of digests sat 7px left of the column grid -
                              and the agreed row's arrow tips then could not
                              land on both neighbours symmetrically. */}
                          <span className="relative inline-block">
                            <Digest value={report.digest} />
                            <span className="absolute top-0 left-full ml-1.5 w-2 text-[9px] text-ink-3/70">
                              {mark === undefined
                                ? ""
                                : MATCH_MARKS[mark % MATCH_MARKS.length]}
                            </span>
                          </span>
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * The record, behind a disclosure. Closed until the reader opens it.
 *
 * IT USED TO OPEN ITSELF for a run past CRITICAL_GENERATIONS that was still
 * open - see f9a1f93, which carries the working implementation and the two
 * silent failures it took to get there. Removed, on the strength of the case
 * against it rather than the case for:
 *
 *   Nothing here is persisted, so it re-opened on EVERY reload, including
 *   after the reader had deliberately closed it. Watching a stuck run means
 *   reloading, so the annoyance landed exactly when the feature was supposed
 *   to be helping.
 *   It made `closed` ambiguous. A disclosure is the reader's control, and once
 *   the page also writes it, a closed panel no longer means "I closed it".
 *   It coupled a threshold to layout: CRITICAL_GENERATIONS is a deliberately
 *   fixed number that may yet be retuned, and it had quietly acquired a second
 *   job moving the page around.
 *   Its failure mode was silence. Two implementations did nothing at all and
 *   looked entirely correct; only asserting on `details.open` caught them. You
 *   cannot tell "not firing because nothing is wrong" from "not firing because
 *   it is broken", which is a poor property for something meant to raise an
 *   alarm.
 *
 * What it was for is already carried by the page without any of that: the
 * headline says split, the strip shows the run in the alarm colour at the live
 * edge, and the caption inside states its length. The panel was saving a click
 * on evidence the page had already made unmissable.
 */
export function GenerationRecord({
  state,
  className = "",
}: {
  state: ScastState;
  className?: string;
}) {
  return (
    <details
      className={`group rounded-lg border border-rule bg-surface/50 open:bg-surface ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-3 py-2 text-sm text-ink-2 hover:text-ink">
        <span className="text-ink">Generation Digests by Host</span>
        <span className="text-[11px] text-ink-3">
          <span className="group-open:hidden">show ▾</span>
          <span className="hidden group-open:inline">hide ▴</span>
        </span>
      </summary>
      <div className="border-t border-rule px-3 py-3">
        <GenerationTable state={state} />
      </div>
    </details>
  );
}

/** Per-copy behaviour: how late, how long, how reliable. */
export function CopyRows({
  state,
  status,
}: {
  state: ScastState;
  status: Liveness;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule-strong text-[10px] uppercase tracking-[0.12em] text-ink-3">
            <th className="py-1.5 pr-3 text-left font-semibold">copy</th>
            <th className="py-1.5 px-3 text-right font-semibold">reports</th>
            <th className="py-1.5 px-3 text-right font-semibold">
              reporting lag
            </th>
            <th className="py-1.5 px-3 text-right font-semibold">scrape</th>
            <th className="py-1.5 px-3 text-right font-semibold">missed</th>
          </tr>
        </thead>
        <tbody>
          {state.perHost.map((h) => (
            <tr
              key={h.host}
              className="border-b border-rule/60 last:border-0 hover:bg-surface-2/60"
            >
              <td className="py-2 pr-3">
                <span className="flex items-center gap-2">
                  <LivenessDot status={status} />
                  <span className="qc-digest text-[13px] text-ink">
                    {h.host}
                  </span>
                </span>
              </td>
              <td className="qc-num py-2 px-3 text-right text-ink-2">
                {h.reports}
              </td>
              <td className="qc-num py-2 px-3 text-right text-ink">
                {h.medianLagMs === null ? "—" : formatDuration(h.medianLagMs)}
              </td>
              <td className="qc-num py-2 px-3 text-right text-ink-2">
                {h.medianElapsed === null
                  ? "—"
                  : formatSeconds(h.medianElapsed)}
              </td>
              <td
                className={`qc-num py-2 px-3 text-right ${h.missed > 0 ? "text-ink-2" : "text-ink-3/50"}`}
              >
                {h.missed || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 max-w-prose text-[11px] text-ink-3">
        Lag is publish time minus the generation; scrape is how long the run
        took.
      </p>
    </div>
  );
}

/** The verdict sentence, shared so all three variants say the same thing. */
export function ConvergenceVerdict({ state }: { state: ScastState }) {
  const last = state.lastDivergence;
  if (!state.latestSettled) {
    return <>Waiting for a complete generation.</>;
  }
  if (!state.agreed) {
    const generations = last?.generations ?? 1;
    return (
      <>
        The copies are{" "}
        <span className="font-medium text-alarm">out of step</span> and have
        been for <span className="qc-num">{generations}</span>{" "}
        {generations === 1 ? "generation" : "generations"}
        {generations > CRITICAL_GENERATIONS ? (
          <> — longer than they normally take to reconcile.</>
        ) : (
          <> — the reconciliation is expected to close it.</>
        )}
      </>
    );
  }
  if (!last) {
    return (
      <>All {state.hosts.length} copies agree, and have for the whole window.</>
    );
  }
  return (
    <>
      All {state.hosts.length} copies agree. Last divergence{" "}
      <span className="qc-num text-ink">{genLabel(last.to)}</span>, lasting{" "}
      <span className="qc-num text-ink">{last.generations}</span>{" "}
      {last.generations === 1 ? "generation" : "generations"}
      {last.critical ? " — longer than usual." : " and it healed itself."}
    </>
  );
}
