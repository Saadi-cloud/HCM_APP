const EARTH_RADIUS_METERS = 6371008.8;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function isValidCoordinate(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return (
    latitude != null &&
    longitude != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export function haversineMeters(from, to) {
  const lat1 = toRadians(Number(from.latitude));
  const lat2 = toRadians(Number(to.latitude));
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(Number(to.longitude) - Number(from.longitude));
  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function usableOffices(offices = []) {
  return offices.filter(
    (office) =>
      office?.enabled !== false &&
      isValidCoordinate(office?.latitude, office?.longitude) &&
      Number(office?.radiusMeters) > 0
  );
}

export function evaluateGeofence(position, offices = []) {
  const candidates = usableOffices(offices);

  if (!position || !isValidCoordinate(position.latitude, position.longitude)) {
    return { status: "no_position", allowed: false, nearest: null, matches: [], distances: [] };
  }
  if (candidates.length === 0) {
    return { status: "no_offices", allowed: false, nearest: null, matches: [], distances: [] };
  }

  const distances = candidates
    .map((office) => ({
      office,
      distanceMeters: haversineMeters(position, office),
    }))
    .sort((left, right) => left.distanceMeters - right.distanceMeters);

  const matches = distances.filter((entry) => entry.distanceMeters <= Number(entry.office.radiusMeters));

  return {
    status: matches.length > 0 ? "inside" : "outside",
    allowed: matches.length > 0,
    nearest: matches[0] ?? distances[0],
    matches,
    distances,
  };
}
