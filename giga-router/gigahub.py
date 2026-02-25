#!/usr/bin/env -S uv run
# /// script
# dependencies = [
#   "aiohttp>=3.10.0",
#   "sagemcom-api==1.4.3",
# ]
# ///
"""
Giga Hub DHCP Extraction — Bell Sagemcom F@st 5690

Usage:
  uv run gigahub2.py --scrape    # crawl router, write report/
  uv run gigahub2.py --summary   # re-render summary.md from existing JSON
  uv run gigahub2.py --serve     # web UI at http://localhost:8765
"""

from __future__ import annotations

import asyncio
import argparse
import hashlib
import json
import os
import random
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from aiohttp import ClientSession, ClientTimeout, TCPConnector, web
from sagemcom_api.enums import EncryptionMethod


# ── Constants ──────────────────────────────────────────────────────────────────

LAN_SUBNET   = "192.168.2."
GUEST_SUBNET = "192.168.5."
API_PATH     = "/cgi/json-req"

# XPaths queried. Keys become aliases in raw.json.
XPATHS: dict[str, str] = {
    "pool_1":        "Device/DHCPv4/Server/Pools/Pool[@uid='1']",
    "pool_2":        "Device/DHCPv4/Server/Pools/Pool[@uid='2']",
    "hosts":         "Device/Hosts/Hosts",
    "pool_1_static": "Device/DHCPv4/Server/Pools/Pool[@uid='1']/StaticAddresses",
    "pool_2_static": "Device/DHCPv4/Server/Pools/Pool[@uid='2']/StaticAddresses",
}

MAC6_RE = re.compile(r"^[0-9A-F]{2}(:[0-9A-F]{2}){5}$")


# ── Utilities ──────────────────────────────────────────────────────────────────

def load_dotenv(path: Path = Path(".env")) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip())


def load_config() -> dict[str, Any]:
    load_dotenv()
    enc_str = os.getenv("SAGEMCOM_ENC", "SHA512").upper()
    enc = EncryptionMethod.SHA512 if enc_str == "SHA512" else EncryptionMethod.MD5
    return {
        "host":       os.getenv("SAGEMCOM_HOST", "192.168.2.1"),
        "username":   os.getenv("SAGEMCOM_USER", "admin"),
        "password":   os.getenv("SAGEMCOM_PASS", ""),
        "encryption": enc,
        "ssl":        os.getenv("SAGEMCOM_SSL", "false").lower() == "true",
        "verify_ssl": os.getenv("SAGEMCOM_VERIFY_SSL", "false").lower() == "true",
        "out_dir":    Path(os.getenv("GIGAHUB_OUT_DIR", "./report")),
    }


def normalize_mac(raw: str | None) -> str | None:
    """Normalize to uppercase colon-separated 6-byte MAC, or None if invalid."""
    if not raw:
        return None
    parts = raw.strip().split(":")
    # DHCP Client ID: leading type byte "01" + 6-byte MAC
    if len(parts) == 7 and parts[0].lower() == "01":
        parts = parts[1:]
    if len(parts) != 6:
        return None
    mac = ":".join(p.upper().zfill(2) for p in parts)
    return mac if MAC6_RE.match(mac) else None


def classify_network(ip: str | None, pool_uid: int | None = None) -> str | None:
    if pool_uid == 2 or (ip and ip.startswith(GUEST_SUBNET)):
        return "guest"
    if pool_uid == 1 or (ip and ip.startswith(LAN_SUBNET)):
        return "lan"
    return None


def classify_medium(raw_type: str) -> str | None:
    t = (raw_type or "").lower()
    if "ethernet" in t or t == "eth":
        return "ethernet"
    if "wifi" in t or "wireless" in t or "wlan" in t:
        return "wifi"
    return None


def canonicalize(data: Any) -> Any:
    """Recursively sort dicts by key and lists by JSON repr for stable diffs."""
    if isinstance(data, dict):
        return {k: canonicalize(v) for k, v in sorted(data.items())}
    if isinstance(data, list):
        items = [canonicalize(i) for i in data]
        try:
            return sorted(items, key=lambda x: json.dumps(x, sort_keys=True))
        except TypeError:
            return items
    return data


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(canonicalize(data), indent=2) + "\n")


# ── Router client ──────────────────────────────────────────────────────────────

