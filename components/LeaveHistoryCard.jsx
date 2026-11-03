import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatSlashDate } from "../utils/leaveDays";
import { theme } from "../constants/theme";

const STATUS_COLORS = {
  PENDING: theme.orange,
  SUBMITTED: theme.orange,
  DRAFT: theme.muted,
  APPROVED: "#15803D",
  REJECTED: theme.danger,
  WITHDRAWN: theme.muted,
  CANCELLED: theme.danger,
};

export function statusColor(status) {
  const key = String(status ?? "").toUpperCase();
  return STATUS_COLORS[key] ?? theme.navy;
}

const LeaveHistoryCard = ({ item, expanded, onPress, showEmployee }) => {
  const color = statusColor(item.status);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          {showEmployee ? (
            <Text style={styles.employee} numberOfLines={1}>
              {item.employeeName || `Employee ${item.employeeId}`}
              {item.employeeCode ? ` · ${item.employeeCode}` : ""}
            </Text>
          ) : null}
          <Text style={styles.requestNo}>{item.requestNo || `Request #${item.leaveRequestId}`}</Text>
          <Text style={styles.type}>
            {item.leaveTypeName || item.leaveTypeCode || "Leave"}
            {item.leaveReasonName ? ` · ${item.leaveReasonName}` : ""}
          </Text>
        </View>
        <View style={[styles.badge, { borderColor: color }]}>
          <Text style={[styles.badgeText, { color }]}>{item.stage || item.status || "—"}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Meta label="From" value={formatSlashDate(item.fromDate)} />
        <Meta label="To" value={formatSlashDate(item.toDate)} />
        <Meta label="Days" value={item.totalDays == null ? "—" : String(item.totalDays)} />
      </View>

      {item.departmentName ? <Text style={styles.scope}>{item.departmentName}</Text> : null}
      {item.comments ? <Text style={styles.comments}>{item.comments}</Text> : null}

      {expanded && item.days?.length ? (
        <View style={styles.daysBox}>
          <Text style={styles.daysTitle}>Day lines</Text>
          {item.days.map((day, index) => (
            <Text key={`${day.leaveDate}-${index}`} style={styles.dayLine}>
              {formatSlashDate(day.leaveDate)} · {day.dayType || "FULL"} · {day.leaveDays ?? 0} day
              {day.weekendFlag === "Y" ? " · weekend" : ""}
              {day.holidayFlag === "Y" ? " · holiday" : ""}
            </Text>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

function Meta({ label, value }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

export default LeaveHistoryCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 10,
  },
  header: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  headerText: { flex: 1, gap: 2 },
  employee: { fontSize: 13, fontWeight: "700", color: theme.navy },
  requestNo: { fontSize: 15, fontWeight: "800", color: theme.text },
  type: { fontSize: 13, color: theme.muted },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 130,
  },
  badgeText: { fontSize: 11, fontWeight: "800", textAlign: "center" },
  row: { flexDirection: "row" },
  meta: { flex: 1 },
  metaLabel: { fontSize: 11, color: theme.muted },
  metaValue: { fontSize: 14, fontWeight: "700", color: theme.text, marginTop: 2 },
  scope: { fontSize: 12, color: theme.muted },
  comments: { fontSize: 13, color: theme.text },
  daysBox: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 8,
    gap: 4,
  },
  daysTitle: { fontSize: 12, fontWeight: "700", color: theme.navy },
  dayLine: { fontSize: 12, color: theme.muted },
});
