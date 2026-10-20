import { useEffect } from "react";
import { Alert, Platform } from "react-native";

export default function useInAppUpdates() {
  useEffect(() => {
    if (Platform.OS === "web" || Platform.OS === "ios") return;

    const checkUpdates = async () => {
      try {
        const ExpoInAppUpdates = await import("expo-in-app-updates");
        const result = await ExpoInAppUpdates.checkForUpdate();
        const { updateAvailable } = result;

        if (updateAvailable) {
          if (Platform.OS === "android") {
            // Android par automatic update popup (Flexible)
          await ExpoInAppUpdates.checkAndStartUpdate(false);
          } else {
            // iOS ke liye manual alert
            Alert.alert(
              "Update Available",
              "A new version of the app is available with improvements and bug fixes. Would you like to update now?",
              [
                {
                  text: "Update",
                  isPreferred: true,
                  onPress: async () => {
                    await ExpoInAppUpdates.startUpdate();
                  },
                },
                { text: "Cancel", style: "cancel" },
              ]
            );
          }
        }
      } catch (error) {
        // Production mein error sirf silent rakhen ya analytics mein bhej dein
        console.log("In-App Update Error:", error.message);
      }
    };

    checkUpdates();
  }, []);
}