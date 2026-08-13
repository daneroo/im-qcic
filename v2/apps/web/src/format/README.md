# format

Presentation rules shared by both subjects — the only module that is neither
`ted1k` nor `scast`, because a duration reads the same whichever one produced
it. Ported from `prototype/frontend-design`, where these rules were stated in
comments and verified nowhere. See
[issue #264](https://github.com/daneroo/im-qcic/issues/264) and
[the fold-back spec](../../../../../docs/specs/frontend-design-fold-back.md).

Pure and framework-free: strings in, strings out, no React, no NATS. The
vocabulary is [`v2/CONTEXT.md`](../../../../CONTEXT.md)'s — **missing**,
**coverage**, **reporting lag**, **scrape elapsed**.

## Module shape

- **`duration.ts`** — one canonical rule for multi-unit durations (largest unit
  that fits, later segments zero-padded, trailing zero segments dropped,
  interior ones kept: `1m02s`, `13h59m`, `2h00m03s`), plus the entry points over
  it. `formatMissing(seconds)` is the domain reading and prints `none` for an
  unbroken window; `formatDuration(ms)` is the millisecond adapter for reporting
  lag and prints `0s`, since a copy that reported inside half a second did
  report. Two deliberate outliers keep their own rules: `formatSeconds` holds
  one decimal below ten seconds, where a scrape elapsed of 9.4s and one of 9.8s
  are different readings; `since(from, to)` is single-unit and rounds — it
  answers "is this reading current?", not "how does this compare to that one" —
  and measures against the view's own stamp, so a page rendered from a fixture
  ages against the fixture.
- **`coverage.ts`** — `formatCoverage(missing, expected)`, missing time
  normalised against its window. Precision comes from the leading nine count
  (`decimals = max(0, nines - 2)`), which is all that survives of the old
  `nines` reading — the duration is the number now. **Truncates, never rounds**,
  and `100%` is reserved for nothing missing at all, so a month holding an
  outage can never print as perfect.

## What is not here

`kwhPerDay` and the localised time labels (`localHM`, `utcDate`, `utcISO`,
`tzLabel`) are still on the prototype branch, and land with the pages that use
them — consumption is ted1k's, and the timezone rule is worth its own argument.
