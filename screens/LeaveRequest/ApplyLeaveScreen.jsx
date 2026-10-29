import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import DropDownPicker from "react-native-dropdown-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGlobalState } from "../../context/GlobalContext";
import {
  buildLeaveDetailPayloads,
  buildLeaveMasterPayload,
  employeeLabel,
  planLeaveRequest,
  selectEmployeeLeaveBalance,
} from "../../services/leavePayload";
import {
  fetchEmployeeLeaveBalance,
  fetchEmployees,
  fetchLeaveHistory,
  fetchLeaveReasons,
  fetchLeaveRequests,
  fetchLeaveTypes,
  getLeaveErrorMessage,
  submitLeaveRequest,
} from "../../services/leaveService";
import {
  DAY_TYPE_LABELS,
  DAY_TYPES,
  formatLeaveDateShort,
  formatSlashDate,
} from "../../utils/leaveDays";
import { businessDateKey, dateKeyFromPicker, parseApiDateTime, pickerDateFromKey } from "../../utils/dateTime";
import { theme } from "../../constants/theme";

const ApplyLeaveScreen = ({ navigation }) => {
  const { employeeId, userId, companyId, accessToken } = useGlobalState();
  const queryClient = useQueryClient();
  const todayKey = businessDateKey();

  const [leaveTypeId, setLeaveTypeId] = useState(null);
  const [reasonId, setReasonId] = useState(null);
  const [coveringEmployeeId, setCoveringEmployeeId] = useState(null);
  const [fromKey, setFromKey] = useState(todayKey);
  const [toKey, setToKey] = useState(todayKey);
  const leaveYear = Number(String(fromKey).slice(0, 4)) || Number(String(todayKey).slice(0, 4));
  const [dayType, setDayType] = useState(DAY_TYPES.FULL);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [coveringOpen, setCoveringOpen] = useState(false);
  const [dayTypeModalOpen, setDayTypeModalOpen] = useState(false);
  const [iosDateField, setIosDateField] = useState(null);
  const [iosDateValue, setIosDateValue] = useState(new Date());

  const typesQuery = useQuery({
    queryKey: ["leaveTypes"],
    queryFn: fetchLeaveTypes,
    enabled: !!accessToken,
  });
  const reasonsQuery = useQuery({
    queryKey: ["leaveReasons"],
    queryFn: fetchLeaveReasons,
    enabled: !!accessToken,
  });
  const employeesQuery = useQuery({
    queryKey: ["employees", companyId],
    queryFn: () => fetchEmployees(companyId),
    enabled: !!accessToken && Number(companyId) > 0,
  });
  const balanceQuery = useQuery({
    queryKey: ["employeeLeaveBalance", employeeId, leaveYear],
    queryFn: () => fetchEmployeeLeaveBalance(employeeId, leaveYear),
    enabled: !!accessToken && Number(employeeId) > 0 && Number(leaveYear) > 0,
  });
  const requestsQuery = useQuery({
    queryKey: ["leaveRequests"],
    queryFn: fetchLeaveRequests,
    enabled: !!accessToken,
  });
  const historyQuery = useQuery({
    queryKey: ["leaveHistory", employeeId, leaveTypeId],
    queryFn: () => fetchLeaveHistory(employeeId, leaveTypeId),
    enabled: !!accessToken && Number(employeeId) > 0 && Number(leaveTypeId) > 0,
  });

  const leaveTypes = typesQuery.data ?? [];
  const selectedType = leaveTypes.find((item) => item.leavE_TYPE_ID === leaveTypeId) ?? null;
  const halfDayAllowed = String(selectedType?.halF_DAY_ALLOWED ?? "Y").toUpperCase() !== "N";
  const typeBalance = useMemo(
    () => selectEmployeeLeaveBalance(balanceQuery.data, leaveTypeId),
    [balanceQuery.data, leaveTypeId]
  );
  const allocatedDays = typeBalance?.allocatedDays ?? null;
  const balanceDays = typeBalance?.balanceDays ?? null;
  const pendingDays = typeBalance?.pendingDays ?? 0;

  const myTypeRequests = useMemo(
    () =>
      (requestsQuery.data ?? []).filter(
        (item) =>
          Number(item.employeE_ID) === Number(employeeId) &&
          Number(item.leavE_TYPE_ID) === Number(leaveTypeId) &&
          (item.leavE_YEAR == null || Number(item.leavE_YEAR) === Number(leaveYear))
      ),
    [requestsQuery.data, employeeId, leaveTypeId, leaveYear]
  );

  useEffect(() => {
    if (!leaveTypeId && leaveTypes.length) {
      setLeaveTypeId(leaveTypes[0].leavE_TYPE_ID);
    }
  }, [leaveTypeId, leaveTypes]);

  useEffect(() => {
    setReasonId(null);
  }, [leaveTypeId]);

  useEffect(() => {
    if (!halfDayAllowed) setDayType(DAY_TYPES.FULL);
  }, [halfDayAllowed]);

  const reasonItems = useMemo(
    () =>
      (reasonsQuery.data ?? [])
        .filter((item) => Number(item.leavE_TYPE_ID) === Number(leaveTypeId))
        .map((item) => ({
          label: item.reasoN_NAME || item.reasoN_CODE || `Reason ${item.leavE_REASON_ID}`,
          value: item.leavE_REASON_ID,
        })),
    [reasonsQuery.data, leaveTypeId]
  );

  const coveringItems = useMemo(
    () =>
      (employeesQuery.data ?? [])
        .filter((item) => Number(item.employeeId ?? item.employeE_ID) !== Number(employeeId))
        .map((item) => ({
          label: employeeLabel(item),
          value: Number(item.employeeId ?? item.employeE_ID),
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [employeesQuery.data, employeeId]
  );

  const plan = useMemo(
    () => planLeaveRequest({ fromKey, toKey, fromDayType: dayType, toDayType: dayType }),
    [fromKey, toKey, dayType]
  );

  const lastLeaveTaken = useMemo(() => {
    const fromRequests = [...myTypeRequests].sort(
      (left, right) =>
        (parseApiDateTime(right.froM_DATE || right.submitteD_DATE) ?? 0) -
        (parseApiDateTime(left.froM_DATE || left.submitteD_DATE) ?? 0)
    )[0];
    if (fromRequests?.froM_DATE) return fromRequests.froM_DATE;

    const rows = historyQuery.data ?? [];
    if (!rows.length) return null;
    const sorted = [...rows].sort(
      (left, right) =>
        (parseApiDateTime(right.leaveStartDate || right.leaveEndDate) ?? 0) -
        (parseApiDateTime(left.leaveStartDate || left.leaveEndDate) ?? 0)
    );
    return sorted[0]?.leaveStartDate || sorted[0]?.leaveEndDate || null;
  }, [myTypeRequests, historyQuery.data]);

  const ratioText = (value) => {
    if (value == null && allocatedDays == null) return "—";
    if (allocatedDays == null) return String(value ?? 0);
    return `${value ?? 0}/${allocatedDays}`;
  };

  const statsLoading = balanceQuery.isLoading;

  const applyDate = (field, key) => {
    if (field === "from") {
      setFromKey(key);
      if (dayType !== DAY_TYPES.FULL) {
        setToKey(key);
      } else if (key > toKey) {
        setToKey(key);
      }
      return;
    }
    if (dayType !== DAY_TYPES.FULL) {
      setFromKey(key);
      setToKey(key);
      return;
    }
    setToKey(key < fromKey ? fromKey : key);
  };

  const openDate = (field) => {
    const current = field === "from" ? fromKey : toKey;
    const value = pickerDateFromKey(current);

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value,
        mode: "date",
        onChange: (event, date) => {
          if (event.type === "set" && date) applyDate(field, dateKeyFromPicker(date));
        },
      });
      return;
    }
    setIosDateValue(value);
    setIosDateField(field);
  };

  const openDayType = () => {
    if (!halfDayAllowed) {
      Alert.alert("Full day only", "Half day is not allowed for this leave type.");
      return;
    }
    setDayTypeModalOpen(true);
  };

  const selectDayType = (nextType) => {
    setDayType(nextType);
    if (nextType !== DAY_TYPES.FULL) setToKey(fromKey);
    setDayTypeModalOpen(false);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!(Number(leaveTypeId) > 0)) {
      Alert.alert("Leave type required", "Select Casual or Sick leave.");
      return;
    }
    if (!(Number(reasonId) > 0)) {
      Alert.alert("Reason required", "Select a leave reason.");
      return;
    }
    if (fromKey > toKey) {
      Alert.alert("Invalid dates", "From date cannot be later than To date.");
      return;
    }
    if (plan.totalDays <= 0) {
      Alert.alert("No leave days", "The selected dates do not create any countable leave days.");
      return;
    }

    setSubmitting(true);
    try {
      const leaveYear = Number(fromKey.slice(0, 4));
      const master = buildLeaveMasterPayload({
        employeeId,
        userId,
        leaveYear,
        leaveTypeId,
        leaveReasonId: reasonId,
        fromKey,
        toKey,
        fromDayType: dayType,
        toDayType: dayType,
        totalDays: plan.totalDays,
        comments: comment,
        coveringEmployeeId,
        submittedAt: Date.now(),
      });
      const details = buildLeaveDetailPayloads(0, plan.rows);
      const saved = await submitLeaveRequest({ master, details });
      await queryClient.invalidateQueries({ queryKey: ["employeeLeaveBalance", employeeId] });
      await queryClient.invalidateQueries({ queryKey: ["leaveRequests"] });
      Alert.alert(
        "Leave submitted",
        `Request ${saved.master.requesT_NO || saved.master.leavE_REQUEST_ID} is pending approval.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert("Apply leave failed", getLeaveErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>APPLY LEAVE</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.typeBanner}>
            <Text style={styles.typeLabel}>LEAVE TYPE</Text>
            {typesQuery.isLoading ? (
              <ActivityIndicator color={theme.navy} />
            ) : typesQuery.isError ? (
              <Text style={styles.errorText}>Leave types could not be loaded.</Text>
            ) : (
              <View style={styles.typeRow}>
                {leaveTypes.map((type) => {
                  const selected = type.leavE_TYPE_ID === leaveTypeId;
                  return (
                    <TouchableOpacity
                      key={type.leavE_TYPE_ID}
                      style={[styles.typePill, selected && styles.typePillSelected]}
                      onPress={() => setLeaveTypeId(type.leavE_TYPE_ID)}
                    >
                      <Text style={[styles.typePillText, selected && styles.typePillTextSelected]}>
                        {type.leavE_TYPE_NAME || type.leavE_TYPE_CODE}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.statsCard}>
            <Stat label="Leave Balance" value={statsLoading ? "…" : ratioText(balanceDays)} />
            <View style={styles.statDivider} />
            <Stat
              label="Last Leave Taken"
              value={statsLoading || historyQuery.isLoading ? "…" : formatSlashDate(lastLeaveTaken)}
            />
            <View style={styles.statDivider} />
            <Stat label="Leave Pending" value={statsLoading ? "…" : ratioText(pendingDays)} />
          </View>

          <Text style={styles.fieldLabel}>Reason</Text>
          <View style={[styles.dropdownWrap, { zIndex: reasonOpen ? 3000 : 1000 }]}>
            <DropDownPicker
              open={reasonOpen}
              value={reasonId}
              items={reasonItems}
              setOpen={(open) => {
                setReasonOpen(open);
                if (open) setCoveringOpen(false);
              }}
              setValue={setReasonId}
              placeholder="Select"
              listMode="SCROLLVIEW"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              placeholderStyle={styles.placeholder}
              disabled={!leaveTypeId || reasonsQuery.isLoading}
            />
          </View>

          <View style={styles.datesCard}>
            <View style={styles.datesLeft}>
              <DateRow label="From" dateText={formatLeaveDateShort(fromKey)} onPressDate={() => openDate("from")} />
              <DateRow label="To" dateText={formatLeaveDateShort(toKey)} onPressDate={() => openDate("to")} />
              <TouchableOpacity style={styles.dayTypeRow} onPress={openDayType}>
                <Text style={styles.dateLabel}>Day Type</Text>
                <View style={styles.dateValueRow}>
                  <Text style={styles.halfValue}>{DAY_TYPE_LABELS[dayType]}</Text>
                  <Ionicons name="pencil" size={14} color={theme.orange} />
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.daysBox}>
              <Text style={styles.daysLabel}>No Of Days</Text>
              <Text style={styles.daysValue}>{plan.totalDays.toFixed(1)}</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Comment</Text>
          <TextInput
            style={styles.comment}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            placeholder="Optional"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.fieldLabel}>Covering Person (optional)</Text>
          <View style={[styles.dropdownWrap, { zIndex: coveringOpen ? 3000 : 900 }]}>
            <DropDownPicker
              open={coveringOpen}
              value={coveringEmployeeId}
              items={coveringItems}
              setOpen={(open) => {
                setCoveringOpen(open);
                if (open) setReasonOpen(false);
              }}
              setValue={setCoveringEmployeeId}
              placeholder="Select (optional)"
              listMode="MODAL"
              searchable
              searchPlaceholder="Search employee"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              placeholderStyle={styles.placeholder}
              disabled={employeesQuery.isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.submit, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <Text style={styles.submitText}>APPLY LEAVE</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={dayTypeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDayTypeModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setDayTypeModalOpen(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Day Type</Text>
            {Object.keys(DAY_TYPES).map((key) => (
              <TouchableOpacity key={key} style={styles.modalOption} onPress={() => selectDayType(key)}>
                <Text style={styles.modalOptionText}>{DAY_TYPE_LABELS[key]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {Platform.OS === "ios" && iosDateField ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setIosDateField(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.sheet}>
              <DateTimePicker
                value={iosDateValue}
                mode="date"
                display="inline"
                onChange={(event, date) => date && setIosDateValue(date)}
              />
              <View style={styles.sheetActions}>
                <TouchableOpacity onPress={() => setIosDateField(null)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    applyDate(iosDateField, dateKeyFromPicker(iosDateValue));
                    setIosDateField(null);
                  }}
                >
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
};

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function DateRow({ label, dateText, onPressDate }) {
  return (
    <View style={styles.dateRow}>
      <Text style={styles.dateLabel}>{label}</Text>
      <TouchableOpacity style={styles.dateValueRow} onPress={onPressDate}>
        <Text style={styles.dateValue}>{dateText}</Text>
        <Ionicons name="pencil" size={14} color={theme.navy} />
      </TouchableOpacity>
    </View>
  );
}

export default ApplyLeaveScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.navy },
  flex: { flex: 1 },
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
    letterSpacing: 1.5,
  },
  headerSpacer: { width: 26 },
  content: {
    flexGrow: 1,
    backgroundColor: theme.background,
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  typeBanner: {
    backgroundColor: theme.yellow,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.navy,
    letterSpacing: 1,
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typePill: {
    backgroundColor: theme.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.orange,
  },
  typePillSelected: { backgroundColor: theme.orange },
  typePillText: { color: theme.orange, fontWeight: "700" },
  typePillTextSelected: { color: theme.white },
  statsCard: {
    backgroundColor: theme.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E8D48A",
  },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, backgroundColor: "#E8D48A" },
  statLabel: { fontSize: 11, color: theme.muted, textAlign: "center" },
  statValue: { fontSize: 15, fontWeight: "800", color: theme.navy, textAlign: "center" },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: theme.text, marginTop: 4 },
  dropdownWrap: { zIndex: 1000 },
  dropdown: {
    borderColor: theme.border,
    borderRadius: 10,
    minHeight: 48,
    backgroundColor: theme.white,
  },
  dropdownContainer: { borderColor: theme.border },
  placeholder: { color: "#9CA3AF" },
  datesCard: {
    backgroundColor: theme.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: theme.border,
    gap: 10,
  },
  datesLeft: { flex: 1, gap: 12 },
  dateRow: { gap: 4 },
  dateLabel: { fontSize: 12, color: theme.muted, fontWeight: "600" },
  dateValueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateValue: { fontSize: 16, fontWeight: "700", color: theme.navy },
  dayTypeRow: { gap: 4, marginTop: 4 },
  halfValue: { fontSize: 14, fontWeight: "700", color: theme.orange },
  daysBox: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
    paddingLeft: 8,
  },
  daysLabel: { fontSize: 11, color: theme.muted, textAlign: "center" },
  daysValue: { fontSize: 28, fontWeight: "800", color: theme.navy, marginTop: 4 },
  comment: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.white,
    padding: 12,
    textAlignVertical: "top",
    color: theme.text,
  },
  submit: {
    marginTop: 12,
    backgroundColor: theme.navy,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: theme.white, fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  errorText: { color: theme.danger },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(8,20,45,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: theme.white,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: theme.navy, marginBottom: 4 },
  modalOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalOptionText: { fontSize: 15, color: theme.text, fontWeight: "600" },
  sheet: {
    marginTop: "auto",
    backgroundColor: theme.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
  },
  sheetActions: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8 },
  cancelText: { color: theme.muted, fontSize: 16 },
  doneText: { color: theme.navy, fontSize: 16, fontWeight: "700" },
});
