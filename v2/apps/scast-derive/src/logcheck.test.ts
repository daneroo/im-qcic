import { describe, expect, test } from "bun:test";
import { aggregate, round10min } from "./logcheck";
import fixture from "./logcheck.fixture.json";

// Reuses Phase 1's exact fixture (v2/apps/status/src/logcheck.fixture.json)
// unchanged - its `data` field is already CheckpointRecord[] shape
// ({stamp,host,digest}), matching what the real NATS message gives us
// after a trivial destructure (see scrobblecast-datasource.ts), so no
// Loggly-specific parsing step is needed to exercise these functions.
describe("logcheck", () => {
  describe("round10min", () => {
    test.each([
      ["1", "2019-03-12T03:40:00Z", "2019-03-12T03:41:34Z"],
      ["2", "2019-03-12T03:40:00Z", "2019-03-12T03:46:34Z"],
    ])("Check truth (%s)", (_name, expected, v) => {
      expect(round10min(v)).toBe(expected);
    });
  });

  const { data } = fixture;

  describe("aggregate", () => {
    test.each([
      [
        "happy",
        [
          ["checkpoint", "darwin", "dirac.imetrical.com", "euler", "newton"],
          [
            "2019-03-12T03:50:00Z",
            "838ae31efb392938f611fc0887282b1f8d951707a8fb4f550072f98e38a78871",
            "",
            "838ae31efb392938f611fc0887282b1f8d951707a8fb4f550072f98e38a78871",
            "838ae31efb392938f611fc0887282b1f8d951707a8fb4f550072f98e38a78871",
          ],
          [
            "2019-03-12T03:40:00Z",
            "e53d2ac1103590f74f205ae5548985e4330f2f04ab547692c7945478a1801b33",
            "e53d2ac1103590f74f205ae5548985e4330f2f04ab547692c7945478a1801b33",
            "0a79ce887263f6aaf97cf7ded9e44fc7fcca701ef3e70d983024dd5a89ecc5db",
            "e53d2ac1103590f74f205ae5548985e4330f2f04ab547692c7945478a1801b33",
          ],
        ],
        data,
      ],
    ])("Check aggregate (%s)", (_name, expected, v) => {
      expect(aggregate(v)).toEqual(expected);
    });
  });
});