class RouterClient:
    def __init__(
        self,
        host: str,
        username: str,
        password: str,
        authentication_method: EncryptionMethod,
        ssl: bool,
        verify_ssl: bool,
    ) -> None:
        self.host = host
        self.username = username
        self.authentication_method = authentication_method
        self.protocol = "https" if ssl else "http"
        self.verify_ssl = verify_ssl
        self._password_hash = self._hash(password)
        self._session_id = 0
        self._server_nonce = ""
        self._request_id = -1
        self._current_nonce = 0
        self.session: ClientSession | None = None

    def _hash(self, value: str) -> str:
        raw = value.encode("utf-8")
        if self.authentication_method == EncryptionMethod.SHA512:
            return hashlib.sha512(raw).hexdigest()
        return hashlib.md5(raw).hexdigest()  # noqa: S324

    def _generate_auth_key(self) -> str:
        credential_hash = self._hash(
            f"{self.username}:{self._server_nonce}:{self._password_hash}"
        )
        auth_string = (
            f"{credential_hash}:{self._request_id}:{self._current_nonce}:JSON:{API_PATH}"
        )
        return self._hash(auth_string)

    async def __aenter__(self) -> "RouterClient":
        connector = TCPConnector(ssl=self.verify_ssl)
        self.session = ClientSession(
            timeout=ClientTimeout(total=30),
            connector=connector,
            headers={"User-Agent": "python-requests/2.31.0"},
        )
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self.session:
            await self.session.close()

    async def _post(self, actions: list[dict[str, Any]], priority: bool = False) -> dict[str, Any]:
        assert self.session, "Session not started"
        self._request_id += 1
        self._current_nonce = random.randrange(0, 500000)
        payload = {
            "request": {
                "id": self._request_id,
                "session-id": int(self._session_id),
                "priority": priority,
                "actions": actions,
                "cnonce": self._current_nonce,
                "auth-key": self._generate_auth_key(),
            }
        }
        url = f"{self.protocol}://{self.host}{API_PATH}"
        async with self.session.post(url, data={"req": json.dumps(payload, separators=(",", ":"))}) as resp:
            raw = await resp.read()
            text = raw.decode("utf-8", errors="replace")
            if resp.status != 200:
                raise RuntimeError(f"HTTP {resp.status}: {text[:300]}")
            try:
                return json.loads(text)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Invalid JSON from router: {exc}") from exc

    @staticmethod
    def _response_error(result: dict[str, Any]) -> str:
        return result.get("reply", {}).get("error", {}).get("description", "UNKNOWN")

    @staticmethod
    def _response_value(result: dict[str, Any]) -> Any:
        return (
            result.get("reply", {})
            .get("actions", [{}])[0]
            .get("callbacks", [{}])[0]
            .get("parameters", {})
            .get("value")
        )

    async def login(self) -> None:
        result = await self._post([{
            "id": 0,
            "method": "logIn",
            "parameters": {
                "user": self.username,
                "persistent": True,
                "session-options": {
                    "nss": [{"name": "gtw", "uri": "http://sagemcom.com/gateway-data"}],
                    "language": "ident",
                    "context-flags": {"get-content-name": True, "local-time": True},
                    "capability-depth": 2,
                    "capability-flags": {
                        "name": True,
                        "default-value": False,
                        "restriction": True,
                        "description": False,
                    },
                    "time-format": "ISO_8601",
                    "write-only-string": "_XMO_WRITE_ONLY_",
                    "undefined-write-only-string": "_XMO_UNDEFINED_WRITE_ONLY_",
                },
            },
        }], priority=True)
        err = self._response_error(result)
        if err not in ("XMO_REQUEST_NO_ERR", "Ok"):
            raise RuntimeError(f"Login failed: {err}")
        params = (
            result.get("reply", {}).get("actions", [{}])[0]
            .get("callbacks", [{}])[0].get("parameters", {})
        )
        sid = params.get("id")
        nonce = params.get("nonce")
        if sid is None or nonce is None:
            raise RuntimeError(f"Login response missing session data: {params}")
        self._session_id = sid
        self._server_nonce = nonce

    async def get_value(self, xpath: str) -> Any:
        result = await self._post([{"id": 0, "method": "getValue", "xpath": xpath, "options": {}}])
        err = self._response_error(result)
        if err == "XMO_REQUEST_NO_ERR":
            return self._response_value(result)
        if err == "XMO_REQUEST_ACTION_ERR":
            action_err = (
                result.get("reply", {}).get("actions", [{}])[0]
                .get("error", {}).get("description", "UNKNOWN")
            )
            if action_err == "XMO_UNKNOWN_PATH_ERR":
                raise KeyError(f"unknown_path: {xpath}")
            raise RuntimeError(f"Action error for {xpath}: {action_err}")
        raise RuntimeError(f"Request error for {xpath}: {err}")


# ── Operation 1: Discover Networks ────────────────────────────────────────────

