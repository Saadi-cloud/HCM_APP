import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as Updates from "expo-updates";

/**
 * Over-the-air (OTA) updates via EAS Update.
 * Downloads JS/asset updates and applies them so all installed builds
 * on the matching channel/runtime get the new code without a store resubmit.
 *
 * Note: native module / plugin / permission changes still need a new store build.
 */
export default function useEASUpdates() {
  useEffect(() => {
    if (__DEV__ || Platform.OS === "web" || !Updates.isEnabled) {
      return;
    }

    let isMounted = true;

    const syncUpdate = async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!isMounted || !result.isAvailable) return;

        const fetched = await Updates.fetchUpdateAsync();
        if (!isMounted || !fetched.isNew) return;

        // Apply immediately so users get the fix on this launch cycle.
        await Updates.reloadAsync();
      } catch (error) {
        console.log("EAS Update check error:", error?.message ?? error);
      }
    };

    syncUpdate();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        syncUpdate();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
}
