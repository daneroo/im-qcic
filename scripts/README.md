# qcic-scritps

Start of script snippets for establishing qcic health and status.

- First, command line tool to run basic health checks and status reports
- May also be used as a cron job to report status to a central location
- Script wrapper to gather post cron-like reporting (gmvault, backblaze, TimeMachine, CCC, ..)

Concerns:

- identity - hostname, user, ip, tailscale ip
- notifications -
- connected state (internet LAN,WAN)
- tailscale status - Self, Peers, DERP
- nats - status, state (kv,jetstream)
- services - lastRun, status
- perf: iperf, fio
- files/backups

There will be different language experiments:

- qcic-sh - bash
- qcic-go - go
- qcic-dax - dax
- qcic-zx - zx
- qcic-elixir - elixir
  - livebook
- qcic-gleam - gleam
- nixify the right one!

## TODO

- [ ] move this to im-qcic/scripts/(qcic.sh|network.sh|tailscale.sh)
- [ ] Finally explain the rsync problem from syno (galois | shannon )
- [ ] run from synk ?

## Notifications

We are using the public <https://ntfy.sh/> for now.
See [./NOTIFY](./NOTIFY.md)

## Monitoring (uptime-kuma)

We are using a local docker container for now.
See [./UPTIME-KUMA](./UPTIME-KUMA.md)

## tailscale status

- [ ]should list hosts, which are online (not active) and report DERP
  - `tailscale ping shannon` - `pong from shannon (100.100.25.28) via DERP(tor) in 25ms <-- DERP!`
- [ ] get status as json and parse
- [ ] compare with API call to tailscale.com

## iperf3

Speed test:

- [ ] add target a a script parameter, and which tests?
- [ ] add '-R' for reverse in basic test(st)

```bash
./iperf-speed-test.sh #  --tests basic | all <target-short-name> (.imetrical.com .ts.imetrical.com)
```
