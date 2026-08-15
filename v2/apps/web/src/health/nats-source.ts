import { wsconnect } from "@nats-io/nats-core";
import { Kvm } from "@nats-io/kv";
import type { HealthEvent, HealthSource } from "./feed";

export const HEALTH_KV_BUCKET = "im-qcic-health";
export const PUBLIC_HEALTH_STREAM_SUBJECT = "pub.im.qcic.health.stream";

export const natsHealthSource: HealthSource = {
  async open(credentials) {
    const nc = await wsconnect({ servers: credentials.servers });
    try {
      const kv = await new Kvm(nc).open(HEALTH_KV_BUCKET);
      const detailWatch = await kv.watch({ key: ">" });
      const publicSubscription = nc.subscribe(PUBLIC_HEALTH_STREAM_SUBJECT);

      async function* events(): AsyncGenerator<HealthEvent> {
        const publicMessages = publicSubscription[Symbol.asyncIterator]();
        const detailEntries = detailWatch[Symbol.asyncIterator]();
        let nextPublic = publicMessages
          .next()
          .then((result) => ({ source: "public" as const, result }));
        let nextDetail = detailEntries
          .next()
          .then((result) => ({ source: "detail" as const, result }));

        while (true) {
          const next = await Promise.race([nextPublic, nextDetail]);
          if (next.result.done) return;

          if (next.source === "public") {
            yield { kind: "public", data: next.result.value.data };
            nextPublic = publicMessages
              .next()
              .then((result) => ({ source: "public" as const, result }));
          } else {
            const entry = next.result.value;
            if (entry.key === "nats" || entry.key === "tailnet") {
              yield { kind: "detail", key: entry.key, data: entry.value };
            }
            nextDetail = detailEntries
              .next()
              .then((result) => ({ source: "detail" as const, result }));
          }
        }
      }

      return {
        events: events(),
        async close() {
          publicSubscription.unsubscribe();
          detailWatch.stop();
          await nc.close();
        },
      };
    } catch (error) {
      await nc.close();
      throw error;
    }
  },
};
