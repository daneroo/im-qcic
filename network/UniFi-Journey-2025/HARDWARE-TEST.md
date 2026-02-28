# Initial 10GbE Hardware tests

- 2 x 10GTek - 10GbE Single SFP+ Port (Same as X520-DA1/X520-SR1)
  - one for SynologyDS1821+ NIC (syno)
  - one for Z390/i9-9900K PC NIC (hilbert)
- 2 x 10GTEK SFP+ **DAC** Twinax Cable

## Summary

- The direct DAC link between Synology and Hilbert works flawlessly.
  - Both NIC's work, tested in direct DAC connection (hilbert-syno)
  - 10GTEK SFP+ DAC Cable - One validated (assume the other works)
- UCG-Fiber unable to connect to NICs with the 10GTEK SFP+ DAC Cables

## Initial Network Topology

LAN side only connections on UXG-Fiber (boole)

```text
ISP → Bell Giga Router (DHCP server & LAN core router)
|
|-- Netgear 16-port Gigabit Switch (LAN extension)
|   |-- Synology (1GbE port) — DHCP via Bell Giga Router
|   |-- Hilbert (1GbE port) — DHCP via Bell Giga Router
|   |-- [Other devices on 1GbE ports — not pertinent]
|
|-- UXG-Fiber (boole) LAN Port → Patched directly into Bell Giga Router (LAN-only, NO WAN uplink yet)
    |-- Galois (Mac Mini) — connects ONLY to UXG-Fiber via 10GbE RJ45
    |-- Gauss (Beelink SER8) — connects ONLY to UXG-Fiber via 2.5GbE
    |-- Shannon — connects ONLY to UXG-Fiber via 1GbE (negotiates at 1GbE)
    |-- Hilbert (10GbE SFP+ DAC) — attempted connection to UXG-Fiber (failed earlier)
    |-- Synology (10GbE SFP+ DAC) — connected to UXG-Fiber SFP+ (Link Up, no IP yet)
```

## 10GbE DAC Testing — Direct Synology ↔ Hilbert Test

- Assigned static IPs: 10.10.10.1 (Hilbert), 10.10.10.2 (Synology).
- Confirmed bidirectional ping working (low latency, no packet loss).
- iperf3 tests achieved full 10GbE line rate
  - Synology → Hilbert: **9.42 Gbps** (Sender), **8.94 Gbps** (Receiver)
  - Hilbert → Synology: **9.41 Gbps** (Sender), **9.40 Gbps** (Receiver)
- Both NICs, DAC cable, and interfaces fully operational.

## 10GbE UniFi DAC on hilbert ↔ UCG-Fiber

- `vmbr0` now uses only `enp2s0` (10 GbE to UCG-Fiber) via `bridge-ports`.
- `eno2` (1 GbE) was removed to avoid mixed-speed bridge issues.
- Static IP `192.168.2.110` is assigned directly to `vmbr0` (not via DHCP).
- Revert by re-adding `eno2` to `bridge-ports`.
- miperf:  Down: 9383 Mbps Up: 9381 Mbps

## Synology rollout

- DHCP range is 192.168.2.[10-254]
  - 192.168.2.1 - Giga and UCG-Fiber-lan-side
  - 192.168.2.2 UCG-Fiber/LAN side (boole)

Rollout sequence:

- LAN1 → set static `192.168.2.100`
- LAN5 → set static `192.168.2.108`
  - test connectivity + speed (`:5000` web + SSH to `.108`)
  - maintain an open ssh session to LAN5 192.168.2.108
- *from here we lose connectivity to 192.168.2.100 for a short while*
- LAN1 → set static `192.168.2.109` (fallback)
- LAN5 → set static `192.168.2.100` (final config)
- *service to .100 is restored*
  - confirm `.100` now served via LAN5
- unplug LAN1 → set to DHCP (optionally reserve `.109` on Giga)
- optionally delete old DHCP reservation for LAN1 and reassign `.100` to LAN5 MAC
