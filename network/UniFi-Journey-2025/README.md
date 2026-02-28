# Ubiquiti - UniFi - Journey - 2025

- 2025-07-17: UniFi consoles:
  - U6-LR on galois: 1password: **UniFi Ubiquiti**
  - UCG-Fiber on boole: 1password: **boole (UCG-Fiber)**

## Other Documents

- [PLAN.md](PLAN.md) — Staged migration plan (Stage 0–4)
- [PLAN-Review.md](PLAN-Review.md) — Risk register: known issues & mitigations
- [TASKS.md](TASKS.md) — Task checklist with progress tracking
- [NOTES.md](NOTES.md) — Field notes captured during execution
- [HARDWARE-TEST.md](HARDWARE-TEST.md) — 10GbE hardware test results

## Current State

- Bell Giga Hub - Wi-Fi 6E (To be replaced)
  - Two SSID: Boltzman, GUEST18
  - Two gigabit switches (x8 and x16)

## Desired State

- UCG-Fiber
  - The UCG-Fiber includes a built-in 4-port 2.5 GbE managed switch, with one port providing PoE+ (30 W).
  - 3x 10 GbE LAN-capable ports
    - 1× 10 GbE SFP+ LAN (dedicated)
    - 1× 10 GbE SFP+ WAN (which you can reassign as LAN, since your ISP provides only 1 GbE service)
    - 1× 10 GbE RJ45 LAN (multi-gig copper)
- Connects to
  - PoE+ RJ45: U6-LR
  - 2xDAC: 10GTEK SFP+ **DAC** Twinax Cable
    - 2x 10GTek - 10GbE Single SFP+ Port (Same as X520-DA1/X520-SR1)
      - one for SynologyDS1821+ NIC (syno)
      - one for Z390/i9-9900K PC NIC (hilbert)
  - RJ45: Mac mini M2 Pro
  - Gigabit switch(es) for everything else

### Example Connection Diagram

_Note:_ One port must be assigned to WAN1, but WAN2 can now be unassigned

```text
[ ISP Modem (1 GbE) ]
↓
UCG-Fiber (router + controller + switch)
├── Port1: WAN1: 1 GbE RJ45 (ISP) - Unused for Stage 1
├── Port2: LAN: 2.5G RJ45 → 16-port 1 GbE switch → iMac and other devices
├── Port3: LAN: 2.5G RJ45 → 8-port 1 GbE switch → older Mac minis
├── Port4: LAN: 2.5G PoE+ RJ45 → U6 LR AP (Wi-Fi 6)
├── Port5: LAN: 10G RJ45 → Mac mini M2 Pro (built-in 10GbE)
├── Port6: LAN: 10G SFP+ → DS1821+ (via DAC to Mellanox NIC)
└── Port7: LAN: 10G SFP+ → Z390/i9-9900K PC (via DAC to Mellanox NIC)
```

### Summary

With this setup, the UCG-Fiber handles:

- Routing
- 10 GbE switching (3 ports)
- Legacy 2.5 GbE + PoE+ switching (4 ports)
- Unifi Wi-Fi control
- Controller functionality for AP + stats

## WiFi AP Placement

We did some experiments to characterize our WiFi performance and AP placement.

[View the GitHub Repository](https://github.com/daneroo/wifidan)

![UniFi WiFi Placement](https://raw.githubusercontent.com/daneroo/wifidan/refs/heads/main/data/UniFi-WiFi-Placement-2025-06-24.png)

## Cabling Validation

- Foyer - Confirmed **1.0Gbps**
- Borel / Office (B) - **100Mbs** - Grey (Wall) cable labelled Borel
  - Yellow cable labelled X-Over, and tested blue cable
- Salon - Dead cable - no signal
