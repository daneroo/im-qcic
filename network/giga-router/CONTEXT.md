# Network/giga-router

A DHCP/device-inventory extraction tool for the current (soon to be replaced) Bell Giga Hub router. Scrapes the router's `/cgi/json-req` API and writes git-diffable JSON reports (networks, devices, DHCP reservations), with a small local web UI for browsing them.

## Language

**Giga Hub**:
The Bell-supplied router (Sagemcom F@st 5690) currently serving as the homelab's gateway/WAN router. Being replaced by UniFi gear — see `network/UniFi-Journey-2025`.
