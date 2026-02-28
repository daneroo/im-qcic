# Giga Hub DHCP Extraction

Extract device inventory and DHCP reservation data from a Bell Giga Hub (Sagemcom F@st 5690).

## Router

| Property     | Value                         |
| ------------ | ----------------------------- |
| Model        | Giga Hub / Sagemcom F@st 5690 |
| Firmware     | 2.14                          |
| UI           | 7.3.28                        |
| IP           | `192.168.2.1`                 |
| API endpoint | `POST /cgi/json-req`          |

## Usage

```bash
cp .env.example .env        # set SAGEMCOM_PASS

uv run gigahub.py --scrape    # crawl router, write report/
uv run gigahub.py --summary   # re-render summary.md from existing JSON
uv run gigahub.py --serve     # start web UI at http://localhost:8765
```

---

## Objective

Extract three things from the router and keep them as clean, git-diffable JSON:

1. **Networks** — which DHCP pools exist, which subnet each covers
2. **Devices** — every device the router has seen (MAC, hostname, network, medium, online/offline)
3. **Reservations** — which devices have a static DHCP assignment (MAC → fixed IP)

---

## Operations

### 1. Discover Networks

**Purpose**: Determine which subnet maps to which pool. This is static router config — it does not change at runtime.

| XPath queried                               | Key fields             | Confirmed value                     |
| ------------------------------------------- | ---------------------- | ----------------------------------- |
| `Device/DHCPv4/Server/Pools/Pool[@uid='1']` | `Alias`, `IPInterface` | `DEFAULT_POOL`, `192.168.2.1` → LAN |
| `Device/DHCPv4/Server/Pools/Pool[@uid='2']` | `Alias`, `IPInterface` | `GUEST_POOL`, `192.168.5.1` → Guest |

**Classification rules**:

| `network` value | Condition                                       |
| --------------- | ----------------------------------------------- |
| `"lan"`         | IP in `192.168.2.x` or source is Pool uid=1     |
| `"guest"`       | IP in `192.168.5.x` or source is Pool uid=2     |
| `null`          | IP absent or doesn't match either known subnet  |

| `medium` value  | Condition                                       |
| --------------- | ----------------------------------------------- |
| `"ethernet"`    | `InterfaceType` contains `"ethernet"` or `"eth"` |
| `"wifi"`        | `InterfaceType` contains `"wifi"`, `"wireless"`, or `"wlan"` |
| `null`          | `InterfaceType` absent or unrecognized          |

Note: `Device/DHCPv4/Server/StaticAddresses` (flat, not pool-scoped) returns `unknown_path` on this firmware — confirmed failure, not a bug.

---

### 2. List Known Devices

**Purpose**: The router's Hosts table is the authoritative record of every device ever seen.

**XPath**: `Device/Hosts/Hosts`

**Raw schema (fields used)**:

| Raw field       | Maps to      | Notes                                     |
| --------------- | ------------ | ----------------------------------------- |
| `PhysAddress`   | `mac`        | Canonical 6-byte MAC                      |
| `IPAddress`     | `current_ip` | Empty string `""` when device is inactive |
| `InterfaceType` | `medium`     | `"Ethernet"` or `"WiFi"`                  |
| `HostName`      | `hostname`   | Router-assigned or user-set               |

**Limitation**: `IPAddress` is `""` for inactive devices. A device with no current IP gets `current_ip: null`.

---

### 3. List DHCP Reservations

**Purpose**: Identify which devices have a manually configured fixed IP (MAC → IP binding in the router).

**XPaths**:

- `Device/DHCPv4/Server/Pools/Pool[@uid='1']/StaticAddresses` → LAN reservations
- `Device/DHCPv4/Server/Pools/Pool[@uid='2']/StaticAddresses` → Guest reservations

**Raw schema**:

| Raw field | Maps to       | Notes                                                           |
| --------- | ------------- | --------------------------------------------------------------- |
| `Chaddr`  | `mac`         | MAC of the reserved device                                      |
| `Yiaddr`  | `reserved_ip` | The fixed IP assigned to that MAC                               |
| `Enable`  | (filter)      | `true` = active reservation; `false` = stale placeholder, skip |
| `Creator` | (ignored)     | `"USER"` for manually created entries                           |

