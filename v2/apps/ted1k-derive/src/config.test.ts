import { expect, test } from "bun:test";
import { KV_BUCKET_NAME } from "./config";

test("publishes ted1k views to the iMetrical-prefixed KV bucket", () => {
  expect(KV_BUCKET_NAME).toBe("im-ted1k-derive");
});
