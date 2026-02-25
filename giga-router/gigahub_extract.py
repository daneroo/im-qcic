#!/usr/bin/env -S uv run
# /// script
# dependencies = [
#   "aiohttp>=3.10.0",
#   "sagemcom-api==1.4.3",
# ]
# ///
"""
Extract known devices and DHCP reservation hints from Bell Giga Hub.

Usage:
  cp .env.example .env
  # set SAGEMCOM_PASS in .env
  uv run gigahub_extract.py
  uv run gigahub_extract.py --summary
  uv run gigahub_extract.py --serve
"""

from __future__ import annotations

import asyncio
import argparse
import hashlib
import json
import os
import random
import re
import sys
from collections.abc import Iterable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from aiohttp import ClientSession, ClientTimeout, TCPConnector, web
from sagemcom_api.enums import EncryptionMethod

API_ENDPOINT = "/cgi/json-req"


CANDIDATE_XPATHS: dict[str, str] = {
    "hosts_hosts": "Device/Hosts/Hosts",
    "hosts_root": "Device/Hosts",
    "dhcp4_server": "Device/DHCPv4/Server",
    "dhcp4_server_pools": "Device/DHCPv4/Server/Pools",
    "dhcp4_pool_1": "Device/DHCPv4/Server/Pools/Pool[@uid='1']",
    "dhcp4_pool_2": "Device/DHCPv4/Server/Pools/Pool[@uid='2']",
    "dhcp4_static_addresses": "Device/DHCPv4/Server/StaticAddresses",
    "dhcp4_pool_1_static_addresses": "Device/DHCPv4/Server/Pools/Pool[@uid='1']/StaticAddresses",
    "dhcp4_pool_2_static_addresses": "Device/DHCPv4/Server/Pools/Pool[@uid='2']/StaticAddresses",
    "ip_interfaces": "Device/IP/Interfaces",
    "wifi_access_points": "Device/WiFi/AccessPoints",
}


def load_dotenv(path: Path = Path(".env")) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        os.environ.setdefault(key, value)


def parse_enc(name: str) -> EncryptionMethod:
    key = name.strip().upper()
    try:
        return EncryptionMethod[key]
    except KeyError:
        valid = ", ".join(e.name for e in EncryptionMethod)
        raise SystemExit(f"Unknown SAGEMCOM_ENC={key}. Valid: {valid}")


def env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() not in ("0", "false", "no", "off")


def write_json(path: Path, value: Any) -> None:
    canonical = canonicalize(value)
    path.write_text(json.dumps(canonical, indent=2, sort_keys=True) + "\n")


def canonicalize(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: canonicalize(value[k]) for k in sorted(value)}
    if isinstance(value, list):
        normalized = [canonicalize(v) for v in value]
        return sorted(
            normalized,
            key=lambda v: json.dumps(v, sort_keys=True, separators=(",", ":")),
        )
    return value


def normalize_mac(value: Any) -> str:
    if not value:
        return ""
    s = str(value).strip().upper()
    # DHCP client-id can be MAC prefixed with 0x01.
    if re.fullmatch(r"[0-9A-F]{14}", s) and s.startswith("01"):
        s = s[2:]
    if re.fullmatch(r"01(?::[0-9A-F]{2}){6}", s):
        s = s[3:]
    if re.fullmatch(r"[0-9A-F]{12}", s):
        return ":".join(s[i : i + 2] for i in range(0, 12, 2))
    return s


def normalize_interface(value: Any) -> str:
    s = str(value or "").strip().lower()
    if "guest" in s:
        return "guest_wifi"
    if "ethernet" in s or "wired" in s or "eth" in s:
        return "ethernet"
    if "wifi" in s or "wireless" in s or "wlan" in s:
        return "primary_wifi"
    return "unknown"


def guess_interface_from_path(path: str) -> str:
    p = path.lower()
    if "pool[@uid='2']" in p:
        return "guest_wifi"
    if "guest" in p:
        return "guest_wifi"
    if "ethernet" in p or "wired" in p or "eth" in p:
        return "ethernet"
    if "wifi" in p:
        return "primary_wifi"
    return "unknown"


