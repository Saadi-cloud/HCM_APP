// Must be read as a literal process.env.EXPO_PUBLIC_* expression so Expo can inline it at build time.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL is not set. Add it to .env or the EAS environment.");
}
export const API_TIMEOUT_MS = 30000;

// Attendance GPS checks are client-side only until backend validation exists.
export const ATTENDANCE_TEST_MODE = __DEV__;
export const DEFAULT_GEOFENCE_RADIUS_METERS = 1000;

// Release builds stay blocked until server-side location, office and time validation are approved.
export const ATTENDANCE_SUBMISSION_ENABLED = ATTENDANCE_TEST_MODE;
export const DUPLICATE_SUBMISSION_COOLDOWN_MS = 60 * 1000;

// Testing defaults only; production values must come from payroll rules on the server.
export const ATTENDANCE_FIELD_DEFAULTS = ATTENDANCE_TEST_MODE
  ? { attendanceStatus: "PRESENT", weekendFlag: "N", holidayFlag: "N", manualFlag: "N" }
  : { attendanceStatus: null, weekendFlag: null, holidayFlag: null, manualFlag: "N" };
