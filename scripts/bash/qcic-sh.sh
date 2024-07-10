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
# Parameters:
# - pid: The process ID of the background command to monitor.
# - label: The text label to display alongside the spinner.
# Note: The spinner output is written to stderr to avoid mixing with command output.
show_spinner() {
  local pid=$1
  local label=$2
  local delay=0.1
  local spinstr='⠋⠙⠸⠴⠦⠇'
  tput civis  # hide cursor
  while ps -p $pid > /dev/null; do
    for (( i=0; i<${#spinstr}; i++ )); do
      printf " %s %s" "${spinstr:$i:1}" "$label" >&2
      sleep $delay
      printf "\r" >&2  # carriage return to overwrite the line
    done
  done
  tput cnorm  # show cursor
}

# Function to run a command with a custom spinner and capture its output
# Parameters:
# - command: The command to run in the background.
# - label: The text label to display alongside the spinner.
# The command's stdout and stderr are captured to a temporary file.
run_with_spinner() {
  local command=$1
  local label=$2
  local output
  local tmpfile=$(mktemp)

  if [ "$gum_available" = true ]; then
    # Use gum spinner
    output=$(gum spin --spinner minidot --title "$label" --show-output -- $command)
  else
    # Run the command in the background and capture both stdout and stderr
    $command >"$tmpfile" 2>&1 & pid=$!
    show_spinner $pid "$label"
    wait $pid

    # Clear spinner
    printf "\r\033[K" >&2

    # Read output from temporary file
    output=$(cat "$tmpfile")
    rm -f "$tmpfile"
  fi

  echo "$output"
}

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

echo "## Tailscale Identity" | $gum_fmt_cmd

  # Find the Tailscale binary
  if command -v tailscale &> /dev/null; then
    tailscaleCmd=$(command -v tailscale)
  elif [ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ]; then
    tailscaleCmd="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
  elif [ -x "/volume1/@appstore/Tailscale/bin/tailscale" ]; then
    tailscaleCmd="/volume1/@appstore/Tailscale/bin/tailscale"
  else
    echo "- ${red_xmark} Tailscale binary not found." | $gum_fmt_cmd
    return
  fi

  local statusText=$(run_with_spinner "$tailscaleCmd status --peers=false" "Tailscale Status...")
  # status : Tailscale is stopped.
  if [[ "$statusText" == "Tailscale is stopped." ]]; then
    echo "- ${red_xmark} Tailscale is stopped." | $gum_fmt_cmd
    return
  fi

  local myTailscaleIPV4=$($tailscaleCmd ip --4)
  local tailscaleHostname=$($tailscaleCmd whois $myTailscaleIPV4 | grep -m 1 "Name:" | awk '{print $2}')

  $gum_fmt_cmd << EOF
- Tailscale IP: $myTailscaleIPV4
- Tailscale Hostname: $tailscaleHostname

## Tailscale Status (Peers)
EOF

  # TODO run_with_spinner is broken with this JSON output (on gateway)
  # local statusJSON=$(run_with_spinner "$tailscaleCmd status --json" "Tailscale Status with Peers...")
  local statusJSON=$($tailscaleCmd status --json)
  # HostName is bad for ipad-4 -> localhost could use DNSName, 
  # but that looks like: ipad-4.tail62209.ts.net. (trailing tailnet and dot)
  local peers=$(echo "${statusJSON}" | jq -r '.Peer[] | "\(.HostName)\t\(.Online)\t\(.Active)\t\(.TailscaleIPs[0])"')

  $gum_fmt_cmd << EOF
| Host                 | IP Address      | Online |
| -------------------- | --------------- | ------ |
$(echo "$peers" | while IFS=$'\t' read -r host online active ip; do
  # ignore active field for now 
  printf "| %-20s | %-15s | %-6s |\n" "$host" "$ip" "$online"
done)
EOF

  echo
  echo "## Tailscale Ping Results" | $gum_fmt_cmd
  echo

  # To accumulate the results in a local variable, we avoid running the while loop in a subshell.
  # Using process substitution (< <(command)) allows the loop to run in the current shell, 
  # preserving changes to the results variable.
  local results=""
  while IFS=$'\t' read -r host online active ip; do
    if [ "$online" = "true" ]; then
      # run with spinner, and capture output
      ping_output=$(run_with_spinner "$tailscaleCmd ping -c 1 --timeout 5s --until-direct=false $ip" "Tailscale Pinging $host...")

      # Extract the "via" and "delay" values using awk
      via=$(echo "$ping_output" | awk -F ' via | in ' '{print $2}')
      delay=$(echo "$ping_output" | awk -F ' in ' '{print $2}')
      
      # Accumulate the results (note: the $() eats the newline, so we add it back with $'\n')
      results+=$(printf "| %-20s | %-15s | %-6s | %-20s | %-7s |" "$host" "$ip" "$online" "$via" "$delay")
      results+=$'\n'
    fi
  done < <(echo "$peers")
  # Output all accumulated results as a table
  $gum_fmt_cmd << EOF
| Host                 | IP Address      | Online | Via                  | Delay   |
| -------------------- | --------------- | ------ | -------------------- | ------- |
$results
EOF
}

# NATS section
showNats() {
  local nats_server="nats.ts.imetrical.com"
  local nats_subject="im.>"
  echo "## NATS  Section" | $gum_fmt_cmd

  # Find the NATS cli binary
  if ! command -v nats &> /dev/null; then
    echo "- ${red_xmark} nats cli binary not found." | $gum_fmt_cmd
    return
  fi
  # Find the NATS-top binary
  if ! command -v nats-top &> /dev/null; then
    echo "- ${red_xmark} nats-top binary not found." | $gum_fmt_cmd
    return
  fi
  echo "- connecting to ``${nats_server}``" | $gum_fmt_cmd

  local nats_sub_output=$(run_with_spinner "nats -s ${nats_server}  sub --timeout=10s --count 1 ${nats_subject}" "Connecting to Nats (sub)...")
  # local nats_sub_output=$(nats -s ${nats_server}  sub --timeout=10s --count 1 ${nats_subject})

  echo
  $gum_fmt_cmd << EOF
### NATS subscription (${nat_subject})
\`\`\`
${nats_sub_output}
\`\`\`
EOF

  local nats_top_output=$(run_with_spinner "nats-top -s ${nats_server}  -o -" "Connecting to Nats (top)...")
  # local nats_top_output=$(nats-top -s nats.ts.imetrical.com  -o -)

  echo
  $gum_fmt_cmd << EOF
### NATS top 
\`\`\`
${nats_top_output}
\`\`\`
EOF


}

showHTTPServices() {
  echo
  echo "## HTTP Services" | $gum_fmt_cmd

  # Find the curl binary
  if ! command -v curl &> /dev/null; then
    echo "- ${red_xmark} curl binary not found." | $gum_fmt_cmd
    return
  fi

  # Define peers as an array
  local scrobble_peers=("dirac" "darwin" "d1-px1")
  # Initialize an initial array for services
  local services=(
    "https://status.dl.imetrical.com/"
    "https://status.dl.imetrical.com/api/logcheck"
  )
  # Iterate over peers to create service URLs
  for peer in "${scrobble_peers[@]}"; do
      services+=("http://${peer}.imetrical.com:8000/api/status")
  done

  local results=""
  for service in "${services[@]}"; do
    # run with spinner, and capture output
    http_output=$(run_with_spinner "curl -s -o /dev/null -w '%{http_code}' $service" "Checking $service...")
    # Convert HTTP status code to a number for comparison
    http_code_num=$(echo $http_output | tr -d -c 0-9)

    # Check the HTTP status code
    if [ "$http_code_num" -ge 200 ] && [ "$http_code_num" -le 299 ]; then
      results+="- ${green_check} $service is up. (${http_code_num})\n"
    else
      results+="- ${red_xmark} $service is down. (${http_code_num})\n"
    fi
  done
  echo -e "$results" | $gum_fmt_cmd
}


showIdentity
showTailscale
showNats
showHTTPServices