**Rule**: only entries where `Enable: true` and `Chaddr`/`Yiaddr` are non-empty are real reservations.

**Merge**: reservation records are joined to the device record by MAC. Pool UID is authoritative for `network` classification. MACs that appear in reservations but never in the Hosts table get a stub record (`current_ip: null`).

---

## Output Files

All files are written to `report/`. JSON is canonicalized (keys sorted) for clean diffs, except `devices.json` which preserves IP sort order.

| File          | Contents                                      |
| ------------- | --------------------------------------------- |
| `raw.json`    | Verbatim router API responses                 |
| `devices.json`| All devices, one record per MAC (IP-sorted)   |
| `meta.json`   | Metadata: generated_at, host, networks, xpaths|
| `summary.md`  | Human-readable report                         |

### Device record schema

```json
{
  "mac":         "02:11:32:2C:5D:18",
  "hostname":    "gateway",
  "network":     "lan",
  "medium":      "ethernet",
  "current_ip":  "192.168.2.101",
  "reserved_ip": "192.168.2.101"
}
```

| Field         | Values                        | Meaning                                       |
| ------------- | ----------------------------- | --------------------------------------------- |
| `network`     | `"lan"` \| `"guest"` \| `null`| Which DHCP pool / subnet                      |
| `medium`      | `"ethernet"` \| `"wifi"` \| `null` | Physical connection type                 |
| `current_ip`  | IP string \| `null`           | Non-null = currently online                   |
| `reserved_ip` | IP string \| `null`           | Non-null = has a StaticAddresses entry        |

---

## Pipeline

```
POST /cgi/json-req  (router API)
        │
        ▼
    raw.json               ← verbatim responses, one key per XPath alias
        │
        ▼
  Extract records           ← one record per MAC, fields mapped from raw schema
  Merge by MAC              ← Hosts + StaticAddresses joined on MAC
        │                      (reservation-only MACs get stub records)
        ├──▶ devices.json
        └──▶ meta.json     ← counts, network config, xpaths
                │
                ▼
          summary.md        ← markdown rendered from JSON files
                │
                ▼
          web server         ← reads same JSON; filter/sort/refresh UI
```

The web server computes nothing from the router. It reads the JSON files from `report/` and renders them.

- **Refresh** — re-reads the existing files without hitting the router
- **Crawl** — re-runs the full scrape, rewrites all JSON
- **Summary** — re-renders `summary.md` from the current JSON, no router contact

---

## Validated Facts

These are confirmed stable router config values, not runtime counts.

| Fact               | XPath                         | Field              | Value                                         |
| ------------------ | ----------------------------- | ------------------ | --------------------------------------------- |
| LAN pool id        | `Pool[@uid='1']`              | `Pool.uid`         | `1`                                           |
| LAN pool alias     | `Pool[@uid='1']`              | `Pool.Alias`       | `DEFAULT_POOL`                                |
| LAN bridge         | `Pool[@uid='1']`              | `Pool.Interface`   | `Device/IP/Interfaces/Interface[IP_BR_LAN]`   |
| LAN router IP      | `Pool[@uid='1']`              | `Pool.IPInterface` | `192.168.2.1`                                 |
| Guest pool id      | `Pool[@uid='2']`              | `Pool.uid`         | `2`                                           |
| Guest pool alias   | `Pool[@uid='2']`              | `Pool.Alias`       | `GUEST_POOL`                                  |
| Guest bridge       | `Pool[@uid='2']`              | `Pool.Interface`   | `Device/IP/Interfaces/Interface[IP_BR_GUEST]` |
| Guest router IP    | `Pool[@uid='2']`              | `Pool.IPInterface` | `192.168.5.1`                                 |
| ADMZ pool disabled | `Pools` (uid=3)               | `Enable`           | `false`                                       |
| Flat static addr   | `StaticAddresses` (top-level) | —                  | `unknown_path` (firmware limitation)          |

---

## Sensitive Data

Files in `report/` contain:

- Device MAC addresses
- Hostnames
- Internal IPv4 addresses
- Raw lease/client identifiers (`raw.json`)

Review before committing.

---

## Tooling

Use `uv` only. Do not use `pip install` in this project.
