import { readFile } from "node:fs/promises";
import type { LocalApi } from "./tailnet-probe";

export type LocalApiConfig =
  | { kind: "unix"; socketPath: string }
  | { kind: "macos"; credentialPath: string; host: string };

type FetchInit = RequestInit & { unix?: string };
type Fetch = (
  input: string | URL | Request,
  init?: FetchInit,
) => Promise<Response>;

interface LocalApiDependencies {
  readFile(path: string, encoding: "utf8"): Promise<string>;
  fetch: Fetch;
}

const defaults: LocalApiDependencies = {
  readFile,
  fetch: globalThis.fetch,
};

export function createLocalApi(
  config: LocalApiConfig,
  dependencies: LocalApiDependencies = defaults,
): LocalApi {
  if (config.kind === "unix") {
    return {
      request(path, init) {
        return dependencies.fetch(`http://local-tailscaled.sock${path}`, {
          ...init,
          unix: config.socketPath,
        });
      },
    };
  }

  return {
    async request(path, init) {
      const { port, token } = await readMacosCredentials(config, dependencies);
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Basic ${btoa(`:${token}`)}`);
      headers.set("Host", "local-tailscaled.sock");
      return dependencies.fetch(`http://${config.host}:${port}${path}`, {
        ...init,
        headers,
      });
    },
  };
}

async function readMacosCredentials(
  config: Extract<LocalApiConfig, { kind: "macos" }>,
  dependencies: LocalApiDependencies,
): Promise<{ port: number; token: string }> {
  const parsed = JSON.parse(
    await dependencies.readFile(config.credentialPath, "utf8"),
  ) as unknown;
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as { port?: unknown }).port === "number" &&
    typeof (parsed as { token?: unknown }).token === "string"
  ) {
    return parsed as { port: number; token: string };
  }
  throw new Error("invalid macOS Tailscale LocalAPI credential file");
}
