import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { useGlobalState } from "../context/GlobalContext";
import DateRangePicker from "../components/DateRangePicker";
import { fetchAttendanceList, getAttendanceErrorMessage } from "../services/attendanceService";
import { recordDateKey } from "../services/attendancePayload";
import { businessDateKey, formatDateLabel, formatTimeLabel, parseApiDateTime, startOfMonthKey } from "../utils/dateTime";
import { theme } from "../constants/theme";

export function formatMinutes(value) {
  if (value == null || value === "") return "—";
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

export function statusColor(status) {
  const value = String(status ?? "").toUpperCase();
  if (value === "PRESENT") return "#15803D";
  if (value === "ABSENT") return theme.danger;
  if (value.includes("LEAVE")) return theme.orange;
  return theme.muted;
}

const AttendanceHistoryScreen = ({ navigation }) => {
  const { employeeId, accessToken } = useGlobalState();
  const today = businessDateKey();
  const [fromDate, setFromDate] = useState(startOfMonthKey());
  const [toDate, setToDate] = useState(today);
  const [range, setRange] = useState({ fromDate: startOfMonthKey(), toDate: today });
  const [rangeError, setRangeError] = useState("");

  const query = useQuery({
    queryKey: ["attendance", "history", employeeId, range.fromDate, range.toDate],
    queryFn: () => fetchAttendanceList(employeeId, range.fromDate, range.toDate),
    enabled: Number(employeeId) > 0 && !!accessToken,
  });

  const records = [...(query.data ?? [])].sort((left, right) =>
    String(recordDateKey(right) ?? "").localeCompare(String(recordDateKey(left) ?? ""))
  );

  const apply = () => {
    if (fromDate > toDate) {
      setRangeError("From Date cannot be later than To Date.");
      return;
    }
    setRangeError("");
    if (range.fromDate === fromDate && range.toDate === toDate) {
      query.refetch();
    } else {
      setRange({ fromDate, toDate });
    }
  };

  const renderItem = ({ item }) => {
    const status = item.attendancE_STATUS || "—";
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => navigation.navigate("AttendanceDetails", { record: item })}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemDate}>{formatDateLabel(recordDateKey(item))}</Text>
          <Text style={[styles.status, { color: statusColor(status), borderColor: statusColor(status) }]}>
            {status}
          </Text>
        </View>
        <View style={styles.timesRow}>
          <TimeBlock label="Scheduled" inValue={item.scheduleD_IN} outValue={item.scheduleD_OUT} />
          <TimeBlock label="Actual" inValue={item.actuaL_IN} outValue={item.actuaL_OUT} />
        </View>
        <View style={styles.metricsRow}>
          <Metric label="Work" value={formatMinutes(item.worK_MINUTES)} />
          <Metric label="Late" value={formatMinutes(item.latE_MINUTES)} />
          <Metric label="Early Out" value={formatMinutes(item.earlY_OUT_MINUTES)} />
          <Metric label="Overtime" value={formatMinutes(item.oT_MINUTES)} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ATTENDANCE</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={records}
        keyExtractor={(item, index) => String(item.attendancE_ID ?? `row-${index}`)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              maxDate={today}
              onChangeFrom={setFromDate}
              onChangeTo={setToDate}
              onApply={apply}
              applying={query.isFetching}
              error={rangeError}
            />
            {!query.isLoading && !query.isError ? (
              <Text style={styles.count}>
                {records.length} record{records.length === 1 ? "" : "s"} · {formatDateLabel(range.fromDate)} –{" "}
                {formatDateLabel(range.toDate)}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator color={theme.navy} style={styles.empty} />
          ) : query.isError ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={40} color={theme.danger} />
              <Text style={styles.emptyText}>{getAttendanceErrorMessage(query.error)}</Text>
              <TouchableOpacity onPress={() => query.refetch()}>
                <Text style={styles.retry}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="calendar-clear-outline" size={40} color={theme.muted} />
              <Text style={styles.emptyText}>No attendance records for this period.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

function TimeBlock({ label, inValue, outValue }) {
  return (
    <View style={styles.timeBlock}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.timeValue}>
        {formatTimeLabel(parseApiDateTime(inValue))} – {formatTimeLabel(parseApiDateTime(outValue))}
      </Text>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export default AttendanceHistoryScreen;

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
  list: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
    backgroundColor: theme.background,
  },
  listHeader: {
    gap: 10,
    marginBottom: 2,
  },
  count: {
    fontSize: 12,
    color: theme.muted,
  },
  item: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 10,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemDate: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.navy,
  },
  status: {
    fontSize: 11,
    fontWeight: "800",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  timesRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeBlock: {
    flex: 1,
  },
  timeValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: theme.muted,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.text,
    marginTop: 2,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 40,
  },
  emptyText: {
    color: theme.muted,
    textAlign: "center",
  },
  retry: {
    color: theme.navy,
    fontWeight: "700",
  },
});
