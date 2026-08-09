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

**Nines** — `-log10(1 - availability)`, the reliability convention. `0.993` is
2.15 nines. The right unit for ted1k because 86400 samples a day give the ratio
enough resolution; the wrong unit for scast, whose ~144 generations per window
make one divergence 2.46 nines on its own.

**Resolvable ceiling** — the best _non-perfect_ figure a window's sampling can
express, i.e. one single absence: `log10(expected)`. 4.94 for a day, 6.44 for a
month, 3.56 for an hour. Scales are drawn against this, never against a round
number a designer picked.

**Absence** — samples that never arrived. Reported as a duration, because ted1k
samples once a second so the count _is_ a duration: `2347` is `39m`.

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
