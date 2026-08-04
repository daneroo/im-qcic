# @daneroo/qcic-web

Homelab dashboard, replacing `site` — TanStack Start + Tailwind, fully
static/client-rendered (no server-side data fetching). See
[../../AGENTS.md](../../AGENTS.md) for workspace-wide conventions.

This is the scaffold only (see
[issue #241](https://github.com/daneroo/im-qcic/issues/241)): basic page/layout
and a light/dark theme toggle. No NATS connection yet — live Tedcheck and
Logcheck views land in follow-up tickets
([#249](https://github.com/daneroo/im-qcic/issues/249),
[#250](https://github.com/daneroo/im-qcic/issues/250)), which is why no server
functions or loaders are written here: every future data fetch happens
client-side, directly over a NATS websocket connection, matching this app's
fully-static shape from the start.

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
SSR entry `start` runs) — despite the server entry, no route in this app does
server-side data fetching; SSR here only ever renders the same static shell a
client render would.
