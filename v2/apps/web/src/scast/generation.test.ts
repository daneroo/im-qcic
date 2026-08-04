import { describe, expect, test } from "bun:test";
import { aggregate, parseDigestMessage, shorten } from "./generation";
import fixture from "./generation.fixture.json";

describe("parseDigestMessage", () => {
  test("accepts a well-formed scope:item message", () => {
    const raw = {
      stamp: "2019-03-12T03:52:19.279Z", // present on the real message, ignored here
      host: "newton",
      digest: "838ae31",
      scope: "item",
      generation: "2019-03-12T03:50:00Z",
      elapsed: 42, // present on the real message, ignored here
    };
    expect(parseDigestMessage(raw)).toEqual({
      generation: "2019-03-12T03:50:00Z",
      host: "newton",
      digest: "838ae31",
    });
  });

  test("rejects scope:history messages", () => {
    const raw = {
      host: "newton",
      digest: "838ae31",
      scope: "history",
      generation: "2019-03-12T03:50:00Z",
    };
    expect(parseDigestMessage(raw)).toBeNull();
  });

  test("rejects messages missing required fields", () => {
    expect(parseDigestMessage({ scope: "item", host: "newton" })).toBeNull();
  });

  test("rejects non-object input", () => {
    expect(parseDigestMessage(null)).toBeNull();
    expect(parseDigestMessage("not json")).toBeNull();
  });
});

describe("checkpoint", () => {
  const { data } = fixture;

  describe("aggregate", () => {
    test.each([
      [
        "happy",
        [
          ["generation", "darwin", "dirac.imetrical.com", "euler", "newton"],
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

  describe("aggregate-short", () => {
    test.each([
      [
        "short",
        [
          ["generation", "darwin", "dirac.imetrical.com", "euler", "newton"],
          ["03:50:00Z", "838ae31", "", "838ae31", "838ae31"],
          ["03:40:00Z", "e53d2ac", "e53d2ac", "0a79ce8", "e53d2ac"],
        ],
        data,
      ],
    ])("Check aggregate (%s)", (_name, expected, v) => {
      expect(shorten(aggregate(v))).toEqual(expected);
    });
  });
});
