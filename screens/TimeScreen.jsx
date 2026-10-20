import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Circle, Marker } from "react-native-maps";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { useGlobalState } from "../context/GlobalContext";
import { useEmployeeProfileQuery } from "../apis/Get";
import useEmployeeShift from "../hooks/useEmployeeShift";
import useAttendanceStatus, { deriveAttendanceState } from "../hooks/useAttendanceStatus";
import LocationStatus from "../components/LocationStatus";
import AttendanceModal, { CAPTURE_TYPES } from "../components/AttendanceModal";
import AttendanceSuccessModal from "../components/AttendanceSuccessModal";
import { buildCheckInPayload, buildCheckOutPayload } from "../services/attendancePayload";
import { getAttendanceErrorMessage, submitCheckIn, submitCheckOut } from "../services/attendanceService";
import { scheduleForDate } from "../utils/attendanceCalculations";
import { formatDateLabel, formatTimeLabel, parseApiDateTime } from "../utils/dateTime";
import { ensureForegroundPermission, getFreshPosition, PERMISSION_MESSAGES } from "../services/locationService";
import {
  addTestOfficeAtPosition,
  clearTestOffices,
  getAuthorizedOffices,
} from "../services/officeLocationService";
import { evaluateGeofence, usableOffices } from "../utils/geofence";
import { READING_ISSUE_MESSAGES, validateReading } from "../utils/locationQuality";
import {
  ATTENDANCE_FIELD_DEFAULTS,
  ATTENDANCE_SUBMISSION_ENABLED,
  ATTENDANCE_TEST_MODE,
  DUPLICATE_SUBMISSION_COOLDOWN_MS,
} from "../constants/config";
import { theme } from "../constants/theme";

const MAP_DELTA = 0.02;

