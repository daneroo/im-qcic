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
See [./ntfy-sh](./ntfy-sh.md)

## Monitoring (uptime-kuma)

We are using a local docker container for now.
See [./uptime-kuma](./uptime-kuma.md)

## tailscale status

- [ ]should list hosts, which are online (not active) and report DERP
  - `tailscale ping shannon` - `pong from shannon (100.100.25.28) via DERP(tor) in 25ms <-- DERP!`
- [ ] get status as json and parse
- [ ] compare with API call to tailscale.com

```bash
# binary on MacOS ()
#   alias tailscale=/Applications/Tailscale.app/Contents/MacOS/Tailscale
# binary on Synology
#   alias tailscale=/volume1/@appstore/Tailscale/bin/tailscale

tailscale status --json | jq

tailscale status --json | jq '.Peer[] | {HostName, Online, Active, TailscaleIPV4: .TailscaleIPs[0]}'


peers=$(tailscale status --json | jq -r '.Peer[] | "\(.HostName)\t\(.Online)\t\(.Active)\t\(.TailscaleIPs[0])"')

echo "$peers" | while IFS=$'\t' read -r host online active ip; do
  echo "# Host: $host,  IPV4: $ip"
  echo " -  Online: $online, Active: $active, "
  if [ "$online" = "true" ]; then
    loca
    tailscale ping $ip
    echo "---------------------------------"
  else
    echo "Skipping ping for $host as it is not online."
  fi
done
```

## iperf3

Speed test:

- [ ] add target a a script parameter, and which tests?
- [ ] add '-R' for reverse in basic test(st)

```bash
./speedTest.sh #  --tests basic | all <target-short-name> (.imetrical.com .ts.imetrical.com)
```
