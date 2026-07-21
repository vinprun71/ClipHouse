import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, hashSessionToken, safeDestination, verifyPassword } from "../src/lib/auth";

test("password hashes verify without storing plaintext", async () => {
  const password = "a-correct-horse-battery-staple";
  const hash = await hashPassword(password);
  assert.equal(hash.includes(password), false);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("session tokens are stored as deterministic hashes", () => {
  assert.equal(hashSessionToken("session-token"), hashSessionToken("session-token"));
  assert.notEqual(hashSessionToken("session-token"), "session-token");
});

test("redirect destinations stay on the same site", () => {
  assert.equal(safeDestination("/library?q=dogs"), "/library?q=dogs");
  assert.equal(safeDestination("//example.com"), "/");
  assert.equal(safeDestination("https://example.com"), "/");
});
