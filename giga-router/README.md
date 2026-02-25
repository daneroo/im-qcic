# Giga Hub DHCP Extraction

Extract device inventory and DHCP reservation data from a Bell Giga Hub (Sagemcom F@st 5690).

## Context

- Router: **Giga Hub / Sagemcom F@st 5690**
- Firmware: **2.14**
- UI: **7.3.28**
- Router IP: `192.168.2.1`
- LAN: `192.168.2.0/24`
- API endpoint used by the web UI: `POST /cgi/json-req`

## Objective

- List known devices across Primary Wi-Fi, Guest Wi-Fi, and Wired.
- Mark which devices are DHCP-reserved (static reservation).
- Generate repeatable JSON outputs that diff cleanly in git.

## Usage

```bash
uv run gigahub_extract.py -h
uv run gigahub_extract.py --scrape
uv run gigahub_extract.py --summary
uv run gigahub_extract.py --serve
```

## Outputs (Read These First)

All output files are in `report/`.

| file                         | type             | meaning                                             |
| ---------------------------- | ---------------- | --------------------------------------------------- |
| `raw_xpath_values.json`      | source capture   | Raw API responses captured from router paths.       |
| `known_devices.json`         | derived          | Full merged device list.                            |
| `active_devices.json`        | derived          | Subset where device is currently active.            |
| `reserved_devices.json`      | derived          | Subset where DHCP reservation is detected.          |
| `reserved_by_interface.json` | derived          | Reserved devices grouped by interface label.        |
| `entities.json`              | derived metadata | Counts and scrape success/failure per queried path. |
| `summary.md`                 | derived report   | Human-readable summary generated from JSON files.   |

## What Is Proven (Stable Facts)

These facts are stable router configuration facts, not run-time counts.

| fact                  | router path queried                         | value location in `raw_xpath_values.json` | expected value                                |
| --------------------- | ------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| LAN DHCP pool id      | `Device/DHCPv4/Server/Pools/Pool[@uid='1']` | `dhcp4_pool_1.Pool.uid`                   | `1`                                           |
| LAN DHCP pool alias   | `Device/DHCPv4/Server/Pools/Pool[@uid='1']` | `dhcp4_pool_1.Pool.Alias`                 | `DEFAULT_POOL`                                |
| LAN bridge            | `Device/DHCPv4/Server/Pools/Pool[@uid='1']` | `dhcp4_pool_1.Pool.Interface`             | `Device/IP/Interfaces/Interface[IP_BR_LAN]`   |
| LAN router IP         | `Device/DHCPv4/Server/Pools/Pool[@uid='1']` | `dhcp4_pool_1.Pool.IPInterface`           | `192.168.2.1`                                 |
| Guest DHCP pool id    | `Device/DHCPv4/Server/Pools/Pool[@uid='2']` | `dhcp4_pool_2.Pool.uid`                   | `2`                                           |
| Guest DHCP pool alias | `Device/DHCPv4/Server/Pools/Pool[@uid='2']` | `dhcp4_pool_2.Pool.Alias`                 | `GUEST_POOL`                                  |
| Guest bridge          | `Device/DHCPv4/Server/Pools/Pool[@uid='2']` | `dhcp4_pool_2.Pool.Interface`             | `Device/IP/Interfaces/Interface[IP_BR_GUEST]` |
| Guest router IP       | `Device/DHCPv4/Server/Pools/Pool[@uid='2']` | `dhcp4_pool_2.Pool.IPInterface`           | `192.168.5.1`                                 |
| ADMZ pool disabled    | `Device/DHCPv4/Server/Pools`                | `dhcp4_server_pools[]` row with `uid=3`   | `Alias=ADMZ_POOL`, `Enable=false`             |

Run-time totals are intentionally excluded from this section.

## Validation (Systematic)

### 1) Validate source capture

- Run: `uv run gigahub_extract.py --scrape`
- Check `report/entities.json`:
  - `xpath_success` has expected paths.
  - `xpath_failure` is empty or understood.

### 2) Validate pool mapping

- Check `report/raw_xpath_values.json` values listed in the "What Is Proven" table.
- This confirms LAN pool vs Guest pool mapping directly from router config.

### 3) Validate active counts vs UI

- Take UI snapshot counts at same time (Primary / Guest / Ethernet).
- Compare with `report/entities.json.active_by_interface`.
- This is time-sensitive and can drift as clients connect/disconnect.

### 4) Validate reservation extraction

- Compare UI reservation table rows with:
  - `report/reserved_devices.json`
  - `report/reserved_by_interface.json`
- Differences should be explained by stale UI rows, stale DHCP lease history, or extractor heuristics.

## Data Sources (How Outputs Are Built)

### Terms

- `path`: Router model selector sent to API (example: `Device/Hosts/Hosts`).
- `query`: One HTTP POST to `/cgi/json-req` containing one or more actions.
- `action`: One `getValue` operation for one path.
- `alias key`: Local JSON key used in `raw_xpath_values.json` for that path response.

### Queried paths

| alias key                       | router path                                                 | currently used for                                   |
| ------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `hosts_hosts`                   | `Device/Hosts/Hosts`                                        | active hosts, interface hints, hostnames, current IP |
| `hosts_root`                    | `Device/Hosts`                                              | additional host metadata                             |
| `dhcp4_server`                  | `Device/DHCPv4/Server`                                      | lease/client structures                              |
| `dhcp4_server_pools`            | `Device/DHCPv4/Server/Pools`                                | pool list and enable flags                           |
| `dhcp4_pool_1`                  | `Device/DHCPv4/Server/Pools/Pool[@uid='1']`                 | LAN pool config and lease hints                      |
| `dhcp4_pool_2`                  | `Device/DHCPv4/Server/Pools/Pool[@uid='2']`                 | Guest pool config and lease hints                    |
| `dhcp4_pool_1_static_addresses` | `Device/DHCPv4/Server/Pools/Pool[@uid='1']/StaticAddresses` | LAN reservation hints                                |
| `dhcp4_pool_2_static_addresses` | `Device/DHCPv4/Server/Pools/Pool[@uid='2']/StaticAddresses` | Guest reservation hints                              |
| `ip_interfaces`                 | `Device/IP/Interfaces`                                      | interface metadata                                   |
| `wifi_access_points`            | `Device/WiFi/AccessPoints`                                  | wifi metadata                                        |

Known failing candidate path:

- alias `dhcp4_static_addresses`
- path `Device/DHCPv4/Server/StaticAddresses`
- router result `unknown_path`

## Assumptions and Limits

- No official vendor path catalog was available; path list is empirical.
- Some identifiers may be DHCP `ClientID` values and not canonical 6-byte MAC addresses.
- Router hostnames like `cpe-###` are often generic placeholders.
- Interface labels in derived files are heuristic when source fields are ambiguous.

## Sensitive Data Notes

Review before committing `report/` files:

- device MAC addresses
- hostnames
- internal IPv4 addresses
- raw lease/client identifiers in `raw_xpath_values.json`

## Protocol Details (Optional)

This section is only needed if reimplementing extractor logic.

- Transport: `POST /cgi/json-req`
- Body: form-encoded field `req=<json string>`
- Action style: `{"method":"getValue","xpath":"Device/..."}`
- The script issues multiple `getValue` actions and writes each response into `raw_xpath_values.json` under its alias key.

## Tooling Rule

Use `uv` only in this project. Do not use `pip install` here.