function useClock(intervalMs = 15000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

const TimeScreen = ({ navigation }) => {
  const { employeeId, authData, isAuthenticated } = useGlobalState();
  const queryClient = useQueryClient();
  const { schedule, shiftId, isLoading: shiftLoading } = useEmployeeShift();
  const profileQuery = useEmployeeProfileQuery();
  const attendanceQuery = useAttendanceStatus();
  const now = useClock();
  const mapRef = useRef(null);
  const busy = useRef(false);
  const lastSubmission = useRef(null);
  const [successDetails, setSuccessDetails] = useState(null);

  const attendanceState = useMemo(
    () => deriveAttendanceState(attendanceQuery.records, schedule, now.getTime()),
    [attendanceQuery.records, schedule, now]
  );

  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [offices, setOffices] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const geofence = useMemo(() => evaluateGeofence(position, offices), [position, offices]);
  const reading = useMemo(() => validateReading(position, Date.now()), [position, now]);
  const mapOffices = usableOffices(offices);

  const loadOffices = useCallback(async () => {
    setOffices(await getAuthorizedOffices(employeeId));
  }, [employeeId]);

  const refreshLocation = useCallback(async () => {
    if (busy.current) return null;
    busy.current = true;
    setLocating(true);
    setLocationError("");
    try {
      const permission = await ensureForegroundPermission();
      if (!permission.granted) {
        setPermissionBlocked(permission.reason === "blocked");
        setLocationError(PERMISSION_MESSAGES[permission.reason]);
        setPosition(null);
        return null;
      }
      setPermissionBlocked(false);
      const fresh = await getFreshPosition();
      setPosition(fresh);
      mapRef.current?.animateToRegion(
        {
          latitude: fresh.latitude,
          longitude: fresh.longitude,
          latitudeDelta: MAP_DELTA,
          longitudeDelta: MAP_DELTA,
        },
        400
      );
      return fresh;
    } catch {
      setLocationError("Unable to get your location. Check GPS and try again.");
      return null;
    } finally {
      busy.current = false;
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    loadOffices();
    refreshLocation();
  }, [loadOffices, refreshLocation]);

  const canCapture = !locating && !locationError && geofence.allowed && reading.ok;

  const handleCapturePress = () => {
    if (attendanceQuery.isLoading) return;
    if (attendanceQuery.isError) {
      Alert.alert("Attendance unavailable", "Today's attendance could not be loaded. Pull to refresh and try again.");
      attendanceQuery.refetch();
      return;
    }
    if (attendanceState.nextAction === "COMPLETE") {
      Alert.alert("Attendance complete", "You have already checked in and checked out for this shift.");
      return;
    }
    if (!canCapture) {
      const message =
        locationError ||
        (!reading.ok && READING_ISSUE_MESSAGES[reading.issues[0]]) ||
        (geofence.status === "no_offices"
          ? "No attendance location is configured for your account."
          : "You are outside your authorized attendance area.");
      Alert.alert("Attendance not allowed", message);
      return;
    }
    setModalVisible(true);
  };

  const handleSubmit = async ({ captureType, reason }) => {
    if (submitting) return;
    const isCheckIn = captureType === CAPTURE_TYPES.CHECK_IN;
    const label = isCheckIn ? "Check In" : "Check Out";

    if (!isAuthenticated || !(Number(employeeId) > 0)) {
      Alert.alert("Session expired", "Please sign in again.");
      return;
    }
    if (!ATTENDANCE_SUBMISSION_ENABLED) {
      Alert.alert(
        "Not available yet",
        "Attendance submission is disabled in this build until server-side location and time validation is approved."
      );
      return;
    }
    const last = lastSubmission.current;
    if (last && last.type === captureType && Date.now() - last.at < DUPLICATE_SUBMISSION_COOLDOWN_MS) {
      Alert.alert("Already submitted", `Your ${label} was just recorded.`);
      return;
    }

    setSubmitting(true);
    try {
      const fresh = await refreshLocation();
      const freshReading = validateReading(fresh);
      if (!fresh || !freshReading.ok) {
        Alert.alert(
          "Attendance not allowed",
          READING_ISSUE_MESSAGES[freshReading.issues[0]] ?? "Unable to verify your location."
        );
        return;
      }
      if (!evaluateGeofence(fresh, offices).allowed) {
        Alert.alert("Attendance not allowed", "You are outside your authorized attendance area.");
        return;
      }

      const latest = await attendanceQuery.refetch();
      if (latest.isError) {
        Alert.alert("Attendance unavailable", getAttendanceErrorMessage(latest.error));
        return;
      }
      const captureAt = Date.now();
      const current = deriveAttendanceState(latest.data ?? [], schedule, captureAt);

      let saved;
      if (isCheckIn) {
        if (current.openRecord || current.completedRecord) {
          Alert.alert(
            "Already checked in",
            current.openRecord
              ? "You are already checked in for this shift. Use Check Out instead."
              : "Attendance for this shift is already complete."
          );
          return;
        }
        const payload = buildCheckInPayload({
          employeeId,
          shiftId,
          dateKey: current.attendanceDateKey,
          scheduleInstance: scheduleForDate(schedule, current.attendanceDateKey),
          actualIn: captureAt,
          reason,
          testMode: ATTENDANCE_TEST_MODE,
          defaults: ATTENDANCE_FIELD_DEFAULTS,
        });
        saved = await submitCheckIn(payload);
      } else {
        if (!current.openRecord) {
          Alert.alert(
            "No open check-in",
            current.completedRecord
              ? "You have already checked out for this shift."
              : "There is no check-in for this shift to check out from."
          );
          return;
        }
        const payload = buildCheckOutPayload({
          record: current.openRecord,
          employeeId,
          actualOut: captureAt,
          reason,
          testMode: ATTENDANCE_TEST_MODE,
        });
        saved = await submitCheckOut(payload);
      }

      if (Number(saved?.employeE_ID) !== Number(employeeId)) {
        throw new Error("The saved record does not belong to the signed-in employee.");
      }

      lastSubmission.current = { type: captureType, at: Date.now() };
      setModalVisible(false);
      setSuccessDetails({
        captureType: label,
        captureTime: formatTimeLabel(
          parseApiDateTime(isCheckIn ? saved.actuaL_IN : saved.actuaL_OUT) ?? captureAt
        ),
        attendanceDate: formatDateLabel(current.attendanceDateKey),
        employeeName: profileQuery.data?.fullName || authData?.username,
        attendanceId: saved.attendancE_ID,
      });
    } catch (error) {
      Alert.alert(`${label} failed`, getAttendanceErrorMessage(error));
      attendanceQuery.refetch();
    } finally {
      setSubmitting(false);
    }
  };

  const closeSuccess = () => {
    setSuccessDetails(null);
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
  };

  const captureLabel =
    attendanceState.nextAction === "CHECK_OUT"
      ? "Check Out"
      : attendanceState.nextAction === "COMPLETE"
      ? "Attendance Complete"
      : "Check In";

  const addTestOffice = () => {
    if (!position) {
      Alert.alert("No location", "Refresh your location first.");
      return;
    }
    Alert.alert(
      "Create test office",
      "Your current GPS position will be saved as a TEST attendance office with a 1,000 m radius on this device only.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: async () => {
            try {
              await addTestOfficeAtPosition(employeeId, position);
              await loadOffices();
            } catch (error) {
              Alert.alert("Not saved", error?.message ?? "The test office could not be saved.");
            }
          },
        },
      ]
    );
  };

  const removeTestOffices = async () => {
    await clearTestOffices(employeeId);
    await loadOffices();
  };

  const hours = now.getHours();
  const period = hours >= 12 ? "PM" : "AM";
  const clock = `${hours % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dateLabel = now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TIME</Text>
        <TouchableOpacity
          hitSlop={12}
          onPress={() => navigation.navigate("AttendanceHistory")}
          accessibilityLabel="Attendance history"
        >
          <Ionicons name="calendar-outline" size={24} color={theme.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Text style={styles.period}>{period}</Text>
        <View style={styles.clockBlock}>
          <Text style={styles.clock}>{clock}</Text>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>
        <View style={styles.shiftBlock}>
          <Text style={styles.shiftLabel}>{schedule?.shiftName || "Shift"}</Text>
          {shiftLoading ? (
            <ActivityIndicator color={theme.navy} size="small" />
          ) : (
            <Text style={styles.shiftTimes}>
              {schedule ? `${schedule.scheduledInLabel} - ${schedule.scheduledOutLabel}` : "Timings unavailable"}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.mapWrap}>
        {position ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: position.latitude,
              longitude: position.longitude,
              latitudeDelta: MAP_DELTA,
              longitudeDelta: MAP_DELTA,
            }}
            showsUserLocation
            showsMyLocationButton={false}
            toolbarEnabled={false}
          >
            {mapOffices.map((office) => (
              <Circle
                key={`${office.locationId}-circle`}
                center={{ latitude: office.latitude, longitude: office.longitude }}
                radius={Number(office.radiusMeters)}
                strokeColor={theme.navy}
                strokeWidth={2}
                fillColor="rgba(8, 55, 133, 0.12)"
              />
            ))}
            {mapOffices.map((office) => (
              <Marker
                key={`${office.locationId}-marker`}
                coordinate={{ latitude: office.latitude, longitude: office.longitude }}
                title={office.locationName}
                description={office.testOnly ? "Test office (development only)" : undefined}
                pinColor={office.testOnly ? theme.orange : theme.navy}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            {locating ? <ActivityIndicator color={theme.navy} /> : null}
            <Ionicons name="map-outline" size={40} color={theme.muted} />
          </View>
        )}
        <TouchableOpacity
          style={styles.refresh}
          onPress={refreshLocation}
          disabled={locating}
          accessibilityLabel="Refresh location"
        >
          {locating ? <ActivityIndicator color={theme.navy} /> : <Ionicons name="locate" size={22} color={theme.navy} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        <LocationStatus
          loading={locating}
          error={locationError}
          position={position}
          geofence={geofence}
          readingIssues={position ? reading.issues : []}
        />

        <View style={styles.todayCard}>
          <Text style={styles.todayTitle}>{formatDateLabel(attendanceState.attendanceDateKey)}</Text>
          {attendanceQuery.isLoading ? (
            <ActivityIndicator color={theme.navy} />
          ) : attendanceQuery.isError ? (
            <Text style={styles.todayError}>Today's attendance could not be loaded.</Text>
          ) : (
            <View style={styles.todayRow}>
              <View style={styles.todayItem}>
                <Text style={styles.todayLabel}>Check In</Text>
                <Text style={styles.todayValue}>
                  {formatTimeLabel(
                    parseApiDateTime(
                      (attendanceState.openRecord ?? attendanceState.completedRecord)?.actuaL_IN
                    )
                  )}
                </Text>
              </View>
              <View style={styles.todayItem}>
                <Text style={styles.todayLabel}>Check Out</Text>
                <Text style={styles.todayValue}>
                  {formatTimeLabel(parseApiDateTime(attendanceState.completedRecord?.actuaL_OUT))}
                </Text>
              </View>
            </View>
          )}
          {attendanceState.staleOpenRecord ? (
            <Text style={styles.todayError}>
              {formatDateLabel(attendanceState.staleOpenRecord.attendancE_DATE)} has no check out. Contact HR to
              correct it.
            </Text>
          ) : null}
        </View>

        {permissionBlocked ? (
          <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.linkText}>Open device settings</Text>
          </TouchableOpacity>
        ) : null}

        {ATTENDANCE_TEST_MODE ? (
          <View style={styles.testPanel}>
            <Text style={styles.testBadge}>TESTING ONLY</Text>
            <Text style={styles.testNote}>
              Production office assignments are not available yet. Test offices are stored on this device and are
              disabled in release builds.
            </Text>
            <View style={styles.testActions}>
              <TouchableOpacity style={styles.testButton} onPress={addTestOffice} disabled={!position}>
                <Text style={styles.testButtonText}>Use my location as test office</Text>
              </TouchableOpacity>
              {offices.some((office) => office.testOnly) ? (
                <TouchableOpacity style={styles.testClear} onPress={removeTestOffices}>
                  <Text style={styles.testClearText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.captureButton,
            (!canCapture || attendanceState.nextAction === "COMPLETE") && styles.captureDisabled,
          ]}
          onPress={handleCapturePress}
          disabled={locating || submitting || attendanceQuery.isLoading}
        >
          <Ionicons name="finger-print-outline" size={22} color={theme.white} />
          <Text style={styles.captureText}>{captureLabel}</Text>
        </TouchableOpacity>
      </ScrollView>

      <AttendanceModal
        visible={modalVisible}
        submitting={submitting}
        defaultType={
          attendanceState.nextAction === "CHECK_OUT" ? CAPTURE_TYPES.CHECK_OUT : CAPTURE_TYPES.CHECK_IN
        }
        onSubmit={handleSubmit}
        onCancel={() => setModalVisible(false)}
      />
      <AttendanceSuccessModal visible={!!successDetails} details={successDetails} onClose={closeSuccess} />
    </SafeAreaView>
  );
};

export default TimeScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.navy,
  },
  header: {
    backgroundColor: theme.navy,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: theme.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
  banner: {
    backgroundColor: theme.yellow,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  period: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.navy,
  },
  clockBlock: {
    minWidth: 92,
  },
  clock: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.navy,
  },
  date: {
    fontSize: 12,
    color: theme.navy,
  },
  shiftBlock: {
    flex: 1,
    alignItems: "flex-end",
  },
  shiftLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.navy,
    textTransform: "uppercase",
  },
  shiftTimes: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.navy,
    marginTop: 2,
    textAlign: "right",
  },
  mapWrap: {
    flex: 1,
    minHeight: 220,
    backgroundColor: "#DCE4F1",
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  refresh: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  panel: {
    flexGrow: 0,
    maxHeight: "48%",
    backgroundColor: theme.background,
  },
  panelContent: {
    padding: 16,
    gap: 12,
  },
  todayCard: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 8,
  },
  todayTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.navy,
  },
  todayRow: {
    flexDirection: "row",
  },
  todayItem: {
    flex: 1,
  },
  todayLabel: {
    fontSize: 11,
    color: theme.muted,
  },
  todayValue: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.text,
    marginTop: 2,
  },
  todayError: {
    color: theme.danger,
    fontSize: 13,
  },
  linkButton: {
    alignSelf: "center",
  },
  linkText: {
    color: theme.navy,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  testPanel: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.orange,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#FFF7ED",
    gap: 8,
  },
  testBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.orange,
    color: theme.white,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  testNote: {
    fontSize: 12,
    color: "#7C2D12",
    lineHeight: 17,
  },
  testActions: {
    flexDirection: "row",
    gap: 8,
  },
  testButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.orange,
    paddingVertical: 10,
    alignItems: "center",
  },
  testButtonText: {
    color: theme.orange,
    fontWeight: "700",
    fontSize: 13,
  },
  testClear: {
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  testClearText: {
    color: theme.muted,
    fontWeight: "700",
  },
  captureButton: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.orange,
    borderRadius: 40,
    paddingVertical: 16,
  },
  captureDisabled: {
    backgroundColor: "#9CA3AF",
  },
  captureText: {
    color: theme.white,
    fontSize: 17,
    fontWeight: "800",
  },
});
