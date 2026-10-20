import assert from "assert";
import { formatMinutesAsTime, resolveShiftSchedule, selectApplicableShift } from "./shift.js";

const now = Date.parse("2026-10-19T10:00:00");
const assignments = [
  {
    employeE_ID: 180,
    shifT_ID: 1,
    effectivE_FROM: "2026-01-01T00:00:00",
    effectivE_TO: "2026-06-30T00:00:00",
    activE_FLAG: "Y",
  },
  {
    employeE_ID: 180,
    shifT_ID: 4,
    effectivE_FROM: "2026-07-01T00:00:00",
    effectivE_TO: null,
    activE_FLAG: "Y",
  },
  {
    employeE_ID: 181,
    shifT_ID: 9,
    effectivE_FROM: "2026-07-01T00:00:00",
    activE_FLAG: "Y",
  },
];

assert.strictEqual(selectApplicableShift(assignments, 180, now).shifT_ID, 4);
assert.strictEqual(selectApplicableShift(assignments, 181, now).shifT_ID, 9);
assert.strictEqual(formatMinutesAsTime(9 * 60), "9:00 AM");
assert.strictEqual(formatMinutesAsTime(18 * 60), "6:00 PM");

const overnight = resolveShiftSchedule({
  shifT_ID: 4,
  shifT_NAME: "Night",
  timE_IN_MIN: 22 * 60,
  timE_OUT_MIN: 6 * 60,
  nighT_SHIFT_FLAG: "Y",
});
assert.strictEqual(overnight.scheduledInLabel, "10:00 PM");
assert.strictEqual(overnight.scheduledOutLabel, "6:00 AM");
assert.strictEqual(overnight.overnight, true);

const payroll = resolveShiftSchedule({
  shiftId: 1,
  shiftName: "General",
  startTime: "2026-10-19T09:00:00",
  endTime: "2026-10-19T18:00:00",
});
assert.strictEqual(payroll.scheduledInLabel, "9:00 AM");
assert.strictEqual(payroll.scheduledOutLabel, "6:00 PM");
assert.strictEqual(payroll.overnight, false);
assert.strictEqual(resolveShiftSchedule({ shifT_ID: 1, shifT_NAME: "Unknown" }), null);

console.log("shift tests passed");
