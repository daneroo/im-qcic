# Spec — folding `prototype/frontend-design` into `main`

Buildable plan for the work recorded in
[issue #262](https://github.com/daneroo/im-qcic/issues/262). The prototype branch
is the **primary source** and never merges; `main` is rebuilt from it, test-first.
Tickets cut from this spec should link back to #262.

**Read before building:** `v2/apps/web/src/prototype/README.md` on the branch
(scope guard, design rules, variant verdicts) and the commit messages, which carry
the argument rather than just the change:

```sh
git log --reverse main..prototype/frontend-design
```

The prototype has **no tests, by design**. Everything this spec calls domain truth
therefore arrives untested, and the rebuild is where the tests get written.

## Scope guard

QCIC reports on the service quality of the homelab's own monitoring. It is not an
energy dashboard — Grafana already does that job, with a live gauge, the full 1 Hz
series and a data explorer. **If a change would make this more useful for looking
at power and no more useful for judging whether ted1k is healthy, it belongs in
Grafana.** The prototype drifted across this line once already.

## Vocabulary

[`v2/CONTEXT.md`](../../v2/CONTEXT.md) is now the glossary for the whole project
and was written from the prototype's working glossary during the design session
that produced this spec. Use its terms; don't drift to the words listed under
`_Avoid_`.

**`Stratum` stays a component name and does not enter the glossary.** Once `Circuit`
and `Sheet` are gone there is only one design language, and "the page has horizontal
sections" is a general UI concept — the glossary excludes those even when the project
uses them constantly. What graduated instead is the rule underneath it, which was
never about layout: a reading whose substrate has failed goes _unverifiable_, not red.
That now lives on the `Fabric`/`Bus`/`Services` entry. Avoid `band` as a synonym.

The one change that touches code broadly: **`tedcheck` and `logcheck` are dead
names.** They named the _check_; the subjects are named for the thing watched —
**ted1k** and **scast**. The single exception is `v2/apps/status`, a deliberately
behaviour-frozen port of the old service, where those names are its API contract
and must not change.

## Settled decisions

### Where the derivations live

Fold each derivation file into the subject slice that owns it — `src/ted1k/`,
`src/scast/`, `src/network/`. The `prototype/derive/` folder does not survive.

Those slices already exist with their own tests and READMEs, and they cut by
_subject_, the same axis `CONTEXT.md` organises vocabulary along. A `derive/`
folder groups by technical role instead, which files scast's convergence model next
to ted1k's boundary correction on the grounds that both are "computed" — not a
relationship.

**Not a shared workspace package.** Lifting the domain files somewhere
`ted1k-derive` could import them is the same bet as publishing an `expected` field
upstream, which was considered and rejected: it freezes a boundary convention into
a shared contract while that convention is still moving. Build it when a second
consumer actually exists.

### The ted1k boundary correction stays consumer-side

`ted1k-derive`'s SQL computes `<bucketSeconds> - count(*)` over a _rolling_ window,
so the first and last buckets report their unelapsed remainder as a gap. Live
example from the branch: two `21:00` rows reading 2803 and 797 missing, summing to
exactly 3600, when corrected against `meta.stamp` they are 1 and 0 — the cleanest
hours of the day. Rendering them raw makes a healthy day look like it began and
ended in catastrophe.

The correction happens in the browser and is **not** pushed upstream, for the
reason above. Corrected buckets render as **partial**, which must read as
incomplete and never as faulty.

### `DataTable` is deleted, `Cell`/`Table` are kept

`DataTable`'s only two consumers are `routes/tedcheck.tsx` and `routes/scast.tsx` —
exactly the routes this work replaces. The fix for an interface nothing calls is
deletion, not a redesign.

`Cell` and `Table` stay: they describe the shape `ted1k-derive` publishes, which is
not changing. The untypedness is the _wire format's_, not the component's —
`DataTable` was only the last place it surfaced. `BucketTable` shows what the
untyped matrix made impossible: right-aligned tabular numerals, and rendering
`missing` as a duration rather than a raw count.

The surviving views hand-roll nine `<table>` elements. That is a second debt and
should not be waved through — but extract a **chrome-only** shell (borders, header
row, tabular-numeral defaults, `min-w` scroll container) only after the second page
lands and the repetition is real, leaving cell rendering to each view. Extracting
it sooner just re-invents `DataTable` with better types and no more knowledge of
what a column means.

### One duration rule

The branch has four formatters and a dead alias where the fold-back plan claims
one:

| current                       | disposition                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `formatMissing(seconds)`      | **canonical.** Largest unit that fits, later segments zero-padded, trailing zero segments dropped, interior ones kept |
| `formatMissingShort(seconds)` | **delete** — its entire body is `return formatMissing(seconds)`                                                       |
| `formatDuration(ms)`          | becomes a **ms adapter** over the canonical rule                                                                      |
| `formatSeconds(value)`        | keep — sub-10s precision is a different question                                                                      |
| `since(from, to)`             | keep — relative time, deliberately single-unit                                                                        |

`formatDuration` currently **caps at minutes**, so a two-hour reporting lag prints
`"127m"` — exactly the ambiguity the padding rule exists to prevent. Fix it by
routing through the canonical rule.

Lands in `src/format/`, the one thing genuinely shared by both subjects, and the
piece that most deserves tests: its rules are stated in prose in `CONTEXT.md` and
verified nowhere. Also covers `formatCoverage`, whose **truncate-never-round**
behaviour is a domain rule — a month at 99.8611% must not print `100%`, which is
reserved for nothing missing at all.

### Marks: split by subject, no extra hierarchy

Call-site counts across the surviving views (`Circuit` and `Sheet` excluded, since
they don't land):

| mark                                    | uses              | disposition                           |
| --------------------------------------- | ----------------- | ------------------------------------- |
| `Masthead`                              | 10 across 4 files | → `src/components/`                   |
| `Byline`                                | 9 across 4        | → `src/components/`                   |
| `ConnectionDot` (was `LivenessDot`)     | 8 across 4        | → `src/components/`                   |
| `Eyebrow`                               | 7 across 4        | → `src/components/`                   |
| `ConnectionLabel` (was `LivenessLabel`) | 4 across 2        | → `src/components/`                   |
| `Reading` (was `Figure`)                | 1                 | → `src/ted1k/`                        |
| `CoverageStrip`                         | 1                 | → `src/ted1k/`                        |
| `ConsumptionStrip` (was `PowerStrip`)   | 1                 | → `src/ted1k/`                        |
| `Tile`                                  | 1                 | → the home route                      |
| `StructureLabel`                        | **0**             | **delete** — exported, never rendered |

Renames borrow words the glossary already owns: a **reading** is what a subject
currently says, and **consumption** is the term for normalised mean power ("power
strip" is a physical object). `CoverageStrip`, `Byline`, `Masthead` and `Eyebrow`
stay — the first two are glossary terms, the last two are ordinary typographic
words, not inventions.

`ConnectionDot`/`ConnectionLabel` are renamed but **not** promoted into the
glossary. Their states (`connected | connecting | reconnecting | closed`) describe
the bus connection only, and three surfaces currently disagree about how to model
connectivity — the tailnet uses `online: boolean`, HTTP probes use a status code.
Naming that now would freeze an undesigned model. It stays visual.

Nothing in the mark set is scast-only.

### Themes: all three ship

Three families (`sketch`, `chromatic`, `catppuccin`), each with a light and dark
member, all shipping. The existing no-flash `.dark` machinery picks light vs dark;
`data-theme` on `<html>` picks the family. Both axes survive.

`VariantSwitcher` — the dev-only bottom bar — is replaced by a **shared page
header** carrying the light/dark toggle and the theme picker, present on every
page and shipping to production. The `?variant=` structure axis does not survive at
all; `Strata` won.

**One chromatic token.** `--qc-alarm` is the only high-chroma colour in any theme
and is spent only on an _active_ anomaly, so a healthy page shows it zero times.
Every place it appeared without something actually being wrong — ted1k's ordinary
daily loss, scast's routine two-generation divergences, the tailnet's expected-offline peers —
the encoding was lying.

### The network page ships

`/prototype/network` becomes `/network` (`qcic` names the home page, not the
networking slice). `network` rather than `mesh`: mesh names a topology only
Tailscale has — NATS is the bus, DNS is neither — so it would over-claim two of the
page's three rungs and get less true as the page grows.

`fixtures/network.ts` is three things and splits accordingly:

- **Types** (`Peer`, `Identity`, `BusStats`, `HttpProbe`, `Heartbeat`) — the wire
  contract a future collector publishes. → `src/network/`
- **Derivations** (`isRelayed`, `summariseFabric`, `summariseProbes`) — domain
  truth; `summariseFabric` computes the fabric rung's state. → `src/network/`, with
  tests
- **The `NETWORK_FIXTURE` literal** — isolated in `src/network/fixture.ts` so
  swapping in a live source is a one-file change

The three rungs are not equally stuck. **Fabric** (tailnet) needs the Tailscale
daemon, which cannot be reached from inside a container — fixture stays. **Bus**
(NATS `/varz`, `/connz`) is reachable today. **Services** (HTTP probes) are mixed;
third-party probes hit CORS, our own don't.

Per [ADR-0004](../adr/0004-browser-reads-only-from-the-bus.md), the browser is a
pure bus consumer and a collector should own those endpoints. Until it exists, the
bus rung fetches them directly — a named, temporary placeholder chosen over fixture
data because the signal is genuinely available. **`FixtureNote` must be updated to
name exactly which rungs are not live.** Blending live and recorded readings is
allowed; blending them silently is not.

### Circuit's keeper

`Circuit` does not land, but its flow chart does, as one stratum on the ted1k page:
`ted → mysql → derive → kv → browser`, each link carrying its own fact and dimming
when its substrate is down. Nodes are drawn plainly.

This is **a visual, not a model.** Nothing about it enters `CONTEXT.md`. It shows
where the numbers come from and it looks good; that is the whole claim.

### Never lands

`VariantSwitcher`, `?variant=`, the wordmark bench (`/prototype/mark`), `Sheet`,
and `Circuit` itself apart from the stratum above. The wordmark is **EB Garamond**,
settled.

`Sheet`'s finding outlives its variant: nines cannot describe scast, so the
vocabulary shared with ted1k is _last excursion + duration_, not a rate.

## Tickets

Each is independently shippable — a slice with no page is dead code.

1. **Tokens and the shared header.** The theme layer (theme vs semantic split, the
   one-chromatic-token rule), the light/dark toggle and the three-family picker,
   replacing `VariantSwitcher`. Visible on the existing pages immediately.
2. **`src/format/` with tests.** The canonical duration rule plus the ms and
   relative adapters; `formatCoverage` and its truncate-never-round behaviour;
   `formatMissingShort` deleted, `formatDuration`'s minute cap fixed. Prerequisite
   for 3 and 4.
3. **ted1k slice and page.** `src/tedcheck/` → `src/ted1k/`; `TedcheckView` →
   `Ted1kReading`; `meta.type` → `"ted1k"`; route `/tedcheck` → `/ted1k`. The
   window correction, significant-gap threshold, largest gap and partial marking,
   with tests. Marks placed. `Strata` becomes the page, with the flow stratum.
4. **scast slice and page.** The convergence model — settled/pending,
   converged/diverged, critical run length, the contiguous latest-divergence slice
   — with tests. `ScastState` → `ScastReading`. `parseRich` disappears into
   `parseDigestMessage`, which takes on `stamp` and `elapsed`. `/scast` page.
5. **network slice and page.** Types, derivations and tests into `src/network/`;
   fixture literal isolated; bus rung live from `/varz` + `/connz`; `FixtureNote`
   updated to name only the rungs that aren't. `/network` page.
6. **Home page.** Every subject at one reading each. Depends on 3–5.
7. **Network collector.** A new `v2/apps/` service owning the Tailscale daemon and
   the NATS monitoring endpoints, publishing into a KV bucket on the `ted1k-derive`
   pattern; the browser's direct fetch comes out. Per ADR-0004. Sequenced last —
   the page ships honest before the collector exists.

`DataTable`'s deletion falls out of 3 and 4, as its last consumers go.

## Deliberately open

Not decided, and not to be settled by guessing — these need the app on screen after
the first slice lands:

- **The connection model.** Three surfaces disagree; no glossary term until the
  network page is designed for real.
- **Desktop power-column width.** Too wide on desktop, fine on mobile and portrait
  iPad.
- **How much of the flow chain earns its stratum.**
- **Versioning and tags for `v2/`** — [#255](https://github.com/daneroo/im-qcic/issues/255), unrelated to this work but unresolved.

## Verification

```sh
cd v2 && bun run ci        # fmt:check, lint, check, test — after every edit
```

Review happens on a phone and an iPad, so the dev server must bind the LAN address
— `ws://localhost:9222` resolves to _the phone_ and the page sits at "connecting"
forever with nothing on screen explaining why:

```sh
docker compose -f v2/infra/compose.yaml up -d
cd v2/apps/web
VITE_NATS_WS_URL=ws://$(ipconfig getifaddr en0):9222 bun --bun vite dev --port 3000 --host 0.0.0.0
```

**Measure the DOM before claiming anything about layout.** Every geometric claim in
the prototype's comments is a measured number, because several confident ones turned
out to be wrong. 1× screenshots cannot settle hairlines or 12px type;
`getBoundingClientRect` can.
