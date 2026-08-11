# PROTOTYPE — throwaway

**This whole directory is disposable design-exploration code.** It lives on the
`prototype/frontend-design` branch and is not intended to be merged as-is.
Nothing outside `src/prototype/` is modified except:

- `src/routes/__root.tsx` — font links + the prototype stylesheet
- `src/routes/{index,scast,tedcheck}.tsx` — `validateSearch` for `?variant=` and
  a switch to the variant renderers
- new `src/routes/prototype.{network,mark}.tsx`

The question it answers: **what should QCIC's visual language be**, given that
the app today is two large monitoring tables but the broader information space
(hosts, tailnet, NATS, services) is much wider.

## Scope guard — this is service quality, not consumption

QCIC watches whether the watchers are working. It is **not** an energy
dashboard: Grafana already does that job well, with a live power gauge, the full
1 Hz sample series and a data explorer, and there is no reason to rebuild any of
it here.

The distinction is easy to lose because the two share a data source, and this
prototype has already drifted once — consumption briefly appeared as a co-equal
hero next to the continuity figure. It is now a secondary reading, which is what
it is: useful context for judging whether a gap mattered, not the point of the
page. **If a change would make this more useful for looking at power and no more
useful for judging whether ted1k is healthy, it belongs in Grafana.**

## How to run

```sh
docker compose -f v2/infra/compose.yaml up -d      # nats + ted1k-derive + scast-bridge
cd v2/apps/web
VITE_NATS_WS_URL=ws://$(ipconfig getifaddr en0):9222 bun --bun vite dev --port 3000 --host 0.0.0.0
```

Every variant reads the same real data through the existing `useDerivedState` /
`useScastFeed` hooks, unchanged.

**Bind to the LAN address, not localhost.** Review happens on a phone and an
iPad, and the default `ws://localhost:9222` resolves to _the phone_ — so pages
render and then sit at "connecting" forever with nothing on screen explaining
why. Vite needs `--host 0.0.0.0` **and** the NATS URL needs the LAN IP.
`bun run dev` alone is fine only for desktop-only work.

Quality gate: `cd v2 && bun run ci`.

## Axes

Two independent search params, so a variant is never just a palette:

- `?variant=strata|circuit|sheet` — **structure**. Three different answers to
  how hierarchy and summary are expressed.
- `?theme=sketch|chromatic|catppuccin` — **palette**. Orthogonal. Each family
  has a light and a dark member; the app's existing light/dark toggle picks
  which one, so the pre-existing no-flash theme machinery is untouched.

A dev-only switcher (bottom bar) drives both. It renders only when
`import.meta.env.DEV`.

## Surfaces

| route                | what it is                                                             |
| -------------------- | ---------------------------------------------------------------------- |
| `/`                  | **QCIC** — the project overview. Every subject at one reading each.    |
| `/tedcheck`          | ted1k continuity. Live.                                                |
| `/scast`             | scrobblecast agreement. Live.                                          |
| `/prototype/network` | Hosts and network — identity, tailnet, bus, endpoints. Fixture-backed. |
| `/prototype/mark`    | Wordmark comparison bench.                                             |

`qcic` is the whole project's name, so it names the home page, not the
networking slice — that one is `network`.

## Vocabulary

A working glossary, not a finished one — correct it as the design gets refined.
Several of these started as design words and turned out to be domain words:
**significant gap** and **unverifiable** changed what the pages compute, not
just how they look. That is the test for whether a term belongs here.

### Measuring continuity

**Missing** — samples that never arrived, named after the column it comes from.
Reported as a Go-style duration, because ted1k samples once a second so the
count _is_ a duration. Formatting rules, in order: prefer the largest unit that
fits (`1m`, never `60s`); leading segment unpadded, later ones padded to two
digits so the string keeps a constant shape (`1m02s`, `2h`); drop trailing zero
segments (`13h59m`); keep interior ones, since skipping one makes the units
ambiguous (`2h00m03s`, never `2h3s`). The page says `49s missing` and nothing
more.

**Coverage** — the same fact normalised, so windows of different lengths can be
compared: `49s missing · 99.9% ok` for a day against `1h04m missing · 99% ok`
for a month. Precision is set by how many nines the figure has —
`decimals = max(0, leadingNines − 2)` — which is the one genuinely useful idea
inside "nines", kept as a formatting rule instead of a number on screen. It
**truncates, never rounds**: a month at 99.8611% must not print `100%`. `100%`
is reserved for nothing missing at all.

