import { useState } from "react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "../constants/theme";
import { dateKeyFromPicker, formatDateLabel, pickerDateFromKey } from "../utils/dateTime";

const DateRangePicker = ({ fromDate, toDate, maxDate, onChangeFrom, onChangeTo, onApply, applying, error }) => {
  const [iosField, setIosField] = useState(null);
  const [iosValue, setIosValue] = useState(new Date());

  const open = (field) => {
    const value = pickerDateFromKey(field === "from" ? fromDate : toDate);
    const maximumDate = pickerDateFromKey(maxDate);
    const apply = (date) => (field === "from" ? onChangeFrom : onChangeTo)(dateKeyFromPicker(date));

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value,
        mode: "date",
        maximumDate,
        onChange: (event, date) => {
          if (event.type === "set" && date) apply(date);
        },
      });
      return;
    }
    setIosValue(value);
    setIosField(field);
  };

  const confirmIos = () => {
    (iosField === "from" ? onChangeFrom : onChangeTo)(dateKeyFromPicker(iosValue));
    setIosField(null);
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <DateField label="From Date" value={fromDate} onPress={() => open("from")} />
        <DateField label="To Date" value={toDate} onPress={() => open("to")} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={[styles.apply, applying && styles.disabled]} onPress={onApply} disabled={applying}>
        <Ionicons name="search" size={18} color={theme.white} />
        <Text style={styles.applyText}>Apply</Text>
      </TouchableOpacity>

      {Platform.OS === "ios" ? (
        <Modal visible={!!iosField} transparent animationType="slide" onRequestClose={() => setIosField(null)}>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{iosField === "from" ? "From Date" : "To Date"}</Text>
              <DateTimePicker
                value={iosValue}
                mode="date"
                display="inline"
                maximumDate={pickerDateFromKey(maxDate)}
                onChange={(event, date) => date && setIosValue(date)}
              />
              <View style={styles.sheetActions}>
                <TouchableOpacity onPress={() => setIosField(null)} style={styles.sheetButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmIos} style={styles.sheetButton}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

function DateField({ label, value, onPress }) {
  return (
    <TouchableOpacity style={styles.field} onPress={onPress} accessibilityLabel={label}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValueRow}>
        <Ionicons name="calendar-outline" size={16} color={theme.navy} />
        <Text style={styles.fieldValue} numberOfLines={1}>
          {formatDateLabel(value)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default DateRangePicker;

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
    gap: 10,
  },
  field: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 10,
  },
  fieldLabel: {
    fontSize: 11,
    color: theme.muted,
    marginBottom: 4,
  },
  fieldValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fieldValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
  },
  error: {
    color: theme.danger,
    fontSize: 13,
  },
  apply: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.navy,
    borderRadius: 10,
    paddingVertical: 12,
  },
  applyText: {
    color: theme.white,
    fontWeight: "700",
    fontSize: 15,
  },
  disabled: {
    opacity: 0.6,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(8, 20, 45, 0.45)",
  },
  sheet: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.navy,
    textAlign: "center",
  },
  sheetActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sheetButton: {
    padding: 12,
  },
  cancelText: {
    color: theme.muted,
    fontSize: 16,
  },
  doneText: {
    color: theme.navy,
    fontSize: 16,
    fontWeight: "700",
  },
});
