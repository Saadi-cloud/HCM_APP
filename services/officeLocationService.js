import * as SecureStore from "expo-secure-store";
import { ATTENDANCE_TEST_MODE, DEFAULT_GEOFENCE_RADIUS_METERS } from "../constants/config";
import { isValidCoordinate } from "../utils/geofence";

// Production employee-to-office assignments come from a backend endpoint that is still pending.
const PRODUCTION_ASSIGNMENTS = {};

const testOfficesKey = (employeeId) => `hcm.testOffices.${employeeId}`;

async function readTestOffices(employeeId) {
  if (!ATTENDANCE_TEST_MODE || !(Number(employeeId) > 0)) return [];
  try {
    const stored = await SecureStore.getItemAsync(testOfficesKey(employeeId));
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getAuthorizedOffices(employeeId) {
  const production = PRODUCTION_ASSIGNMENTS[String(employeeId)] ?? [];
  const testing = await readTestOffices(employeeId);
  return [...production, ...testing.map((office) => ({ ...office, testOnly: true }))];
}

export async function addTestOfficeAtPosition(employeeId, position, name) {
  if (!ATTENDANCE_TEST_MODE) {
    throw new Error("Test offices are only available in development builds.");
  }
  if (!position || !isValidCoordinate(position.latitude, position.longitude)) {
    throw new Error("A valid GPS position is required to create a test office.");
  }

  const existing = await readTestOffices(employeeId);
  const office = {
    locationId: `test-${Date.now()}`,
    locationName: name || `Test Office ${existing.length + 1}`,
    latitude: position.latitude,
    longitude: position.longitude,
    radiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
    enabled: true,
  };
  await SecureStore.setItemAsync(testOfficesKey(employeeId), JSON.stringify([...existing, office]));
  return office;
}

export async function clearTestOffices(employeeId) {
  if (!(Number(employeeId) > 0)) return;
  try {
    await SecureStore.deleteItemAsync(testOfficesKey(employeeId));
  } catch {
    // Nothing stored yet.
  }
}
