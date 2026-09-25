// Removes a stale scast-bridge durable from the production server's
// scrobblecastDigest stream (#297). Dry run unless --yes. Run on the host
// that owns the credentials, from its compose directory:
//
//   just compose run --rm --entrypoint bun scast-bridge src/durable-rm.ts <durable> [--yes]

import { connect, type ConsumerInfo } from "nats";
import {
  config,
  DURABLE_PREFIX,
  durableName,
  SOURCE_STREAM_NAME,
} from "./config";

// Why this durable must not be deleted, or null if it may be.
export function refusal(
  name: string,
  info: Pick<ConsumerInfo, "push_bound">,
  ownDurable: string,
): string | null {
  if (name !== DURABLE_PREFIX && !name.startsWith(`${DURABLE_PREFIX}-`)) {
    return `${name} is not a scast-bridge durable`;
  }
  if (name === ownDurable) {
    return `${name} is this host's own durable`;
  }
  if (info.push_bound) {
    return `${name} is bound to a live subscriber`;
  }
  return null;
}

async function main(args: string[]): Promise<number> {
  const name = args.find((a) => !a.startsWith("--"));
  const yes = args.includes("--yes");
  if (!name || !config.natsProd || !process.env.HOSTALIAS) {
    console.error(
      "usage: durable-rm.ts <durable> [--yes]  (needs HOSTALIAS and nats-prod credentials)",
    );
    return 2;
  }
  const ownDurable = durableName(process.env);

  const nc = await connect({ servers: config.natsProd.servers });
  try {
    const jsm = await nc.jetstreamManager();
    const info = await jsm.consumers
      .info(SOURCE_STREAM_NAME, name)
      .catch(() => null);
    if (!info) {
      console.error(`no durable ${name} on ${SOURCE_STREAM_NAME}`);
      return 1;
    }
    console.log({
      stream: SOURCE_STREAM_NAME,
      durable: info.name,
      push_bound: info.push_bound ?? false,
      deliver_subject: info.config.deliver_subject,
      delivered_seq: info.delivered.stream_seq,
      ack_floor_seq: info.ack_floor.stream_seq,
      num_pending: info.num_pending,
      num_ack_pending: info.num_ack_pending,
    });

    const reason = refusal(name, info, ownDurable);
    if (reason) {
      console.error(`refused: ${reason}`);
      return 1;
    }
    if (!yes) {
      console.log("dry run: re-run with --yes to delete");
      return 0;
    }
    await jsm.consumers.delete(SOURCE_STREAM_NAME, name);
    console.log(`deleted ${name}`);
    return 0;
  } finally {
    await nc.close();
  }
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2)));
}