**Nines (retired)** — `−log10(1 − availability)`. Dropped: given the window it
is a bijection with `missing`, so it derived nothing and only rescaled. It
exists in the industry because percentages crowd at the top and a log buys the
resolution back; a duration never had that problem, because as things improve
the number moves toward zero where there is room. `49s / 78s / 112s` reads at a
glance where `99.943% / 99.912% / 99.87%` does not.

**Consumption** — mean power, normalised to **kWh/d** (`W × 24 / 1000`), the
scale this house reads at a glance. Sample-weighted across the window, so a
partial bucket contributes its share rather than counting as a whole day. The
upstream capture never records a zero watt — a zero is not a legitimate sensor
reading and such values are excluded before reaching the `watt` table — so the
published `avg(watt)` is already an average over real values only.

**What missing time actually means.** A house never draws zero, so there is no
such thing as a low-watt outage — an outage can only appear as missing samples.
A recorder failure looks identical from here. The two are indistinguishable in
this data, so the page must not pretend to tell them apart.

**Significant gap** — missing time past a **fixed** threshold: over **1 minute**
in an hour bucket, over **5 minutes** in a day bucket. This, and never
`missing > 0`, is what earns the alarm colour.

The threshold is where the explanation changes. Below it the sensor simply
failed to deliver some samples — it has never managed a perfect 1 Hz, and a few
tens of seconds a day is its resting state, not an incident. Above it something
stopped, and since a house never draws zero, "the power was out" is the most
plausible reading.

Fixed rather than derived, deliberately. An earlier version set the bar at 8×
the window's own median, which meant "significant" quietly meant something
different this month than last and the page's own history stopped being citable.
(Also called an _excursion_ in an earlier draft — invented jargon for something
that is just a big gap.)

**A caveat this cannot escape:** these are per-bucket _totals_, not contiguous
runs. 60s missing in an hour might be one 60-second outage or sixty separate
1-second drops, and an aggregate cannot tell them apart — which is exactly the
distinction the threshold is trying to make. Only the raw 1 Hz series can, and
that lives in Grafana.

**Largest gap** — the worst single bucket in a window, named on the month
summary. A month's total is usually dominated by one bad day, and a bare
`1h04m missing` cannot distinguish that from being chronically flaky.

### Measuring agreement

**Generation** — one ten-minute scrape cycle. The message's own authoritative
field, not a reconstructed time bucket.

**Settled** / **pending** — every known copy has reported for that generation,
or not yet. The copies report minutes apart, so the newest generation is almost
always pending; calling that a disagreement would cry wolf every ten minutes.

**Converged** / **diverged** — a settled generation whose copies all hold the
same digest, or don't.

**Critical** — a divergence that has run past `CRITICAL_GENERATIONS`, six
generations, which is one hour. Below it the reconciliation is doing its job and
the divergence is drawn in neutral ink; past it, and only while the run is still
open, it earns the alarm colour. A run that ran long but has since closed is
history, not a fault.

Criticality is a visual advisory and a phrase in the verdict sentence, nothing
more. If it ever grows teeth it will be as an alarm or notification, and that is
where the concept would be carried.

**Reporting lag** — a copy's publish `stamp` minus the generation it belongs to.
**Scrape elapsed** — how long that copy's own run took. Both ride on every
message and neither is shown by the production view.

### States of knowledge

**Partial** — a bucket clipped by a rolling window: opening, or still in
progress. Incomplete, never faulty.

**Unverifiable** — a reading whose substrate is down. The page knows only the
last thing it was told and when. Rendering this as "broken" is a lie; it is
drawn as _unknown_.

**Live** vs **fixture** — read from NATS in the browser right now, versus a
shape taken from `scripts/bash/qcic-sh.sh` because a browser cannot observe it.
Never blended silently.

### Naming

**Window names are capitalised** — Last Day, Last Month, Last Day by Hour, Last
Month by Day. `by` stays lowercase as a connector. Everything else on the page
is a description and stays sentence case or lowercase: "missing by hour",
"power, same window", "Table of gaps". So the same word can appear both ways —
`Hour` in a window's name, `hour` in a chart's label — and the case tells you
which it is.

### Structure

**Fabric / bus / services** — the three dependency rungs. Order is never
rearranged: if the fabric is down the bus cannot be reached, and if the bus is
down no service reading can be trusted.

**Subject** — one thing QCIC watches, at one reading, with its own byline.

**Byline** — the originating NATS subject or command, printed under a reading.
Provenance as a designed element; kept from `/design/html-react`.

