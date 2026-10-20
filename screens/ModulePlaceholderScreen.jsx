import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "../constants/theme";

const ModulePlaceholderScreen = ({ navigation, route }) => {
  const title = route?.params?.title ?? "Module";
  const icon = route?.params?.icon ?? "construct-outline";
  const note = route?.params?.note ?? "This module is not connected yet.";

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title.toUpperCase()}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.body}>
        <Ionicons name={icon} size={64} color={theme.navy} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.badge}>PLACEHOLDER</Text>
        <Text style={styles.note}>{note}</Text>
      </View>
    </SafeAreaView>
  );
};

export default ModulePlaceholderScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
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
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 26,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  title: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "700",
    color: theme.navy,
  },
  badge: {
    marginTop: 10,
    backgroundColor: theme.yellow,
    color: theme.navy,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  note: {
    marginTop: 14,
    fontSize: 15,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 22,
  },
});
