#!/usr/bin/env bash

# GUM THEME pink (default), light, notty, dracula
export GUM_FORMAT_THEME="pink"
# Check if gum is available
if command -v gum &> /dev/null; then
  gum_fmt_cmd="gum format"
  gum_available=true
else
  gum_fmt_cmd="cat"
  gum_available=false
fi

# Define color constants and symbols
green="$(printf '\033[32m')"
red="$(printf '\033[31m')"
reset="$(printf '\033[0m')"
green_check="${green}✔${reset}"
red_xmark="${red}✗${reset}"

# Function to show a smoother spinner
show_spinner() {
  local pid=$1
  local label=$2
  local delay=0.1
  local spinstr='⠋⠙⠸⠴⠦⠇'
  tput civis  # hide cursor
  while ps -p $pid > /dev/null; do
    for (( i=0; i<${#spinstr}; i++ )); do
      printf " %s %s" "${spinstr:$i:1}" "$label"
      sleep $delay
      printf "\r"  # carriage return to overwrite the line
    done
  done
  printf "    \r"  # clear the spinner
  tput cnorm  # show cursor
}

# Function to run a command with a custom spinner and capture its output
run_with_spinner() {
  local command=$1
  local label=$2
  local output

  # Run the command in the background and get the output
  output=$({ $command & pid=$!; show_spinner $pid "$label"; wait $pid; } 2>&1)
  echo "$output"
}

gum spin --spinner minidot --title "I see this..." --show-output -- sleep 5
run_with_spinner "sleep 5" "Why can I not see this"
exit


echo "# QCIC - Host report" | $gum_fmt_cmd

# Identity section
# - identity - hostname, user, ip, tailscale ip
showIdentity() {
  local hostnameFQDN=$(hostname -f)
  local hostnameShort=$(hostname -s)
  
  # Find the active network interface
  if [ "$(uname)" == "Darwin" ]; then
    # macOS specific commands
    local activeInterface=$(route get default | grep interface | awk '{print $2}')
    local myIP=$(ipconfig getifaddr $activeInterface)
  else
    # Linux specific commands
    local activeInterface=$(ip route | grep default | awk '{print $5}')
    local myIP=$(ip -4 addr show $activeInterface | grep -oP '(?<=inet\s)\d+(\.\d+){3}')
  fi

  $gum_fmt_cmd << EOF
## Identity ($hostnameShort)
- Hostname: $hostnameFQDN
- IP Address: $myIP
EOF
  # missing paragraph separation
  echo
}

# Tailscale section
showTailscale() {
  local tailscaleCmd
  
  # Find the Tailscale binary
  if command -v tailscale &> /dev/null; then
    tailscaleCmd=$(command -v tailscale)
  elif [ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ]; then
    tailscaleCmd="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
  elif [ -x "/volume1/@appstore/Tailscale/bin/tailscale" ]; then
    tailscaleCmd="/volume1/@appstore/Tailscale/bin/tailscale"
  else
    $gum_fmt_cmd << EOF
## Tailscale Identity
- ${red_xmark} Tailscale binary not found.
EOF
    return
  fi

  local myTailscaleIPV4=$($tailscaleCmd ip --4)
  local tailscaleHostname=$($tailscaleCmd whois $myTailscaleIPV4 | grep -m 1 "Name:" | awk '{print $2}')
  
  local peers=$($tailscaleCmd status --json | jq -r '.Peer[] | "\(.HostName)\t\(.Online)\t\(.Active)\t\(.TailscaleIPs[0])"')

  $gum_fmt_cmd << EOF
## Tailscale Identity
- Tailscale IP: $myTailscaleIPV4
- Tailscale Hostname: $tailscaleHostname

## Tailscale Peers

| Host                 | IP Address      | Online |
| -------------------- | --------------- | ------ |
$(echo "$peers" | while IFS=$'\t' read -r host online active ip; do
  # ignore active field for now 
  # echo "- **$host** $ip Online: $online"
  # echo "| $host | $ip | $online |"
  printf "| %-20s | %-15s | %-6s |\n" "$host" "$ip" "$online"
done)
EOF

echo "$peers" | while IFS=$'\t' read -r host online active ip; do
  if [ "$online" = "true" ]; then
    if [ "$gum_available" = true ]; then
      # Use gum spinner
      ping_output=$(gum spin --spinner minidot --title "Tailscale Pinging $host..." --show-output -- $tailscaleCmd ping -c 1 --timeout 5s --until-direct=false $ip)
    else
      # Use custom spinner
      ping_output=$(run_with_spinner "$tailscaleCmd ping -c 1 --timeout 5s --until-direct=false $ip" "Tailscale Pinging $host...")
    fi

    # Extract the "via" and "delay" values using awk
    via=$(echo "$ping_output" | awk -F ' via | in ' '{print $2}')
    delay=$(echo "$ping_output" | awk -F ' in ' '{print $2}')
    
    # Print the extracted values
    echo "$host ($ip) via $via with delay $delay"
  fi
done
}

showIdentity
showTailscale