async def get_networks(client: RouterClient) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    Query both DHCP pool configs to establish subnet → network mapping.
    Returns (networks_by_uid, raw).
    """
    raw: dict[str, Any] = {}
    networks: dict[str, Any] = {}

    for alias in ("pool_1", "pool_2"):
        value = await client.get_value(XPATHS[alias])
        raw[alias] = value
        pool = value.get("Pool") if isinstance(value, dict) else None
        if not isinstance(pool, dict):
            continue
        uid = str(pool.get("uid", ""))
        if uid:
            networks[uid] = {
                "uid":          uid,
                "alias":        pool.get("Alias"),
                "interface":    pool.get("Interface"),
                "ip_interface": pool.get("IPInterface"),
                "min_address":  pool.get("MinAddress"),
                "max_address":  pool.get("MaxAddress"),
                "enabled":      bool(pool.get("Enable", True)),
            }

    return networks, raw


# ── Operation 2: List Known Devices ───────────────────────────────────────────

async def get_devices(client: RouterClient) -> tuple[list[dict[str, Any]], Any]:
    """
    Query Device/Hosts/Hosts for all known devices.
    Fields used: PhysAddress → mac, IPAddress, InterfaceType, HostName.
    Returns (devices, raw_hosts).
    """
    raw = await client.get_value(XPATHS["hosts"])
    hosts = raw if isinstance(raw, list) else []

    devices: list[dict[str, Any]] = []
    seen: set[str] = set()

    for host in hosts:
        if not isinstance(host, dict):
            continue
        mac = normalize_mac(host.get("PhysAddress"))
        if not mac or mac in seen:
            continue
        seen.add(mac)

        current_ip = host.get("IPAddress") or None
        history    = host.get("History") if isinstance(host.get("History"), dict) else {}
        hostname   = (
            host.get("UserHostName")
            or host.get("HostName")
            or history.get("HostName")
            or None
        )

        devices.append({
            "mac":         mac,
            "hostname":    hostname or None,
            "network":     classify_network(current_ip),
            "medium":      classify_medium(host.get("InterfaceType", "")),
            "current_ip":  current_ip,
            "reserved_ip": None,
        })

    return devices, raw


# ── Operation 3: List DHCP Reservations ───────────────────────────────────────

async def get_reservations(
    client: RouterClient,
) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    """
    Query StaticAddresses for both pools.
    Fields used: Chaddr → mac, Yiaddr → reserved_ip, Enable (filter: true only).
    Returns (reservations_by_mac, raw).
    """
    raw: dict[str, Any] = {}
    reservations: dict[str, dict[str, Any]] = {}

    for pool_uid, alias in ((1, "pool_1_static"), (2, "pool_2_static")):
        value = await client.get_value(XPATHS[alias])
        raw[alias] = value

        if isinstance(value, list):
            entries = value
        elif isinstance(value, dict):
            entries = next((v for v in value.values() if isinstance(v, list)), [])
        else:
            entries = []

        for entry in entries:
            if not isinstance(entry, dict) or not entry.get("Enable"):
                continue
            chaddr = entry.get("Chaddr", "")
            yiaddr = entry.get("Yiaddr", "")
            if not chaddr or not yiaddr:
                continue
            mac = normalize_mac(chaddr)
            if not mac:
                continue
            reservations[mac] = {
                "reserved_ip": yiaddr,
                "pool":        pool_uid,
            }

    return reservations, raw


# ── Merge ──────────────────────────────────────────────────────────────────────

def _ip_sort_key(device: dict[str, Any]) -> tuple:
    ip = device.get("current_ip") or device.get("reserved_ip") or ""
    try:
        return (tuple(int(x) for x in ip.split(".")), device.get("mac", ""))
    except (ValueError, AttributeError):
        return ((999, 999, 999, 999), device.get("mac", ""))


def merge(
    devices: list[dict[str, Any]],
    reservations: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Join reservation data onto device records by MAC.
    Pool UID is authoritative for network classification.
    Reservation-only MACs (never seen in Hosts table) get a stub record.
    """
    by_mac = {d["mac"]: d for d in devices}
    for mac, res in reservations.items():
        if mac in by_mac:
            by_mac[mac]["reserved_ip"] = res["reserved_ip"]
            # Pool is authoritative for network classification
            by_mac[mac]["network"] = "guest" if res["pool"] == 2 else "lan"
        else:
            # Reservation-only MAC: create stub
            by_mac[mac] = {
                "mac":         mac,
                "hostname":    None,
                "network":     "guest" if res["pool"] == 2 else "lan",
                "medium":      None,
                "current_ip":  None,
                "reserved_ip": res["reserved_ip"],
            }
    return sorted(by_mac.values(), key=_ip_sort_key)


# ── Reports ────────────────────────────────────────────────────────────────────

def write_reports(
    devices: list[dict[str, Any]],
    networks: dict[str, Any],
    raw: dict[str, Any],
    host: str,
    out_dir: Path,
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    meta = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "host":         host,
        "networks":     networks,
        "xpaths":       XPATHS,
    }

    write_json(out_dir / "raw.json",     raw)
    (out_dir / "devices.json").write_text(json.dumps(devices, indent=2) + "\n")
    write_json(out_dir / "meta.json",    meta)


# ── Summary ────────────────────────────────────────────────────────────────────

