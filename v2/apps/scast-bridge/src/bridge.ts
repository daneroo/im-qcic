export interface BridgeMessage {
  subject: string;
  data: Uint8Array;
  seq: number;
  ack(): void;
}

export interface BridgeDeps {
  // an already-subscribed, live-tailing source of raw messages - see
  // scrobblecast-source.ts's subscribe()
  messages: AsyncIterable<BridgeMessage>;
  sink: {
    publish(subject: string, data: Uint8Array, msgId: string): Promise<void>;
  };
  rewriteSubject: (subject: string) => string;
  // the source stream's own sequence number is a stable, already-unique id
  // - no need to decode payload content to derive a dedup key
  msgIdPrefix: string;
  // observability only - never affects what gets published
  onCopy?: (message: BridgeMessage) => void;
}

// Copy-through, not transformation: every message is republished byte-for-
// byte unchanged, only the subject is rewritten (scrobblecast -> scast
// namespace). No decode, no filter, no reshape - see README.md for why.
export async function run(deps: BridgeDeps): Promise<void> {
  for await (const message of deps.messages) {
    const destSubject = deps.rewriteSubject(message.subject);
    const msgId = `${deps.msgIdPrefix}-${message.seq}`;
    await deps.sink.publish(destSubject, message.data, msgId);
    message.ack();
    deps.onCopy?.(message);
  }
}
