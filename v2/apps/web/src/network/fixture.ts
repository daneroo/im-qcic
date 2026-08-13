import type { NetworkFixture } from "./types";

// Recorded shapes for the two rungs the browser cannot observe. Every field is
// produced by scripts/bash/qcic-sh.sh; only the readings are representative.
export const NETWORK_FIXTURE: NetworkFixture = {
  identity: {
    hostnameShort: "galois",
    hostnameFqdn: "galois.imetrical.com",
    lanIp: "192.168.1.24",
    tailscaleIp: "100.94.17.6",
    tailscaleHostname: "galois",
  },
  peers: [
    peer("hilbert", "100.72.4.19", "192.168.1.31:41641", 2),
    peer("darwin", "100.101.55.3", "192.168.1.18:41641", 3),
    peer("gauss", "100.88.201.44", "192.168.1.42:41641", 2),
    peer("d1-px1", "100.119.8.72", "192.168.1.57:41641", 4),
    peer("scast-hilbert", "100.65.31.90", "192.168.1.33:41641", 3),
    peer("gateway", "100.77.12.5", "192.168.1.2:41641", 1),
    peer("syno", "100.91.44.21", "192.168.1.10:41641", 2),
    peer("synk", "100.85.169.81", "DERP(tor)", 27),
    peer("shannon", "100.100.25.28", "DERP(tor)", 31),
    peer("davinci", "100.83.9.14", "192.168.1.61:41641", 5),
    peer("dizzy", "100.70.55.8", "192.168.1.34:41641", 4),
    peer("plex-audiobook", "100.68.2.77", "192.168.1.32:41641", 3),
    peer("goedel", "100.75.140.2", null, null),
    peer("fermat", "100.99.61.30", null, null),
    peer("dirac", "100.86.7.51", null, null),
  ],
  probes: [
    { url: "https://status.dl.imetrical.com/", status: 200, ms: 84 },
    {
      url: "https://status.dl.imetrical.com/api/logcheck",
      status: 200,
      ms: 131,
    },
    { url: "http://d1-px1.imetrical.com:8000/api/status", status: 200, ms: 22 },
    { url: "http://darwin.imetrical.com:8000/api/status", status: 200, ms: 19 },
    {
      url: "http://scast-hilbert.imetrical.com:8000/api/status",
      status: 200,
      ms: 26,
    },
  ],
  heartbeat: {
    hosts: 12,
    delaySeconds: 0.4,
    lastText: "watts: 4810",
    lastHost: "capture.ted1k",
  },
};

function peer(
  hostName: string,
  tailscaleIp: string,
  via: string | null,
  delayMs: number | null,
) {
  return { hostName, tailscaleIp, online: via !== null, via, delayMs };
}
