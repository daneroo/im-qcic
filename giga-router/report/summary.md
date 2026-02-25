# Giga Hub Extraction Summary

- generated_at: `2026-02-25T02:03:31.740889+00:00`
- host: `192.168.2.1`

## Report Files

- `active_devices.json`: Currently active devices only.
- `entities.json`: Compact metadata and counts for automation and diffs.
- `known_devices.json`: All known devices merged by MAC (active + historical).
- `raw_xpath_values.json`: Raw router payloads used for debugging (can include sensitive values).
- `reserved_by_interface.json`: Reservation-focused view grouped by interface type.
- `reserved_devices.json`: Devices flagged as DHCP reserved/static by current heuristics.
- `summary.md`: Human-readable run summary.

## Classification Notes

- interface_type values: `ethernet, guest_wifi, primary_wifi, unknown`
- guest_wifi inference: Guest is inferred from guest subnet (e.g. 192.168.5.x) and DHCP Pool[@uid='2'] hints.
- vlan note: These groups are UI/network classifications and may not exactly match underlying VLAN IDs.

## Entity Counts

- known_devices: `177`
- active_devices: `29`
- reserved_devices: `37`

## Active by Interface

- ethernet: `15`
- guest_wifi: `3`
- primary_wifi: `11`

## DHCP Reservations by Interface

- primary_wifi: `20`
- guest_wifi: `0`
- ethernet: `17`

## Reservation Table