def infer_reserved_from_value(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    s = str(value).strip().lower()
    return s in ("true", "1", "yes", "enabled", "reserved", "static")


def pick_first(d: dict[str, Any], keys: Iterable[str]) -> Any:
    for key in keys:
        if key in d and d[key] not in (None, ""):
            return d[key]
    return None


def flatten_dict_keys(d: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in d.items():
        raw = str(key)
        low = raw.lower()
        snake = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", raw)
        snake = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", snake).replace("-", "_").lower()
        compact = snake.replace("_", "")
        out[low] = value
        out[snake] = value
        out[compact] = value
    return out


def walk_nodes(node: Any, out: list[dict[str, Any]]) -> None:
    if isinstance(node, dict):
        out.append(node)
        for value in node.values():
            walk_nodes(value, out)
        return
    if isinstance(node, list):
        for item in node:
            walk_nodes(item, out)


def extract_records_from_node(node: dict[str, Any], source_path: str) -> dict[str, Any] | None:
    n = flatten_dict_keys(node)
    mac = normalize_mac(
        pick_first(
            n,
            (
                "phys_address",
                "mac",
                "mac_address",
                "chaddr",
                "physaddress",
                "client_id",
            ),
        )
    )
    if not mac:
        return None

    current_ip = pick_first(
        n,
        (
            "ip_address",
            "ip",
            "ipv4_address",
            "current_ip",
            "address",
        ),
    )
    reserved_ip = pick_first(
        n,
        (
            "reserved_ip",
            "static_ip",
            "fixed_ip",
            "reservation_ip",
        ),
    )
    hostname = pick_first(
        n,
        (
            "user_host_name",
            "host_name",
            "hostname",
            "alias",
            "name",
        ),
    )

    interface_raw = pick_first(
        n,
        (
            "interface_type",
            "layer1_interface",
            "layer3_interface",
            "network",
            "interface",
        ),
    )
    interface_type = normalize_interface(interface_raw)
    if interface_type == "unknown":
        interface_type = guess_interface_from_path(source_path)

    # Parse nested IPv4 arrays commonly returned by DHCP/host structures.
    if not current_ip:
        ipv4_items = pick_first(n, ("ipv4_addresses", "ipv4addresses", "ip_addresses", "ipaddresses"))
        if isinstance(ipv4_items, list):
            for item in ipv4_items:
                if not isinstance(item, dict):
                    continue
                item_n = flatten_dict_keys(item)
                candidate = pick_first(item_n, ("ip_address", "ipaddress", "address"))
                if candidate:
                    current_ip = candidate
                    break

    if not reserved_ip:
        reserved_items = pick_first(
            n,
            (
                "reserved_ipv4_addresses",
                "reservedipv4addresses",
                "static_ipv4_addresses",
                "staticipv4addresses",
            ),
        )
        if isinstance(reserved_items, list):
            for item in reserved_items:
                if not isinstance(item, dict):
                    continue
                item_n = flatten_dict_keys(item)
                candidate = pick_first(item_n, ("ip_address", "ipaddress", "address"))
                if candidate:
                    reserved_ip = candidate
                    break

    # Force guest classification for guest subnet/pool hints.
    if isinstance(current_ip, str) and current_ip.startswith("192.168.5."):
        interface_type = "guest_wifi"
    if "pool[@uid='2']" in source_path.lower():
        interface_type = "guest_wifi"

    reserved_hints = [
        n.get("is_reserved"),
        n.get("reserved"),
        n.get("reservation"),
        n.get("static"),
        n.get("address_source"),
        "static" if "static" in source_path.lower() else None,
        "reserved" if "reserv" in source_path.lower() else None,
    ]
    is_reserved = any(infer_reserved_from_value(v) for v in reserved_hints if v is not None)
    if not reserved_ip and is_reserved and current_ip:
        reserved_ip = current_ip

    return {
        "mac": mac,
        "hostname": hostname,
        "interface_type": interface_type,
        "current_ip": current_ip,
        "reserved_ip": reserved_ip,
        "is_reserved": bool(is_reserved),
        "is_active": n.get("active"),
        "source_paths": [source_path],
    }


def merge_record(records: dict[str, dict[str, Any]], incoming: dict[str, Any]) -> None:
    mac = incoming["mac"]
    current = records.get(mac)
    if not current:
        records[mac] = incoming
        return

    for key in ("hostname", "current_ip", "reserved_ip"):
        if not current.get(key) and incoming.get(key):
            current[key] = incoming[key]
    if current.get("interface_type") == "unknown" and incoming.get("interface_type") != "unknown":
        current["interface_type"] = incoming["interface_type"]
    current["is_reserved"] = bool(current.get("is_reserved") or incoming.get("is_reserved"))
    if current.get("is_active") is None and incoming.get("is_active") is not None:
        current["is_active"] = incoming["is_active"]
    for source_path in incoming.get("source_paths", []):
        if source_path not in current["source_paths"]:
            current["source_paths"].append(source_path)


class JsonReqClient:
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
        self.password = password
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
        if self.authentication_method == EncryptionMethod.MD5:
            return hashlib.md5(raw).hexdigest()  # noqa: S324
        return value

    def _generate_auth_key(self) -> str:
        credential_hash = self._hash(f"{self.username}:{self._server_nonce}:{self._password_hash}")
        auth_string = f"{credential_hash}:{self._request_id}:{self._current_nonce}:JSON:{API_ENDPOINT}"
        return self._hash(auth_string)

    async def __aenter__(self) -> "JsonReqClient":
        connector = TCPConnector(ssl=self.verify_ssl)
        self.session = ClientSession(
            timeout=ClientTimeout(total=30),
            connector=connector,
            headers={"User-Agent": "python-requests/2.31.0"},
        )
        return self

    async def __aexit__(self, exc_type, exc_value, traceback) -> None:
        if self.session:
            await self.session.close()

    async def _post(self, actions: list[dict[str, Any]], priority: bool = False) -> dict[str, Any]:
        if not self.session:
            raise RuntimeError("Session not started")
        self._request_id += 1
        self._current_nonce = random.randrange(0, 500000)
        auth_key = self._generate_auth_key()

        payload = {
            "request": {
                "id": self._request_id,
                "session-id": int(self._session_id),
                "priority": priority,
                "actions": actions,
                "cnonce": self._current_nonce,
                "auth-key": auth_key,
            }
        }
        api_host = f"{self.protocol}://{self.host}{API_ENDPOINT}"
        form_data = {"req": json.dumps(payload, separators=(",", ":"))}

        async with self.session.post(api_host, data=form_data) as response:
            raw = await response.read()
            text = raw.decode("utf-8", errors="replace")
            if response.status != 200:
                raise RuntimeError(f"HTTP {response.status}: {text[:300]}")
            try:
                return json.loads(text)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Invalid JSON from router: {exc}; sample={text[:300]}") from exc

    @staticmethod
    def _response_error(result: dict[str, Any]) -> str:
        return result.get("reply", {}).get("error", {}).get("description", "UNKNOWN")

    @staticmethod
    def _response_value(result: dict[str, Any], index: int = 0) -> Any:
        return (
            result.get("reply", {})
            .get("actions", [{}])[index]
            .get("callbacks", [{}])[0]
            .get("parameters", {})
            .get("value")
        )

    async def login(self) -> None:
        action = {
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
        }
        result = await self._post([action], priority=True)
        error = self._response_error(result)
        if error not in ("XMO_REQUEST_NO_ERR", "Ok"):
            raise RuntimeError(f"Login failed: {error}")
        params = (
            result.get("reply", {})
            .get("actions", [{}])[0]
            .get("callbacks", [{}])[0]
            .get("parameters", {})
        )
        sid = params.get("id")
        nonce = params.get("nonce")
        if sid is None or nonce is None:
            raise RuntimeError(f"Login response missing session data: {params}")
        self._session_id = sid
        self._server_nonce = nonce

    async def get_value(self, xpath: str, options: dict[str, Any] | None = None) -> Any:
        action = {
            "id": 0,
            "method": "getValue",
            "xpath": xpath,
            "options": options or {},
        }
        result = await self._post([action], priority=False)
        error = self._response_error(result)
        if error == "XMO_REQUEST_NO_ERR":
            return self._response_value(result)
        if error == "XMO_REQUEST_ACTION_ERR":
            action_error = (
                result.get("reply", {})
                .get("actions", [{}])[0]
                .get("error", {})
                .get("description", "UNKNOWN")
            )
            if action_error == "XMO_UNKNOWN_PATH_ERR":
                raise KeyError("unknown_path")
            raise RuntimeError(f"Action error for {xpath}: {action_error}")
        raise RuntimeError(f"Request error for {xpath}: {error}")


def count_by_interface(rows: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        key = row.get("interface_type", "unknown") or "unknown"
        counts[key] = counts.get(key, 0) + 1
    return dict(sorted(counts.items()))


def build_reserved_by_interface(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        key = row.get("interface_type", "unknown") or "unknown"
        grouped.setdefault(key, []).append(
            {
                "mac": row.get("mac"),
                "hostname": row.get("hostname"),
                "reserved_ip": row.get("reserved_ip"),
                "current_ip": row.get("current_ip"),
                "is_active": row.get("is_active"),
            }
        )
    for key in grouped:
        grouped[key] = sorted(
            grouped[key],
            key=lambda r: (
                str(r.get("reserved_ip") or ""),
                str(r.get("current_ip") or ""),
                str(r.get("mac") or ""),
            ),
        )
    return dict(sorted(grouped.items()))


def build_entities_payload(
    *,
    generated_at: str,
    host: str,
    known_rows: list[dict[str, Any]],
    active_rows: list[dict[str, Any]],
    reserved_rows: list[dict[str, Any]],
    successes: dict[str, str],
    failures: dict[str, str],
    reserved_by_interface_entries: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    return {
        "generated_at": generated_at,
        "host": host,
        "classification_notes": {
            "interface_type_values": ["primary_wifi", "guest_wifi", "ethernet", "unknown"],
            "guest_wifi_inference": "Guest is inferred from guest subnet (e.g. 192.168.5.x) and DHCP Pool[@uid='2'] hints.",
            "vlan_note": "These groups are UI/network classifications and may not exactly match underlying VLAN IDs.",
        },
        "output_files": {
            "known_devices.json": "All known devices merged by MAC (active + historical).",
            "active_devices.json": "Currently active devices only.",
            "reserved_devices.json": "Devices flagged as DHCP reserved/static by current heuristics.",
            "reserved_by_interface.json": "Reservation-focused view grouped by interface type.",
            "entities.json": "Compact metadata and counts for automation and diffs.",
            "summary.md": "Human-readable run summary.",
            "raw_xpath_values.json": "Raw router payloads used for debugging (can include sensitive values).",
        },
        "entities": {
            "known_devices": len(known_rows),
            "active_devices": len(active_rows),
            "reserved_devices": len(reserved_rows),
        },
        "active_by_interface": count_by_interface(active_rows),
        "reserved_by_interface": count_by_interface(reserved_rows),
        "reserved_by_interface_entries": reserved_by_interface_entries,
        "xpath_success": dict(sorted(successes.items())),
        "xpath_failure": dict(sorted(failures.items())),
    }


def build_summary_markdown_from_reports(report_dir: Path) -> str:
    def load_report_json(filename: str, default: Any) -> Any:
        path = report_dir / filename
        try:
            return json.loads(path.read_text())
        except Exception:
            return default

    entities = load_report_json("entities.json", {})
    known_rows = load_report_json("known_devices.json", [])
    active_rows = load_report_json("active_devices.json", [])
    reserved_rows = load_report_json("reserved_devices.json", [])
    reserved_by_interface_entries = load_report_json("reserved_by_interface.json", {})

    if not isinstance(entities, dict):
        entities = {}
    if not isinstance(known_rows, list):
        known_rows = []
    if not isinstance(active_rows, list):
        active_rows = []
    if not isinstance(reserved_rows, list):
        reserved_rows = []
    if not isinstance(reserved_by_interface_entries, dict):
        reserved_by_interface_entries = {}

    output_files = entities.get("output_files", {})
    if not isinstance(output_files, dict):
        output_files = {}

    classification_notes = entities.get("classification_notes", {})
    if not isinstance(classification_notes, dict):
        classification_notes = {}

    active_by_interface = entities.get("active_by_interface")
    if not isinstance(active_by_interface, dict):
        active_by_interface = count_by_interface(active_rows)

    reserved_by_interface = entities.get("reserved_by_interface")
    if not isinstance(reserved_by_interface, dict):
        reserved_by_interface = {}
    if not reserved_by_interface:
        reserved_by_interface = {
            key: len(entries) if isinstance(entries, list) else 0
            for key, entries in reserved_by_interface_entries.items()
        }
    if not reserved_by_interface:
        reserved_by_interface = count_by_interface(reserved_rows)

    interface_order = ["primary_wifi", "guest_wifi", "ethernet"]
    for iface in interface_order:
        reserved_by_interface.setdefault(iface, 0)
        reserved_by_interface_entries.setdefault(iface, [])

    xpath_success = entities.get("xpath_success", {})
    if not isinstance(xpath_success, dict):
        xpath_success = {}
    xpath_failure = entities.get("xpath_failure", {})
    if not isinstance(xpath_failure, dict):
        xpath_failure = {}

    def md_cell(value: Any) -> str:
        if value is None:
            return ""
        return str(value).replace("|", "\\|").replace("\n", " ").strip()

    lines = [
        "# Giga Hub Extraction Summary",
        "",
        f"- generated_at: `{entities.get('generated_at', 'unknown')}`",
        f"- host: `{entities.get('host', 'unknown')}`",
        "",
        "## Report Files",
        "",
    ]
    for name, description in sorted(output_files.items()):
        lines.append(f"- `{name}`: {description}")

    lines.extend(
        [
            "",
            "## Classification Notes",
            "",
            f"- interface_type values: `{', '.join(classification_notes.get('interface_type_values', []))}`",
            f"- guest_wifi inference: {classification_notes.get('guest_wifi_inference', 'n/a')}",
            f"- vlan note: {classification_notes.get('vlan_note', 'n/a')}",
            "",
            "## Entity Counts",
            "",
            f"- known_devices: `{len(known_rows)}`",
            f"- active_devices: `{len(active_rows)}`",
            f"- reserved_devices: `{len(reserved_rows)}`",
            "",
            "## Active by Interface",
            "",
        ]
    )
    for key, value in sorted(active_by_interface.items()):
        lines.append(f"- {key}: `{value}`")

    lines.extend(["", "## DHCP Reservations by Interface", ""])
    for key in interface_order:
        value = reserved_by_interface.get(key, 0)
        lines.append(f"- {key}: `{value}`")
    for key, value in sorted(reserved_by_interface.items()):
        if key in interface_order:
            continue
        lines.append(f"- {key}: `{value}`")

    lines.extend(
        [
            "",
            "## Reservation Table",
            "",
            "| interface | mac | hostname | reserved_ip | current_ip | is_active |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
    )
    if reserved_by_interface_entries:
        table_interfaces: list[str] = interface_order + sorted(
            k for k in reserved_by_interface_entries if k not in interface_order
        )
        for interface_name in table_interfaces:
            entries = reserved_by_interface_entries.get(interface_name, [])
            lines.append(f"| **{md_cell(interface_name)}** |  |  |  |  |  |")
            if entries:
                for row in entries:
                    lines.append(
                        "| {interface} | `{mac}` | `{host}` | `{reserved_ip}` | `{current_ip}` | `{active}` |".format(
                            interface=md_cell(interface_name),
                            mac=md_cell(row.get("mac")),
                            host=md_cell(row.get("hostname")),
                            reserved_ip=md_cell(row.get("reserved_ip")),
                            current_ip=md_cell(row.get("current_ip")),
                            active=md_cell(row.get("is_active")),
                        )
                    )
            else:
                lines.append(f"| {md_cell(interface_name)} |  | _none_ |  |  |  |")
            lines.append("|  |  |  |  |  |  |")
    else:
        lines.append("| _none_ |  |  |  |  |  |")

    lines.extend(["", "## XPaths", "", "### Successful", ""])
    if xpath_success:
        for name, xpath in sorted(xpath_success.items()):
            lines.append(f"- `{name}`: `{xpath}`")
    else:
        lines.append("- none")

    lines.extend(["", "### Failed", ""])
    if xpath_failure:
        for name, error in sorted(xpath_failure.items()):
            lines.append(f"- `{name}`: `{error}`")
    else:
        lines.append("- none")

    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- Counts and reservation samples are generated from JSON report files in this directory.",
            "- `dhcp4_static_addresses` may be `unknown_path` on this firmware; pool-specific static-address paths are used instead.",
            "- `reserved_devices` is based on router data and current heuristics.",
            "- Compare this summary and JSON files in git history between runs.",
            "",
        ]
    )
    return "\n".join(lines)


def read_report_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text())
    except Exception:
        return default


def write_summary_from_reports(out_dir: Path) -> None:
    summary_md = build_summary_markdown_from_reports(out_dir)
    (out_dir / "summary.md").write_text(summary_md)


def load_runtime_config() -> dict[str, Any]:
    host = os.getenv("SAGEMCOM_HOST", "192.168.2.1").replace("http://", "").replace("https://", "")
    user = os.getenv("SAGEMCOM_USER", "admin")
    pw = os.getenv("SAGEMCOM_PASS")
    enc = parse_enc(os.getenv("SAGEMCOM_ENC", "SHA512"))
    use_ssl = env_bool("SAGEMCOM_SSL", False)
    verify_ssl = env_bool("SAGEMCOM_VERIFY_SSL", False)
    out_dir = Path(os.getenv("GIGAHUB_OUT_DIR", "./report")).expanduser()
    out_dir.mkdir(parents=True, exist_ok=True)
    return {
        "host": host,
        "user": user,
        "pw": pw,
        "enc": enc,
        "use_ssl": use_ssl,
        "verify_ssl": verify_ssl,
        "out_dir": out_dir,
    }


async def scrape_and_write_reports(
    *,
    host: str,
    user: str,
    pw: str | None,
    enc: EncryptionMethod,
    use_ssl: bool,
    verify_ssl: bool,
    out_dir: Path,
) -> dict[str, Any]:
    if not pw:
        raise RuntimeError("Missing env var: SAGEMCOM_PASS")

    generated_at = datetime.now(timezone.utc).isoformat()
    records: dict[str, dict[str, Any]] = {}
    successes: dict[str, str] = {}
    failures: dict[str, str] = {}
    raw_xpath_values: dict[str, Any] = {}

    async with JsonReqClient(
        host=host,
        username=user,
        password=pw,
        authentication_method=enc,
        ssl=use_ssl,
        verify_ssl=verify_ssl,
    ) as client:
        await client.login()

        # Host list is the baseline.
        try:
            hosts = await client.get_value(
                "Device/Hosts/Hosts",
                options={"capability-flags": {"interface": True}},
            )
            if isinstance(hosts, list):
                for host_row in hosts:
                    if isinstance(host_row, dict):
                        rec = extract_records_from_node(host_row, "Device/Hosts/Hosts")
                        if rec:
                            merge_record(records, rec)
            successes["hosts_hosts"] = "Device/Hosts/Hosts"
            raw_xpath_values["hosts_hosts"] = hosts
        except Exception as exc:
            failures["hosts_hosts"] = f"{type(exc).__name__}: {exc}"

        for name, xpath in CANDIDATE_XPATHS.items():
            if name == "hosts_hosts":
                continue
            try:
                value = await client.get_value(xpath)
                successes[name] = xpath
                raw_xpath_values[name] = value
                nodes: list[dict[str, Any]] = []
                walk_nodes(value, nodes)
                for node in nodes:
                    rec = extract_records_from_node(node, xpath)
                    if rec:
                        merge_record(records, rec)
            except KeyError:
                failures[name] = "unknown_path"
            except Exception as exc:
                failures[name] = f"{type(exc).__name__}: {exc}"

    known_rows = sorted(records.values(), key=lambda r: (str(r.get("current_ip") or ""), r["mac"]))
    active_rows = [r for r in known_rows if r.get("is_active") is True]
    reserved_rows = [r for r in known_rows if r.get("is_reserved")]
    reserved_by_interface_entries = build_reserved_by_interface(reserved_rows)

    entities = build_entities_payload(
        generated_at=generated_at,
        host=host,
        known_rows=known_rows,
        active_rows=active_rows,
        reserved_rows=reserved_rows,
        successes=successes,
        failures=failures,
        reserved_by_interface_entries=reserved_by_interface_entries,
    )
    write_json(out_dir / "known_devices.json", known_rows)
    write_json(out_dir / "active_devices.json", active_rows)
    write_json(out_dir / "reserved_devices.json", reserved_rows)
    write_json(out_dir / "reserved_by_interface.json", reserved_by_interface_entries)
    write_json(out_dir / "entities.json", entities)
    write_json(out_dir / "raw_xpath_values.json", raw_xpath_values)
    write_summary_from_reports(out_dir)

    return {
        "out_dir": str(out_dir),
        "known_devices": len(known_rows),
        "active_devices": len(active_rows),
        "reserved_devices": len(reserved_rows),
        "xpath_failures": len(failures),
    }


def build_dashboard_html() -> str:
    return """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Giga Hub Report Viewer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdn.datatables.net/2.1.8/css/dataTables.dataTables.min.css" />
  <link rel="stylesheet" href="https://cdn.datatables.net/rowgroup/1.5.0/css/rowGroup.dataTables.min.css" />
  <style>
    :root {
      --bg: #edf4f2;
      --bg2: #dce8ff;
      --panel: rgba(255, 255, 255, 0.78);
      --panel-border: rgba(17, 55, 116, 0.16);
      --text: #0f1f3a;
      --muted: #4c5f87;
      --accent: #2563eb;
      --accent-2: #e67e22;
      --ok: #0d7b4d;
      --warn: #a95200;
      --err: #a61c2b;
      --chip: rgba(37, 99, 235, 0.1);
      --shadow: 0 16px 40px rgba(20, 39, 88, 0.16);
    }
    [data-theme="dark"] {
      --bg: #0a1222;
      --bg2: #13284a;
      --panel: rgba(15, 24, 46, 0.75);
      --panel-border: rgba(145, 185, 255, 0.22);
      --text: #e7eeff;
      --muted: #aab8dd;
      --accent: #60a5fa;
      --accent-2: #f59e0b;
      --ok: #4ade80;
      --warn: #fbbf24;
      --err: #fb7185;
      --chip: rgba(96, 165, 250, 0.16);
      --shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Space Grotesk", sans-serif;
      color: var(--text);
      background: radial-gradient(1200px 800px at 10% -20%, var(--bg2), transparent 70%),
                  radial-gradient(1200px 800px at 110% -30%, rgba(230, 126, 34, 0.16), transparent 70%),
                  var(--bg);
      min-height: 100vh;
    }
    .bg-orb {
      position: fixed;
      border-radius: 999px;
      filter: blur(40px);
      opacity: 0.25;
      pointer-events: none;
      z-index: -1;
    }
    .bg-orb.a { width: 260px; height: 260px; background: var(--accent); top: -80px; left: -90px; }
    .bg-orb.b { width: 320px; height: 320px; background: var(--accent-2); top: 40%; right: -120px; }
    .app {
      max-width: 1220px;
      margin: 0 auto;
      padding: 24px 18px 36px;
    }
    .reveal {
      opacity: 0;
      transform: translateY(8px);
      animation: rise 0.5s ease forwards;
      animation-delay: var(--delay, 0s);
    }
    @keyframes rise {
      to { opacity: 1; transform: translateY(0); }
    }
    .panel {
      border: 1px solid var(--panel-border);
      background: var(--panel);
      backdrop-filter: blur(16px);
      border-radius: 18px;
      box-shadow: var(--shadow);
    }
    .hero {
      display: flex;
      gap: 14px;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px;
      margin-bottom: 16px;
    }
    .hero h1 {
      margin: 0;
      font-size: clamp(1.45rem, 2vw, 2.1rem);
      letter-spacing: 0.01em;
    }
    .hero p {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 0.97rem;
    }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: flex-end;
    }
    .controls {
      padding: 14px;
      margin-bottom: 14px;
    }
    .toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 8px;
    }
    .btn, .link-chip {
      border-radius: 999px;
      border: 1px solid transparent;
      padding: 8px 14px;
      font-size: 0.9rem;
      line-height: 1;
      text-decoration: none;
      cursor: pointer;
      transition: all 140ms ease;
      font-family: "Space Grotesk", sans-serif;
      color: var(--text);
      background: rgba(255, 255, 255, 0.5);
    }
    [data-theme="dark"] .btn, [data-theme="dark"] .link-chip {
      background: rgba(255, 255, 255, 0.03);
    }
    .btn:hover, .link-chip:hover {
      transform: translateY(-1px);
      border-color: var(--panel-border);
    }
    .btn-primary { background: color-mix(in srgb, var(--accent) 20%, transparent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
    .btn-accent { background: color-mix(in srgb, var(--accent-2) 22%, transparent); border-color: color-mix(in srgb, var(--accent-2) 45%, transparent); }
    .btn-ghost { border-color: var(--panel-border); }
    .btn:disabled { opacity: 0.6; cursor: wait; transform: none; }
    .field {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 999px;
      border: 1px solid var(--panel-border);
      font-size: 0.87rem;
      color: var(--muted);
      background: rgba(255, 255, 255, 0.36);
    }
    [data-theme="dark"] .field {
      background: rgba(255, 255, 255, 0.02);
    }
    .field select {
      border: 1px solid var(--panel-border);
      border-radius: 9px;
      padding: 5px 8px;
      background: transparent;
      color: var(--text);
      font-family: "Space Grotesk", sans-serif;
    }
    .status {
      padding: 11px 12px;
      border-radius: 12px;
      border: 1px solid var(--panel-border);
      background: rgba(255, 255, 255, 0.38);
      color: var(--muted);
      font-size: 0.92rem;
    }
    .status.ok { border-color: color-mix(in srgb, var(--ok) 55%, transparent); color: var(--ok); }
    .status.work { border-color: color-mix(in srgb, var(--warn) 55%, transparent); color: var(--warn); }
    .status.error { border-color: color-mix(in srgb, var(--err) 55%, transparent); color: var(--err); }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(120px, 1fr));
      gap: 10px;
      margin-bottom: 10px;
    }
    .metric {
      padding: 12px 13px;
      border: 1px solid var(--panel-border);
      border-radius: 14px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }
    .metric .label { font-size: 0.79rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
    .metric .value { margin-top: 4px; font-size: 1.5rem; font-weight: 700; }
    .counts {
      font-size: 0.87rem;
      color: var(--muted);
      margin: 2px 4px 14px;
      font-family: "JetBrains Mono", monospace;
      overflow-wrap: anywhere;
    }
    .table-panel { padding: 14px; }
    .mono { font-family: "JetBrains Mono", monospace; font-size: 0.82rem; }
    .id-cell { display: inline-block; max-width: 330px; overflow: hidden; text-overflow: ellipsis; vertical-align: bottom; }
    .chip {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 3px 9px;
      font-size: 0.78rem;
      background: var(--chip);
      border: 1px solid var(--panel-border);
      white-space: nowrap;
    }
    .chip.ok { color: var(--ok); }
    .chip.off { color: var(--muted); }
    .chip.iface { color: var(--accent); }
    div.dt-container .dt-layout-row {
      margin: 8px 0;
      color: var(--muted);
      font-size: 0.87rem;
    }
    div.dt-container .dt-input, div.dt-container .dt-paging-button {
      border-radius: 10px !important;
      border: 1px solid var(--panel-border) !important;
      background: rgba(255, 255, 255, 0.25) !important;
      color: var(--text) !important;
      font-family: "Space Grotesk", sans-serif;
    }
    div.dt-container .dt-paging .dt-paging-button.current {
      background: color-mix(in srgb, var(--accent) 20%, transparent) !important;
      border-color: color-mix(in srgb, var(--accent) 55%, transparent) !important;
    }
    table.dataTable thead th {
      border-bottom: 1px solid var(--panel-border) !important;
      color: var(--muted);
      font-size: 0.79rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    table.dataTable tbody td {
      border-top: 1px solid color-mix(in srgb, var(--panel-border) 65%, transparent) !important;
      vertical-align: middle;
      padding: 6px 10px !important;
      font-size: 0.88rem;
    }
    table.dataTable tbody tr:hover {
      background: color-mix(in srgb, var(--accent) 10%, transparent) !important;
    }
    tr.dtrg-group td {
      background: color-mix(in srgb, var(--accent) 8%, transparent) !important;
      font-weight: 600;
      color: var(--text);
      border-top: 1px solid var(--panel-border) !important;
      border-bottom: 1px solid var(--panel-border) !important;
    }
    @media (max-width: 900px) {
      .metrics { grid-template-columns: repeat(2, minmax(100px, 1fr)); }
      .hero { flex-direction: column; }
      .hero-actions { justify-content: flex-start; }
    }
    @media (max-width: 560px) {
      .metrics { grid-template-columns: 1fr 1fr; }
      .app { padding: 16px 10px 24px; }
      .toolbar { gap: 8px; }
      .btn, .link-chip { padding: 8px 11px; font-size: 0.83rem; }
    }
  </style>
</head>
<body>
  <div class="bg-orb a"></div>
  <div class="bg-orb b"></div>
  <main class="app">
    <section class="hero panel reveal" style="--delay: 0s;">
      <div>
        <h1>Giga Hub Report Viewer</h1>
        <p>Explore <code>report/*.json</code>, trigger router crawl, and rebuild summary from one dashboard.</p>
      </div>
      <div class="hero-actions">
        <button id="themeToggle" class="btn btn-ghost" type="button">Toggle Theme</button>
        <a class="link-chip" href="/api/summary-md" target="_blank" rel="noreferrer">summary.md</a>
        <a class="link-chip" href="/report/" target="_blank" rel="noreferrer">report dir</a>
      </div>
    </section>

    <section class="controls panel reveal" style="--delay: 0.05s;">
      <div id="status" class="status">Ready.</div>
      <div class="toolbar">
        <button id="refreshBtn" class="btn btn-ghost" type="button">Refresh JSON</button>
        <button id="scrapeBtn" class="btn btn-primary" type="button">Regenerate Crawl</button>
        <button id="summaryBtn" class="btn btn-accent" type="button">Rebuild Summary</button>
        <label class="field">
          Interface
          <select id="ifaceFilter">
            <option value="">all</option>
            <option value="primary_wifi">primary_wifi</option>
            <option value="guest_wifi">guest_wifi</option>
            <option value="ethernet">ethernet</option>
            <option value="unknown">unknown</option>
          </select>
        </label>
        <label class="field"><input id="reservedOnly" type="checkbox" /> reserved only</label>
        <label class="field"><input id="activeOnly" type="checkbox" /> active only</label>
        <label class="field"><input id="groupByIface" type="checkbox" checked /> group interface</label>
      </div>
    </section>

    <section class="metrics reveal" style="--delay: 0.1s;">
      <article class="metric">
        <div class="label">Known</div>
        <div class="value" id="knownCount">-</div>
      </article>
      <article class="metric">
        <div class="label">Active</div>
        <div class="value" id="activeCount">-</div>
      </article>
      <article class="metric">
        <div class="label">Reserved</div>
        <div class="value" id="reservedCount">-</div>
      </article>
      <article class="metric">
        <div class="label">XPath Failures</div>
        <div class="value" id="xpathFailCount">-</div>
      </article>
    </section>
    <div id="counts" class="counts reveal" style="--delay: 0.15s;"></div>

    <section class="table-panel panel reveal" style="--delay: 0.2s;">
      <table id="devices" class="display" style="width:100%">
        <thead>
          <tr>
            <th>interface</th>
            <th>id</th>
            <th>hostname</th>
            <th>current_ip</th>
            <th>reserved_ip</th>
            <th>status</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  </main>

  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
  <script src="https://cdn.datatables.net/2.1.8/js/dataTables.min.js"></script>
  <script src="https://cdn.datatables.net/rowgroup/1.5.0/js/dataTables.rowGroup.min.js"></script>
  <script>
    let table = null;
    const actionButtonIds = ["refreshBtn", "scrapeBtn", "summaryBtn"];

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function setTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("gh_theme", theme);
      const btn = document.getElementById("themeToggle");
      if (btn) {
        btn.textContent = theme === "dark" ? "Theme: Dark" : "Theme: Light";
      }
    }

    function initTheme() {
      const saved = localStorage.getItem("gh_theme");
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(saved || (prefersDark ? "dark" : "light"));
    }

    function setBusy(isBusy) {
      for (const id of actionButtonIds) {
        const el = document.getElementById(id);
        if (el) {
          el.disabled = isBusy;
        }
      }
    }

    function setStatus(msg, kind = "ok") {
      const el = document.getElementById("status");
      el.textContent = msg;
      el.classList.remove("ok", "work", "error");
      el.classList.add(kind);
    }

    function setMetric(id, value) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = String(value ?? "-");
      }
    }

    async function fetchJson(url, options = {}) {
      const resp = await fetch(url, options);
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      return data;
    }

    function rowsForTable(rows) {
      return rows.map((r) => ({
        interface_type: r.interface_type || "",
        mac: r.mac || "",
        hostname: r.hostname || "",
        current_ip: r.current_ip || "",
        reserved_ip: r.reserved_ip || "",
        is_reserved: !!r.is_reserved,
        is_active: !!r.is_active,
      }));
    }

    function shortId(value) {
      const s = String(value || "");
      if (s.length <= 28) {
        return s;
      }
      return `${s.slice(0, 12)}...${s.slice(-10)}`;
    }

    function renderStateCell(row, type) {
      if (type !== "display") {
        return row.is_active ? "active" : "idle";
      }
      return `<span class="chip ${row.is_active ? "ok" : "off"}">${row.is_active ? "active" : "idle"}</span>`;
    }

    function setGrouping(enabled) {
      if (!table || !table.rowGroup) {
        return;
      }
      table.rowGroup().enable(enabled);
      table.column(0).visible(!enabled);
      if (enabled) {
        table.order([[0, "asc"], [2, "asc"]]);
      }
      table.draw();
    }

    function ensureTable(rows) {
      if (table) {
        table.clear().rows.add(rows).draw();
        return;
      }
      $.fn.dataTable.ext.search.push((settings, _searchData, _index, rowData) => {
        if (settings.nTable.id !== "devices") {
          return true;
        }
        const iface = document.getElementById("ifaceFilter").value;
        const reservedOnly = document.getElementById("reservedOnly").checked;
        const activeOnly = document.getElementById("activeOnly").checked;
        if (iface && rowData.interface_type !== iface) {
          return false;
        }
        if (reservedOnly && !rowData.is_reserved) {
          return false;
        }
        if (activeOnly && !rowData.is_active) {
          return false;
        }
        return true;
      });
      table = new DataTable("#devices", {
        data: rows,
        pageLength: 200,
        lengthMenu: [50, 100, 200],
        order: [[0, "asc"], [2, "asc"]],
        rowGroup: {
          dataSrc: "interface_type",
          startRender: (rows, group) =>
            `<span class="chip iface">${escapeHtml(group || "unknown")}</span> <span class="mono">${rows.count()} entries</span>`,
        },
        columns: [
          {
            data: "interface_type",
            render: (data, type) =>
              type === "display"
                ? `<span class="chip iface">${escapeHtml(data || "unknown")}</span>`
                : data || "",
          },
          {
            data: "mac",
            render: (data, type) => {
              if (type !== "display") {
                return data || "";
              }
              const full = escapeHtml(data || "");
              return `<span class="mono id-cell" title="${full}">${escapeHtml(shortId(data))}</span>`;
            },
          },
          { data: "hostname", render: (data, type) => (type === "display" ? escapeHtml(data || "") : data || "") },
          { data: "current_ip", render: (data, type) => (type === "display" ? `<span class="mono">${escapeHtml(data || "")}</span>` : data || "") },
          { data: "reserved_ip", render: (data, type) => (type === "display" ? `<span class="mono">${escapeHtml(data || "")}</span>` : data || "") },
          { data: null, render: (_data, type, row) => renderStateCell(row, type) },
        ],
      });
      setGrouping(document.getElementById("groupByIface").checked);
    }

    function formatMap(name, obj) {
      const entries = Object.entries(obj || {});
      if (!entries.length) {
        return `${name}=none`;
      }
      return `${name}=${entries.map(([k, v]) => `${k}:${v}`).join(",")}`;
    }

    async function loadData() {
      const [knownRows, entities] = await Promise.all([
        fetchJson("/api/known"),
        fetchJson("/api/entities"),
      ]);
      const rows = rowsForTable(Array.isArray(knownRows) ? knownRows : []);
      ensureTable(rows);

      const counts = entities.entities || {};
      const activeBy = entities.active_by_interface || {};
      const reservedBy = entities.reserved_by_interface || {};
      const xpathFailures = Object.keys(entities.xpath_failure || {}).length;

      setMetric("knownCount", counts.known_devices ?? rows.length);
      setMetric("activeCount", counts.active_devices ?? 0);
      setMetric("reservedCount", counts.reserved_devices ?? 0);
      setMetric("xpathFailCount", xpathFailures);

      const generatedAt = entities.generated_at || "unknown";
      document.getElementById("counts").textContent =
        `${formatMap("active_by_interface", activeBy)} | ${formatMap("reserved_by_interface", reservedBy)} | generated_at=${generatedAt}`;
      setStatus("Loaded latest JSON files.", "ok");
    }

    async function postAction(url, doneMessage) {
      setBusy(true);
      setStatus("Working...", "work");
      try {
        const result = await fetchJson(url, { method: "POST" });
        await loadData();
        setStatus(`${doneMessage}: ${JSON.stringify(result.stats || {})}`, "ok");
      } catch (err) {
        setStatus(String(err), "error");
      } finally {
        setBusy(false);
      }
    }

    document.getElementById("themeToggle").addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      setTheme(current === "light" ? "dark" : "light");
    });
    document.getElementById("refreshBtn").addEventListener("click", () => {
      setBusy(true);
      loadData()
        .catch((err) => setStatus(String(err), "error"))
        .finally(() => setBusy(false));
    });
    document.getElementById("scrapeBtn").addEventListener("click", () => {
      postAction("/api/scrape", "Crawl completed");
    });
    document.getElementById("summaryBtn").addEventListener("click", () => {
      postAction("/api/summary", "Summary rebuilt");
    });
    document.getElementById("ifaceFilter").addEventListener("change", () => table && table.draw());
    document.getElementById("reservedOnly").addEventListener("change", () => table && table.draw());
    document.getElementById("activeOnly").addEventListener("change", () => table && table.draw());
    document.getElementById("groupByIface").addEventListener("change", (event) => {
      setGrouping(!!event.target.checked);
    });

    initTheme();
    setBusy(true);
    loadData()
      .catch((err) => setStatus(String(err), "error"))
      .finally(() => setBusy(false));
  </script>
</body>
</html>
"""


async def serve_dashboard(
    *,
    host: str,
    user: str,
    pw: str | None,
    enc: EncryptionMethod,
    use_ssl: bool,
    verify_ssl: bool,
    out_dir: Path,
    bind: str,
    port: int,
) -> None:
    scrape_lock = asyncio.Lock()

    def log_serve_scrape(*, status: str, stats: dict[str, Any] | None = None, error: str | None = None) -> None:
        parts = [f"serve_scrape status={status}"]
        if stats:
            for key in ("known_devices", "active_devices", "reserved_devices", "xpath_failures"):
                if key in stats:
                    parts.append(f"{key}={stats[key]}")
        if error:
            clean_error = str(error).replace("\n", " ").strip()
            parts.append(f'error="{clean_error}"')
        line = " ".join(parts)
        if status == "ok":
            print(line, flush=True)
        else:
            print(line, file=sys.stderr, flush=True)

    async def handle_index(_request: web.Request) -> web.Response:
        return web.Response(text=build_dashboard_html(), content_type="text/html")

    async def handle_known(_request: web.Request) -> web.Response:
        data = read_report_json(out_dir / "known_devices.json", [])
        if not isinstance(data, list):
            data = []
        return web.json_response(data)

    async def handle_entities(_request: web.Request) -> web.Response:
        data = read_report_json(out_dir / "entities.json", {})
        if not isinstance(data, dict):
            data = {}
        return web.json_response(data)

    async def handle_summary_md(_request: web.Request) -> web.Response:
        path = out_dir / "summary.md"
        try:
            text = path.read_text()
        except Exception:
            text = ""
        return web.Response(text=text, content_type="text/markdown")

    async def handle_summary(_request: web.Request) -> web.Response:
        write_summary_from_reports(out_dir)
        return web.json_response({"ok": True, "stats": {"out_dir": str(out_dir)}})

    async def handle_scrape(_request: web.Request) -> web.Response:
        async with scrape_lock:
            try:
                stats = await scrape_and_write_reports(
                    host=host,
                    user=user,
                    pw=pw,
                    enc=enc,
                    use_ssl=use_ssl,
                    verify_ssl=verify_ssl,
                    out_dir=out_dir,
                )
                log_serve_scrape(status="ok", stats=stats)
                return web.json_response({"ok": True, "stats": stats})
            except Exception as exc:
                log_serve_scrape(status="error", error=f"{type(exc).__name__}: {exc}")
                return web.json_response(
                    {"ok": False, "error": f"{type(exc).__name__}: {exc}"},
                    status=500,
                )

    app = web.Application()
    app.router.add_get("/", handle_index)
    app.router.add_get("/api/known", handle_known)
    app.router.add_get("/api/entities", handle_entities)
    app.router.add_get("/api/summary-md", handle_summary_md)
    app.router.add_post("/api/summary", handle_summary)
    app.router.add_post("/api/scrape", handle_scrape)
    app.router.add_static("/report", str(out_dir), show_index=True)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, bind, port)
    await site.start()
    print(f"Serving UI on http://{bind}:{port} (Ctrl+C to stop)")
    await asyncio.Event().wait()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract DHCP/device data from a Giga Hub and write JSON reports."
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--scrape",
        action="store_true",
        help="Crawl router and write JSON reports (default mode).",
    )
    mode.add_argument(
        "--summary",
        dest="summary",
        action="store_true",
        help="Rebuild report/summary.md from existing JSON files without crawling the router.",
    )
    mode.add_argument(
        "--serve",
        action="store_true",
        help="Run local web UI and API for browsing and regenerating reports.",
    )
    parser.add_argument(
        "--bind",
        default="127.0.0.1",
        help="Bind address for --serve (default: 127.0.0.1).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8765,
        help="Port for --serve (default: 8765).",
    )
    return parser.parse_args()


async def main(args: argparse.Namespace) -> None:
    load_dotenv()
    cfg = load_runtime_config()

    if args.summary:
        write_summary_from_reports(cfg["out_dir"])
        print(f"Rebuilt summary from JSON files in: {cfg['out_dir']}")
        return

    if args.serve:
        if not cfg["pw"]:
            print("Warning: SAGEMCOM_PASS is not set; /api/scrape will fail until configured.")
        await serve_dashboard(
            host=cfg["host"],
            user=cfg["user"],
            pw=cfg["pw"],
            enc=cfg["enc"],
            use_ssl=cfg["use_ssl"],
            verify_ssl=cfg["verify_ssl"],
            out_dir=cfg["out_dir"],
            bind=args.bind,
            port=args.port,
        )
        return

    try:
        stats = await scrape_and_write_reports(
            host=cfg["host"],
            user=cfg["user"],
            pw=cfg["pw"],
            enc=cfg["enc"],
            use_ssl=cfg["use_ssl"],
            verify_ssl=cfg["verify_ssl"],
            out_dir=cfg["out_dir"],
        )
    except RuntimeError as exc:
        raise SystemExit(str(exc))

    print(f"Wrote outputs to: {stats['out_dir']}")
    print(f"Known devices: {stats['known_devices']}")
    print(f"Active devices: {stats['active_devices']}")
    print(f"Reserved candidates: {stats['reserved_devices']}")
    if stats["xpath_failures"]:
        print(f"XPath failures: {stats['xpath_failures']} (see entities.json / summary.md)")


if __name__ == "__main__":
    try:
        args = parse_args()
        asyncio.run(main(args))
    except KeyboardInterrupt:
        sys.exit(130)
