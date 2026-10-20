import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { formatMinutes, statusColor } from "./AttendanceHistoryScreen";
import { recordDateKey } from "../services/attendancePayload";
import { formatDateLabel, formatDateTimeLabel, parseApiDateTime } from "../utils/dateTime";
import { theme } from "../constants/theme";

const flagLabel = (value) => {
  if (value == null || value === "") return "—";
  const text = String(value).toUpperCase();
  if (text === "Y") return "Yes";
  if (text === "N") return "No";
  return String(value);
};

const AttendanceDetailsScreen = ({ navigation, route }) => {
  const record = route?.params?.record ?? {};
  const status = record.attendancE_STATUS || "—";
  const dateTime = (value) => formatDateTimeLabel(parseApiDateTime(value));

  const sections = [
    {
      title: "Schedule",
      rows: [
        ["Shift ID", record.shifT_ID],
        ["Scheduled In", dateTime(record.scheduleD_IN)],
        ["Scheduled Out", dateTime(record.scheduleD_OUT)],
      ],
    },
    {
      title: "Actual",
      rows: [
        ["Actual In", dateTime(record.actuaL_IN)],
        ["Actual Out", dateTime(record.actuaL_OUT)],
      ],
    },
    {
      title: "Minutes",
      rows: [
        ["Work", formatMinutes(record.worK_MINUTES)],
        ["Late", formatMinutes(record.latE_MINUTES)],
        ["Early Out", formatMinutes(record.earlY_OUT_MINUTES)],
        ["Overtime", formatMinutes(record.oT_MINUTES)],
      ],
    },
    {
      title: "Record",
      rows: [
        ["Attendance ID", record.attendancE_ID],
        ["Weekend", flagLabel(record.weekenD_FLAG)],
        ["Holiday", flagLabel(record.holidaY_FLAG)],
        ["Manual Entry", flagLabel(record.manuaL_FLAG)],
        ["Leave Request ID", record.leavE_REQUEST_ID],
        ["Remarks", record.remarks],
        ["Processed", dateTime(record.processeD_DATE)],
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DETAILS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Text style={styles.date}>{formatDateLabel(recordDateKey(record))}</Text>
          <Text style={[styles.status, { color: statusColor(status), borderColor: statusColor(status) }]}>
            {status}
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.rows.map(([label, value]) => (
              <View key={label} style={styles.row}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>
                  {value == null || String(value).trim() === "" ? "—" : String(value)}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AttendanceDetailsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.navy,
  },
  header: {
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
  headerSpacer: {
    width: 26,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
    backgroundColor: theme.background,
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.navy,
  },
  status: {
    fontSize: 12,
    fontWeight: "800",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  card: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.navy,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 12,
  },
  label: {
    color: theme.muted,
    fontSize: 14,
  },
  value: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
});
