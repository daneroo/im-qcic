# Giga Hub DHCP Reservation Plan

A cli, and a web ui!

## Usage

- `uv run gigahub_extract.py -h`
- `uv run gigahub_extract.py --summary`
- `uv run gigahub_extract.py --serve`

## Invocation

- `cp .env.example .env`
- Edit `.env` and set `SAGEMCOM_PASS`.
- Crawl router and write JSON + summary (default): `uv run gigahub_extract.py`
- Explicit crawl mode: `uv run gigahub_extract.py --scrape`
- Rebuild only summary from existing JSON (no router crawl): `uv run gigahub_extract.py --summary`
- Serve local UI + API (includes regenerate buttons): `uv run gigahub_extract.py --serve`
- Show flags/help: `uv run gigahub_extract.py -h`
- Optional one-off override:
  - `SAGEMCOM_PASS='...' uv run gigahub_extract.py`

## Context

- Router: **Giga Hub / Sagemcom F@st 5690**
- Firmware: **2.14**
- UI: **7.3.28**
- Router IP: `192.168.2.1`
- LAN: `192.168.2.0/24`
- UI API endpoint: `POST /cgi/json-req`

## Objective

- Extract all known entries across Primary Wi-Fi, Guest Wi-Fi, and Wired.
- Identify which entries are reserved/static.
- Provide a repeatable script to export this data.

## Tooling Rule

- Use `uv` only for dependency/runtime management.
- Do not use `pip install` in this project.
- Prefer no `pyproject.toml` for this repo.

## Task Tracker

- [x] Confirm router context and endpoint family (`/cgi/json-req`)
- [x] Confirm authenticated access and device table visibility
- [ ] Capture reservation-specific `Device/...` xpaths from UI traffic
  - [x] Primary + Wired reservation path (`Pool[@uid='1']/StaticAddresses`)
  - [x] Guest reservation path (`Pool[@uid='2']/StaticAddresses`)
  - [x] Generic static path unavailable on this firmware (`unknown_path`)
- [x] Build repeatable extractor script (`gigahub_extract.py`)
  - [x] Login/session handling
  - [x] Query host + lease + reservation paths
  - [x] Normalize records by MAC
  - [x] Export stable JSON entities + summary markdown
- [ ] Validate extraction against UI
  - [x] Device counts match UI
  - [ ] Reserved entries match UI
  - [x] 3 repeated runs keep reservation set stable
  - [ ] Failure checks: bad password, expired session, missing xpath

## Validation Criteria

1. Output contains all interfaces: `primary_wifi`, `guest_wifi`, `ethernet`.
2. Every reserved UI entry appears with `is_reserved=true`.
3. No silent drops for devices missing hostname or IP.
4. Script exits non-zero on auth/session/path failures.

## How Data Was Gathered

### Browser approach (Playwright tool)

- Logged into the modem UI and navigated live views (`dashboard`, `mynetwork`, `advancedtools/dhcp`).
- Used `My devices` + `Advanced` view to verify per-device `IP/MAC` details.
- Used dashboard and modal counts as UI ground truth:
  - Primary Wi-Fi: `11`
  - Guest Wi-Fi: `3`
  - Ethernet: `15`
  - Active total: `29`
- Used `DHCP lease table` popup to validate what the UI currently exposes directly.

### Python approach (`gigahub_extract.py`)

- Uses direct `POST /cgi/json-req` requests (same backend family as UI).
- Logs in and queries multiple `Device/...` xpaths (hosts, DHCP pools, static address lists, interfaces, Wi-Fi APs).
- Normalizes all records by MAC and classifies into `primary_wifi`, `guest_wifi`, `ethernet`, `unknown`.
- Produces deterministic, pretty-printed JSON and a markdown summary for repeatable git diffs.
- Generates `summary.md` primarily from the JSON artifacts in `report/`.

## DHCP XPath Coverage

- Working reservation sources:
  - `Device/DHCPv4/Server/Pools/Pool[@uid='1']/StaticAddresses`
  - `Device/DHCPv4/Server/Pools/Pool[@uid='2']/StaticAddresses`
- Working context paths:
  - `Device/DHCPv4/Server`
  - `Device/DHCPv4/Server/Pools`
  - `Device/DHCPv4/Server/Pools/Pool[@uid='1']`
  - `Device/DHCPv4/Server/Pools/Pool[@uid='2']`
  - `Device/Hosts/Hosts`
- Failed path:
  - `Device/DHCPv4/Server/StaticAddresses` returns `unknown_path` on this firmware/UI.
- Why this is not blocking:
  - The script still extracts reservations from the per-pool static address paths above.
  - `reserved_devices.json` and `reserved_by_interface.json` are built from those working sources.

## Assumptions And Limits

- No official per-firmware XPath schema is used here.
- Candidate paths are inferred from:
  - TR-181-style naming (`Device/...`)
  - successful parent paths discovered on this router
  - manual probing of nearby child paths
- Pool assumptions currently used:
  - `Pool[@uid='1']` is treated as default LAN (`192.168.2.x`)
  - `Pool[@uid='2']` is treated as guest LAN (`192.168.5.x`)
- Interface classification uses heuristics, not authoritative labels:
  - `192.168.5.x` and `Pool[@uid='2']` imply `guest_wifi`
  - `wifi/wlan` strings imply `primary_wifi`
  - `ethernet/wired/eth` strings imply `ethernet`
- `cpe-###` hostnames are router-generated aliases from DHCP pool client lists and can represent stale/inactive historical entries.
- Some router rows include DHCP `ClientID` values that look MAC-like but are not true 6-byte layer-2 MAC addresses.
- Known current bug/limitation:
  - conflicting evidence from multiple source paths can keep some `192.168.5.x` entries labeled `primary_wifi` instead of `guest_wifi` (merge precedence issue).
  - treat interface labels as inferred until this precedence fix lands.

### Difference between approaches

- Browser approach:
  - Best for confirming what the UI truly shows right now.
  - Good for manual validation and troubleshooting.
- Python approach:
  - Best for repeatable extraction and version-controlled outputs.
  - Captures broader structured data than the UI tables alone.
- Combined:
  - Browser validates.
  - Script operationalizes.

## Output Entities

Each run overwrites stable files in `./report/`:

- `known_devices.json`: merged known device inventory keyed by normalized MAC.
- `active_devices.json`: only currently active devices.
- `reserved_devices.json`: devices flagged reserved/static by heuristics.
- `reserved_by_interface.json`: reservation view grouped by `primary_wifi` / `guest_wifi` / `ethernet`.
- `entities.json`: metadata, xpath success/failure, and aggregate counters.
- `raw_xpath_values.json`: raw router payloads (contains sensitive data; review before commit).
- `summary.md`: human summary generated mostly from the JSON files above.
