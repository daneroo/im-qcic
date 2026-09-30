# Hass

Home Assistant OS deployment for home automation, running as a VM on Hilbert (Proxmox VE).

## Language

**Hass**:
Home Assistant OS, running as a Proxmox VM (id 120) on Hilbert. Controls TP-Link Kasa smart plugs (fountain, espresso machine, grinder, homelab power strip). Reachable at `hass.imetrical.com:8123`.
_Avoid_: Home Assistant, HA

**Automation**:
A Home Assistant YAML config (e.g. `fountain-automation.yaml`) declaring triggers/conditions/actions against entities — the unit of scheduled/reactive behavior in Hass.

**Backup (Hass)**:
Two independent layers: Hilbert's nightly Proxmox VM snapshot (full-VM rollback), and Home Assistant's own native configuration backup pushed to a Synology SMB share (`HomeAssistantBackups`) plus an Emergency Kit stored in 1Password.
