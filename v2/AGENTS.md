# AGENTS.md

Canonical instructions for agents and humans working in `v2/`. `CLAUDE.md`
points here.

`v2/` is a self-contained Bun workspace within `im-qcic`
([docs/adr/0002](../docs/adr/0002-v2-bun-monorepo-subtree.md)), rebuilding the
repo's actively-used packages — starting with `status` — on modern tooling,
decoupled from the existing lerna/pnpm root at the repo root.

## Quality

- `bun run ci` — after every edit, before every commit
- `bun run fmt` — fix formatting when `ci` fails

## Shared dependencies

When the same dependency is pinned in two or more `apps/*/package.json` (e.g.
`pino`), move the version spec into this workspace root's
`workspaces.catalogs.runtime` entry and reference it from each app as
`"pino": "catalog:runtime"` — one version across the workspace, no drift.
(Convention carried over from `prosodio`.) Don't catalog a dependency that only
one app currently uses — wait until it's genuinely shared.

## Layout

- `apps/` — runnables, each its own package (e.g. `apps/status`)
- `infra/` — infrastructure this workspace itself depends on (e.g. a local NATS
  server via `infra/compose.yaml`), plus `infra/credentials/` (see Credentials
  below). Distinct from the repo-root `infra/gateway/`, which is the real
  production deployment — nothing here is wired into that yet.

## Docker

Each dockerized app gets its own `Dockerfile` inside its `apps/<name>/`
directory, but the build **context must be the workspace root** (`v2/`), not the
app's own directory — `bun install` needs the root `package.json`/ `bun.lock` to
resolve `workspace:*` links. Build from within `v2/`:

```sh
docker build -f apps/<name>/Dockerfile -t qcic-<name>:latest .
```

`.dockerignore` (at this workspace root) is shared across all dockerized apps —
critically excludes `**/node_modules`, without which Bun's workspace symlinks
get corrupted during `COPY`.

All apps default to port `8000`
([docs/adr/0003](../docs/adr/0003-v2-apps-share-a-standard-default-port.md))
unless overridden via `PORT` or remapped at the Docker/Compose level.

### Digest-pinned base images

Base images are pinned as `image:tag@sha256:...` (e.g.
`oven/bun:1@sha256:e10577f0...`, `nats:2-alpine@sha256:f2123f53...`) — a
repo-wide convention predating `v2/` (see the repo-root `packages/status`,
`packages/myip`, `packages/natsql` Dockerfiles, all pinning
`node:18.17.1-alpine3.18@sha256:982b5b6f...`). The tag stays for human
readability (which version/variant was intended); Docker resolves the pull by
digest alone when both are present, ignoring the tag - **nothing automatically
verifies the tag and digest still correspond to each other**; that's a
manual/scripted check, not something this format enforces on its own.

**Updating a pin**: there's a verification script for this pattern at
`scrobbleCast/js/scripts/pin-docker-tags.sh` (a sibling repo, not `im-qcic`) -
it resolves a tag's current digest via the registry API, builds and
runtime-tests images with both the tag and the resolved digest to confirm
they're currently equivalent, and reports the dated pairing for a human to copy
in. It is **not yet adapted for this repo**: it's Docker-Hub-specific
(`registry.hub.docker.com/v2/repositories/library/node/...`) and Node-specific
(checks a `config.version` script), so it won't work as-is against `oven/bun` or
`nats` (different registry namespaces, no equivalent version check). Adapting it
for `v2/`'s images is real, not-yet-done follow-up work - until then, updating a
pin means manually resolving the new digest (e.g.
`docker inspect --format='{{index .RepoDigests 0}}'` after a fresh
`docker pull <image>:<tag>`) and updating the Dockerfile/compose file by hand.

### Credentials

Credentials live in a single flat `infra/credentials/` (gitignored as a whole
directory — matches `infra/gateway`'s own `credentials/` convention, e.g.
`credentials/caddy/CREDS.env`), volume-mounted at runtime, never baked into
images. Flat for now, one file per concern (`credentials.mysql.json`,
`credentials.loggly.json`, ...) — split into per-app subdirectories only once a
real naming collision actually happens, not before. (Originally lived at this
workspace's top-level `credentials/`; consolidated under `infra/` once that
concept existed, since credentials are infrastructure the workspace depends on,
not app source.)

None of this is wired into `infra/gateway`'s real deploy yet — see each app's
own `CONTEXT.md` (under the repo root's `packages/`) for cutover status.
