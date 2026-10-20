import { isValidCoordinate } from "./geofence.js";

export const MAX_ACCURACY_METERS = 100;
export const MAX_READING_AGE_MS = 30 * 1000;

export const READING_ISSUE_MESSAGES = {
  invalid: "The GPS coordinates are invalid.",
  low_accuracy: `GPS accuracy is too low. Move to an open area and refresh (needs ${MAX_ACCURACY_METERS} m or better).`,
  stale: "The GPS reading is out of date. Refresh your location.",
  mocked: "A mock location was detected. Disable mock location apps to mark attendance.",
};

export function validateReading(reading, now = Date.now()) {
  const issues = [];
  if (!reading || !isValidCoordinate(reading.latitude, reading.longitude)) {
    issues.push("invalid");
    return { ok: false, issues };
  }

  const accuracy = Number(reading.accuracy);
  if (!Number.isFinite(accuracy) || accuracy > MAX_ACCURACY_METERS) {
    issues.push("low_accuracy");
  }

  const age = now - Number(reading.timestamp);
  if (!Number.isFinite(age) || age > MAX_READING_AGE_MS) {
    issues.push("stale");
  }

  if (reading.mocked === true) {
    issues.push("mocked");
  }

  return { ok: issues.length === 0, issues };
}

export function accuracyLevel(accuracy) {
  const value = Number(accuracy);
  if (!Number.isFinite(value)) return "unknown";
  if (value <= 25) return "good";
  if (value <= MAX_ACCURACY_METERS) return "fair";
  return "poor";
}
