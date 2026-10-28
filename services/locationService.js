import * as Location from "expo-location";

export function readingFromLocation(location) {
  const heading = Number(location?.coords?.heading);
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    timestamp: location.timestamp,
    mocked: location.mocked === true,
    heading: Number.isFinite(heading) && heading >= 0 ? heading : null,
  };
}

export async function ensureForegroundPermission() {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return { granted: false, reason: "services_disabled" };
  }

  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return { granted: true };

  if (!current.canAskAgain) {
    return { granted: false, reason: "blocked" };
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.granted
    ? { granted: true }
    : { granted: false, reason: requested.canAskAgain ? "denied" : "blocked" };
}

export async function getFreshPosition() {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
    mayShowUserSettingsDialog: true,
  });
  return readingFromLocation(location);
}

// Foreground-only live updates for the Time map marker. Not used for punch submission.
export async function watchPosition(onUpdate) {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 2000,
      distanceInterval: 5,
      mayShowUserSettingsDialog: true,
    },
    (location) => onUpdate(readingFromLocation(location))
  );
}

export const PERMISSION_MESSAGES = {
  services_disabled: "Location services are turned off. Turn on GPS to mark attendance.",
  denied: "Location permission is required to mark attendance.",
  blocked: "Location permission is blocked. Enable it for DWP HCM in your device settings.",
};
