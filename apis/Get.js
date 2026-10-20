import { useQuery, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../utils/Api";
import axios from "axios";
import { useGlobalState } from "../context/GlobalContext";
import dayjs from "dayjs";
import { Alert } from "react-native";
import { useRoute } from "@react-navigation/native";

/** Read `count` from list API payloads: { count, data } */
export function getListCount(payload) {
  if (payload == null) return null;
  if (typeof payload.count === "number") return payload.count;
  if (Array.isArray(payload.data)) return payload.data.length;
  if (Array.isArray(payload)) return payload.length;
  return null;
}

// login apis start
export const useCompanyListQuery = () => {
  return useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const response = await api.get("/api/Company/GetAllCompany");
      return response?.data ?? [];
    },
  });
};

export const useFinancialYearListQuery = () => {
  return useQuery({
    queryKey: ["financial"],
    queryFn: async () => {
      const response = await api.get("/FinancialYear/GetAllFinancialYears");
      return response?.data ?? [];
    },
  });
};

// login apis end

export const useEmployeeProfileQuery = () => {
  const { employeeId, accessToken } = useGlobalState();

  return useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const response = await api.get("/Employee/GetEmployeeById", {
        params: { employeeId },
      });
      return response?.data ?? null;
    },
    enabled: Number(employeeId) > 0 && !!accessToken,
  });
};

export const useEmployeeShiftListQuery = () => {
  const { employeeId, accessToken } = useGlobalState();

  return useQuery({
    queryKey: ["employeeShift", employeeId],
    queryFn: async () => {
      const response = await api.get("/api/HrAttEmpShift/GetHrAttEmpShiftList", {
        params: { employeeId },
      });
      return response?.data ?? [];
    },
    enabled: Number(employeeId) > 0 && !!accessToken,
  });
};

export const useAttendanceShiftQuery = (shiftId) => {
  const { accessToken } = useGlobalState();

  return useQuery({
    queryKey: ["attendanceShift", shiftId],
    queryFn: async () => {
      const response = await api.get(`/api/HrAttShiftMst/GetHrAttShiftMstById/${shiftId}`);
      return response?.data ?? null;
    },
    enabled: Number(shiftId) > 0 && !!accessToken,
    retry: false,
  });
};

export const usePayrollShiftQuery = (shiftId, attendanceShiftSettled) => {
  const { accessToken } = useGlobalState();

  return useQuery({
    queryKey: ["payrollShift", shiftId],
    queryFn: async () => {
      const response = await api.get("/api/Shift/GetById", {
        params: { id: shiftId },
      });
      return response?.data ?? null;
    },
    enabled: Number(shiftId) > 0 && !!accessToken && attendanceShiftSettled,
    retry: false,
  });
};

// so form apis start

export const useAccountListQuery = () => {
  const { selectedBranch, userId } = useGlobalState();

  return useQuery({
    queryKey: ["account", selectedBranch, userId],
    queryFn: async () => {
      const response = await api.get(
        `/api/AccountInfo?dealerCode=0&branchId=${selectedBranch}&userId=${userId}`
      );

      // ✅ Check backend success flag
      if (!response.data.success) {
        Alert.alert(response.data.message || "Failed to fetch accounts.");
        return [];
      }

      return response?.data?.data ?? [];
    },
    onError: (error) => {
      console.error("Error fetching accounts:", error);
      Alert.alert(error.message); // or replace with toast/snackbar
    },
  });
};

export const useProductTypeListQuery = () => {
  return useQuery({
    queryKey: ["product"],
    queryFn: async () => {
      const response = await api.get("/api/ProductType?buId=0");

      // ✅ Ensure backend success is checked
      if (!response.data.success) {
        Alert.alert(response.data.message || "Failed to fetch product types.");
        return [];
      }

      return response?.data?.data ?? [];
    },
    onError: (error) => {
      // ✅ Log error or show toast/snackbar
      console.error("Error fetching product types:", error);
      Alert.alert(error.message); // Replace with toast if you have one
    },
  });
};

export const useDetailTitleListQuery = () => {
  const { selectedProductType, selectedBranch } = useGlobalState();

  return useQuery({
    queryKey: ["detail", selectedProductType, selectedBranch],
    queryFn: async () => {
      const response = await api.get(
        `/api/DetailTitle?branchId=${selectedBranch}&productTypeId=${selectedProductType}&formType=All`
      );
      console.log("Detail Title Response:", response.data.success);

      if (!response.data.success) {
        Alert.alert("Info", response.data.message || "No title details found.");
        return [];
      }

      return response?.data?.data ?? [];
    },
    enabled: !!selectedProductType && selectedProductType !== 0,
    onError: (error) => {
      console.log("Error fetching details:", error);
      Alert.alert(error.message); // Keep Alert only for true errors
    },
  });
};

