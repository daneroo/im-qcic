// The wire shape ted1k-derive publishes into each KV entry (see
// v2/apps/ted1k-derive/src/poll.ts's ViewPayload) - copied here, not
// imported, since the two are separate deployables communicating over a
// wire format, not sharing TypeScript across a package boundary.

export type Cell = string | number | null;
export type Table = Cell[][];

export interface TedcheckViewPayload {
  meta: {
    stamp: string;
    hostname: string;
    version: { name: string; version: string; runtime: string };
    type: "tedcheck";
    view: string;
  };
  data: Table;
}
