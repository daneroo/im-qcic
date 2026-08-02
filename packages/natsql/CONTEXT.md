# Natsql

Daniel's own invention: a GraphQL-to-NATS subscription bridge. This is the origin concept of the whole repo — QCIC started as a GraphQL subscriptions server/client example, and Natsql is that idea's still-live implementation.

## Language

**Natsql**:
A GraphQL server (`natsbridge.js` + `schema.js`) that bridges GraphQL Query/Mutation/Subscription to a NATS subject — currently `im.qcic.heartbeat`. Built and run by Gateway, reverse-proxied publicly at `natsql.dl.imetrical.com` by Caddy. Consumed by Site.
_Avoid_: api (an older/stale name for this same service — see `infra/gateway/README.md`, which still calls its port-5000 service "api")

**Heartbeat**:
The one NATS subject Natsql currently bridges (`im.qcic.heartbeat`) — a periodic liveness message, exposed as a GraphQL Query, Mutation, and Subscription.

**Note — technically redundant, kept anyway**: NATS later added its own native websocket support (see Gateway's `nats` service, port 9222), which can let Site talk to NATS directly without a GraphQL bridge in between. Natsql still exists partly because Daniel is genuinely proud of the original work (it's the repo's origin concept), not purely necessity — but the stated intent is to actually retire it. Don't treat its continued presence as evidence it's still architecturally required.
