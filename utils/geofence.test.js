import assert from "assert";
import { evaluateGeofence, haversineMeters, isValidCoordinate } from "./geofence.js";
import { validateReading } from "./locationQuality.js";

const headOffice = {
  locationId: "head-office",
  locationName: "Head Office",
  latitude: 31.5,
  longitude: 74.3,
  radiusMeters: 1000,
  enabled: true,
};
const branchOffice = {
  locationId: "branch-office",
  locationName: "Branch Office",
  latitude: 31.6,
  longitude: 74.4,
  radiusMeters: 1000,
  enabled: true,
};

const oneDegreeLat = haversineMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
assert.ok(Math.abs(oneDegreeLat - 111195) < 10);

assert.strictEqual(isValidCoordinate(null, 74.3), false);
assert.strictEqual(isValidCoordinate(0, 0), false);
assert.strictEqual(isValidCoordinate(91, 74), false);
assert.strictEqual(isValidCoordinate(31.5, 74.3), true);

const near = { latitude: 31.5045, longitude: 74.3 };
const inside = evaluateGeofence(near, [headOffice, branchOffice]);
assert.strictEqual(inside.allowed, true);
assert.strictEqual(inside.nearest.office.locationId, "head-office");
assert.ok(inside.nearest.distanceMeters > 450 && inside.nearest.distanceMeters < 550);

const nearBranch = evaluateGeofence({ latitude: 31.6, longitude: 74.405 }, [headOffice, branchOffice]);
assert.strictEqual(nearBranch.allowed, true);
assert.strictEqual(nearBranch.nearest.office.locationId, "branch-office");

const headOnly = evaluateGeofence({ latitude: 31.6, longitude: 74.405 }, [headOffice]);
assert.strictEqual(headOnly.allowed, false);
assert.strictEqual(headOnly.status, "outside");

const edge = evaluateGeofence({ latitude: 31.5 + 1100 / 111195, longitude: 74.3 }, [headOffice]);
assert.strictEqual(edge.allowed, false);

const disabled = evaluateGeofence(near, [{ ...headOffice, enabled: false }]);
assert.strictEqual(disabled.status, "no_offices");

const unconfigured = evaluateGeofence(near, [{ ...headOffice, latitude: null, longitude: null }]);
assert.strictEqual(unconfigured.status, "no_offices");

const now = 1_000_000;
const good = validateReading({ latitude: 31.5, longitude: 74.3, accuracy: 20, timestamp: now - 5000, mocked: false }, now);
assert.deepStrictEqual(good.issues, []);

const bad = validateReading({ latitude: 31.5, longitude: 74.3, accuracy: 250, timestamp: now - 120000, mocked: true }, now);
assert.ok(bad.issues.includes("low_accuracy"));
assert.ok(bad.issues.includes("stale"));
assert.ok(bad.issues.includes("mocked"));

console.log("geofence tests passed");
