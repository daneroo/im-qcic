import type {
  NatsFacts,
  NatsHealth,
  PublicHealth,
  TailnetFacts,
  TailnetHealth,
} from "./types";

export interface HealthObserver {
  read(): Promise<PublicHealth>;
  latestNats(): NatsHealth | null;
  latestTailnet(): TailnetHealth | null;
}

export interface HealthObserverOptions {
  observer: string;
  natsFreshnessMs: number;
  tailnetFreshnessMs: number;
  now?: () => Date;
  probeNats(): Promise<NatsFacts>;
  probeTailnet(): Promise<TailnetFacts>;
}

interface ObservationSlot<T> {
  read(at: Date): Promise<{ available: boolean; observedAt: Date }>;
  latest(): T | null;
}

export function createHealthObserver(
  options: HealthObserverOptions,
): HealthObserver {
  const now = options.now ?? (() => new Date());
  const nats = createObservationSlot({
    observer: options.observer,
    freshnessMs: options.natsFreshnessMs,
    now,
    probe: options.probeNats,
  });
  const tailnet = createObservationSlot({
    observer: options.observer,
    freshnessMs: options.tailnetFreshnessMs,
    now,
    probe: options.probeTailnet,
  });

  return {
    async read(): Promise<PublicHealth> {
      const requestedAt = now();
      const [natsObservation, tailnetObservation] = await Promise.all([
        nats.read(requestedAt),
        tailnet.read(requestedAt),
      ]);
      return {
        schema: 1,
        observer: options.observer,
        tailnet: {
          available: tailnetObservation.available,
          observedAt: tailnetObservation.observedAt.toISOString(),
        },
        nats: {
          available: natsObservation.available,
          observedAt: natsObservation.observedAt.toISOString(),
        },
      };
    },
    latestNats: nats.latest,
    latestTailnet: tailnet.latest,
  };
}

function createObservationSlot<TFacts extends object>(options: {
  observer: string;
  freshnessMs: number;
  now: () => Date;
  probe(): Promise<TFacts>;
}): ObservationSlot<
  TFacts & { schema: 1; observer: string; observedAt: string }
> {
  let checkedAtMs = Number.NEGATIVE_INFINITY;
  let available = false;
  let retained:
    | (TFacts & {
        schema: 1;
        observer: string;
        observedAt: string;
      })
    | null = null;
  let inFlight: Promise<{ available: boolean; observedAt: Date }> | null = null;

  return {
    read(at: Date): Promise<{ available: boolean; observedAt: Date }> {
      if (at.getTime() - checkedAtMs < options.freshnessMs) {
        return Promise.resolve({
          available,
          observedAt: new Date(checkedAtMs),
        });
      }
      if (inFlight) return inFlight;

      inFlight = options
        .probe()
        .then((facts) => {
          const observedAt = options.now();
          retained = {
            schema: 1,
            observer: options.observer,
            observedAt: observedAt.toISOString(),
            ...facts,
          };
          available = true;
          checkedAtMs = observedAt.getTime();
          return { available: true, observedAt };
        })
        .catch(() => {
          const observedAt = options.now();
          available = false;
          checkedAtMs = observedAt.getTime();
          return { available: false, observedAt };
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
    latest: () => retained,
  };
}
