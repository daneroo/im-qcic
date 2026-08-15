import { chmod, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function parseLocalCreds(output: string): {
  port: number;
  token: string;
} {
  const match =
    /^curl -u:([^\s]+) http:\/\/localhost:(\d+)\/localapi\/v0\/status\s*$/.exec(
      output,
    );
  if (!match) {
    throw new Error("unexpected `tailscale debug local-creds` output");
  }
  return { token: match[1]!, port: Number(match[2]) };
}

if (import.meta.main) {
  const tailscaleCli =
    process.env.TAILSCALE_CLI ||
    "/Applications/Tailscale.app/Contents/MacOS/Tailscale";
  if (!existsSync(tailscaleCli)) {
    throw new Error(
      `Tailscale CLI not found at ${tailscaleCli}; set TAILSCALE_CLI`,
    );
  }
  const destination = resolve(
    import.meta.dir,
    "../../../infra/credentials/credentials.tailscale-localapi.json",
  );
  const command = Bun.spawnSync([tailscaleCli, "debug", "local-creds"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (command.exitCode !== 0) {
    throw new Error(
      `tailscale debug local-creds failed: ${command.stderr.toString().trim()}`,
    );
  }

  const credentials = parseLocalCreds(command.stdout.toString());
  await mkdir(dirname(destination), { recursive: true });
  await Bun.write(destination, `${JSON.stringify(credentials)}\n`);
  await chmod(destination, 0o600);
  console.log("Refreshed macOS Tailscale LocalAPI credentials.");
}
