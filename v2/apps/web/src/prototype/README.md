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
cd v2/apps/web && bun run dev
```

Needs `v2/infra/compose.yaml` up (`nats` + `ted1k-derive` + `scast-bridge`) —
every variant reads the same real data through the existing `useDerivedState` /
`useScastFeed` hooks, unchanged.

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
**excursion** and **unverifiable** changed what the pages compute, not just how
they look. That is the test for whether a term belongs here.

### Measuring continuity

**Nines** — `-log10(1 - availability)`. A readable shorthand for _how many
samples went missing over a day or a month_, on a log scale. Shown to **one
decimal and without a range**: it is a label, not a measurement, and dressing it
up with an axis and a ceiling claimed more precision than it has. The right unit
for ted1k because 86400 samples a day give the ratio resolution; the wrong unit
for scast, whose ~144 generations per window make one divergence 2.46 nines on
its own.

**Resolvable ceiling** — the best _non-perfect_ figure a window's sampling can
express: `log10(expected)`, so 4.94 for a day, 6.44 for a month. Still computed,
because it is what makes nines meaningful for ted1k and meaningless for scast —
but deliberately **not displayed**. See the y-scale rule below for why that is
not a contradiction.

**The y-scale rule** — a plot's vertical axis is always defined and, for
measurements, always starts at zero. A plot makes a visual claim about
magnitude, so it has to say what it is measured against; an auto-scaled line
exaggerates every wobble, since a house drifting 1.8→2.1 kW fills the same box
as one swinging 0→4 kW. A _label_ like nines makes no such claim and needs no
axis. Trim a range only with a specific reason.

**Absence** — samples that never arrived. Reported as a duration, because ted1k
samples once a second so the count _is_ a duration: `2347` is `39m`.

**Consumption** — mean power, normalised to **kWh/d** (`W × 24 / 1000`), the
scale this house actually reads at a glance. Sample-weighted across the window,
so a partial bucket contributes its share rather than counting as a whole day.
The upstream capture never records a zero watt — a zero is not a legitimate
sensor reading and such values are excluded before reaching the `watt` table —
so the published `avg(watt)` is already an average over real values only.

**What an absence actually means.** A house never draws zero, so there is no
such thing as a low-watt outage — an outage can only appear as missing samples.
And a recorder failure looks exactly the same from here. The two are genuinely
indistinguishable in this data, so the page must not pretend to tell them apart;
in practice both mean **the power was out**. This closes the question rather
than leaving it open: absence is one event with one plausible cause, not an
ambiguity to resolve later.

**Baseline** — the median absence across a window's whole buckets. ted1k's
resting state, not a fault.

**Excursion** — an absence materially above the baseline (8× median, floored at
0.5% of a bucket). This, and never `missing > 0`, is what earns the alarm
colour. On live data it picks out one day in 32 and no hours in 24.

### Measuring agreement

**Generation** — one ten-minute scrape cycle. The message's own authoritative
field, not a reconstructed time bucket.

**Settled** / **pending** — every known copy has reported for that generation,
or not yet. The copies report minutes apart, so the newest generation is almost
always pending; calling that a disagreement would cry wolf every ten minutes.

**Converged** / **diverged** — a settled generation whose copies all hold the
same digest, or don't.

**Self-healing** — a divergence that reconciles within two cycles. The system
working as designed, so it is drawn in neutral ink.

**Stuck run** — a divergence lasting longer than that. Only these are drawn in
the alarm colour.

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

### Structure

**Fabric / bus / services** — the three dependency rungs. Order is never
rearranged: if the fabric is down the bus cannot be reached, and if the bus is
down no service reading can be trusted.

**Subject** — one thing QCIC watches, at one reading, with its own byline.

**Byline** — the originating NATS subject or command, printed under a reading.
Provenance as a designed element; kept from `/design/html-react`.

### Colour discipline

**One chromatic token.** `--qc-excursion` is the only high-chroma colour in any
theme and is spent only on an active anomaly, so a healthy page shows it zero
times. Every time it appeared without something actually being wrong — ted1k's
ordinary daily loss, scast's routine two-cycle splits, the tailnet's
expected-offline peers — the encoding was lying, and fixing it made the page
more useful rather than merely quieter.

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
