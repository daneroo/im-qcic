export interface LogglyEvent {
  timestamp: string;
  tags: string[];
  event?: { json?: { digest?: string } };
}

export interface CheckpointRecord {
  stamp: string;
  host: string;
  digest: string;
}

export type DigestTable = (string | null)[][];

// The search options can be parametrized later (hours,runs...)
export const searchOptions = {
  query:
    "tag:pocketscrape AND json.message:checkpoint AND json.scope:item AND json.digest:*",
  from: "-24h",
  until: "now",
  order: "desc", // which is the default
  // max size is about 1728=12*24*6, entiresPerRun*24h(retention) * 6runs/hour
  // at 12 entries per task run: 2 type * 2 users * 3 hosts, so this is 36 runs, or 6 hours.
  size: 200,
};

// receives loggly events for checkpoint.
// depends on events having {timestamp,tags:['host-,..],event.json.digest}
// and returns an array of {stamp,host,digest}
export function parseCheckpointEvents(
  events: LogglyEvent[],
): CheckpointRecord[] {
  const records: CheckpointRecord[] = [];

  events.forEach(function (event) {
    // stamp is no longer rounded here: moved to aggregator function
    const stamp = new Date(event.timestamp).toJSON();

    // host from tags: [ 'pocketscrape', 'host-darwin.imetrical.com' ]
    const hostRE = /^host-/;
    const defaultHost = "unknown";
    // return the last matching host, with suitable default
    const host = event.tags.reduce(
      (host, tag) => (tag.match(hostRE) ? tag.replace(hostRE, "") : host),
      defaultHost,
    );

    // skip if event.event.json.digest not found
    if (event.event?.json?.digest) {
      const digest = event.event.json.digest;
      records.push({ stamp, host, digest });
    }
  });
  return records;
}

export function round10min(stamp: string): string {
  return stamp.replace(/[0-9]:[0-9]{2}(\.[0-9]*)?Z$/, "0:00Z"); // round down to 10:00
}

export function shortDate(stampStr: string): string {
  return stampStr.substr(11, 9);
}

export function shortHash(hash: string): string {
  return hash.substr(0, 7);
}

export function shorten(long: DigestTable): DigestTable {
  const short: DigestTable = [long[0]!]; // dont touch titles
  for (const digests of long.slice(1)) {
    const row: (string | null)[] = [shortDate(digests[0]!)]; // which is a date
    for (const d of digests.slice(1)) {
      row.push(shortHash(d!));
    }
    short.push(row);
  }
  return short;
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
    // TODO(daneroo) if already present select max date, but it is too late..
    //  Just make sure the original entries are ascending in date...
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

// equivalent to the original service's asTable() - takes raw Loggly events
// (already fetched by the data-access boundary) straight through to the
// aggregated digest table.
export function asTable(events: LogglyEvent[]): DigestTable {
  return aggregate(parseCheckpointEvents(events));
}
