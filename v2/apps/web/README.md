# @daneroo/qcic-web

Homelab dashboard, replacing `site` — TanStack Start + Tailwind, fully
static/client-rendered (no server-side data fetching). See
[../../AGENTS.md](../../AGENTS.md) for workspace-wide conventions.

The pages read live detail client-side over NATS WebSocket connections; no
server functions or loaders fetch application data. `/network` and the home page
bootstrap coarse substrate health from the public `apps/health` HTTP endpoint,
then consume its public NATS stream and private KV detail. The shared header
carries navigation plus the theme-family and light/dark controls.

## Theming

`src/theme.ts` holds the pure light/dark logic (storage read/write, system
preference fallback, class toggling) — no DOM/React coupling, so it's tested
directly with `bun test`, no browser needed. `THEME_INIT_SCRIPT` is inlined as a
raw `<script>` in `__root.tsx`'s `<head>`, running before hydration so the
correct theme class is already on `<html>` for first paint (no flash of the
wrong theme). `ThemeToggle.tsx` is the thin React wrapper.

Tailwind v4 defaults to `prefers-color-scheme`-based dark mode; `styles.css`'s
`@custom-variant dark (&:where(.dark, .dark *));` switches it to class-based, so
the toggle actually overrides system preference instead of just following it.

## Local dev

```sh
cd v2/apps/web
bun install
bun run dev
```

Opens on `localhost:3000`.

## Build

```sh
bun run build
bun run start
```

`build` produces `dist/client/` (static assets) and `dist/server/server.js` (the
SSR entry) — despite the server entry, no route in this app does server-side
data fetching; SSR here only ever renders the same static shell a client render
would. `start` runs `server.ts` on port 8000: files from `dist/client/`, then
the SSR entry, which does not serve them itself.

## Endpoints

A production build reaches NATS at `/nats` (websocket) and health at `/healthz`
on the page's own origin (`src/endpoints.ts`); Caddy routes both in
`infra/qcic-core`. `bun dev` overrides them with `VITE_NATS_WS_URL` and
`VITE_HEALTH_HTTP_URL` from `.env.development` (v2/infra's ports).

## Deploy

Built by `apps/web/Dockerfile`, run in `infra/qcic-core` behind Caddy at
`qcic.imetrical.net` (LAN) and `qcic.ts.imetrical.net` (tailnet). No public
ingress.
