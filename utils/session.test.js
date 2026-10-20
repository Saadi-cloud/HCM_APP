import assert from "assert";
import {
  getJwtExpiryMs,
  isSessionExpired,
  resolveSessionExpiry,
  stripSensitiveAuthFields,
} from "./session.js";

function makeToken(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.sig`;
}

const expSeconds = 1_800_000_000;
const token = makeToken({ exp: expSeconds, sub: "1" });

assert.strictEqual(getJwtExpiryMs(token), expSeconds * 1000);
assert.strictEqual(getJwtExpiryMs("not-a-jwt"), null);
assert.strictEqual(resolveSessionExpiry(token, 5), expSeconds * 1000);
assert.strictEqual(resolveSessionExpiry("opaque", 10, 1_000), 1_000 + 10 * 60 * 1000);
assert.strictEqual(resolveSessionExpiry("opaque", 0, 1_000), null);
assert.strictEqual(isSessionExpired(expSeconds * 1000, expSeconds * 1000), true);
assert.strictEqual(isSessionExpired(expSeconds * 1000, expSeconds * 1000 - 1), false);
assert.strictEqual(isSessionExpired(null), true);

const stripped = stripSensitiveAuthFields({
  userId: 1,
  password: "secret",
  token: "jwt",
  employeeId: 180,
});
assert.deepStrictEqual(stripped, { userId: 1, employeeId: 180 });

console.log("session tests passed");
