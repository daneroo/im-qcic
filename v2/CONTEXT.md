# QCIC

QCIC watches whether the watchers are working. It reports on the **service
quality** of the homelab's own monitoring — whether ted1k is still recording,
whether scrobblecast's copies still agree, whether the fabric under them is
reachable. It is deliberately not a dashboard for the things being monitored:
power consumption belongs to Grafana, which already does that job well.

This is the vocabulary for the whole of `v2/`, which is rebuilding the repo's
actively-used packages and is expected to become the repo.

## ted1k — continuity

**Missing**: Samples that never arrived, expressed as a duration — ted1k samples
once a second, so the count is a duration. _Avoid_: downtime, outage, gap count

**Coverage**: Missing time normalised against its window, so windows of
different lengths can be compared. Truncates rather than rounds, so an imperfect
window never reads as perfect. _Avoid_: nines, availability, uptime, SLO

**Significant gap**: Missing time past a fixed threshold, above which the most
plausible explanation changes from "the sensor dropped some samples" to
"something stopped." The only thing that earns the alarm colour on a continuity
reading. _Avoid_: excursion, incident, anomaly, outlier

**Largest gap**: The worst single bucket in a window. Distinguishes one bad day
from chronic flakiness, which a window total cannot.

**Consumption**: Mean power over a window, normalised to kWh/d — the scale this
house reads at a glance. Secondary context for judging whether a gap mattered,
never the point of a page. _Avoid_: usage, load, demand

## scast — agreement

**Generation**: One scrobblecast scrape cycle, identified by the message's own
authoritative field rather than a reconstructed time bucket. _Avoid_: cycle,
scrape, round, time bucket

**Settled** / **Pending**: A generation every known copy has reported for, or
has not yet. Copies report minutes apart, so the newest generation is almost
always pending — and that is not a disagreement.

**Converged** / **Diverged**: A settled generation whose copies all hold the
same digest, or don't. Agreement is nominal, not a magnitude: two copies
agreeing are not more right than the third, so there is no majority to compute
and no per-copy statistic to derive from comparing digests. The only agreement
quantity is run length. _Avoid_: consensus, majority, quorum, odd-one-out,
agreement score, drift

**Critical**: A divergence whose run has passed a fixed number of generations
**and is still open**. A run that ran long but has since closed is history, not
a fault. _Avoid_: alert, alarm, severity

**Reporting lag**: A copy's publish time minus the generation it belongs to.

**Scrape elapsed**: How long a copy's own scrape run took.

## States of knowledge

**Partial**: A bucket clipped by a rolling window — opening, or still in
progress. Reads as incomplete, never as faulty. _Avoid_: truncated, clipped,
invalid

**Unverifiable**: A reading whose substrate is down, so only the last known
value and its age are knowable. Drawn as unknown, never as broken — the page
does not know that it is. _Avoid_: down, offline, stale, error

**Live** / **Fixture**: Observed from the bus right now, versus a shape recorded
because the observer genuinely cannot see it. Never blended silently. _Avoid_:
mock, stub, sample data

**What missing time cannot tell you**: A house never draws zero, so an outage
can only appear as missing samples — and a recorder failure looks identical. The
two are indistinguishable in this data and no reading may claim to separate
them. Likewise a bucket total cannot distinguish one long gap from many short
ones.

## Structure

**Subject**: One thing QCIC watches, presented at one reading, with its own
byline. Subjects are named for the thing watched — **ted1k**, **scast** — never
for the check that watches it. _Avoid_: service, check, metric, target;
`tedcheck` and `logcheck`, retired check-names surviving only inside the
behaviour-frozen port of the old status service.

**Reading**: What a subject currently says — one figure or verdict, at one
moment.

**Byline**: The originating bus subject or command, printed under a reading.
Provenance as a designed element rather than a debug affordance. _Avoid_:
source, origin label, debug info

**Fabric** / **Bus** / **Services**: The three dependency rungs, never
reordered: if the fabric is down the bus cannot be reached, and if the bus is
down no service reading can be trusted. So a failure travels upward as doubt,
not as fault — when a rung fails, the readings resting on it become
_unverifiable_, never alarming.

## Presentation discipline

**Alarm colour**: The single high-chroma colour in any theme, spent only on an
active anomaly — so a healthy page shows it zero times. Anything that would show
it during ordinary, expected behaviour is an encoding that lies. _Avoid_:
warning colour, severity colour, status colour

**Window name**: The capitalised name of a measurement window — Last Day, Last
Month by Day. A window name is a proper noun; every other label on a page is a
description and stays lowercase, so the same word can appear both ways and the
case says which it is.
