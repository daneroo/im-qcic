// Ported from v2/apps/status/src/logcheck.ts (renamed here - "logcheck"
// was an artifact of that view's data once being sourced from Loggly; the
// real domain term is "digest", matching the NATS subject
// im.scrobblecast.scrape.digest). `parseCheckpointEvents` is deliberately
// NOT carried over: it exists there to decode Loggly's raw event shape
// (extracting host from a tags array, digging into event.json.digest) into
// a CheckpointRecord. The NATS message this service reads already arrives
// as {stamp, host, digest, scope, ...} - see scrobblecast-datasource.ts's
// toItemRecords, a trivial destructure, not a port of that Loggly-specific
// parsing.

export interface CheckpointRecord {
  stamp: string;
  host: string;
  digest: string;
}

export type DigestTable = (string | null)[][];

export function round10min(stamp: string): string {
  return stamp.replace(/[0-9]:[0-9]{2}(\.[0-9]*)?Z$/, "0:00Z"); // round down to 10:00
}

export function aggregate(data: CheckpointRecord[]): DigestTable {
  // pre-sort in ascending date order
  const sorted = data.slice().sort((a, b) => a.stamp.localeCompare(b.stamp));

  // reduce set of {stamp,host,digest} -> 10min(stamp)->{[host]=>digest}
  // '2019-03-11T19:00:00Z': { h1:d1, h2,d2,.. },
  const digestByStampByHost = sorted.reduce<
    Record<string, Record<string, string>>
  >((map, entry) => {
    const stamp = round10min(entry.stamp);
    const { host, digest } = entry;
    map[stamp] = { ...(map[stamp] || {}), [host]: digest };
    return map;
  }, {});

  const hosts = Array.from(
    Object.values(digestByStampByHost).reduce((set, digestByHost) => {
      Object.keys(digestByHost).reduce((set, host) => set.add(host), set);
      return set;
    }, new Set<string>()),
  );
  hosts.sort();

  const stamps = Object.keys(digestByStampByHost).sort().reverse();

  // host + [stamp, digest1, digest 2,..]*
  const result: DigestTable = [["checkpoint", ...hosts]];

  for (const stamp of stamps) {
    const ds: (string | null)[] = [stamp];
    for (const host of hosts) {
      ds.push(digestByStampByHost[stamp]![host] || "");
    }
    result.push(ds);
  }

  return result;
}

// equivalent to the original service's asTable() - takes already-parsed
// checkpoint records straight through to the aggregated digest table.
export function asTable(records: CheckpointRecord[]): DigestTable {
  return aggregate(records);
}
