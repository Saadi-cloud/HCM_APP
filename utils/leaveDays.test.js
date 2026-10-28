import assert from "assert";
import { buildLeaveDetailRows, totalLeaveDays } from "./leaveDays.js";

const single = buildLeaveDetailRows({
  fromKey: "2026-11-23",
  toKey: "2026-11-23",
  fromDayType: "FULL",
  toDayType: "FULL",
});
assert.strictEqual(single.length, 1);
assert.strictEqual(totalLeaveDays(single), 1);

const halfRange = buildLeaveDetailRows({
  fromKey: "2026-11-23",
  toKey: "2026-11-24",
  fromDayType: "FULL",
  toDayType: "FIRST_HALF",
});
assert.strictEqual(halfRange.length, 2);
assert.strictEqual(totalLeaveDays(halfRange), 1.5);

const sunday = buildLeaveDetailRows({
  fromKey: "2026-11-22",
  toKey: "2026-11-22",
  fromDayType: "FULL",
  toDayType: "FULL",
});
assert.strictEqual(sunday[0].weekenD_FLAG, "Y");
assert.strictEqual(sunday[0].leavE_DAYS, 0);

console.log("leave days tests passed");
