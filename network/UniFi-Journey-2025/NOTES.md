# Field Notes

Notes, while I execute the plan in [TASKS.md](TASKS.md)

- [x] **Stage 0 — Initial Setup (No Services)**
- set password saved to boole in 1Password
  - Control-Plane -> Console -> Advanced [x] SSH and set a password
    - added same ssh password as for login
    - `ssh root@192.168.2.2`
- set Settings/Canada/24h
- Name the UCG-Fiber : `boole`
- Edit: Networks/Default
  - Rename Network to Main
  - Router IP to 192.168.10.1/24
  - Advanced: Manual
    - DHCP : On

- [ ] **Stage 1 — LAN ONLY**
  - [X] Confirmed Giga DHCP range is 192.168.2.10-254
    - so 192.168.2.2 will not interfere with the Gig DHCP range

- [ ] **Stage 2 — Switch-Only 10 Gb Testing**

- [ ] **Stage 3 — DHCP Handover**

- [ ] **Stage 4 — Retire Bell Wi‑Fi**