def build_summary_md(out_dir: Path) -> str:
    def load(name: str, default: Any) -> Any:
        try:
            return json.loads((out_dir / name).read_text())
        except Exception:
            return default

    devices  = load("devices.json", [])
    meta     = load("meta.json", {})
    networks = meta.get("networks", {})
    active   = [d for d in devices if d.get("current_ip")]
    reserved = [d for d in devices if d.get("reserved_ip")]

    active_by_network: dict[str, int] = {}
    for d in active:
        k = d.get("network") or "unknown"
        active_by_network[k] = active_by_network.get(k, 0) + 1

    lines = [
        "# Giga Hub Report",
        "",
        f"- generated_at: `{meta.get('generated_at', 'unknown')}`",
        f"- host: `{meta.get('host', 'unknown')}`",
        "",
        "## Totals",
        "",
        "| known | active | reserved |",
        "| ----- | ------ | -------- |",
        f"| {len(devices)} | {len(active)} | {len(reserved)} |",
        "",
        "## Active by Network",
        "",
    ]
    lines += [f"- `{k}`: {v}" for k, v in sorted(active_by_network.items())]
    lines.append("")

    if networks:
        lines += ["## Networks", ""]
        for uid, net in sorted(networks.items()):
            state = "enabled" if net.get("enabled") else "disabled"
            lines.append(
                f"- Pool {uid} (`{net.get('alias')}`): `{net.get('ip_interface')}` — {state}"
            )
        lines.append("")

    if reserved:
        lines += [
            "## Reserved Devices",
            "",
            "| MAC | Hostname | Reserved IP | Network | Online |",
            "| --- | -------- | ----------- | ------- | ------ |",
        ]
        for d in reserved:
            online_str = "yes" if d.get("current_ip") else "no"
            lines.append(
                f"| `{d.get('mac')}` | {d.get('hostname') or '—'} "
                f"| `{d.get('reserved_ip')}` | {d.get('network') or '—'} | {online_str} |"
            )
        lines.append("")

    return "\n".join(lines)


def write_summary(out_dir: Path) -> None:
    (out_dir / "summary.md").write_text(build_summary_md(out_dir))


# ── Web UI ─────────────────────────────────────────────────────────────────────