export const useStnGetQuery = () => {
  const { selectedYear, selectedBranch, selectedCompany } = useGlobalState();
  const currentMonth = dayjs().format("MMM");

  return useQuery({
    queryKey: [
      "stn",
      selectedYear,
      selectedBranch,
      selectedCompany,
      currentMonth,
    ],
    queryFn: async () => {
      const response = await api.get(
        `/api/STN?BranchId=${selectedBranch}&FinYearId=${selectedYear}&DocType=SO&MonthName=${currentMonth}&CompanyId=${selectedCompany}`
      );
      return response?.data;
    },
  });
};


// fsm apis start here
export const useCustomerListQuery = () => {
  const { customerDetails } = useGlobalState();
  return useQuery({
    queryKey: ["customer", customerDetails],
    queryFn: async () => {
      const response = await api.get(`/api/CheckCustomer?mobileNo=${customerDetails}`);
      return response?.data ?? [];
    },
    enabled: !!customerDetails,
  });
};

export const useSerialListQuery = () => {
  const { serialNumber } = useGlobalState();

  return useQuery({
    queryKey: ["serial", serialNumber],
    queryFn: async () => {
      const response = await api.get(
        `/api/FsmSerial/CheckFsmIncentive?serialNo=${serialNumber}`
      );
      return response?.data ?? {};
    },
    enabled: !!serialNumber, // 🚀 CRITICAL FIX
    retry: false,            // optional: avoids repeated 400 calls
  });
};


export const useCityListQuery = () => {
  return useQuery({
    queryKey: ["city"],
    queryFn: async () => {
      const response = await api.get("/api/City");
      return response?.data;
    },
  });
};

export const useClaimSchemeListQuery = () => {
  const { fsmProfileId, authData } = useGlobalState();
  return useQuery({
    queryKey: ["claimScheme", fsmProfileId, authData],
    queryFn: async () => {
      const response = await api.get(`/api/IncentiveClaim/claimSchemeDetail?regActId=${authData.regActId}&fmsProfileId=${fsmProfileId}`);
      return response?.data;
    },
  });
};

export const useCrossBranchListQuery = () => {
  const { fsmProfileId, authData } = useGlobalState();
  return useQuery({
    queryKey: ["crossBranch", fsmProfileId, authData],
    queryFn: async () => {
      const response = await api.get(`/api/IncentiveClaim/crossBranch?regActId=${authData.regActId}&fmsProfileId=${fsmProfileId}`);
      return response?.data;
    },
  });
};

export const useGetGuideLearning = (subcategoryId) => {
  const { isAdmin } = useGlobalState();
  return useQuery({
    queryKey: ["learningGuide", subcategoryId ?? "all", isAdmin],
    queryFn: async () => {
      const url = subcategoryId
        ? `/api/FSMUserGuide/list?profileTypeId=${isAdmin}&subcategoryId=${subcategoryId}`
        : `/api/FSMUserGuide/list?profileTypeId=${isAdmin}`;
      try {
        const response = await api.get(url);
        const payload = response?.data;
        // Normalize empty payloads so UI can show tabs + no-data
        if (payload == null) return { count: 0, data: [] };
        if (Array.isArray(payload)) return { count: payload.length, data: payload };
        if (!Array.isArray(payload.data)) {
          return { ...payload, count: payload.count ?? 0, data: [] };
        }
        return payload;
      } catch (error) {
        const status = error?.response?.status;
        // No records / not found → treat as empty list, not a hard failure
        if (status === 404 || status === 204) {
          return { count: 0, data: [] };
        }
        throw error;
      }
    },
    enabled: isAdmin != null,
  });
};

export const useGetQuestionCategory = () => {
  return useQuery({
    queryKey: ["questionCategory"],
    queryFn: async () => {
      const response = await api.get("/api/FSMQuestionCategory/list");
      return response?.data;
    },
  });
};

export const useGetPriorityList = () => {
  return useQuery({
    queryKey: ["priorityList"],
    queryFn: async () => {
      const response = await api.get("/api/Priority/list");
      return response?.data;
    },
  });
};

