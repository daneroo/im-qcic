import { describe, expect, test } from "bun:test";
import { parseDigestMessage } from "./generation";

describe("parseDigestMessage", () => {
  test("accepts a well-formed scope:item message", () => {
    const raw = {
      stamp: "2019-03-12T03:52:19.279Z",
      host: "newton",
      digest: "838ae31",
      scope: "item",
      generation: "2019-03-12T03:50:00Z",
      elapsed: 42,
    };
    expect(parseDigestMessage(raw)).toEqual({
      stamp: new Date("2019-03-12T03:52:19.279Z"),
      generation: new Date("2019-03-12T03:50:00Z"),
      host: "newton",
      digest: "838ae31",
      elapsed: 42,
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
