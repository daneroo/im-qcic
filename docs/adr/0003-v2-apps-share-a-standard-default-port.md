# v2 apps default to one standard port, remapped at runtime as needed

**Status:** accepted

`status`'s old default (`8001`) wasn't arbitrary — it was chosen in 2022 to avoid colliding with Scrobblecast's `8000` on `dirac.imetrical.com`, a host `status` was expected to share at the time. That constraint no longer applies: `v2/status` won't run on `dirac`. Rather than carry the old value forward as an artifact of a since-abandoned deployment plan, `v2/apps/*` now default to **`8000`**, uniformly, across every app in the workspace — familiarity (the same port always answers `bun run dev`, unless told otherwise) is worth more than each app privately picking a distinct default to dodge collisions that better tools already handle: the `PORT` env var for local runs, and Docker/Compose's `host:container` port mapping for anything containerized.

## Consequences

- Running two `v2` apps locally at once, undockerized, requires overriding `PORT` for one of them — an accepted, minor cost.
- Any future app added under `v2/apps/*` should default to `8000` too, not invent its own, unless it has a genuinely new reason not to (the same bar that retired `status`'s old `8001`).
