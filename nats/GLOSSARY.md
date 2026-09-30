# Nats (client)

A simple node client for testing/exercising a NATS server. Content is still wanted; slated to move under `scripts/` (per README TODO), not delete.

## Language

**Nats (client)**:
Not the NATS server itself (see Gateway, which now runs the actual server) — this is a dev/test client used to start a shared NATS instance locally when none is running, and to smoke/speed-test one. Historically pointed at a NATS server running on Dirac (`dl.imetrical.com:4222`); that role has since moved to Gateway.
