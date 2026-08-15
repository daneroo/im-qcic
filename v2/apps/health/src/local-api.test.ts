import { describe, expect, test } from "bun:test";
import { createLocalApi } from "./local-api";

describe("Tailscale LocalAPI transport", () => {
  test("reads a mounted macOS credential without exposing it in the URL", async () => {
    const requests: { input: string; init?: RequestInit }[] = [];
    const localApi = createLocalApi(
      {
        kind: "macos",
        credentialPath: "/run/secrets/tailscale-localapi.json",
        host: "host.docker.internal",
      },
      {
        readFile: async () => JSON.stringify({ port: 56650, token: "secret" }),
        fetch: async (input, init) => {
          requests.push({ input: String(input), init });
          return Response.json({ BackendState: "Running" });
        },
      },
    );

    await localApi.request("/localapi/v0/status");

    expect(requests[0]?.input).toBe(
      "http://host.docker.internal:56650/localapi/v0/status",
    );
    const headers = new Headers(requests[0]?.init?.headers);
    expect(headers.get("host")).toBe("local-tailscaled.sock");
    expect(headers.get("authorization")).toBe(`Basic ${btoa(":secret")}`);
  });

  test("routes Linux and Synology requests through the mounted Unix socket", async () => {
    const requests: { input: string; unix?: string }[] = [];
    const localApi = createLocalApi(
      {
        kind: "unix",
        socketPath: "/run/tailscale/tailscaled.sock",
      },
      {
        readFile: async () => "",
        fetch: async (input, init) => {
          requests.push({ input: String(input), unix: init?.unix });
          return Response.json({ BackendState: "Running" });
        },
      },
    );

    await localApi.request("/localapi/v0/status");

    expect(requests).toEqual([
      {
        input: "http://local-tailscaled.sock/localapi/v0/status",
        unix: "/run/tailscale/tailscaled.sock",
      },
    ]);
  });
});
