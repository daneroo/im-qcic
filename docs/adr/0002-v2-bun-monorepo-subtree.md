# v2: a self-contained Bun monorepo subtree, ported package by package

**Status:** accepted

Site and Status — the only two packages with real, active daily use — have had no love since 2022 and are believed to no longer build on current Node.js (Gatsby, old Fastify/Node pins). Rather than upgrading in place or converting the existing lerna/pnpm root to Bun directly, new work lives in `v2/`: a self-contained subtree with its own `package.json` (Bun workspaces) and lockfile, structured after `/Users/daniel/Code/iMetrical/ai-garden/prosodio` (`packages/`, `components/`, `apps/`, strict TS, single `bun run ci` gate). It has zero effect on the existing root or on Gateway's/Vercel's current deploy paths, so it can be built and proven out with no risk to what's already live, and cut over one package at a time.

`status` is the first package ported, chosen because it's the simplest (no dependency on any Deprecated package, unlike `site`) and gives an early proof that Bun-in-production — a first for this operator, who has only ever run Bun in dev mode — actually works, before committing `site`'s much larger and still-undecided rebuild to the same foundation.

## Considered options

- **Convert the root `package.json` to Bun workspaces now, migrate packages in incrementally** — rejected: couples the migration's pace to the still-live deploy paths from day one, for no benefit at this early stage.

## Consequences

- `site`'s rebuild (framework, styling, whether it still proxies state through Natsql per ADR-0001) is deliberately out of scope here — it gets its own `/wayfinder` decision map, not a `/grill-with-docs` session, because the destination isn't fully knowable yet.
- The existing lerna/pnpm root and its Deprecated packages are untouched and can be cleaned up on their own schedule, independent of `v2/`'s progress.
