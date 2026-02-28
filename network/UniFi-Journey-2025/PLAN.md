# Homelab 10 GbE Migration - Full Plan (UCG‑Fiber + Bell Giga Router)

## 1 · Current Environment

- Bell Giga Router
  - Edge NAT + firewall
  - DHCP for 192.168.2.0/24
  - Wi‑Fi: Boltzmann (main) & Guest18
- UCG‑Fiber
  - Not yet deployed
  - Built‑in UniFi OS Console (Network app pre‑installed)
  - 1 × 10 Gb RJ‑45, 2 × 10 Gb SFP+, 4 × 2.5 Gb RJ‑45
- U6‑LR AP: Runs SSID U6LRTEST (same /24)
- Switching / Cabling
  - Gigabit switches
  - PoE injector for AP
- 10 Gb Devices
  - Mac mini (M2 Pro, 10 Gb NIC)
  - Synology NAS (10 Gb card)
  - New tower PC (10 Gb card)
- DHCP Reservations: ~20 static leases on Bell router
- UniFi Controller: Temporary desktop instance (will be retired)

## 2 · Requirements & Objectives

- **Zero IP change** for hosts (`192.168.2.0/24` stays intact).
- Preserve all ~20 DHCP reservations.
- **Minimal downtime**—each stage must be reversible in < 1 min.
- No mandatory Wi‑Fi change during 10 Gb testing.
- Benchmark **10 GbE LAN performance** early.
- Gradually retire Bell Wi‑Fi after UniFi SSIDs are cloned.
- Long‑term goal: UCG‑Fiber becomes sole edge router; Bell box set to bridge/ONT.

## 3 · Roll‑out Strategy

### Stage 0 — Bench Configure (online)

*Note: **Single‑machine bench test** to validate basic LAN‑side configuration and update firmware*

- Connect from **shannon (iMac)** to a **UCG LAN port**.
- Set **LAN IP = 192.168.10.1/24**, **DHCP = on**, **WAN = DHCP**.
- Connect **WAN** to the Bell GigaRouter.
- Apply any firmware updates offered.
- Reboot **shannon** and confirm it receives an IP in **192.168.10.x/24**.

### Stage 1 — LAN ONLY

*Note:* this stage enables switch‑only 10 Gb testing

- **Disconnect the WAN** cable for this entire stage.
- Set **LAN IP = 192.168.2.2/24**, **DHCP = None**, **WAN = DHCP**.
  - Optionally add a **DHCP reservation** on the Bell router for the UCG ("boole") → `192.168.2.2`.
- Patch the **Bell Giga Router LAN** into a **UCG LAN** port.
- Confirm any machine plugged into the UCG still gets its previous IP (via Bell DHCP) with WAN disconnected.
- Move devices to UCG LAN ports in this order:
  - `shannon` (iMac)
  - `galois` (Mac mini M2 Pro)
  - `syno` (Synology DS1821+)
  - `hilbert` (Z390/i9‑9900K tower)
- Optionally **adopt** the **U6‑LR** into the UCG controller and retire the desktop controller on *galois* if adoption succeeds.

### Stage 2 — Switch‑Only 10 Gb Testing

*Note:* This stage tests 10 GbE speeds and functionality. **Ensure MTU is consistent (e.g., 1500 or 9000) across all 10 Gb hosts before benchmarking.**

- `hilbert`: add 10 Gb NIC and configure.
- `syno`: add 10 Gb NIC and configure.
- Perform all speed tests (`iperf3`, SMB multichannel, NFS, etc.).

### Stage 3 — Wi‑Fi Migration

*Note:* Pre‑liminary — details will be vetted when we get there

- Duplicate the Bell SSIDs (**Boltzmann**, **Guest18**) onto the **U6‑LR**.
- Confirm roaming; then disable Bell Wi‑Fi radios.

### Stage 4 — DHCP Handover

*Note:* Pre‑liminary — details will be vetted when we get there

- Export all reservations from the Bell GigaRouter.
- Import or manually enter them into **boole / UCG‑Fiber**.
- Switch DHCP service from Bell to UCG and verify client leases.
