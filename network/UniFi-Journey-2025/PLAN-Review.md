# Potential Issues & Mitigations for UniFi Migration

This document outlines potential problems that could arise during the network migration, based on the revised plan.

## Stage 0 — Bench Configure (online)

- All good!

## Stage 1 — LAN ONLY

- Problem: Planned Disconnection
  - Symptom: After changing the UCG's LAN IP from `192.168.10.1` to `192.168.2.2`, you will be immediately disconnected from the web console.
  - Mitigation: This is expected. Be prepared for the web UI to become unresponsive. The next step is to reconnect your computer to the main Bell network and access the UCG at its new address: `https://192.168.2.2`.

- Problem: IP Conflict on Uplink
  - Symptom: A DHCP conflict arises if the LAN-to-LAN uplink is connected before the UCG is fully reconfigured.
  - Mitigation: The order of operations is critical. **First**, configure the UCG to `192.168.2.2` with DHCP set to **OFF**. **Only then** should you connect the uplink cable from the Bell router to a UCG LAN port.

- Problem: AP Adoption Failure
  - Symptom: The U6-LR does not appear for adoption or the adoption process fails repeatedly.
  - Mitigation: This is often due to a firmware mismatch. The UCG will be on the latest firmware, while the AP may be on an older version. The solution is typically to SSH into the AP and manually trigger a firmware update before re-attempting adoption.

## Stage 2 — Switch-Only 10 Gb Testing

- Problem: Disappointing Speeds (Not 10GbE)
  - Symptom: `iperf3` or file transfer tests show speeds significantly lower than the expected 9-10Gbps.
  - Mitigation:
    - MTU Mismatch: Ensure all devices in the test path (e.g., `hilbert` and `syno`) have the same MTU setting (e.g., 1500 or 9000).
    - Faulty Cable: A bad SFP+ DAC or RJ45 cable can prevent proper 10GbE negotiation. Test with a different cable if possible.
    - Host Firewall: The built-in firewalls on Windows or Synology might be blocking the `iperf3` port (default 5201). Temporarily disable the firewalls on the test devices to rule this out.

## Stage 4 — DHCP Handover

- Problem: DHCP Server Conflict
  - Symptom: Two active DHCP servers (Bell and UCG) on the same network cause IP address chaos for clients.
  - Mitigation: The sequence is critical and must be followed precisely: **1. Turn OFF DHCP on the Bell router. 2. Turn ON DHCP on the UCG.** To speed up the transition, consider lowering the DHCP lease time on the Bell router to 10 minutes about an hour before the changeover.
