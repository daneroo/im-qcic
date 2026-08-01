# Network/UniFi-Journey-2025

An active (2025) staged migration plan from the Bell Giga Hub to Ubiquiti UniFi gear, including a 10GbE backbone upgrade for the homelab.

## Language

**Boole**:
A new host — the UCG-Fiber (UniFi Cloud Gateway Fiber), replacing the Giga Hub as the homelab's router. Continues the household's mathematician-naming convention (see `CONTEXT-MAP.md`). Credentials in 1Password under "boole (UCG-Fiber)".

**UCG-Fiber**:
The specific Ubiquiti router model being migrated to. Provides a built-in 4-port 2.5GbE managed switch (one PoE+) plus 3x 10GbE-capable LAN ports.

**10GbE backbone**:
The target wiring: Boole connects via 10GbE SFP+ DAC to both Syno and Hilbert's NICs, and via PoE+ RJ45 to a U6-LR access point. Everything else stays on gigabit switches.
