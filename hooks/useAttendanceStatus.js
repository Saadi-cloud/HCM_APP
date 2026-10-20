import { useQuery } from "@tanstack/react-query";
import { useGlobalState } from "../context/GlobalContext";
import { fetchAttendanceList } from "../services/attendanceService";
import { isOpenRecord, recordDateKey } from "../services/attendancePayload";
import { resolveAttendanceDate } from "../utils/attendanceCalculations";
import { addDays, businessDateKey, parseApiDateTime } from "../utils/dateTime";

export function deriveAttendanceState(records, schedule, now = Date.now()) {
  const todayKey = businessDateKey(now);
  const attendanceDateKey = resolveAttendanceDate(schedule, now, todayKey);
  const forDate = records
    .filter((record) => recordDateKey(record) === attendanceDateKey)
    .sort((left, right) => (parseApiDateTime(right.actuaL_IN) ?? 0) - (parseApiDateTime(left.actuaL_IN) ?? 0));

  const openRecord = forDate.find(isOpenRecord) ?? null;
  const completedRecord = forDate.find((record) => parseApiDateTime(record.actuaL_OUT) != null) ?? null;
  const staleOpenRecord =
    records.find((record) => isOpenRecord(record) && recordDateKey(record) < attendanceDateKey) ?? null;

  let nextAction = "CHECK_IN";
  if (openRecord) nextAction = "CHECK_OUT";
  else if (completedRecord) nextAction = "COMPLETE";

  return { attendanceDateKey, openRecord, completedRecord, staleOpenRecord, nextAction };
}

export default function useAttendanceStatus() {
  const { employeeId, accessToken } = useGlobalState();
  const todayKey = businessDateKey();

  const query = useQuery({
    queryKey: ["attendance", "recent", employeeId, todayKey],
    queryFn: () => fetchAttendanceList(employeeId, addDays(todayKey, -1), todayKey),
    enabled: Number(employeeId) > 0 && !!accessToken,
  });

  return { ...query, records: query.data ?? [] };
}
