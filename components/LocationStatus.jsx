import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "../constants/theme";
import { accuracyLevel, READING_ISSUE_MESSAGES } from "../utils/locationQuality";

const LEVEL_COLORS = {
  good: "#15803D",
  fair: "#B45309",
  poor: theme.danger,
  unknown: theme.muted,
};

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "—";
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

const LocationStatus = ({ loading, error, position, geofence, readingIssues = [] }) => {
  if (loading && !position) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={theme.navy} />
        <Text style={styles.muted}>Getting your GPS location…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="warning-outline" size={22} color={theme.danger} />
          <Text style={[styles.status, { color: theme.danger }]}>{error}</Text>
        </View>
      </View>
    );
  }

  const level = accuracyLevel(position?.accuracy);
  const nearest = geofence?.nearest;
  let statusText = "Location not available.";
  let statusColor = theme.muted;
  let icon = "location-outline";

  if (geofence?.status === "inside") {
    statusText = `Inside ${nearest.office.locationName}`;
    statusColor = "#15803D";
    icon = "checkmark-circle-outline";
  } else if (geofence?.status === "outside") {
    statusText = "You are outside your authorized attendance area.";
    statusColor = theme.danger;
    icon = "close-circle-outline";
  } else if (geofence?.status === "no_offices") {
    statusText = "No attendance location is configured for your account.";
    statusColor = theme.orange;
    icon = "business-outline";
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name={icon} size={22} color={statusColor} />
        <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Nearest office</Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {nearest?.office?.locationName ?? "—"}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Distance</Text>
          <Text style={styles.metricValue}>{formatDistance(nearest?.distanceMeters)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Accuracy</Text>
          <View style={[styles.pill, { backgroundColor: LEVEL_COLORS[level] }]}>
            <Text style={styles.pillText}>
              {Number.isFinite(Number(position?.accuracy)) ? `±${Math.round(position.accuracy)} m` : "—"}
            </Text>
          </View>
        </View>
      </View>

      {readingIssues.map((issue) => (
        <Text key={issue} style={styles.issue}>
          {READING_ISSUE_MESSAGES[issue]}
        </Text>
      ))}
    </View>
  );
};

export default LocationStatus;

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  status: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  muted: {
    color: theme.muted,
    textAlign: "center",
  },
  metrics: {
    flexDirection: "row",
    gap: 10,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: theme.muted,
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    color: theme.white,
    fontSize: 12,
    fontWeight: "700",
  },
  issue: {
    color: theme.danger,
    fontSize: 13,
  },
});
