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
cp .env.example .env        # set SAGEMCOM_PASS (same .env for both scripts)

uv run gigahub2.py --scrape    # crawl router, write report/
uv run gigahub2.py --summary   # re-render summary.md from existing JSON
uv run gigahub2.py --serve     # start web UI at http://localhost:8765
```

---

## Objective

Extract three things from the router and keep them as clean, git-diffable JSON:

1. **Networks** — which DHCP pools exist, which subnet each covers
2. **Devices** — every device the router has seen (MAC, hostname, interface, active/inactive)
3. **Reservations** — which devices have a static DHCP assignment (MAC → fixed IP)

---

## Operations

### 1. Discover Networks

**Purpose**: Determine which subnet maps to which interface label. This is static router config — it does not change at runtime.

| XPath queried                               | Key fields             | Confirmed value                     |
| ------------------------------------------- | ---------------------- | ----------------------------------- |
| `Device/DHCPv4/Server/Pools/Pool[@uid='1']` | `Alias`, `IPInterface` | `DEFAULT_POOL`, `192.168.2.1` → LAN |
| `Device/DHCPv4/Server/Pools/Pool[@uid='2']` | `Alias`, `IPInterface` | `GUEST_POOL`, `192.168.5.1` → Guest |

**Classification rule derived from this**:

| Interface label | Condition                                          |
| --------------- | -------------------------------------------------- |
| `guest_wifi`    | IP in `192.168.5.x` or source is Pool uid=2        |
| `ethernet`      | IP in `192.168.2.x` and `InterfaceType = Ethernet` |
| `primary_wifi`  | IP in `192.168.2.x` and `InterfaceType = WiFi`     |

Note: `Device/DHCPv4/Server/StaticAddresses` (flat, not pool-scoped) returns `unknown_path` on this firmware — confirmed failure, not a bug.

---

### 2. List Known Devices

**Purpose**: The router's Hosts table is the authoritative record of every device ever seen.

**XPath**: `Device/Hosts/Hosts`

**Raw schema (fields used)**:

| Raw field       | Maps to          | Notes                                     |
| --------------- | ---------------- | ----------------------------------------- |
| `PhysAddress`   | `mac`            | Canonical 6-byte MAC                      |
| `Active`        | `is_active`      | `true` = currently connected              |
| `IPAddress`     | `current_ip`     | Empty string `""` when device is inactive |
| `InterfaceType` | `interface_type` | `"Ethernet"` or `"WiFi"`                  |
| `HostName`      | `hostname`       | Router-assigned or user-set               |

**Limitation**: `IPAddress` is `""` for inactive devices. The last known IP for an inactive device is only available if a StaticAddresses reservation exists for it — the `Hosts` history sub-object is not used.

---

### 3. List DHCP Reservations

**Purpose**: Identify which devices have a manually configured fixed IP (MAC → IP binding in the router).

**XPaths**:

- `Device/DHCPv4/Server/Pools/Pool[@uid='1']/StaticAddresses` → LAN reservations
- `Device/DHCPv4/Server/Pools/Pool[@uid='2']/StaticAddresses` → Guest reservations

**Raw schema**:

| Raw field | Maps to       | Notes                                                          |
| --------- | ------------- | -------------------------------------------------------------- |
| `Chaddr`  | `mac`         | MAC of the reserved device                                     |
| `Yiaddr`  | `reserved_ip` | The fixed IP assigned to that MAC                              |
| `Enable`  | (filter)      | `true` = active reservation; `false` = stale placeholder, skip |
| `Creator` | (ignored)     | `"USER"` for manually created entries                          |

**Rule**: only entries where `Enable: true` and `Chaddr`/`Yiaddr` are non-empty are real reservations.

**Merge**: reservation records are joined to the device record by MAC. A matched device gets `reserved_ip` populated and `is_reserved: true`.

---

## Output Files

All files are written to `report/`. All JSON is canonicalized (keys sorted, lists sorted) for clean diffs.

| File                    | Contents                                   | Derived from                   |
| ----------------------- | ------------------------------------------ | ------------------------------ |
| `raw_xpath_values.json` | Verbatim router API responses              | XPath queries (unprocessed)    |
| `known_devices.json`    | All known devices, one record per MAC      | Hosts + StaticAddresses merged |
| `active_devices.json`   | Subset: `is_active: true`                  | Filtered from `known_devices`  |
| `reserved_devices.json` | Subset: `is_reserved: true`                | Filtered from `known_devices`  |
| `entities.json`         | Counts, interface breakdowns, xpath status | Aggregated from the above      |
| `summary.md`            | Human-readable report                      | Templated from JSON files      |

### Device record schema

```json
{
  "mac": "02:11:32:2C:5D:18",
  "hostname": "gateway",
  "interface_type": "ethernet",
  "current_ip": "192.168.2.101",
  "reserved_ip": "192.168.2.101",
  "is_active": true,
  "is_reserved": true,
  "source_paths": [
    "Device/Hosts/Hosts",
    "Device/DHCPv4/Server/Pools/Pool[@uid='1']/StaticAddresses"
  ]
}
```

`source_paths` lists every router XPath that contributed data to this record.

---

## Pipeline

```
POST /cgi/json-req  (router API)
        │
        ▼
raw_xpath_values.json          ← verbatim responses, one key per XPath alias
        │
        ▼
  Extract records               ← one record per MAC, fields mapped from raw schema
  Merge by MAC                  ← Hosts + StaticAddresses joined on MAC
        │
        ├──▶ known_devices.json
        ├──▶ active_devices.json   (filter: is_active=true)
        ├──▶ reserved_devices.json (filter: is_reserved=true)
        └──▶ entities.json         (counts + metadata)
                │
                ▼
          summary.md             ← markdown template rendered from JSON files
                │
                ▼
          web server             ← reads same JSON; filter/sort/refresh UI
```

The web server computes nothing. It reads the JSON files from `report/` and renders them.

- **Refresh JSON** — re-reads the existing files without hitting the router
- **Regenerate Crawl** — re-runs the full scrape, rewrites all JSON
- **Rebuild Summary** — re-renders `summary.md` from the current JSON, no router contact

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

## Known Extraction Issues

| Issue                                           | Symptom                                                | Root cause                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `reserved_ip` is null for many reserved devices | Device shows `is_reserved: true` but no `reserved_ip`  | `Yiaddr` (the actual field name in StaticAddresses) was not in the field lookup list                                |
| Guest devices labeled `primary_wifi`            | 192.168.5.x IPs appear under `primary_wifi` in reports | Merge logic won't override an existing `primary_wifi` classification with `guest_wifi` evidence from a later source |
| `is_reserved` false positives                   | RESERVED count inflated                                | Devices with `AddressSource: STATIC` (self-assigned, no router reservation) were treated as reserved                |

---

## Sensitive Data

Files in `report/` contain:

- Device MAC addresses
- Hostnames
- Internal IPv4 addresses
- Raw lease/client identifiers (`raw_xpath_values.json`)

Review before committing.

---

## Tooling

Use `uv` only. Do not use `pip install` in this project.
