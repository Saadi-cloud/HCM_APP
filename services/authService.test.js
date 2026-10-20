import assert from "assert";
import { buildLoginRequest, sanitizeAuthResponse } from "./authService.js";

const company = { companyId: 1, companyName: "Digital World Pakistan (Pvt.) Ltd." };
const financialYear = {
  financialYearId: 2,
  startingDate: "2026-07-01T00:00:00",
  endingDate: "2027-06-30T00:00:00",
  financialYearStatus: "Yes",
};

const request = buildLoginRequest({
  username: " admin ",
  password: "secret",
  company,
  financialYear,
});

assert.deepStrictEqual(request, {
  username: "admin",
  password: "secret",
  companyId: 1,
  financialYearId: 2,
  startingDate: "2026-07-01T00:00:00",
  endingDate: "2027-06-30T00:00:00",
  companyName: "Digital World Pakistan (Pvt.) Ltd.",
});
assert.strictEqual(Object.hasOwn(request, "token"), false);
assert.strictEqual(Object.hasOwn(request, "userId"), false);

assert.throws(() => buildLoginRequest({ username: "", password: "x", company, financialYear }));

function makeToken(exp) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ exp })}.sig`;
}

const token = makeToken(1_800_000_000);
const sanitized = sanitizeAuthResponse(
  {
    userId: 1,
    username: "admin",
    password: "secret",
    companyId: 1,
    token,
    expiryMinutes: 100,
    financialYearId: 2,
    startingDate: "2026-07-01T00:00:00",
    endingDate: "2027-06-30T00:00:00",
    companyName: company.companyName,
    server: null,
    employeeId: 180,
  },
  1_000
);

assert.strictEqual(sanitized.ok, true);
assert.strictEqual(sanitized.token, token);
assert.strictEqual(sanitized.session.employeeId, 180);
assert.strictEqual(sanitized.session.expiresAt, 1_800_000_000 * 1000);
assert.strictEqual(Object.hasOwn(sanitized.session, "password"), false);
assert.strictEqual(Object.hasOwn(sanitized.session, "token"), false);

const missingEmployee = sanitizeAuthResponse(
  { userId: 1, token, employeeId: 0, expiryMinutes: 10 },
  1_000
);
assert.strictEqual(missingEmployee.ok, false);

console.log("auth service tests passed");
