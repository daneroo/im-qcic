#!/bin/bash

# Ensure iperf3 server is running on the target machine
echo "Please ensure iperf3 server(s) is running on the target machine with: iperf3 -s"
echo

source=$(hostname -s)
commonOpts='-t 30'

# Function to run iperf3 test
run_iperf3_test() {
  local target=$1
  local label=$2
  local options=$3

  echo ""
  echo "### $label"
  echo "  -  from ${source} -> ${target}"
  echo "  -  options: $options"

  iperf3 -c ${target} ${options} | grep 'sender\|receiver' | tail -2
}

# Run tests with target on Direct and Tailsacle
compare_networks() {
  local target=$1
  local label=$2
  local options=$3

  echo ""
  echo "## $label"
  direct_target="${target}.imetrical.com"
  tailscale_target="${target}.ts.imetrical.com"

  run_iperf3_test "${direct_target}" "Direct LAN ${label}" "${options}"
  run_iperf3_test "${tailscale_target}" "Tailscale LAN ${label}" "${options}"
}

# Run combinations
compare_networks "syno" "Baseline" "${commonOpts}"
# compare_networks "syno" "UDP" "${commonOpts} -u"
# compare_networks "syno" "Parallel (4)" "${commonOpts} -P 4"