def build_html() -> str:
    return """<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Giga Hub</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: { mono: ['ui-monospace','SFMono-Regular','Menlo','Monaco','monospace'] },
          colors: {
            surface: { DEFAULT: 'var(--s0)', 1: 'var(--s1)', 2: 'var(--s2)', 3: 'var(--s3)' },
            border:  { DEFAULT: 'var(--b)',  muted: 'var(--bm)' },
            tx:      { 1: 'var(--t1)', 2: 'var(--t2)', 3: 'var(--t3)', 4: 'var(--t4)' },
          }
        }
      }
    }
  </script>
  <style>
    /* ── Colour tokens ── */
    :root {
      --s0:#ffffff; --s1:#f8fafc; --s2:#f1f5f9; --s3:#e2e8f0;
      --b:#e2e8f0;  --bm:#f1f5f9;
      --t1:#0f172a; --t2:#475569; --t3:#94a3b8; --t4:#cbd5e1;
    }
    html.dark {
      --s0:#0f1117; --s1:#161b27; --s2:#1c2333; --s3:#242d40;
      --b:#2a3449;  --bm:#1e2a3a;
      --t1:#e2e8f0; --t2:#94a3b8; --t3:#64748b; --t4:#475569;
    }
    *, *::before, *::after { transition: background-color .15s, border-color .15s, color .15s; }
    /* ── Chip base ── */
    .ci { display:inline-flex; padding:1px 6px; border-radius:4px; font-size:.7rem; font-weight:500; border:1px solid; }
    /* ── Network chips ── */
    .cn-lan   { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
    .cn-guest { background:#fff7ed; color:#c2410c; border-color:#fed7aa; }
    html.dark .cn-lan   { background:#0d1f3e; color:#60a5fa; border-color:#1e3a5f; }
    html.dark .cn-guest { background:#1f1007; color:#fb923c; border-color:#7c2d12; }
    /* ── Medium chips ── */
    .cm-eth  { background:#f0fdf4; color:#15803d; border-color:#bbf7d0; }
    .cm-wifi { background:#f5f3ff; color:#6d28d9; border-color:#ddd6fe; }
    html.dark .cm-eth  { background:#052e16; color:#4ade80; border-color:#14532d; }
    html.dark .cm-wifi { background:#1e1030; color:#a78bfa; border-color:#4c1d95; }
    /* ── Unknown chip ── */
    .ci-unk { background:var(--s3); color:var(--t3); border-color:var(--b); }
    /* ── Toast types ── */
    #toast[data-type="working"]{ background:var(--s2); border-color:var(--b); }
    #toast[data-type="success"]{ background:#f0fdf4; border-color:#86efac; color:#166534; }
    #toast[data-type="error"]  { background:#fef2f2; border-color:#fca5a5; color:#991b1b; }
    html.dark #toast[data-type="working"]{ background:var(--s2); border-color:#1d4ed8; }
    html.dark #toast[data-type="success"]{ background:#052e16; border-color:#166534; color:#4ade80; }
    html.dark #toast[data-type="error"]  { background:#450a0a; border-color:#991b1b; color:#fca5a5; }
  </style>
  <style type="text/tailwindcss">
    @layer base { body { @apply bg-surface text-tx-1 font-mono antialiased; } }
    @layer components {
      .btn      { @apply inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-surface; }
      .btn-blue { @apply btn bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white focus:ring-blue-500; }
      .btn-ghost{ @apply btn bg-surface-2 hover:bg-surface-3 border border-border text-tx-1 focus:ring-tx-3; }
      .card     { @apply bg-surface-1 rounded-xl border border-border-muted p-5; }
      .input    { @apply bg-surface-2 border border-border rounded-md px-3 py-1.5 text-xs text-tx-1 placeholder-tx-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors; }
      .th       { @apply py-2.5 pr-4 text-xs text-tx-3 uppercase tracking-wider font-medium text-left cursor-pointer select-none hover:text-tx-2 transition-colors whitespace-nowrap; }
      .td       { @apply py-2.5 pr-4 text-sm align-middle; }
    }
  </style>
</head>
<body class="min-h-screen">

  <!-- Crawl progress bar -->
  <div id="progress-bar" class="fixed top-0 left-0 right-0 h-0.5 z-50 hidden overflow-hidden bg-surface-1">
    <div class="h-full bg-blue-500 animate-pulse w-full"></div>
  </div>

  <!-- Toast -->
  <div id="toast" data-type="working"
       class="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 opacity-0 translate-y-3 pointer-events-none">
    <svg id="toast-spinner" class="hidden w-4 h-4 animate-spin text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12" stroke-linecap="round"/>
    </svg>
    <span id="toast-icon" class="shrink-0 text-base leading-none"></span>
    <span id="toast-msg"  class="text-sm leading-snug"></span>
    <button onclick="hideToast()" class="ml-1 text-tx-3 hover:text-tx-1 text-lg leading-none shrink-0">×</button>
  </div>

  <!-- Header -->
  <header class="border-b border-border-muted bg-surface-1 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
    <div class="max-w-screen-2xl mx-auto px-6 h-12 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="text-blue-500">⬡</span>
        <span class="text-sm font-semibold text-tx-1 tracking-tight">Giga Hub</span>
        <span id="host-label" class="text-xs text-tx-4"></span>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-theme"   class="btn-ghost" title="Toggle theme">🌙</button>
        <button id="btn-refresh" class="btn-ghost">↻ Refresh</button>
        <button id="btn-summary" class="btn-ghost">Summary</button>
        <button id="btn-crawl"   class="btn-blue">⚡ Crawl</button>
      </div>
    </div>
  </header>

  <div class="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

    <!-- Metrics -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card">
        <div class="text-xs text-tx-3 uppercase tracking-wider mb-1">Known</div>
        <div id="m-known" class="text-4xl font-bold text-tx-1 tabular-nums">—</div>
      </div>
      <div class="card">
        <div class="text-xs text-tx-3 uppercase tracking-wider mb-1">Active</div>
        <div id="m-active" class="text-4xl font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">—</div>
        <div id="m-active-detail" class="text-xs text-tx-4 mt-1 leading-relaxed"></div>
      </div>
      <div class="card">
        <div class="text-xs text-tx-3 uppercase tracking-wider mb-1">Reserved</div>
        <div id="m-reserved" class="text-4xl font-bold text-blue-500 dark:text-blue-400 tabular-nums">—</div>
        <div id="m-reserved-detail" class="text-xs text-tx-4 mt-1 leading-relaxed"></div>
      </div>
      <div class="card">
        <div class="text-xs text-tx-3 uppercase tracking-wider mb-1">Generated</div>
        <div id="m-generated" class="text-sm text-tx-2 mt-1 leading-relaxed">—</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3">
      <select id="filter-network" class="input">
        <option value="all">All networks</option>
        <option value="lan">lan</option>
        <option value="guest">guest</option>
      </select>
      <select id="filter-medium" class="input">
        <option value="all">All media</option>
        <option value="ethernet">ethernet</option>
        <option value="wifi">wifi</option>
      </select>
      <label class="flex items-center gap-2 text-xs text-tx-2 cursor-pointer hover:text-tx-1 transition-colors">
        <input type="checkbox" id="filter-reserved" class="accent-blue-500 w-3.5 h-3.5"> Reserved only
      </label>
      <label class="flex items-center gap-2 text-xs text-tx-2 cursor-pointer hover:text-tx-1 transition-colors">
        <input type="checkbox" id="filter-active" class="accent-emerald-500 w-3.5 h-3.5"> Active only
      </label>
      <label class="flex items-center gap-2 text-xs text-tx-2 cursor-pointer hover:text-tx-1 transition-colors">
        <input type="checkbox" id="filter-group" class="accent-blue-500 w-3.5 h-3.5" checked> Group by network
      </label>
      <input id="filter-search" type="text" placeholder="Search MAC, hostname, IP…" class="input w-56 ml-auto">
    </div>

    <!-- Table -->
    <div class="bg-surface-1 rounded-xl border border-border-muted overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border-muted bg-surface-2">
              <th class="th pl-5" data-col="mac">MAC <span class="sort-arrow"></span></th>
              <th class="th"      data-col="hostname">Hostname <span class="sort-arrow"></span></th>
              <th class="th"      data-col="current_ip">Current IP <span class="sort-arrow"></span></th>
              <th class="th"      data-col="reserved_ip">Reserved IP <span class="sort-arrow"></span></th>
              <th class="th"      data-col="network">Network <span class="sort-arrow"></span></th>
              <th class="th pr-5" data-col="medium">Medium</th>
            </tr>
          </thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
      <div id="table-empty" class="hidden py-16 text-center text-tx-3 text-sm">
        No devices match the current filters.
      </div>
      <div id="table-count" class="px-5 py-2.5 border-t border-border-muted text-xs text-tx-4"></div>
    </div>

  </div>

<script>
// ── State ──────────────────────────────────────────────────────────────────────
let allDevices = [];
let sortCol = 'current_ip';
let sortAsc  = true;
const filters = { network: 'all', medium: 'all', reservedOnly: false, activeOnly: false, group: true, search: '' };

// ── Theme ──────────────────────────────────────────────────────────────────────
function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  document.getElementById('btn-theme').textContent = dark ? '🌙' : '☀️';
  localStorage.setItem('gh-theme', dark ? 'dark' : 'light');
}
// Default dark; restore from localStorage if set
applyTheme(localStorage.getItem('gh-theme') !== 'light');
document.getElementById('btn-theme').addEventListener('click', () =>
  applyTheme(!document.documentElement.classList.contains('dark')));

// ── Chip helpers ───────────────────────────────────────────────────────────────
const NET_CLASS = { lan: 'cn-lan', guest: 'cn-guest' };
const MED_CLASS = { ethernet: 'cm-eth', wifi: 'cm-wifi' };
const networkChip = (n) =>
  `<span class="ci ${NET_CLASS[n] || 'ci-unk'}">${esc(n || '—')}</span>`;
const mediumChip = (m) =>
  `<span class="ci ${MED_CLASS[m] || 'ci-unk'}">${esc(m || '—')}</span>`;

// ── Utils ──────────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const ipToNum = (ip) => ip ? ip.split('.').reduce((a,b) => a*256+(+b||0), 0) : Infinity;

// ── Fetch / load ───────────────────────────────────────────────────────────────
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
async function loadData() {
  const [devices, meta] = await Promise.all([
    fetchJSON('/api/devices'), fetchJSON('/api/meta'),
  ]);
  allDevices = devices;
  updateMetrics(devices, meta);
  renderTable();
}

// ── Metrics ────────────────────────────────────────────────────────────────────
function updateMetrics(devices, meta) {
  const active   = devices.filter(d => d.current_ip);
  const reserved = devices.filter(d => d.reserved_ip);
  const countBy  = (arr, key) => arr.reduce((acc, d) => {
    const k = d[key] || 'unknown'; acc[k] = (acc[k] || 0) + 1; return acc;
  }, {});
  document.getElementById('m-known').textContent    = devices.length;
  document.getElementById('m-active').textContent   = active.length;
  document.getElementById('m-reserved').textContent = reserved.length;
  document.getElementById('m-active-detail').textContent   = Object.entries(countBy(active,   'network')).map(([k,v])=>`${k}: ${v}`).join(' · ') || '';
  document.getElementById('m-reserved-detail').textContent = Object.entries(countBy(reserved, 'network')).map(([k,v])=>`${k}: ${v}`).join(' · ') || '';
  document.getElementById('host-label').textContent = meta.host ? `· ${meta.host}` : '';
  const gen = meta.generated_at ? new Date(meta.generated_at) : null;
  document.getElementById('m-generated').textContent =
    gen ? gen.toLocaleString(undefined, {dateStyle:'medium', timeStyle:'short'}) : '—';
}

// ── Sort / filter ──────────────────────────────────────────────────────────────
function sortDevices(list) {
  return [...list].sort((a, b) => {
    let va = a[sortCol] ?? '', vb = b[sortCol] ?? '';
    if (sortCol === 'current_ip' || sortCol === 'reserved_ip') { va = ipToNum(va); vb = ipToNum(vb); }
    return (va < vb ? -1 : va > vb ? 1 : 0) * (sortAsc ? 1 : -1);
  });
}
function applyFilters(list) {
  return list.filter(d => {
    if (filters.network !== 'all' && d.network !== filters.network) return false;
    if (filters.medium  !== 'all' && d.medium  !== filters.medium)  return false;
    if (filters.reservedOnly && !d.reserved_ip) return false;
    if (filters.activeOnly   && !d.current_ip)  return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = [d.mac,d.hostname,d.current_ip,d.reserved_ip].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ── Render ─────────────────────────────────────────────────────────────────────
const NET_ORDER = ['lan', 'guest', ''];

function renderTable() {
  const filtered = applyFilters(allDevices);
  const tbody = document.getElementById('table-body');
  const empty = document.getElementById('table-empty');
  const count = document.getElementById('table-count');
  if (!filtered.length) {
    tbody.innerHTML = ''; empty.classList.remove('hidden'); count.textContent = ''; return;
  }
  empty.classList.add('hidden');
  count.textContent = `${filtered.length} device${filtered.length !== 1 ? 's' : ''}`;

  let rows;
  if (filters.group) {
    const groups = {};
    for (const d of filtered) { const k = d.network || ''; (groups[k]=groups[k]||[]).push(d); }
    const keys = [...NET_ORDER.filter(k=>groups[k]), ...Object.keys(groups).filter(k=>!NET_ORDER.includes(k))];
    rows = keys.flatMap(net => {
      const sorted = sortDevices(groups[net]);
      return [`<tr class="border-y border-border-muted bg-surface-2"><td colspan="6" class="pl-5 py-2 text-xs">${networkChip(net||null)}<span class="ml-2 text-tx-4">${sorted.length} ${sorted.length===1?'device':'devices'}</span></td></tr>`,
              ...sorted.map(deviceRow)];
    });
  } else {
    rows = sortDevices(filtered).map(deviceRow);
  }
  tbody.innerHTML = rows.join('');
  document.querySelectorAll('th[data-col] .sort-arrow').forEach(el => {
    el.textContent = el.closest('th').dataset.col === sortCol ? (sortAsc?' ↑':' ↓') : '';
  });
}

function deviceRow(d) {
  return `<tr class="border-b border-border-muted hover:bg-surface-2 transition-colors duration-75">
    <td class="td pl-5 text-tx-3 tabular-nums" title="${esc(d.mac)}">${esc(d.mac)}</td>
    <td class="td text-tx-1 font-medium">${esc(d.hostname??'—')}</td>
    <td class="td text-tx-2 tabular-nums">${esc(d.current_ip??'')}</td>
    <td class="td text-tx-2 tabular-nums">${esc(d.reserved_ip??'')}</td>
    <td class="td">${networkChip(d.network)}</td>
    <td class="td pr-5">${mediumChip(d.medium)}</td>
  </tr>`;
}

// ── Toast ──────────────────────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg, {type='info', spinner=false, icon='', autoDismiss=0}={}) {
  const el = document.getElementById('toast');
  el.dataset.type = type;
  document.getElementById('toast-spinner').classList.toggle('hidden', !spinner);
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent  = msg;
  el.classList.remove('opacity-0','translate-y-3','pointer-events-none');
  el.classList.add('opacity-100','translate-y-0');
  if (_toastTimer) clearTimeout(_toastTimer);
  if (autoDismiss) _toastTimer = setTimeout(hideToast, autoDismiss);
}
function hideToast() {
  const el = document.getElementById('toast');
  el.classList.add('opacity-0','translate-y-3','pointer-events-none');
  el.classList.remove('opacity-100','translate-y-0');
}

// ── Actions ────────────────────────────────────────────────────────────────────
const BTN_IDS = ['btn-refresh','btn-crawl','btn-summary','btn-theme'];
const lockButtons   = () => BTN_IDS.forEach(id => document.getElementById(id).disabled = true);
const unlockButtons = () => BTN_IDS.forEach(id => document.getElementById(id).disabled = false);

document.getElementById('btn-refresh').addEventListener('click', async () => {
  lockButtons(); showToast('Refreshing…', {type:'working', spinner:true});
  try { await loadData(); hideToast(); }
  catch (e) { showToast('Refresh failed: '+e.message, {type:'error', icon:'✗', autoDismiss:8000}); }
  finally { unlockButtons(); }
});

document.getElementById('btn-crawl').addEventListener('click', async () => {
  const btn = document.getElementById('btn-crawl');
  btn.innerHTML = '<svg class="inline w-3.5 h-3.5 animate-spin mr-1" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12" stroke-linecap="round"/></svg>Crawling…';
  document.getElementById('progress-bar').classList.remove('hidden');
  lockButtons(); showToast('Crawling router…', {type:'working', spinner:true});
  try {
    const r = await fetch('/api/scrape', {method:'POST'});
    if (!r.ok) throw new Error(await r.text());
    const stats = await r.json();
    await loadData();
    showToast(`Done — ${stats.known} known · ${stats.active} active · ${stats.reserved} reserved`,
              {type:'success', icon:'✓', autoDismiss:6000});
  } catch (e) {
    showToast('Crawl failed: '+e.message, {type:'error', icon:'✗', autoDismiss:10000});
  } finally {
    btn.innerHTML = '⚡ Crawl';
    document.getElementById('progress-bar').classList.add('hidden');
    unlockButtons();
  }
});

document.getElementById('btn-summary').addEventListener('click', async () => {
  lockButtons(); showToast('Rebuilding summary…', {type:'working', spinner:true});
  try {
    const r = await fetch('/api/summary', {method:'POST'});
    if (!r.ok) throw new Error(await r.text());
    showToast('summary.md rebuilt', {type:'success', icon:'✓', autoDismiss:4000});
  }
  catch (e) { showToast('Failed: '+e.message, {type:'error', icon:'✗', autoDismiss:8000}); }
  finally { unlockButtons(); }
});

// ── Filter wiring ──────────────────────────────────────────────────────────────
document.getElementById('filter-network').addEventListener('change',  e => { filters.network = e.target.value; renderTable(); });
document.getElementById('filter-medium').addEventListener('change',   e => { filters.medium = e.target.value; renderTable(); });
document.getElementById('filter-reserved').addEventListener('change', e => { filters.reservedOnly = e.target.checked; renderTable(); });
document.getElementById('filter-active').addEventListener('change',   e => { filters.activeOnly = e.target.checked; renderTable(); });
document.getElementById('filter-group').addEventListener('change',    e => { filters.group = e.target.checked; renderTable(); });
document.getElementById('filter-search').addEventListener('input',    e => { filters.search = e.target.value; renderTable(); });
document.querySelectorAll('th[data-col]').forEach(th =>
  th.addEventListener('click', () => {
    if (sortCol === th.dataset.col) sortAsc = !sortAsc; else { sortCol = th.dataset.col; sortAsc = true; }
    renderTable();
  }));

// ── Boot ───────────────────────────────────────────────────────────────────────
loadData();
</script>
</body>
</html>"""


