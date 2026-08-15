import { describe, expect, test } from "bun:test";
import { createTailnetProbe, type LocalApi } from "./tailnet-probe";

describe("Tailnet LocalAPI probe", () => {
  test("selects safe status fields and redacts ping endpoints into path facts", async () => {
    const requested: { path: string; method: string }[] = [];
    const localApi: LocalApi = {
      async request(path, init) {
        requested.push({ path, method: init?.method ?? "GET" });
        if (path === "/localapi/v0/status") {
          return Response.json({
            Version: "1.102.1",
            BackendState: "Running",
            Self: {
              HostName: "galois",
              DNSName: "galois.tail.test.",
              TailscaleIPs: ["100.64.0.1", "fd7a::1"],
              PublicKey: "must-not-leak",
            },
            Peer: {
              online: {
                HostName: "gauss",
                DNSName: "gauss.tail.test.",
                TailscaleIPs: ["100.64.0.2"],
                Online: true,
                LastSeen: "0001-01-01T00:00:00Z",
                CurAddr: "192.168.1.2:41641",
              },
              absent: {
                HostName: "hardy",
                DNSName: "hardy.tail.test.",
                TailscaleIPs: ["100.64.0.3"],
                Online: false,
                LastSeen: "2026-08-13T14:53:40.1Z",
              },
            },
          });
        }
        return Response.json({
          IP: "100.64.0.2",
          LatencySeconds: 0.0024,
          Endpoint: "192.168.1.2:41641",
          DERPRegionCode: "",
        });
      },
    };

    const probe = createTailnetProbe({ localApi, timeoutMs: 1_000 });
    const result = await probe();

    expect(result).toEqual({
      version: "1.102.1",
      backendState: "Running",
      selfHostName: "galois",
      selfDnsName: "galois.tail.test.",
      selfTailscaleIp: "100.64.0.1",
      peers: [
        {
          hostName: "gauss",
          dnsName: "gauss.tail.test.",
          tailscaleIp: "100.64.0.2",
          online: true,
          lastSeen: "0001-01-01T00:00:00Z",
          path: { kind: "direct", latencyMs: 2.4 },
        },
        {
          hostName: "hardy",
          dnsName: "hardy.tail.test.",
          tailscaleIp: "100.64.0.3",
          online: false,
          lastSeen: "2026-08-13T14:53:40.1Z",
          path: null,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("192.168.1.2");
    expect(JSON.stringify(result)).not.toContain("PublicKey");
    expect(requested).toEqual([
      { path: "/localapi/v0/status", method: "GET" },
      {
        path: "/localapi/v0/ping?ip=100.64.0.2&type=disco",
        method: "POST",
      },
    ]);
  });
});
