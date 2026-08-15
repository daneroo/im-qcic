import { describe, expect, test } from "bun:test";
import { parseLocalCreds } from "./macos-local-creds";

describe("parseLocalCreds", () => {
  test("selects the token and port from Tailscale's local-creds curl command", () => {
    expect(
      parseLocalCreds(
        "curl -u:e82ecda4 http://localhost:56650/localapi/v0/status\n",
      ),
    ).toEqual({ port: 56650, token: "e82ecda4" });
  });

  test("fails clearly if Tailscale changes the debug output", () => {
    expect(() => parseLocalCreds("something else")).toThrow(
      "unexpected `tailscale debug local-creds` output",
    );
  });
});