# ── Web server ─────────────────────────────────────────────────────────────────

def build_web_app(config: dict, out_dir: Path) -> web.Application:
    _lock = asyncio.Lock()

    async def handle_index(_: web.Request) -> web.Response:
        return web.Response(text=build_html(), content_type="text/html")

    async def handle_devices(_: web.Request) -> web.Response:
        p = out_dir / "devices.json"
        return web.json_response(json.loads(p.read_text()) if p.exists() else [])

    async def handle_meta(_: web.Request) -> web.Response:
        p = out_dir / "meta.json"
        return web.json_response(json.loads(p.read_text()) if p.exists() else {})

    async def handle_summary_md(_: web.Request) -> web.Response:
        p = out_dir / "summary.md"
        return web.Response(text=p.read_text() if p.exists() else "", content_type="text/plain")

    async def handle_summary_rebuild(_: web.Request) -> web.Response:
        write_summary(out_dir)
        return web.json_response({"ok": True})

    async def handle_scrape(_: web.Request) -> web.Response:
        if _lock.locked():
            return web.json_response({"error": "crawl already in progress"}, status=409)
        async with _lock:
            stats = await _do_scrape(config, out_dir)
        return web.json_response(stats)

    async def handle_report(req: web.Request) -> web.FileResponse:
        path = out_dir / req.match_info["filename"]
        if not path.exists() or not path.is_file():
            raise web.HTTPNotFound()
        return web.FileResponse(path)

    app = web.Application()
    app.router.add_get( "/",                  handle_index)
    app.router.add_get( "/api/devices",       handle_devices)
    app.router.add_get( "/api/meta",          handle_meta)
    app.router.add_get( "/api/summary-md",    handle_summary_md)
    app.router.add_post("/api/summary",       handle_summary_rebuild)
    app.router.add_post("/api/scrape",        handle_scrape)
    app.router.add_get( "/report/{filename}", handle_report)
    return app