export const useGetQuestionList = () => {
  const { fsmProfileId } = useGlobalState();
  return useQuery({
    queryKey: ["questionList", fsmProfileId],
    queryFn: async () => {
      const response = await api.get(`/api/FSMQuestion/list?profileId=${fsmProfileId}`);
      return response?.data;
    },
  });
};

export const useGetQuestionListById = () => {
  const route = useRoute();
    const { questionId } = route.params;
    // console.log("Question ID:", questionId);
  return useQuery({
    queryKey: ["questionListbyId", questionId],
    queryFn: async () => {
      const response = await api.get(`/api/FSMQuestion/${questionId}`);
      return response?.data;
    },
  });
};

export const useGetChatList = () => {
  const route = useRoute();
    const { questionId } = route.params;
    // console.log("Question ID:", questionId);
  return useQuery({
    queryKey: ["chatList", questionId],
    queryFn: async () => {
      const response = await api.get(`/api/FSMQuestionChat/GetQuestionChat?questionId=${questionId}`);
      return response?.data;
    },
    // 🔄 Real-time polling: Check for new messages every 3 seconds
    refetchInterval: 3000, // 3 seconds
    refetchIntervalInBackground: false, // Only poll when app is in foreground
    refetchOnWindowFocus: true, // Refetch when screen comes into focus
    refetchOnMount: true, // Refetch when component mounts
  });
};

export const useGetWalletApprovedStatusList = () => {
  const { fsmProfileId } = useGlobalState();
  console.log("FSM Profile ID:", fsmProfileId);
  return useQuery({
    queryKey: ["walletApprovedStatus", fsmProfileId],
    queryFn: async () => {
      const response = await api.get(`/api/fsm/wallet/approved-status?fsmProfileId=${fsmProfileId}&payoutStatusId=1`);
      return response?.data;
    },
  });
};

export const useGetWalletInProcessDisbursementList = () => {
  const { fsmProfileId } = useGlobalState();
  console.log("FSM Profile ID:", fsmProfileId);
  return useQuery({
    queryKey: ["walletInProcessDisbursement", fsmProfileId],
    queryFn: async () => {
      const response = await api.get(`/api/fsm-wallet/inprocess?fsmProfileId=${fsmProfileId}&WithDraw_Type=IN_PROCESS`);
      return response?.data;
    },
  });
};

export const useGetWalletPaidStatusList = () => {
  const { fsmProfileId } = useGlobalState();
  console.log("FSM Profile ID:", fsmProfileId);
  return useQuery({
    queryKey: ["walletPaidStatus", fsmProfileId],
    queryFn: async () => {
      const response = await api.get(`/api/fsm-wallet/inprocess?fsmProfileId=${fsmProfileId}&WithDraw_Type=PAID`);
      return response?.data;
    },
  });
};

export const useGetAllWalletStatusList = () => {
  const { fsmProfileId } = useGlobalState();
  console.log("FSM Profile ID:", fsmProfileId);
  return useQuery({
    queryKey: ["allWalletStatus", fsmProfileId],
    queryFn: async () => {
      const response = await api.get(`/api/fsm-wallet/inprocess?fsmProfileId=${fsmProfileId}&WithDraw_Type=ALL`);
      return response?.data;
    },
  });
};

export const useGetNotificationList = () => {
  const { fsmProfileId } = useGlobalState();
  return useQuery({
    queryKey: ["notificationList", fsmProfileId],
    queryFn: async () => {
      const response = await api.get(`/api/FSMNotification/list?fsmProfileId=${fsmProfileId}`);
      return response?.data;
    },
    // 🔄 Real-time polling: Check for new notifications every 3 seconds (like QuestionDetailScreen chat)
    refetchInterval: 3000, // 3 seconds
    refetchIntervalInBackground: false, // Only poll when app is in foreground
    refetchOnWindowFocus: true, // Refetch when screen comes into focus
    refetchOnMount: true, // Refetch when component mounts
  });
};

export const useGetAdvertismentList = () => {
  return useQuery({
    queryKey: ["advertismentList"],
    queryFn: async () => {
      const response = await api.get(`/api/FSMAd/list?targetRole=FSM`);
      return response?.data;
    },
  });
};

export const useGetDashboardList = () => {
  const fromDate = dayjs().startOf("month").format("YYYY-MM-DD");
  return useQuery({
    queryKey: ["dashboardList", fromDate],
    queryFn: async () => {
      const response = await api.get(
        `/api/FSMDashboard/dashboard?from=${fromDate}`
      );
      return response?.data;
    },
    // 🔄 Poll dashboard while app is open
    refetchInterval: 20000, // 20 seconds
    refetchIntervalInBackground: false, // Only poll when app is in foreground
    refetchOnWindowFocus: true, // Refetch when screen comes into focus
    refetchOnMount: true, // Refetch when component mounts
  });
};


