import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "../constants/theme";

const AttendanceSuccessModal = ({ visible, details, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <Ionicons name="checkmark-circle" size={64} color="#15803D" style={styles.icon} />
        <Text style={styles.title}>You have successfully submitted</Text>
        {console.log("details", details)}
        <Row label="Capture Type" value={details?.captureType} />
        <Row label="Capture Time" value={details?.captureTime} />
        <Row label="Attendance Date" value={details?.attendanceDate} />
        <Row label="Employee Name" value={details?.employeeName} />
        {details?.attendanceId ? <Row label="Attendance ID" value={String(details.attendanceId)} /> : null}

        <Text style={styles.note}>Time was recorded from this device's clock.</Text>

        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  );
}

export default AttendanceSuccessModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 20, 45, 0.55)",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    backgroundColor: theme.white,
    borderRadius: 18,
    padding: 22,
  },
  icon: {
    alignSelf: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.navy,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
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
  note: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 12,
    textAlign: "center",
  },
  button: {
    marginTop: 18,
    backgroundColor: theme.navy,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: theme.white,
    fontWeight: "800",
    fontSize: 16,
  },
});
