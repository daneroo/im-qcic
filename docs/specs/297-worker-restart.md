# #297 — workers survive restarts

Branch `agent/297-worker-restart`. qcic-syno deploys from `main` only.

## Diagnosis (reproduced locally 2026-09-25)

- **ted1k-derive:** `kv-sink.ts` caches the first `connect()` promise. If it
  rejects (nats not up yet: refused / `ENOTFOUND`), every later publish
  re-awaits the same rejection. Timers keep the process alive; the per-poll
  catch hides it.
- **scast-bridge:** `duplicate subscription` is thrown by the nats.js v2 client
  when the durable is `push_bound`. On reboot the old connection is not closed
  on the legacy server, which holds it for ~4–6 min (`ping_interval` 120s ×
  `ping_max` 2). `run failed` sets `exitCode` but the open NATS connection keeps
  the process alive, so Docker never restarts it. `opts.bind()` would not help.
- **Shared durable:** every instance (qcic-syno, any dev stack) uses durable
  `scast-bridge` on the legacy server — one cursor, one binding.

## Code

- [x] ted1k-derive: sink forgets a failed open; `maxReconnectAttempts: -1`
- [x] scast-bridge: `process.exit(1)` when `run()` fails (not while draining)
- [x] scast-bridge: durable `scast-bridge-${HOSTALIAS}`
- [x] `HOSTALIAS` required, no fallback, in health, ted1k-derive, scast-bridge
- [x] v2/infra: Justfile exports `HOSTALIAS` (`hostname -s`); compose requires
      it for all three
- [x] qcic-core compose: same, message names `host.env`; header delta 5
- [x] `src/durable-rm.ts`: dry run by default; refuses bound, own, non-bridge
- [x] `bun run ci`; /code-review

Guarded delete, on the host that owns the credentials:

```sh
just compose run --rm --entrypoint bun scast-bridge src/durable-rm.ts <durable> [--yes]
```

## Test locally (with Daniel, galois)

- [x] `just macos-up -d --build`: `scast-bridge-galois` created and copying,
      next to qcic-syno's bound `scast-bridge`
- [x] ted1k-derive restarted with nats down: `ENOTFOUND`, then published on
      its own once nats was back
- [x] guarded delete refuses this host's own durable (dev one is kept)

## Deploy (after merge; everything from `main`)

The first start re-copies 24h into qcic-syno's `scastDigest`. Harmless: the
dashboard keeps one report per host per generation.

1. qcic-syno, `infra/qcic-core`, Daniel: `git pull && just build && just start`
2. qcic-syno, same, Daniel: `just logs scast-bridge` — `scast-bridge-qcic-syno`,
   `copied`
3. qcic-syno, same, Daniel: guarded delete of the old `scast-bridge` — dry run,
   then `--yes`:
   `just compose run --rm --entrypoint bun scast-bridge src/durable-rm.ts scast-bridge`
4. Daniel: reboot qcic-syno; both workers log `published` / `copied`
