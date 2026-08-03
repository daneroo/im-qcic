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

## Layout

- `apps/` — runnables, each its own package (e.g. `apps/status`)

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

Credentials live in a single flat `credentials/` at this workspace root
(gitignored as a whole directory — matches `infra/gateway`'s own `credentials/`
convention, e.g. `credentials/caddy/CREDS.env`), volume-mounted at runtime,
never baked into images. Flat for now, one file per concern
(`credentials.mysql.json`, `credentials.loggly.json`, ...) — split into per-app
subdirectories only once a real naming collision actually happens, not before.

None of this is wired into `infra/gateway`'s real deploy yet — see each app's
own `CONTEXT.md` (under the repo root's `packages/`) for cutover status.
