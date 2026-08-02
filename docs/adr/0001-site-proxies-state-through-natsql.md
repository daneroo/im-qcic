# Site holds no state of its own — it proxies to the homelab via Natsql/Nats

Originally, things deployed on zeit/now ran as always-on containers, so a deployed service could hold its own state directly (persistent connections, in-memory data, etc). When that model went away — zeit's shift to stateless serverless functions, later formalized as the Vercel rebrand — anything deployed there lost the ability to maintain state itself.

That's why Site (a static Gatsby build on Vercel) has no backend of its own: it can't hold state on that platform. Instead it reaches back into the homelab — where state actually lives — via Natsql (a GraphQL-to-NATS bridge), and increasingly directly via NATS itself once NATS added native websocket support, reducing the need for the bridge on some paths.

This split — a stateless edge deployment (Site) proxying to a stateful homelab backend (Nats/Natsql) — is the reason the repo has separate `packages/site` and `packages/natsql` rather than one monolithic app. The package structure is a vestige of this platform constraint, not an arbitrary design choice.
