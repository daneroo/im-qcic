#!/bin/sh
# Idea for Drive health diagnostics on both Synology NASs syno, and synk
# From chat after synk DS920+ drive failure
# - https://chatgpt.com/c/69eaea22-de8c-83ea-9ad5-712a4be59ae7
set -eu

VOL="${VOL:-/volume1}"
HOST="$(hostname)"
NOW="$(date -Iseconds 2>/dev/null || date)"

section() {
  printf '\n## %s\n\n' "$1"
}

code_begin() {
  printf '```text\n'
}

code_end() {
  printf '```\n'
}

as_code() {
  code_begin
  cat
  code_end
}

run_or_note() {
  desc="$1"
  shift

  code_begin
  if "$@" 2>&1; then
    :
  else
    echo "UNAVAILABLE: $desc"
  fi
  code_end
}

echo "---"
echo "kind: qcic.synology.check"
echo "host: $HOST"
echo "timestamp: $NOW"
echo "volume: $VOL"
echo "privilege: unprivileged"
echo "---"

echo
echo "# Synology QCIC lite check: $HOST"

section "Summary"

echo "| Check | Result |"
echo "|---|---|"
[ -r /proc/mdstat ] && echo "| mdstat | readable |" || echo "| mdstat | unavailable |"
command -v btrfs >/dev/null 2>&1 && echo "| btrfs CLI | present |" || echo "| btrfs CLI | missing |"
[ -d "$VOL/@sharesnap" ] && echo "| @sharesnap | present |" || echo "| @sharesnap | unavailable |"
[ -d /usr/syno/etc/synoretention/Share# ] && echo "| retention policy dir | present |" || echo "| retention policy dir | unavailable |"
[ -d /usr/local/synobtrfsreplicacore ] && echo "| replication state dir | present |" || echo "| replication state dir | unavailable |"

section "RAID / mdstat"
run_or_note "/proc/mdstat" cat /proc/mdstat

section "Snapshot counts"

if command -v btrfs >/dev/null 2>&1; then
  btrfs subvolume list -s "$VOL" 2>/dev/null \
  | awk -F'path @sharesnap/' '
  /@sharesnap/ {
    split($2,a,"/")
    share=a[1]
    snap=a[2]
    if (!(share in first)) first[share]=snap
    last[share]=snap
    count[share]++
  }
  END {
    for (s in count) print count[s], s, first[s], last[s]
  }' \
  | sort -nr \
  | as_code
else
  echo '```text'
  echo "UNAVAILABLE: btrfs command missing"
  echo '```'
fi

section "Snapshot retention policies"

if [ -d /usr/syno/etc/synoretention/Share# ]; then
  for f in /usr/syno/etc/synoretention/Share#/*/policy; do
    [ -r "$f" ] || continue
    share="$(echo "$f" | sed 's#.*/Share#/##; s#/policy##')"
    echo "### $share"
    echo
    grep -E 'policyType=|advPolicyType=|recentlyRetainNum=|retainDay=|advRetainDay=|advHourly=|advDaily=|advWeekly=|advMonthly=|advYearly=|dailyRetainNum=|weeklyRetainNum=|monthlyRetainNum=|yearlyRetainNum=|hourlyRetainNum=' "$f" | as_code
  done
else
  echo '```text'
  echo "UNAVAILABLE: /usr/syno/etc/synoretention/Share# missing"
  echo '```'
fi

section "Replication runtime state"

if [ -d /usr/local/synobtrfsreplicacore ]; then
  grep -H '"parent"\|"state"\|"total_sync_size"\|"sync_size"\|"sender_dsm"\|"sender_pkg_ver"' /usr/local/synobtrfsreplicacore/* 2>/dev/null \
  | as_code
else
  echo '```text'
  echo "No /usr/local/synobtrfsreplicacore directory found."
  echo '```'
fi

section "Active Btrfs receive jobs"

ps auxww 2>/dev/null \
| grep 'btrfs receive' \
| grep -v grep \
| as_code

section "Privileged checks not included"

cat <<'EOF'
```text
Skipped because this script does not use sudo:

- Drive model/serial mapping
- SMART health and bad-sector counters
- synodisk --enum
- full shared-folder inventory via synoshare
- scrub / SMART scheduler internals

Those need a root-mode collector or a container with appropriate host access.
EOF