export const useGetFSMBrandList = () => {
  return useQuery({
    queryKey: ["fsmBrandList"],
    queryFn: async () => {
      const response = await api.get(`/api/FsmBrand/list`);
      return response?.data;
    },
  });
};

export const useGetFSMCategoryList = (brandId) => {
  return useQuery({
    queryKey: ["fsmCategoryList", brandId ?? "all"],
    queryFn: async () => {
      const url = brandId
        ? `/api/FsmCategory/list?brandId=${brandId}`
        : `/api/FsmCategory/list`;
      const response = await api.get(url);
      return response?.data;
    },
  });
};

/** Category count per brand (same cache key as useGetFSMCategoryList). */
export const useGetFSMCategoryCountsByBrandIds = (brandIds = []) => {
  const queries = useQueries({
    queries: brandIds.map((brandId) => ({
      queryKey: ["fsmCategoryList", brandId ?? "all"],
      queryFn: async () => {
        const url = brandId
          ? `/api/FsmCategory/list?brandId=${brandId}`
          : `/api/FsmCategory/list`;
        const response = await api.get(url);
        return response?.data;
      },
      enabled: brandId != null && brandId !== "",
    })),
  });

  const countsKey = queries
    .map((q, i) => `${brandIds[i]}:${getListCount(q?.data)}`)
    .join("|");

  return useMemo(() => {
    return brandIds.reduce((map, brandId, index) => {
      map[String(brandId)] = getListCount(queries[index]?.data);
      return map;
    }, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey, brandIds.join(",")]);
};

export const useGetFSMSubCategoryList = (categoryId) => {
  return useQuery({
    queryKey: ["fsmSubCategoryList", categoryId],
    queryFn: async () => {
      const response = await api.get(
        `/api/FsmSubCategory/list?categoryId=${categoryId}`
      );
      return response?.data;
    },
    enabled: !!categoryId,
  });
};

/** Subcategory / series count per category. */
export const useGetFSMSubCategoryCountsByCategoryIds = (categoryIds = []) => {
  const queries = useQueries({
    queries: categoryIds.map((categoryId) => ({
      queryKey: ["fsmSubCategoryList", categoryId],
      queryFn: async () => {
        const response = await api.get(
          `/api/FsmSubCategory/list?categoryId=${categoryId}`
        );
        return response?.data;
      },
      enabled: !!categoryId,
    })),
  });

  const countsKey = queries
    .map((q, i) => `${categoryIds[i]}:${getListCount(q?.data)}`)
    .join("|");

  return useMemo(() => {
    return categoryIds.reduce((map, categoryId, index) => {
      map[String(categoryId)] = getListCount(queries[index]?.data);
      return map;
    }, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey, categoryIds.join(",")]);
};

/** Guide / materials count per subcategory (E-Learning materials). */
export const useGetGuideCountsBySubcategoryIds = (subcategoryIds = []) => {
  const { isAdmin } = useGlobalState();
  const queries = useQueries({
    queries: subcategoryIds.map((subcategoryId) => ({
      queryKey: ["learningGuide", subcategoryId ?? "all", isAdmin],
      queryFn: async () => {
        const url = subcategoryId
          ? `/api/FSMUserGuide/list?profileTypeId=${isAdmin}&subcategoryId=${subcategoryId}`
          : `/api/FSMUserGuide/list?profileTypeId=${isAdmin}`;
        try {
          const response = await api.get(url);
          const payload = response?.data;
          if (payload == null) return { count: 0, data: [] };
          if (Array.isArray(payload)) return { count: payload.length, data: payload };
          if (!Array.isArray(payload.data)) {
            return { ...payload, count: payload.count ?? 0, data: [] };
          }
          return payload;
        } catch (error) {
          const status = error?.response?.status;
          if (status === 404 || status === 204) {
            return { count: 0, data: [] };
          }
          throw error;
        }
      },
      enabled: isAdmin != null && !!subcategoryId,
    })),
  });

  const countsKey = queries
    .map((q, i) => `${subcategoryIds[i]}:${getListCount(q?.data)}`)
    .join("|");

  return useMemo(() => {
    return subcategoryIds.reduce((map, subcategoryId, index) => {
      map[String(subcategoryId)] = getListCount(queries[index]?.data);
      return map;
    }, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey, subcategoryIds.join(","), isAdmin]);
};