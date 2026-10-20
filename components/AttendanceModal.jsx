import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../constants/theme";

export const CAPTURE_TYPES = {
  CHECK_IN: "CHECK_IN",
  CHECK_OUT: "CHECK_OUT",
};

const AttendanceModal = ({ visible, submitting, defaultType, onSubmit, onCancel }) => {
  const [captureType, setCaptureType] = useState(defaultType ?? CAPTURE_TYPES.CHECK_IN);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (visible) {
      setCaptureType(defaultType ?? CAPTURE_TYPES.CHECK_IN);
      setReason("");
    }
  }, [visible, defaultType]);

  const submit = () => {
    if (submitting) return;
    onSubmit({ captureType, reason: reason.trim() });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={submitting ? undefined : onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <Text style={styles.heading}>What's the capture type</Text>
          <View style={styles.typeRow}>
            {[
              { value: CAPTURE_TYPES.CHECK_IN, label: "Check In" },
              { value: CAPTURE_TYPES.CHECK_OUT, label: "Check Out" },
            ].map((option) => {
              const selected = option.value === captureType;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.typeButton, selected && styles.typeButtonSelected]}
                  onPress={() => setCaptureType(option.value)}
                  disabled={submitting}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.heading}>What's your reason</Text>
          <TextInput
            style={styles.reason}
            value={reason}
            onChangeText={setReason}
            placeholder="Optional"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={250}
            editable={!submitting}
            textAlignVertical="top"
          />

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.logButton, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color={theme.white} /> : null}
              <Text style={styles.logText}>LOG TIME</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={submitting}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AttendanceModal;

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
    padding: 20,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.navy,
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.navy,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  typeButtonSelected: {
    backgroundColor: theme.navy,
  },
  typeText: {
    color: theme.navy,
    fontWeight: "700",
    fontSize: 15,
  },
  typeTextSelected: {
    color: theme.white,
  },
  reason: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: theme.text,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  logButton: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.orange,
    borderRadius: 10,
    paddingVertical: 14,
  },
  logText: {
    color: theme.white,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cancelButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.muted,
    paddingVertical: 14,
  },
  cancelText: {
    color: theme.muted,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.7,
  },
});
