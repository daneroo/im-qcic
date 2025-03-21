#!/usr/bin/env bash

# GUM THEME pink (default), light, notty, dracula
export GUM_FORMAT_THEME="light"
if [[ "${TERM_PROGRAM}" == "ghostty" ]]; then
  export GUM_FORMAT_THEME="dark"
fi
# Check if gum is available
if command -v gum &> /dev/null; then
  gum_fmt_cmd="gum format"
  gum_available=true
else
  gum_fmt_cmd="cat"
  gum_available=false
fi

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
  exit 1
fi

# Define color constants and symbols
green="$(printf '\033[32m')"
red="$(printf '\033[31m')"
reset="$(printf '\033[0m')"
green_check="${green}✔${reset}"
red_xmark="${red}✗${reset}"

# Function to show a smoother spinner (test version)
# Parameters:
# - label: The text label to display alongside the spinner.
# - duration: The duration in seconds for which to show the spinner.
test_spinner() {
  local label=$1
  local duration=$2
  local delay=0.1
  local spinstr='⠋⠙⠸⠴⠦⠇'
  tput civis  # hide cursor
  local end=$((SECONDS + duration))
  while [ $SECONDS -lt $end ]; do
    for (( i=0; i<${#spinstr}; i++ )); do
      printf " %s %s" "${spinstr:$i:1}" "$label"
      sleep $delay
      printf "\r"  # carriage return to overwrite the line
    done
  done
  tput cnorm  # show cursor
  printf "\r\033[K"  # clear the spinner line
}

echo "Starting test spinner..."
test_spinner "Testing spinner..." 5
echo "Spinner test complete."

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

ip="100.100.25.28" # shannon

# Use gum or our custom spinner if gum not available
echo "Using run_with_spinner..."
ping_output=$(run_with_spinner "$tailscaleCmd ping -c 1 --timeout 5s --until-direct=false $ip" "Tailscale Pinging $ip ...")
echo "ping output: $ping_output"