# ── Scrape pipeline ────────────────────────────────────────────────────────────

async def _do_scrape(config: dict, out_dir: Path) -> dict[str, Any]:
    t0 = datetime.now(timezone.utc)
    print(f"[{t0.isoformat()}] crawl start  host={config['host']}")
    raw: dict[str, Any] = {}

    async with RouterClient(
        host=config["host"],
        username=config["username"],
        password=config["password"],
        authentication_method=config["encryption"],
        ssl=config["ssl"],
        verify_ssl=config["verify_ssl"],
    ) as client:
        await client.login()

        networks, networks_raw = await get_networks(client)
        raw.update(networks_raw)

        devices, hosts_raw = await get_devices(client)
        raw["hosts"] = hosts_raw

        reservations, res_raw = await get_reservations(client)
        raw.update(res_raw)

    devices = merge(devices, reservations)
    write_reports(devices, networks, raw, config["host"], out_dir)
    write_summary(out_dir)

    stats = {
        "known":    len(devices),
        "active":   sum(1 for d in devices if d.get("current_ip")),
        "reserved": sum(1 for d in devices if d.get("reserved_ip")),
    }
    elapsed = (datetime.now(timezone.utc) - t0).total_seconds()
    print(f"[{datetime.now(timezone.utc).isoformat()}] crawl done   known={stats['known']} active={stats['active']} reserved={stats['reserved']} elapsed={elapsed:.1f}s")
    return stats


