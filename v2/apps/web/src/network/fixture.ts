import type { NetworkFixture } from "./types";

// Recorded shapes for the endpoint-probe and heartbeat readings the browser
// cannot observe. Every field is produced by scripts/bash/qcic-sh.sh; only the
// readings are representative.
export const NETWORK_FIXTURE: NetworkFixture = {
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
