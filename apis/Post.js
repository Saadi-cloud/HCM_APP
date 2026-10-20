import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../utils/Api";
import { useStnGetQuery } from "./Get";
import { ActivityIndicator, Alert, View } from "react-native";
import { useGlobalState } from "../context/GlobalContext";

export const useSoFormMutation = () => {
  const queryClient = useQueryClient();
  const get_stn = useStnGetQuery();

  const mutation = useMutation({
    mutationFn: async (salesOrderData) => {
      const soNum = get_stn?.data?.maxDocNo;
      console.log("why this", salesOrderData);

      if (!soNum) {
        throw new Error("Sales Order Number (soNum) not available");
      }

      return api.post(`/api/SalesOrder/save?soNum=${soNum}`, salesOrderData);
    },
    // onSuccess: () => {
    //   queryClient.invalidateQueries({ queryKey: ["stn"] });
    //   Alert.alert("success")
    // },
    // onError: (error) => {
    //   console.log("Mutation error:", error);
    // },
    onSuccess: (res) => {
      console.log("Sales order saved:", res.data);
      queryClient.invalidateQueries({ queryKey: ["stn"] });
      Alert.alert("Success", res.data.message);
    },
    onError: (error) => {
      console.error('API Error:', error?.response?.data || error.message);
    },
  });

  return {
    ...mutation,
    isStnLoading: get_stn.isLoading,
    stnError: get_stn.error,
  };
};

export const useSerialMutation = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data) => {
      return api.post("/api/FSMIncentiveClaim/SaveCustomerIncentive", data);
    },
    onSuccess: (res) => {
      console.log("Sales order saved:", res.data);
      queryClient.invalidateQueries({ queryKey: ["walletApprovedStatus", "walletInProcessDisbursement", "walletPaidStatus", "allWalletStatus", "claimScheme"]});
      Alert.alert("Success", res.data.message);
    },
    onError: (error) => {
      Alert.alert("Request Failed", error?.response?.data?.message);
      console.error('API Error:', error?.response?.data || error.message);
    },
  });
  return mutation;
};

export const useSingleSerialMutation = () => {
  const queryClient = useQueryClient();
  const {
    serialNumber,
    fsmUserNumber
  } = useGlobalState();
  const mutation = useMutation({
    mutationFn: async (data) => {
      return api.post("/api/FSMIncentiveClaim/SaveSingleCustomerIncentive", data);
    },
    onSuccess: (res) => {
      console.log("Sales order saved:", res.data);
      queryClient.invalidateQueries({ queryKey: ["walletApprovedStatus", "walletInProcessDisbursement", "walletPaidStatus", "allWalletStatus", "claimScheme"]});
      Alert.alert("Success", res.data.message);
    },
    onError: (error) => {
      const apiMessage = error?.response?.data?.message || error.message || "Something went wrong";
      const errorMessage = `User: ${fsmUserNumber || "N/A"}\nSerial Number: ${serialNumber || "N/A"}\n\n${apiMessage}`;
      Alert.alert("Request Failed", errorMessage);
      console.error('API Error:', error?.response?.data || error.message);
    },
  });
  return mutation;
};

export const useQuestionMutation = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data) => {
      return api.post("/api/FSMQuestion/create", data);
    },
    onSuccess: (res) => {
      console.log("Sales order saved:", res.data);
      queryClient.invalidateQueries({ queryKey: ["questionList"] });
      Alert.alert("Success", res.data.message);
    },
    onError: (error) => {
      Alert.alert("Request Failed", error?.response?.data?.message);
      console.error('API Error:', error?.response?.data || error.message);
    },
  });
  return mutation;
};

export const useChatMutation = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data) => {
      return api.post("/api/FsmQuestionReply/reply", data);
    },
    onSuccess: (res) => {
      console.log("Sales order saved:", res.data);
      queryClient.invalidateQueries({ queryKey: ["chatList"] });
      // Alert.alert("Success", res.data.message);
    },
    onError: (error) => {
      Alert.alert("Request Failed", error?.response?.data?.message);
      console.error('API Error:', error?.response?.data || error.message);
    },
  });
  return mutation;
};

export const useNotificationUpdateMutation = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data) => {
      return api.post("/api/FSMNotification/mark-read", data);
    },
    onSuccess: (res) => {
      console.log("Notification updated:", res.data);
      queryClient.invalidateQueries({ queryKey: ["notificationList"] });
      // Alert.alert("Success", res.data.message);
    },
    onError: (error) => {
      Alert.alert("Request Failed", error?.response?.data?.message);
      console.error('API Error:', error?.response?.data || error.message);
    },
  });
  return mutation;
};