# ── CLI ────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Extract DHCP device data from Giga Hub / Sagemcom F@st 5690."
    )
    p.add_argument("--scrape",  action="store_true", help="Crawl router and write report/ (default)")
    p.add_argument("--summary", action="store_true", help="Re-render summary.md from existing JSON")
    p.add_argument("--serve",   action="store_true", help="Start web UI server")
    p.add_argument("--bind",    default="0.0.0.0",   metavar="HOST", help="Bind address (default: 0.0.0.0)")
    p.add_argument("--port",    type=int, default=8765, help="Port (default: 8765)")
    return p.parse_args()


def main() -> None:
    args    = parse_args()
    config  = load_config()
    out_dir = config["out_dir"]

    if args.summary:
        write_summary(out_dir)
        print(f"Wrote {out_dir}/summary.md")
        return

    if args.serve:
        app = build_web_app(config, out_dir)
        print(f"Serving at http://localhost:{args.port}")
        web.run_app(app, host=args.bind, port=args.port, print=lambda *_: None)
        return

    # Default: --scrape
    stats = asyncio.run(_do_scrape(config, out_dir))
    print(f"known={stats['known']}  active={stats['active']}  reserved={stats['reserved']}")
    print(f"Wrote reports to {out_dir}/")


if __name__ == "__main__":
    main()
