# Migration Tasks — Initial Stages

- [ ] **Stage 0 — Bench Configure (online)**
  - [ ] Bench‑configure UCG
    - [x] Connect shannon (iMac) to UCG LAN port
    - [x] Access `https://192.168.1.1` and complete first‑boot wizard
    - [x] Set LAN IP = 192.168.10.1/24
    - [x] Set DHCP = on
    - [x] Set WAN = DHCP (leave unplugged)
  - [x] Patch WAN & Update Firmware
    - [x] Connect UCG WAN to Bell switch (UCG becomes a plain client, e.g. `192.168.2.178`)
    - [x] shannon got it's DHCP IP:192.168.10.183
    - [x] Access UCG via its new IP and update firmware if prompted
    - [x] Advanced tab has a Firmware: Check For updates
    - [x] Control Plane: UniFi OS section: Check for `Update` Status
      - [x] Install Update if there is one

- [ ] **Stage 1 — LAN ONLY**
  - [x] Disconnect the WAN cable from  The gatewaynow has a stathe UCG.
  - [ ] Reconfigure UCG LAN settings:
    - [x] Set LAN IP = 192.168.2.2/24
    - [x] Set DHCP = None
    - [x] Set WAN = DHCP (this setting is for future use, but ensure it's configured)
  - [x] Confirm `192.168.2.2` is not in DHCP range (192.168.2.10-254)
  - [x] Patch the Bell GigaRouter LAN into a UCG LAN port (this is the "uplink").
  - [x] Confirm any machine plugged into the UCG still gets its previous IP (via Bell DHCP) with WAN disconnected.
  - [ ] Move devices to UCG LAN ports in this order:
    - [X] `shannon` (iMac)
    - [x] `galois` (Mac mini M2 Pro)
    - [ ] `syno` (Synology DS1821+)
    - [ ] `hilbert` (Z390/i9-9900K tower)
  - [ ] (Optional) Adopt the U6-LR into the UCG controller and retire the desktop controller on *galois* if adoption succeeds.

- [ ] **Stage 2 — Switch-Only 10Gb Testing**

- [ ] **Stage 3 — Wi-Fi Migration**

- [ ] **Stage 4 — DHCP Handover**
