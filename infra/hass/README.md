# Home Assistant

Exploring my options for a simplified home assistant deployment.

## TODO

- [x] assign a DNS Name / DHCP Reservation
  - <http://hass.imetrical.com:8123>
- [x] enable ssh
- [x] lets'encrypt for https

## Requirements

- I want a minimal setup
- I only need to validate connecting
  - TP-Link Kasa - KP400 - Smart Outdoor Smart Plug by TP-Link (fountain+lights)
  - TP-Link Kasa - KP125M - Smart Plug x 2 (Bianca Espresso and Sette Grinder)
  - TP-link Kasa - HS300 - Smart Plug Power Strip (homelab)

- I would prefer a docker based installation, but I don't know if I will need add-ons for Kasa/TP-link devices.

- I can run docker containers on my synology
- I can run a VM on on of my (3) proxmox servers
  - Should I make it a container insode that VM?

## Home Assistant Setup

- We chose not to use pure docker on synology - as KP125M device requires Matter- server second container setup.
- Use official Home Assistant OS appliance as a Proxmox VM on “hibert” (i9-9900K)
  - Backups already in place: hibert’s Proxmox schedules & snapshots give full-VM roll-back

- Download `haos_ova-15.2.qcow2.xz` image for proxmox

```bash
# on galois
sha1sum haos_ova-15.2.qcow2.xz
b719073607edacbe267f764085a5b6861c50dee9  haos_ova-15.2.qcow2.xz

scp -p haos_ova-15.2.qcow2.xz root@hilbert.imetrical.com:/pve-storage/backups-isos/template/iso/

# on hilbert as root
cd /pve-storage/backups-isos/template/iso
sha1sum haos_ova-15.2.qcow2.xz
b719073607edacbe267f764085a5b6861c50dee9  haos_ova-15.2.qcow2.xz
unxz haos_ova-15.2.qcow2.xz      # leaves haos_ova-15.2.qcow2
```

- Create an empty shell VM in the Proxmox GUI
  - No installation media, delete the default disk.
  - Note the VMID (we used id: 120).
  - 2 cores /  4086 MB of memory
  - Default network

- Import Disk

```bash
qm importdisk 120 \
  /pve-storage/backups-isos/template/iso/haos_ova-15.2.qcow2 \
  local-zfs --format raw

# Attach as virtio-SCSI
qm set 120 --scsihw virtio-scsi-single --scsi0 local-zfs:vm-120-disk-0

# Make it the first boot device
qm set 120 --boot order=scsi0

# Set the BIOS to OVMF (UEFI):
qm set 120 --bios ovmf --efidisk0 local-zfs:32

# Proxmox defaulted to 1M, but it’s safer to use the 32M size I suggested (to avoid NVRAM corruption on UEFI upgrades).
qm resize 120 efidisk0 +31M

# Cleanup remove cd-rom
qm set 120 --delete ide2
```

## First Boot

- [x] Login with daniel/1password
- [x] import all TP-Link Kasa devices

## Current/Previous Device Setup

- I am currently using these devices from my Pixel 6
- Through the Kasa App on android
- Also Accessed through Google Home, and shared with my wife Catherin through Google Home on her iPhone

Do I need to migrate those connection, or setup afresh?

## Validation Plan

- [x] Establish connecting to Home-Assistant through web?
  - <http://192.168.2.137:8123/>
- [x] Establish connecting to Home-Assistant through mobile app(s)?
  - will that preserve current setup?
- [x] Validate manual control of devices
- [x] Validate Fountain on schedule
- [ ] Backup-restore
  - [x] Proxmox VM id:120 backup nightly
  - [x] Home Assistant native configuration backup
    - [x] Back up to SMB on Synology NAS - not locally as we have proxmox snapshots
    - Emergency Kit in 1password
