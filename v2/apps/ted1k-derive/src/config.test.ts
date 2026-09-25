import { expect, test } from "bun:test";
import { hostAlias, KV_BUCKET_NAME } from "./config";

test("publishes ted1k views to the iMetrical-prefixed KV bucket", () => {
  expect(KV_BUCKET_NAME).toBe("im-ted1k-derive");
});

test("names the host from HOSTALIAS", () => {
  expect(hostAlias({ HOSTALIAS: "qcic-syno" })).toBe("qcic-syno");
});

test("requires HOSTALIAS rather than falling back to the hostname", () => {
  expect(() => hostAlias({})).toThrow("HOSTALIAS");
});
