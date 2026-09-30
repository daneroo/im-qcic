# Scripts

The active home for homelab health-check/status-reporting experiments, in multiple language experiments side by side (bash, zx-node, elixir/livebook — more planned). Destination for `mail/` and `nats/` once they're relocated per the README TODO.

## Language

**Health check** (as used here):
Covers identity (hostname/user/ip/tailscale ip), connectivity (internet/LAN/WAN, tailscale status), NATS state, service last-run/status, performance (iperf/fio), and files/backups. Broader than what Status covers today — this is where that scope is meant to grow.

**Backup concerns**:
The README TODO mentions gmvault (Gmail backup), Backblaze, CCC (Carbon Copy Cloner), and TimeMachine as things to report on here — not yet implemented, but named as a direction. `packages/docz`'s old TODO mentioned the same set, suggesting this consolidates work that was previously scattered.

**qcic-sh.sh** (`bash/qcic-sh.sh`):
The most mature of the three language variants — confirmed working. Reports host identity, Tailscale peer status, live NATS subscription (`im.>`) and `nats-top` connection stats, and HTTP health checks against Status and all three Scrobblecast copies. The other two variants: `zx-node/index.mjs` (node/zx) and `livebook/qcic` (elixir, `mix run_qcic`) — the livebook one is currently broken, though it worked before.