| interface | mac | hostname | reserved_ip | current_ip | is_active |
| --- | --- | --- | --- | --- | --- |
| **primary_wifi** |  |  |  |  |  |
| primary_wifi | `A0:9A:8E:8C:D6:75` | `galileo` | `192.168.2.204` | `192.168.2.204` | `False` |
| primary_wifi | `62:A4:4F:DC:58:22` | `iPad` | `192.168.2.28` | `192.168.2.28` | `False` |
| primary_wifi | `A2:C4:F4:D9:BF:82` | `iMac` | `192.168.2.32` | `192.168.2.32` | `True` |
| primary_wifi | `5C:E9:1E:E4:6B:2E` | `Galois` | `192.168.2.34` | `192.168.2.34` | `False` |
| primary_wifi | `34:36:3B:85:BB:1E` | `Goedel` | `` | `192.168.2.35` | `False` |
| primary_wifi | `00:80:92:54:C7:71` | `cpe-139` | `` | `192.168.2.51` | `False` |
| primary_wifi | `BE:7C:DF:57:52:20` | `iPhone` | `192.168.5.13` | `192.168.5.13` | `False` |
| primary_wifi | `A2:B8:56:5D:CA:F7` | `a2:b8:56:5d:ca:f7` | `192.168.5.17` | `192.168.5.17` | `False` |
| primary_wifi | `DE:7F:EB:D2:36:26` | `de:7f:eb:d2:36:26` | `192.168.5.18` | `192.168.5.18` | `False` |
| primary_wifi | `3E:0E:63:8E:C9:98` | `3e:0e:63:8e:c9:98` | `192.168.5.19` | `192.168.5.19` | `False` |
| primary_wifi | `76:30:28:86:66:AC` | `76:30:28:86:66:ac` | `192.168.5.20` | `192.168.5.20` | `False` |
| primary_wifi | `C6:E9:07:32:F5:F7` | `c6:e9:07:32:f5:f7` | `192.168.5.21` | `192.168.5.21` | `False` |
| primary_wifi | `2E:43:8D:B5:2F:15` | `2e:43:8d:b5:2f:15` | `192.168.5.22` | `192.168.5.22` | `False` |
| primary_wifi | `76:B4:E6:00:A5:C7` | `76:b4:e6:00:a5:c7` | `192.168.5.24` | `192.168.5.24` | `False` |
| primary_wifi | `DE:AE:CA:7E:53:7D` | `de:ae:ca:7e:53:7d` | `192.168.5.25` | `192.168.5.25` | `False` |
| primary_wifi | `4A:AD:00:F3:85:6B` | `4a:ad:00:f3:85:6b` | `192.168.5.27` | `192.168.5.27` | `False` |
| primary_wifi | `06:DE:C9:14:70:2B` | `06:de:c9:14:70:2b` | `192.168.5.28` | `192.168.5.28` | `False` |
| primary_wifi | `E2:5E:C8:E4:DB:70` | `e2:5e:c8:e4:db:70` | `192.168.5.29` | `192.168.5.29` | `False` |
| primary_wifi | `42:24:A9:F2:F6:39` | `42:24:a9:f2:f6:39` | `192.168.5.30` | `192.168.5.30` | `False` |
| primary_wifi | `FE:A1:C6:84:EF:9B` | `fe:a1:c6:84:ef:9b` | `192.168.5.31` | `192.168.5.31` | `False` |
|  |  |  |  |  |  |
| **guest_wifi** |  |  |  |  |  |
| guest_wifi |  | _none_ |  |  |  |
|  |  |  |  |  |  |
| **ethernet** |  |  |  |  |  |
| ethernet | `98:B7:85:21:E9:4A` | `syno` | `192.168.2.100` | `192.168.2.100` | `True` |
| ethernet | `02:11:32:2C:5D:18` | `gateway` | `` | `192.168.2.101` | `True` |
| ethernet | `8E:FE:93:BC:7A:FD` | `bluefin` | `192.168.2.105` | `192.168.2.105` | `False` |
| ethernet | `00:11:32:FC:4A:33` | `syno` | `` | `192.168.2.109` | `False` |
| ethernet | `98:B7:85:21:EB:18` | `hilbert` | `192.168.2.110` | `192.168.2.110` | `False` |
| ethernet | `C6:41:3F:F4:0F:7F` | `feynman` | `192.168.2.111` | `192.168.2.111` | `False` |
| ethernet | `82:A1:71:54:20:4C` | `plex-audiobook` | `` | `192.168.2.112` | `True` |
| ethernet | `B2:F6:4D:B1:09:7F` | `hass` | `` | `192.168.2.113` | `True` |
| ethernet | `26:92:DC:5F:BF:A0` | `scast-hilbert` | `` | `192.168.2.114` | `True` |
| ethernet | `A8:20:66:28:C3:8A` | `a8:20:66:28:c3:8a` | `192.168.2.120` | `192.168.2.120` | `True` |
| ethernet | `7A:4C:F2:F3:B3:E8` | `d1-px1` | `` | `192.168.2.121` | `True` |
| ethernet | `40:6C:8F:19:8D:4F` | `euler` | `192.168.2.130` | `192.168.2.130` | `False` |
| ethernet | `70:70:FC:06:ED:C4` | `omarchy` | `` | `192.168.2.140` | `True` |
| ethernet | `C4:2C:03:0A:E4:3C` | `darwin` | `` | `192.168.2.30` | `True` |
| ethernet | `A8:20:66:11:4E:1F` | `dirac` | `` | `192.168.2.31` | `True` |
| ethernet | `62:F9:7B:6B:D6:B2` | `iMac` | `192.168.2.32` | `192.168.2.32` | `False` |
| ethernet | `5C:E9:1E:E3:53:5C` | `Galois` | `` | `192.168.2.33` | `True` |
|  |  |  |  |  |  |

## XPaths

### Successful

- `dhcp4_pool_1`: `Device/DHCPv4/Server/Pools/Pool[@uid='1']`
- `dhcp4_pool_1_static_addresses`: `Device/DHCPv4/Server/Pools/Pool[@uid='1']/StaticAddresses`
- `dhcp4_pool_2`: `Device/DHCPv4/Server/Pools/Pool[@uid='2']`
- `dhcp4_pool_2_static_addresses`: `Device/DHCPv4/Server/Pools/Pool[@uid='2']/StaticAddresses`
- `dhcp4_server`: `Device/DHCPv4/Server`
- `dhcp4_server_pools`: `Device/DHCPv4/Server/Pools`
- `hosts_hosts`: `Device/Hosts/Hosts`
- `hosts_root`: `Device/Hosts`
- `ip_interfaces`: `Device/IP/Interfaces`
- `wifi_access_points`: `Device/WiFi/AccessPoints`

### Failed

- `dhcp4_static_addresses`: `unknown_path`

## Notes

- Counts and reservation samples are generated from JSON report files in this directory.
- `dhcp4_static_addresses` may be `unknown_path` on this firmware; pool-specific static-address paths are used instead.
- `reserved_devices` is based on router data and current heuristics.
- Compare this summary and JSON files in git history between runs.
