import {
  useAttendanceShiftQuery,
  useEmployeeProfileQuery,
  useEmployeeShiftListQuery,
  usePayrollShiftQuery,
} from "../apis/Get";
import { useGlobalState } from "../context/GlobalContext";
import { resolveShiftSchedule, selectApplicableShift } from "../utils/shift";

export default function useEmployeeShift() {
  const { employeeId } = useGlobalState();
  const profileQuery = useEmployeeProfileQuery();
  const shiftListQuery = useEmployeeShiftListQuery();
  const assignment = selectApplicableShift(shiftListQuery.data, employeeId);
  const shiftId = Number(assignment?.shifT_ID || profileQuery.data?.shiftId || 0);
  const attendanceShiftQuery = useAttendanceShiftQuery(shiftId);
  const attendanceSchedule = resolveShiftSchedule(attendanceShiftQuery.data);
  const payrollShiftQuery = usePayrollShiftQuery(
    shiftId,
    attendanceShiftQuery.isFetched && !attendanceSchedule
  );
  const schedule = attendanceSchedule || resolveShiftSchedule(payrollShiftQuery.data);

  return {
    shiftId,
    assignment,
    schedule,
    definition: attendanceSchedule ? attendanceShiftQuery.data : payrollShiftQuery.data,
    isLoading:
      profileQuery.isLoading ||
      shiftListQuery.isLoading ||
      attendanceShiftQuery.isLoading ||
      payrollShiftQuery.isLoading,
    refetch: () => {
      shiftListQuery.refetch();
      if (shiftId > 0) attendanceShiftQuery.refetch();
    },
  };
}