### Colour discipline

**One chromatic token.** `--qc-alarm` is the only high-chroma colour in any
theme and is spent only on an active anomaly, so a healthy page shows it zero
times. Every time it appeared without something actually being wrong — ted1k's
ordinary daily loss, scast's routine two-cycle splits, the tailnet's
expected-offline peers — the encoding was lying, and fixing it made the page
more useful rather than merely quieter.

## Design rules these pages hold to

**The page states facts; it does not explain itself.** Captions are captions.
Reasoning belongs in this glossary, read once, not in the interface, read a
thousand times. Two paragraphs have already been deleted for breaking this: one
restating the agreement model on every render, one arguing against a unit that
was not even on screen.

**Print nothing the page has no reason to print.** Record counts and buffer
sizes are plumbing volume, not service quality. A number that does not help
answer the page's own question can still be wrong — and one of them was.

**Plots define their own y-scale and start at zero. Labels do not need an
axis.** Two labels at the ends beat an axis, and beat a glyph that might not be
in the font.

**Encode nominal things nominally.** Height and length are magnitude channels.
Agreement has no magnitude — a generation agrees or it does not — so the
convergence strip has two heights and carries the rest in tone. ted1k's missing
time _is_ a magnitude, which is why the two strips deliberately no longer rhyme.

**Match the reading direction.** The Generation Table is newest-first, so the
strip runs now-on-the-left, backwards in time. Two directions on one page is a
bug, not a style.

**Measure the DOM before claiming anything about layout.** Every geometric claim
in this directory's comments is a measured number, because several confident
ones turned out to be wrong. 1× screenshots cannot settle hairlines or 12px
type; `getBoundingClientRect` can.

## What's real and what isn't

**Real, live, from NATS:** everything on `/tedcheck` and `/scast`.

**Fixture:** only `/prototype/network`, and only for signals the browser
genuinely cannot observe (Tailscale peers, `nats-top` counts, HTTP probes).
Every fixture field is copied from a shape `scripts/bash/qcic-sh.sh` actually
produces — no invented services, no alerting/remediation/config surfaces.

## The one non-obvious correction

`derive/tedcheck.ts` recomputes `missing` for boundary buckets. The raw query
does `3600 - count(*)` per hour over a _rolling_ 24h window, so the first and
last hour are partial and report enormous fake gaps. Live example: the two
`21:00` rows read 2803 and 797 missing, which sum to exactly 3600. Corrected
against `meta.stamp` they are 1 and 0 — the cleanest hours of the day. The same
applies to `missingWeekByDay`'s last row, which is simply today-so-far.

Every variant renders the corrected value and marks the bucket **partial**, a
state that must read as _incomplete_, never as _bad_.

## Where each variant stands

**Strata has won.** `Circuit` and `Sheet` stay for now as the record of what was
tried, not as candidates.

| variant   | verdict                                                               |
| --------- | --------------------------------------------------------------------- |
| `Strata`  | the winner                                                            |
| `Circuit` | some elements liked, never enumerated — needs a concrete list to fold |
| `Sheet`   | marked for deletion, judged too simple to be worth the surface        |

`Sheet`'s finding survives its variant: nines cannot describe scast, so the
vocabulary shared with tedcheck is _last excursion + duration_, not a rate.

Still open, visual: power columns are too wide on desktop, fine on mobile and
portrait iPad. The wordmark is EB Garamond, settled for now — bench at
`/prototype/mark` if that reopens.

## Fold-back

Nothing here merges as-is. When it graduates, it sorts into three piles:

**Domain truth — lands regardless of which variant won.** The ted1k window
correction, the significant-gap threshold, the scast agreement model, the
local/UTC time rule, the duration formatter, `critical` and its still-open
narrowing, and the contiguous latest-divergence slice. This is the valuable pile
and **the only part that deserves tests** — the prototype is deliberately
test-free, so these have none.

**Infrastructure — lands early.** The token layer (theme vs semantic split, the
one-chromatic-token rule), the type decisions, the shared marks.

**Scaffolding — never lands.** `VariantSwitcher`, `?variant=`, the wordmark
bench, `Sheet`.

Sequencing: tokens → derivations with tests → producer-side fixes → one page at
a time. Four seams to settle first: where derivations live, the `DataTable`
untyped `Cell[][]` problem (the real architectural debt), whether the marks
become a component library, and whether all three themes ship.

This glossary is really domain vocabulary and should graduate into `CONTEXT.md`
rather than die with this directory.
