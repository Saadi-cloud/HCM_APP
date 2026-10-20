// iOS update popup — version server JSON se aata hai (unlisted app).
// Version update guide: config/IOS_BUILD_CHECKLIST.txt
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  AppState,
} from "react-native";
import {
  fetchIOSLatestVersionInfo,
  getInstalledAppVersion,
  IOS_APP_STORE_ITMS_URL,
  IOS_APP_STORE_URL,
  isUpdateAvailable,
} from "../utils/appVersion";

export default function IOSUpdatePopup() {
  const [showPopup, setShowPopup] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");
  const [storeUrl, setStoreUrl] = useState(IOS_APP_STORE_URL);
  const isCheckingRef = useRef(false);

  const checkIOSUpdate = useCallback(async () => {
    if (Platform.OS !== "ios" || isCheckingRef.current) return;

    isCheckingRef.current = true;

    try {
      const currentVersion = getInstalledAppVersion();
      if (!currentVersion) return;

      const versionInfo = await fetchIOSLatestVersionInfo();
      if (!versionInfo?.version) return;

      const { version: storeVersion, storeUrl: resolvedStoreUrl } = versionInfo;
      const updateAvailable = isUpdateAvailable(currentVersion, storeVersion);

      if (updateAvailable) {
        setLatestVersion(storeVersion);
        setStoreUrl(resolvedStoreUrl || IOS_APP_STORE_URL);
        setShowPopup(true);
      }
    } catch (error) {
      console.log("iOS update check error:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    checkIOSUpdate();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkIOSUpdate();
      }
    });

    return () => subscription.remove();
  }, [checkIOSUpdate]);

  const openAppStore = async () => {
    try {
      const canOpenItms = await Linking.canOpenURL(IOS_APP_STORE_ITMS_URL);
      await Linking.openURL(canOpenItms ? IOS_APP_STORE_ITMS_URL : storeUrl);
    } catch (error) {
      console.log("Could not open App Store:", error);
    }
  };

  return (
    <Modal
      visible={showPopup}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={() => setShowPopup(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <Text style={styles.title}>Update Available</Text>

          <Text style={styles.message}>
            A new version of this app is available. Please update to version{" "}
            {latestVersion} for the best experience.
          </Text>

          <TouchableOpacity style={styles.updateButton} onPress={openAppStore}>
            <Text style={styles.updateText}>Update Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterButton}
            onPress={() => setShowPopup(false)}
          >
            <Text style={styles.laterText}>Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  popup: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: "#444",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  updateButton: {
    width: "100%",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  updateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  laterButton: {
    paddingVertical: 8,
  },
  laterText: {
    color: "#777",
    fontSize: 15,
  },
});
