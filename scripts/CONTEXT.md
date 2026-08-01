# Scripts

The active home for homelab health-check/status-reporting experiments, in multiple language experiments side by side (bash, zx-node, elixir/livebook — more planned). Destination for `mail/` and `nats/` once they're relocated per the README TODO.

## Language

**Health check** (as used here):
Covers identity (hostname/user/ip/tailscale ip), connectivity (internet/LAN/WAN, tailscale status), NATS state, service last-run/status, performance (iperf/fio), and files/backups. Broader than what Status covers today — this is where that scope is meant to grow.

**Backup concerns**:
The README TODO mentions gmvault (Gmail backup), Backblaze, CCC (Carbon Copy Cloner), and TimeMachine as things to report on here — not yet implemented, but named as a direction. `packages/docz`'s old TODO mentioned the same set, suggesting this consolidates work that was previously scattered.
